import { Calendar, CalendarDays } from 'lucide-react';
import { TaskItem } from './TaskItem';
import { TaskGroup } from './TaskGroup';
import type { Task } from '../lib/types';

interface TaskListProps {
  dueToday: Task[];
  dueLater: Task[];
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
  onUpdate: (id: string, title: string) => void;
}

export function TaskList({ dueToday, dueLater, onToggle, onDelete, onUpdate }: TaskListProps) {
  if (dueToday.length === 0 && dueLater.length === 0) {
    return (
      <div className="text-center py-12 text-[var(--text-muted)]">
        <p className="text-lg">No tasks yet</p>
        <p className="text-sm mt-2">Create your first task above!</p>
      </div>
    );
  }

  return (
    <div>
      {dueToday.length > 0 && (
        <TaskGroup
          icon={<Calendar className="w-4 h-4" />}
          title="Due Today"
          count={dueToday.length}
        >
          {dueToday.map(task => (
            <TaskItem
              key={task.id}
              task={task}
              onToggle={onToggle}
              onDelete={onDelete}
              onUpdate={onUpdate}
            />
          ))}
        </TaskGroup>
      )}

      {dueLater.length > 0 && (
        <TaskGroup
          icon={<CalendarDays className="w-4 h-4" />}
          title="Due Later"
          count={dueLater.length}
        >
          {dueLater.map(task => (
            <TaskItem
              key={task.id}
              task={task}
              onToggle={onToggle}
              onDelete={onDelete}
              onUpdate={onUpdate}
            />
          ))}
        </TaskGroup>
      )}
    </div>
  );
}
