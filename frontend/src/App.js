import React, { useState, useEffect, useCallback } from 'react';
import { DndContext, closestCenter, PointerSensor, TouchSensor, useSensor, useSensors } from '@dnd-kit/core';
import { arrayMove } from '@dnd-kit/sortable';
import Header from './components/Header';
import Sidebar from './components/Sidebar';
import Phase from './components/Phase';
import CompletionBanner from './components/CompletionBanner';
import DeleteConfirmModal from './components/DeleteConfirmModal';

const API = '/api';
const CACHE_KEY = 'routine_state_v1';

function readCache() {
  try { return JSON.parse(localStorage.getItem(CACHE_KEY)); } catch { return null; }
}
function writeCache(data) {
  try { localStorage.setItem(CACHE_KEY, JSON.stringify(data)); } catch {}
}

function SkeletonApp() {
  return (
    <div className="app">
      <div className="skeleton-header" />
      <div className="main">
        <div className="skeleton-sidebar" />
        <div className="skeleton-phase" />
        <div className="skeleton-phase" />
        <div className="skeleton-phase" />
      </div>
    </div>
  );
}

export default function App() {
  const cached = readCache();
  const [state, setState] = useState(cached);
  const [loading, setLoading] = useState(!cached);
  const [error, setError] = useState(null);
  const [showBanner, setShowBanner] = useState(false);
  const [newAchievement, setNewAchievement] = useState(null);
  const [deleteModal, setDeleteModal] = useState(null); // null | {phaseId, itemId, label}

  const fetchState = useCallback(async () => {
    try {
      const res = await fetch(`${API}/state`);
      if (!res.ok) throw new Error(`Server responded with ${res.status}`);
      const data = await res.json();
      writeCache(data);
      setState(data);
      setLoading(false);
    } catch (err) {
      setState(prev => {
        if (!prev) setError(err.message);
        return prev;
      });
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchState();
  }, [fetchState]);

  const handleRename = useCallback(async (phaseId, itemId, label) => {
    try {
      const res = await fetch(`${API}/rename-item`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phase_id: phaseId, item_id: itemId, label }),
      });
      if (!res.ok) throw new Error(`Server responded with ${res.status}`);
      setState(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          phases: prev.phases.map(p =>
            p.id !== phaseId ? p : {
              ...p,
              items: p.items.map(i => i.id !== itemId ? i : { ...i, label }),
            }
          ),
        };
      });
    } catch (err) {
      fetchState();
    }
  }, [fetchState]);

  const handleBackfill = useCallback(async (dateStr) => {
    try {
      await fetch(`${API}/backfill-day`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date: dateStr }),
      });
      fetchState();
    } catch (err) {
      fetchState();
    }
  }, [fetchState]);

  const handleDeleteRequest = useCallback((phaseId, itemId, label) => {
    setDeleteModal({ phaseId, itemId, label });
  }, []);

  const handleDeleteCancel = useCallback(() => {
    setDeleteModal(null);
  }, []);

  const handleDeleteConfirm = useCallback(async () => {
    if (!deleteModal) return;
    const { phaseId, itemId } = deleteModal;
    setDeleteModal(null);
    setState(prev => !prev ? prev : {
      ...prev,
      phases: prev.phases.map(p =>
        p.id !== phaseId ? p : { ...p, items: p.items.filter(i => i.id !== itemId) }
      ),
    });
    try {
      const res = await fetch(`${API}/remove-item`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phase_id: phaseId, item_id: itemId }),
      });
      if (!res.ok) throw new Error(`Server responded with ${res.status}`);
    } catch (err) {
      fetchState();
    }
  }, [deleteModal, fetchState]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 5 } })
  );

  const persistOrder = useCallback(async (newPhases) => {
    const order = newPhases.map(p => ({
      phase_id: p.id,
      items: p.items.map(i => i.id),
    }));
    try {
      await fetch(`${API}/reorder`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ order }),
      });
    } catch (err) {
      fetchState(); // rollback on failure
    }
  }, [fetchState]);

  const handleDragEnd = useCallback((event) => {
    const { active, over } = event;
    if (!active || !over) return;

    const activeId = active.id;
    const overId = over.id;

    if (activeId === overId) return;

    setState(prev => {
      if (!prev) return prev;
      const { phases, today } = prev;

      // Find which phase the active item is in
      let sourcePhaseIdx = -1;
      let sourceItemIdx = -1;
      for (let pi = 0; pi < phases.length; pi++) {
        const idx = phases[pi].items.findIndex(i => i.id === activeId);
        if (idx !== -1) {
          sourcePhaseIdx = pi;
          sourceItemIdx = idx;
          break;
        }
      }
      if (sourcePhaseIdx === -1) return prev;

      // Determine destination: is `over` an item or a phase container?
      let destPhaseIdx = -1;
      let destItemIdx = -1;
      for (let pi = 0; pi < phases.length; pi++) {
        if (phases[pi].id === overId) {
          // Dropped on an empty phase container
          destPhaseIdx = pi;
          destItemIdx = phases[pi].items.length; // append at end
          break;
        }
        const idx = phases[pi].items.findIndex(i => i.id === overId);
        if (idx !== -1) {
          destPhaseIdx = pi;
          destItemIdx = idx;
          break;
        }
      }
      if (destPhaseIdx === -1) return prev;

      const newPhases = phases.map(p => ({ ...p, items: [...p.items] }));
      let newToday = { ...today };

      if (sourcePhaseIdx === destPhaseIdx) {
        // Same phase: reorder
        newPhases[sourcePhaseIdx].items = arrayMove(
          newPhases[sourcePhaseIdx].items, sourceItemIdx, destItemIdx
        );
      } else {
        // Cross-phase: remove from source, insert into dest
        const [movedItem] = newPhases[sourcePhaseIdx].items.splice(sourceItemIdx, 1);
        newPhases[destPhaseIdx].items.splice(destItemIdx, 0, movedItem);

        // Migrate completion state
        const sourcePhaseId = phases[sourcePhaseIdx].id;
        const destPhaseId = phases[destPhaseIdx].id;
        const wasChecked = (newToday[sourcePhaseId] || {})[activeId] || false;
        newToday = { ...newToday };
        newToday[sourcePhaseId] = { ...newToday[sourcePhaseId] };
        delete newToday[sourcePhaseId][activeId];
        newToday[destPhaseId] = { ...newToday[destPhaseId], [activeId]: wasChecked };
      }

      // Persist asynchronously
      persistOrder(newPhases);

      return { ...prev, phases: newPhases, today: newToday };
    });
  }, [persistOrder]);

  const handleToggle = useCallback(async (phaseId, itemId) => {
    // Optimistically flip the item immediately
    setState(prev => {
      if (!prev) return prev;
      const prevPhase = prev.today[phaseId] || {};
      return {
        ...prev,
        today: {
          ...prev.today,
          [phaseId]: {
            ...prevPhase,
            [itemId]: !prevPhase[itemId],
          },
        },
      };
    });

    try {
      const res = await fetch(`${API}/toggle`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phase_id: phaseId, item_id: itemId }),
      });
      if (!res.ok) throw new Error(`Server responded with ${res.status}`);
      const data = await res.json();

      // Merge authoritative server data (streak, achievements, completed flag)
      setState(prev => {
        if (!prev) return prev;

        // Detect new achievement unlock
        const prevUnlocked = prev.unlocked_achievements || [];
        const nextUnlocked = data.unlocked_achievements || [];
        const gained = nextUnlocked.filter(a => !prevUnlocked.includes(a));
        if (gained.length > 0) {
          const name = prev.achievement_names[gained[gained.length - 1]];
          setNewAchievement({ days: gained[gained.length - 1], name });
          setTimeout(() => setNewAchievement(null), 3500);
        }

        return {
          ...prev,
          today: data.today,
          streak: data.streak,
          unlocked_achievements: data.unlocked_achievements,
          next_milestone: data.next_milestone,
        };
      });

      if (data.just_completed) {
        setShowBanner(true);
      }
    } catch (err) {
      fetchState(); // rollback on failure
    }
  }, [fetchState]);

  const handleToggleAll = useCallback(async () => {
    // Determine target state: if all items complete, set to false; else true
    const allComplete = state && state.phases.every(phase =>
      phase.items.every(item => (state.today[phase.id] || {})[item.id])
    );
    const targetState = !allComplete;

    // Optimistically update all items
    setState(prev => {
      if (!prev) return prev;
      const newToday = { ...prev.today };
      prev.phases.forEach(phase => {
        newToday[phase.id] = {};
        phase.items.forEach(item => {
          newToday[phase.id][item.id] = targetState;
        });
      });
      newToday.completed = targetState;
      return { ...prev, today: newToday };
    });

    try {
      const res = await fetch(`${API}/toggle-all`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ completed: targetState }),
      });
      if (!res.ok) throw new Error(`Server responded with ${res.status}`);
      const data = await res.json();

      // Merge authoritative server data
      setState(prev => {
        if (!prev) return prev;

        // Detect new achievement unlock
        const prevUnlocked = prev.unlocked_achievements || [];
        const nextUnlocked = data.unlocked_achievements || [];
        const gained = nextUnlocked.filter(a => !prevUnlocked.includes(a));
        if (gained.length > 0) {
          const name = prev.achievement_names[gained[gained.length - 1]];
          setNewAchievement({ days: gained[gained.length - 1], name });
          setTimeout(() => setNewAchievement(null), 3500);
        }

        return {
          ...prev,
          today: data.today,
          streak: data.streak,
          unlocked_achievements: data.unlocked_achievements,
          next_milestone: data.next_milestone,
        };
      });

      if (data.just_completed) {
        setShowBanner(true);
      }
    } catch (err) {
      fetchState(); // rollback on failure
    }
  }, [state, fetchState]);

  if (loading) {
    return <SkeletonApp />;
  }

  if (error) {
    return (
      <div className="error-screen">
        <span className="error-screen__code">Connection Error</span>
        <span className="error-screen__message">
          Make sure the backend is running: <code>python backend/app.py</code>
        </span>
        <span className="error-screen__message" style={{ fontSize: '11px', opacity: 0.5 }}>
          {error}
        </span>
      </div>
    );
  }

  if (!state) return null;

  const { phases, today, streak, unlocked_achievements, next_milestone, fibonacci, achievement_names, date } = state;

  return (
    <div className="app">
      <Header date={date} allCompleted={today.completed} onToggleAll={handleToggleAll} />

      <div className="main">
        <Sidebar
          streak={streak}
          nextMilestone={next_milestone}
          unlockedAchievements={unlocked_achievements}
          fibonacci={fibonacci}
          achievementNames={achievement_names}
          onBackfill={handleBackfill}
        />

        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          {phases.map(phase => (
            <Phase
              key={phase.id}
              phase={phase}
              entries={today[phase.id] || {}}
              onToggle={handleToggle}
              onRename={handleRename}
              onDeleteRequest={handleDeleteRequest}
            />
          ))}
        </DndContext>
      </div>

      {showBanner && (
        <CompletionBanner streak={streak} onDismiss={() => setShowBanner(false)} />
      )}

      {deleteModal && (
        <DeleteConfirmModal
          item={{ label: deleteModal.label }}
          onConfirm={handleDeleteConfirm}
          onCancel={handleDeleteCancel}
        />
      )}

      {newAchievement && (
        <div className="new-achievement-flash">
          <div className="new-achievement-flash__label">Achievement Unlocked</div>
          <div className="new-achievement-flash__name">
            {newAchievement.days} {newAchievement.days === 1 ? 'night' : 'nights'} — {newAchievement.name}
          </div>
        </div>
      )}
    </div>
  );
}
