import React from 'react';

export default function CompletionBanner({ streak, onDismiss }) {
  return (
    <div className="completion-banner" role="status" aria-live="polite">
      <div className="completion-banner__stripe-left" />
      <div className="completion-banner__body">
        <span className="completion-banner__heading">Night Complete</span>
        <div className="completion-banner__sep" />
        <span className="completion-banner__sub">Your routine is done</span>
        <div className="completion-banner__sep" />
        <span className="completion-banner__streak">{streak} night{streak !== 1 ? 's' : ''} in a row</span>
      </div>
      <div className="completion-banner__gap" />
      <button className="completion-banner__dismiss" onClick={onDismiss}>
        Dismiss
      </button>
    </div>
  );
}
