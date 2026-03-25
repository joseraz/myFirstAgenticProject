import React, { useState } from 'react';
import { SortableContext, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { useDroppable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';

function SortableItem({ item, checked, phaseId, isEditing, editValue, onToggle, onStartEdit, onEditChange, onCommitEdit, onEditKeyDown, onDeleteRequest }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: item.id,
    disabled: isEditing,
    data: { phaseId },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : undefined,
    zIndex: isDragging ? 10 : undefined,
    position: 'relative',
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`checklist-item${checked ? ' checklist-item--checked' : ''}${isDragging ? ' checklist-item--dragging' : ''}`}
      onClick={() => !isEditing && onToggle(phaseId, item.id)}
      role="checkbox"
      aria-checked={checked}
      tabIndex={0}
      onKeyDown={e => {
        if (isEditing) return;
        if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); onToggle(phaseId, item.id); }
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
          onChange={e => onEditChange(e.target.value)}
          onBlur={() => onCommitEdit(item)}
          onKeyDown={e => onEditKeyDown(e, item)}
          onClick={e => e.stopPropagation()}
        />
      ) : (
        <span
          className="checklist-item__label"
          onDoubleClick={e => onStartEdit(item, e)}
          title="Double-click to rename"
        >
          {item.label}
        </span>
      )}
      <div
        className="checklist-item__drag-handle"
        {...attributes}
        {...listeners}
        onClick={e => e.stopPropagation()}
      >
        <svg width="10" height="16" viewBox="0 0 10 16" fill="currentColor">
          <circle cx="2" cy="2" r="1.5"/>
          <circle cx="8" cy="2" r="1.5"/>
          <circle cx="2" cy="8" r="1.5"/>
          <circle cx="8" cy="8" r="1.5"/>
          <circle cx="2" cy="14" r="1.5"/>
          <circle cx="8" cy="14" r="1.5"/>
        </svg>
      </div>
      <button
        className="checklist-item__delete"
        aria-label="Delete item"
        tabIndex={0}
        onClick={e => { e.stopPropagation(); onDeleteRequest(phaseId, item.id, item.label); }}
        onKeyDown={e => {
          if (e.key === ' ' || e.key === 'Enter') {
            e.preventDefault();
            e.stopPropagation();
            onDeleteRequest(phaseId, item.id, item.label);
          }
        }}
      >
        <svg width="11" height="13" viewBox="0 0 11 13" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="1,3 10,3" />
          <path d="M3.5,3 L3.5,1.5 L7.5,1.5 L7.5,3" />
          <path d="M2,3 L2.75,11.5 L8.25,11.5 L9,3" />
          <line x1="4.5" y1="6" x2="4.5" y2="9.5" />
          <line x1="6.5" y1="6" x2="6.5" y2="9.5" />
        </svg>
      </button>
    </div>
  );
}

export default function Phase({ phase, entries, onToggle, onRename, onDeleteRequest }) {
  const items = phase.items;
  const color = phase.color;

  const [editingId, setEditingId] = useState(null);
  const [editValue, setEditValue] = useState('');

  const { setNodeRef } = useDroppable({ id: phase.id });

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

      <div className="phase__items" ref={setNodeRef}>
        <SortableContext items={items.map(i => i.id)} strategy={verticalListSortingStrategy}>
          {items.map(item => {
            const checked = !!entries[item.id];
            const isEditing = editingId === item.id;
            return (
              <SortableItem
                key={item.id}
                item={item}
                checked={checked}
                phaseId={phase.id}
                isEditing={isEditing}
                editValue={editValue}
                onToggle={onToggle}
                onStartEdit={startEdit}
                onEditChange={setEditValue}
                onCommitEdit={commitEdit}
                onEditKeyDown={handleEditKeyDown}
                onDeleteRequest={onDeleteRequest}
              />
            );
          })}
        </SortableContext>
      </div>
    </div>
  );
}
