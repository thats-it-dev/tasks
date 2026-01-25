import { useEffect } from 'react';
import { Calendar } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { useTaskStore } from '../store/taskStore';
import { updateTask as updateTaskOp } from '../lib/taskOperations';
import { parseTaskInput } from '../lib/parser';
import { FilterBar } from './FilterBar';
import { TaskGroup } from './TaskGroup';
import { TaskItem } from './TaskItem';

export function ArchiveView() {
  const {
    loadArchivedTasks,
    getFilteredArchivedTasks,
    toggleTask,
    deleteTask,
    refreshTasks,
  } = useTaskStore();

  useEffect(() => {
    loadArchivedTasks();
  }, [loadArchivedTasks]);

  const archivedTasks = getFilteredArchivedTasks();

  const handleUpdate = async (id: string, newTitle: string) => {
    const parsed = parseTaskInput(newTitle);
    await updateTaskOp(id, {
      title: newTitle,
      displayTitle: parsed.displayTitle,
      tags: parsed.tags,
      dueDate: parsed.dueDate || undefined,
    });
    await refreshTasks();
    await loadArchivedTasks();
  };

  const handleToggle = async (id: string) => {
    await toggleTask(id);
    await loadArchivedTasks();
  };

  const handleDelete = async (id: string) => {
    await deleteTask(id);
    await loadArchivedTasks();
  };

  const formatDateHeading = (dateKey: string) => {
    const date = parseISO(dateKey);
    return format(date, 'MMMM d, yyyy');
  };

  return (
    <div>
      <h1 className="text-xl font-semibold mb-2 text-center">Archive</h1>

      <FilterBar />

      {archivedTasks.size === 0 ? (
        <div className="text-center py-12 text-[var(--text-muted)]">
          <p className="text-lg">No archived tasks</p>
          <p className="text-sm mt-2">Completed tasks from previous days will appear here</p>
        </div>
      ) : (
        Array.from(archivedTasks.entries()).map(([dateKey, tasks]) => (
          <TaskGroup
            key={dateKey}
            icon={<Calendar className="w-4 h-4" />}
            title={formatDateHeading(dateKey)}
            count={tasks.length}
          >
            {tasks.map((task) => (
              <TaskItem
                key={task.id}
                task={task}
                onToggle={handleToggle}
                onDelete={handleDelete}
                onUpdate={handleUpdate}
              />
            ))}
          </TaskGroup>
        ))
      )}
    </div>
  );
}
