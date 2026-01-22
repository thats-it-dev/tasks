import { useEffect } from 'react';
import { Layout } from './components/Layout';
import { TaskInput } from './components/TaskInput';
import { TaskList } from './components/TaskList';
import { useTaskStore } from './store/taskStore';
import { updateTask as updateTaskOp } from './lib/taskOperations';
import { parseTaskInput } from './lib/parser';

export default function App() {
  const { dueToday, dueLater, loading, loadTasks, addTask, toggleTask, deleteTask, refreshTasks } = useTaskStore();

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
        <div className="text-center py-12 text-gray-500">
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
