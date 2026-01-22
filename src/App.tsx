import { useEffect } from 'react';
import { Layout } from './components/Layout';
import { TaskInput } from './components/TaskInput';
import { TaskList } from './components/TaskList';
import { useTaskStore } from './store/taskStore';
import { updateTask as updateTaskOp } from './lib/taskOperations';
import { parseTaskInput } from './lib/parser';
import '@thatsit/ui/index.css';

export default function App() {
  const { dueToday, dueLater, loading, loadTasks, addTask, toggleTask, deleteTask, refreshTasks } = useTaskStore();

  // Auto-detect system theme preference
  useEffect(() => {
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    document.documentElement.setAttribute('data-theme', prefersDark ? 'dark' : 'light');

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = (e: MediaQueryListEvent) => {
      document.documentElement.setAttribute('data-theme', e.matches ? 'dark' : 'light');
    };
    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  }, []);

  useEffect(() => {
    loadTasks();
  }, [loadTasks]);

  const handleUpdate = async (id: string, newTitle: string) => {
    const parsed = parseTaskInput(newTitle);
    await updateTaskOp(id, {
      title: newTitle,
      displayTitle: parsed.displayTitle,
      tags: parsed.tags,
      dueDate: parsed.dueDate || undefined,
    });
    await refreshTasks();
  };

  if (loading) {
    return (
      <Layout>
        <div className="text-center py-12 text-[var(--text-muted)]">
          Loading tasks...
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <TaskInput onAdd={addTask} />
      <TaskList
        dueToday={dueToday}
        dueLater={dueLater}
        onToggle={toggleTask}
        onDelete={deleteTask}
        onUpdate={handleUpdate}
      />
    </Layout>
  );
}
