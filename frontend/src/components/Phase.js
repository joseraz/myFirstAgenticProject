import React, { useState } from 'react';

export default function Phase({ phase, entries, onToggle, onRename }) {
  const items = phase.items;
  const color = phase.color; // 'red' | 'blue' | 'yellow'

  const [editingId, setEditingId] = useState(null);
  const [editValue, setEditValue] = useState('');

  function startEdit(item, e) {
    e.stopPropagation();
    setEditingId(item.id);
    setEditValue(item.label);
  }

  function commitEdit(item) {
    const trimmed = editValue.trim();
    if (trimmed && trimmed !== item.label) {
      onRename(phase.id, item.id, trimmed);
    }
    setEditingId(null);
  }

  function handleEditKeyDown(e, item) {
    if (e.key === 'Enter') { e.preventDefault(); commitEdit(item); }
    else if (e.key === 'Escape') { setEditingId(null); }
  }

  return (
    <div className={`phase phase--${color}`}>
      <div className={`phase__header phase__header--${color}`}>
        <div className="phase__number">{phase.name}</div>
        <div className="phase__title">{phase.subtitle}</div>
        <div className="phase__progress">
          {items.map((item) => (
            <div
              key={item.id}
              className={`phase__progress-pip${entries[item.id] ? ' phase__progress-pip--filled' : ''}`}
            />
          ))}
        </div>
      </div>

      <div className="phase__items">
        {items.map(item => {
          const checked = !!entries[item.id];
          const isEditing = editingId === item.id;
          return (
            <div
              key={item.id}
              className={`checklist-item${checked ? ' checklist-item--checked' : ''}`}
              onClick={() => !isEditing && onToggle(phase.id, item.id)}
              role="checkbox"
              aria-checked={checked}
              tabIndex={0}
              onKeyDown={e => {
                if (isEditing) return;
                if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); onToggle(phase.id, item.id); }
              }}
            >
              <div className="checklist-item__box">
                <div className="checklist-item__tick" />
              </div>
              {isEditing ? (
                <input
                  className="checklist-item__edit"
                  value={editValue}
                  autoFocus
                  onChange={e => setEditValue(e.target.value)}
                  onBlur={() => commitEdit(item)}
                  onKeyDown={e => handleEditKeyDown(e, item)}
                  onClick={e => e.stopPropagation()}
                />
              ) : (
                <span
                  className="checklist-item__label"
                  onDoubleClick={e => startEdit(item, e)}
                  title="Double-click to rename"
                >
                  {item.label}
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
