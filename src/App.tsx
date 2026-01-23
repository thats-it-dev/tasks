import { useEffect } from 'react';
import { Layout } from './components/Layout';
import { AuthPanel } from './components/AuthPanel';
import { TaskList } from './components/TaskList';
import { CommandPalette } from './components/CommandPalette';
import { CommandButton } from './components/CommandButton';
import { useTaskStore } from './store/taskStore';
import { useSyncStore } from './store/syncStore';
import { updateTask as updateTaskOp } from './lib/taskOperations';
import { parseTaskInput } from './lib/parser';
import '@thatsit/ui/index.css';

export default function App() {
  const { dueToday, dueLater, loading, loadTasks, toggleTask, deleteTask, refreshTasks } = useTaskStore();
  const { initialize, onSyncComplete } = useSyncStore();

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
    initialize();
  }, [initialize]);

  useEffect(() => {
    loadTasks();
  }, [loadTasks]);

  // Refresh tasks when sync pulls new data from server
  useEffect(() => {
    const unsubscribe = onSyncComplete(() => {
      refreshTasks();
    });
    return unsubscribe;
  }, [onSyncComplete, refreshTasks]);

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
      <AuthPanel />
      <TaskList
        dueToday={dueToday}
        dueLater={dueLater}
        onToggle={toggleTask}
        onDelete={deleteTask}
        onUpdate={handleUpdate}
      />
      <CommandPalette />
      <CommandButton />
    </Layout>
  );
}
