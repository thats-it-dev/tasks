import { useState, useRef, useEffect } from 'react';
import { Trash2 } from 'lucide-react';
import type { Task } from '../lib/types';
import { format, isToday, isPast, isTomorrow } from 'date-fns';
import { useTaskStore } from '../store/taskStore';
import { useAppStore } from '../store/appStore';

interface TaskItemProps {
  task: Task;
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
  onUpdate: (id: string, title: string) => void;
}

function renderTitleWithTags(
  displayTitle: string,
  onTagClick: (tag: string) => void
) {
  const parts = displayTitle.split(/(#\w+)/g);
  return parts.map((part, i) => {
    if (part.startsWith('#')) {
      return (
        <button
          key={i}
          onClick={(e) => {
            e.stopPropagation();
            onTagClick(part.slice(1));
          }}
          className="font-medium text-[var(--primary)] hover:underline"
        >
          {part}
        </button>
      );
    }
    return <span key={i}>{part}</span>;
  });
}

export function TaskItem({ task, onToggle, onDelete, onUpdate }: TaskItemProps) {
  const addFilter = useTaskStore((state) => state.addFilter);
  const focusedTaskId = useAppStore((state) => state.focusedTaskId);
  const setFocusedTaskId = useAppStore((state) => state.setFocusedTaskId);

  // Check if this task should start in edit mode
  const shouldStartEditing = focusedTaskId === task.id;
  const [isEditing, setIsEditing] = useState(shouldStartEditing);
  const [editValue, setEditValue] = useState(task.title);
  const inputRef = useRef<HTMLInputElement>(null);

  // Clear focused task ID after we've consumed it
  useEffect(() => {
    if (shouldStartEditing) {
      setFocusedTaskId(null);
    }
  }, [shouldStartEditing, setFocusedTaskId]);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleSave = () => {
    if (editValue.trim() !== task.title) {
      onUpdate(task.id, editValue.trim());
    }
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSave();
    } else if (e.key === 'Escape') {
      setEditValue(task.title);
      setIsEditing(false);
    }
  };

  const formatDueDate = (date: Date | undefined) => {
    if (!date) return null;

    if (isToday(date)) return 'Today';
    if (isTomorrow(date)) return 'Tomorrow';
    if (isPast(date) && !isToday(date)) {
      return <span className="text-[var(--accent)]">{format(date, 'MMM d')}</span>;
    }
    return format(date, 'MMM d');
  };

  return (
    <div className={`group flex items-center gap-3 py-2 ${task.completed ? 'opacity-60' : ''}`}>
      {/* Checkbox - using native input with @thatsit/ui styling */}
      <input
        type="checkbox"
        checked={task.completed}
        onChange={() => onToggle(task.id)}
        className="flex-shrink-0 cursor-pointer"
      />

      {/* Title */}
      {isEditing ? (
        <input
          ref={inputRef}
          type="text"
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onBlur={handleSave}
          onKeyDown={handleKeyDown}
          className="flex-1 px-2 py-1 bg-[var(--bg)] border border-[var(--primary)] rounded focus:outline-none focus:ring-2 focus:ring-[var(--ring)]"
        />
      ) : (
        <span
          onClick={() => setIsEditing(true)}
          className={`flex-1 text-left cursor-text ${task.completed ? 'line-through' : ''}`}
        >
          {renderTitleWithTags(task.displayTitle, addFilter)}
        </span>
      )}

      {/* Due Date */}
      {task.dueDate && !isEditing && (
        <span className="text-sm text-[var(--text-muted)]">
          {formatDueDate(task.dueDate)}
        </span>
      )}

      {/* Delete Button */}
      {!isEditing && (
        <button
          onClick={() => onDelete(task.id)}
          className="opacity-0 group-hover:opacity-100 text-[var(--text-muted)] hover:text-[var(--accent)] transition-all"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}
