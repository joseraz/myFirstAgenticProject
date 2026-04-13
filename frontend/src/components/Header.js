import React from 'react';

function formatDate(dateStr) {
  if (!dateStr) return '';
  const [year, month, day] = dateStr.split('-').map(Number);
  const d = new Date(year, month - 1, day);
  return d.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });
}

export default function Header({ date, allCompleted, onToggleAll }) {
  return (
    <header className="header">
      <div className="header__accent-red" />
      <div className="header__accent-blue-left" />
      <div className="header__title-area">
        <span className="header__title">Bedtime Routine</span>
        <span className="header__date">{formatDate(date)}</span>
        {allCompleted && (
          <span style={{
            fontSize: '10px',
            fontWeight: 700,
            letterSpacing: '0.18em',
            textTransform: 'uppercase',
            color: '#F5C518',
            marginLeft: '8px',
          }}>
            Night Complete
          </span>
        )}
      </div>
      <div className="header__accent-right" />
      <div className="header__accent-gap" />
      <button
        className={`header__mark-all-btn ${allCompleted ? 'header__mark-all-btn--done' : ''}`}
        onClick={onToggleAll}
        aria-label="Toggle all items"
      >
        <span className="header__mark-all-btn__check">✓</span>
        <span className="header__mark-all-btn__label">Mark All</span>
      </button>
    </header>
  );
}
