import React, { useState, useEffect, useCallback } from 'react';
import Header from './components/Header';
import Sidebar from './components/Sidebar';
import Phase from './components/Phase';
import CompletionBanner from './components/CompletionBanner';

const API = '/api';

export default function App() {
  const [state, setState] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showBanner, setShowBanner] = useState(false);
  const [newAchievement, setNewAchievement] = useState(null);

  const fetchState = useCallback(async () => {
    try {
      const res = await fetch(`${API}/state`);
      if (!res.ok) throw new Error(`Server responded with ${res.status}`);
      const data = await res.json();
      setState(data);
      setLoading(false);
    } catch (err) {
      setError(err.message);
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

  const handleToggle = useCallback(async (phaseId, itemId) => {
    try {
      const res = await fetch(`${API}/toggle`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phase_id: phaseId, item_id: itemId }),
      });
      if (!res.ok) throw new Error(`Server responded with ${res.status}`);
      const data = await res.json();

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
      // Silently fail on toggle; re-fetch to sync
      fetchState();
    }
  }, [fetchState]);

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="loading-screen__bar">
          <div className="loading-screen__bar-fill" />
        </div>
        <span className="loading-screen__text">Loading routine</span>
      </div>
    );
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
      <Header date={date} allCompleted={today.completed} />

      <div className="main">
        <Sidebar
          streak={streak}
          nextMilestone={next_milestone}
          unlockedAchievements={unlocked_achievements}
          fibonacci={fibonacci}
          achievementNames={achievement_names}
        />

        {phases.map(phase => (
          <Phase
            key={phase.id}
            phase={phase}
            entries={today[phase.id] || {}}
            onToggle={handleToggle}
            onRename={handleRename}
          />
        ))}
      </div>

      {showBanner && (
        <CompletionBanner streak={streak} onDismiss={() => setShowBanner(false)} />
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
