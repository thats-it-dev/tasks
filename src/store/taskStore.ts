import { create } from 'zustand';
import type { Task } from '../lib/types';
import { addTask as addTaskOp, toggleTask as toggleTaskOp, deleteTask as deleteTaskOp, getTasksByDueDate } from '../lib/taskOperations';

interface TaskStore {
  tasks: Task[];
  dueToday: Task[];
  dueLater: Task[];
  loading: boolean;

  // Actions
  loadTasks: () => Promise<void>;
  addTask: (input: string) => Promise<void>;
  toggleTask: (id: string) => Promise<void>;
  deleteTask: (id: string) => Promise<void>;
  refreshTasks: () => Promise<void>;
}

export const useTaskStore = create<TaskStore>((set, get) => ({
  tasks: [],
  dueToday: [],
  dueLater: [],
  loading: false,

  loadTasks: async () => {
    set({ loading: true });
    try {
      const { dueToday, dueLater } = await getTasksByDueDate();
      set({
        tasks: [...dueToday, ...dueLater],
        dueToday,
        dueLater,
        loading: false,
      });
    } catch (error) {
      console.error('Failed to load tasks:', error);
      set({ loading: false });
    }
  },

  addTask: async (input: string) => {
    await addTaskOp(input);
    await get().refreshTasks();
  },

  toggleTask: async (id: string) => {
    await toggleTaskOp(id);
    await get().refreshTasks();
  },

  deleteTask: async (id: string) => {
    await deleteTaskOp(id);
    await get().refreshTasks();
  },

  refreshTasks: async () => {
    const { dueToday, dueLater } = await getTasksByDueDate();
    set({
      tasks: [...dueToday, ...dueLater],
      dueToday,
      dueLater,
    });
  },
}));
