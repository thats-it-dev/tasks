import { useState, useRef, useEffect } from 'react';
import { Circle, CheckCircle2, Trash2 } from 'lucide-react';
import type { Task } from '../lib/types';
import { format, isToday, isPast, isTomorrow } from 'date-fns';

interface TaskItemProps {
  task: Task;
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
  onUpdate: (id: string, title: string) => void;
}

export function TaskItem({ task, onToggle, onDelete, onUpdate }: TaskItemProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(task.title);
  const inputRef = useRef<HTMLInputElement>(null);

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
      return <span className="text-red-500">{format(date, 'MMM d')}</span>;
    }
    return format(date, 'MMM d');
  };

  return (
    <div className={`group flex items-center gap-3 py-2 px-3 rounded-lg hover:bg-gray-50 transition-colors ${task.completed ? 'opacity-60' : ''}`}>
      {/* Checkbox */}
      <button
        onClick={() => onToggle(task.id)}
        className="flex-shrink-0 text-gray-400 hover:text-blue-500 transition-colors"
      >
        {task.completed ? (
          <CheckCircle2 className="w-5 h-5 text-blue-500" />
        ) : (
          <Circle className="w-5 h-5" />
        )}
      </button>

      {/* Title */}
      {isEditing ? (
        <input
          ref={inputRef}
          type="text"
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onBlur={handleSave}
          onKeyDown={handleKeyDown}
          className="flex-1 px-2 py-1 border border-blue-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      ) : (
        <button
          onClick={() => setIsEditing(true)}
          className={`flex-1 text-left ${task.completed ? 'line-through' : ''}`}
        >
          {task.displayTitle}
        </button>
      )}

      {/* Due Date */}
      {task.dueDate && !isEditing && (
        <span className="text-sm text-gray-500">
          {formatDueDate(task.dueDate)}
        </span>
      )}

      {/* Delete Button */}
      {!isEditing && (
        <button
          onClick={() => onDelete(task.id)}
          className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500 transition-all"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}
