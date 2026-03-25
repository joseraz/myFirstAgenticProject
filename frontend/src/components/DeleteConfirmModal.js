import React from 'react';

export default function DeleteConfirmModal({ item, onConfirm, onCancel }) {
  function handleOverlayClick(e) {
    if (e.target === e.currentTarget) onCancel();
  }

  function handleKeyDown(e) {
    if (e.key === 'Escape') onCancel();
  }

  return (
    <div
      className="delete-modal-overlay"
      onClick={handleOverlayClick}
      onKeyDown={handleKeyDown}
      tabIndex={-1}
    >
      <div className="delete-modal" role="dialog" aria-modal="true" aria-labelledby="delete-modal-title">
        <div className="delete-modal__title" id="delete-modal-title">Delete Item?</div>
        <div className="delete-modal__body">This will permanently remove:</div>
        <div className="delete-modal__item-name">{item.label}</div>
        <div className="delete-modal__actions">
          <button className="delete-modal__cancel" onClick={onCancel}>
            Cancel
          </button>
          <button className="delete-modal__confirm" onClick={onConfirm} autoFocus>
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}
