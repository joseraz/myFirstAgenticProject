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

export default function Header({ date, allCompleted }) {
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
      <div className="header__accent-yellow" />
    </header>
  );
}
