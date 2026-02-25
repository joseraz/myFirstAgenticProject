import React from 'react';

export default function Phase({ phase, entries, onToggle }) {
  const items = phase.items;
  const color = phase.color; // 'red' | 'blue' | 'yellow'

  return (
    <div className={`phase phase--${color}`}>
      <div className={`phase__header phase__header--${color}`}>
        <div className="phase__number">{phase.name}</div>
        <div className="phase__title">{phase.subtitle}</div>
        <div className="phase__progress">
          {items.map((item, i) => (
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
          return (
            <div
              key={item.id}
              className={`checklist-item${checked ? ' checklist-item--checked' : ''}`}
              onClick={() => onToggle(phase.id, item.id)}
              role="checkbox"
              aria-checked={checked}
              tabIndex={0}
              onKeyDown={e => { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); onToggle(phase.id, item.id); } }}
            >
              <div className="checklist-item__box">
                <div className="checklist-item__tick" />
              </div>
              <span className="checklist-item__label">{item.label}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
