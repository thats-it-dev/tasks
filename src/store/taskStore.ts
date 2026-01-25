import { create } from 'zustand';
import type { Task } from '../lib/types';
import { addTask as addTaskOp, toggleTask as toggleTaskOp, deleteTask as deleteTaskOp, getTasksByDueDate, getArchivedTasks } from '../lib/taskOperations';

const SAVED_FILTERS_KEY = 'tasks-saved-filters';

function loadSavedFilters(): string[] {
  try {
    const stored = localStorage.getItem(SAVED_FILTERS_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

function persistSavedFilters(filters: string[]) {
  localStorage.setItem(SAVED_FILTERS_KEY, JSON.stringify(filters));
}

function matchesFilter(task: Task, filterTerms: string[]): boolean {
  if (filterTerms.length === 0) return true;

  const lowerTitle = task.displayTitle.toLowerCase();
  const lowerTags = task.tags.map(t => t.toLowerCase());

  // OR logic: task matches if ANY term matches
  return filterTerms.some(term => {
    const lowerTerm = term.toLowerCase().trim();
    if (!lowerTerm) return false;

    // Check if term matches any tag (with or without #)
    const tagTerm = lowerTerm.replace(/^#/, '');
    if (lowerTags.some(tag => tag.includes(tagTerm))) return true;

    // Check if term matches title text
    if (lowerTitle.includes(lowerTerm)) return true;

    return false;
  });
}

interface TaskStore {
  tasks: Task[];
  dueToday: Task[];
  dueLater: Task[];
  archivedTasks: Map<string, Task[]>;
  loading: boolean;

  // Filter state
  filterText: string;
  savedFilters: string[];

  // Actions
  loadTasks: () => Promise<void>;
  loadArchivedTasks: () => Promise<void>;
  addTask: (input: string) => Promise<void>;
  toggleTask: (id: string) => Promise<void>;
  deleteTask: (id: string) => Promise<void>;
  refreshTasks: () => Promise<void>;

  // Filter actions
  setFilterText: (text: string) => void;
  saveCurrentFilter: () => void;
  addFilter: (filter: string) => void;
  removeFilter: (filter: string) => void;
  clearFilters: () => void;

  // Filtered getters
  getFilteredDueToday: () => Task[];
  getFilteredDueLater: () => Task[];
  getFilteredArchivedTasks: () => Map<string, Task[]>;
}

export const useTaskStore = create<TaskStore>((set, get) => ({
  tasks: [],
  dueToday: [],
  dueLater: [],
  archivedTasks: new Map(),
  loading: false,

  // Filter state
  filterText: '',
  savedFilters: loadSavedFilters(),

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

  // Filter actions
  setFilterText: (text: string) => {
    set({ filterText: text });
  },

  saveCurrentFilter: () => {
    const { filterText, savedFilters } = get();
    // Split by comma and add each term as a separate filter
    const terms = filterText.split(',').map(t => t.trim()).filter(Boolean);
    const newTerms = terms.filter(t => !savedFilters.includes(t));
    if (newTerms.length > 0) {
      const newFilters = [...savedFilters, ...newTerms];
      persistSavedFilters(newFilters);
      set({ savedFilters: newFilters, filterText: '' });
    } else {
      set({ filterText: '' });
    }
  },

  addFilter: (filter: string) => {
    const { savedFilters } = get();
    const trimmed = filter.trim();
    if (trimmed && !savedFilters.includes(trimmed)) {
      const newFilters = [...savedFilters, trimmed];
      persistSavedFilters(newFilters);
      set({ savedFilters: newFilters });
    }
  },

  removeFilter: (filter: string) => {
    const { savedFilters } = get();
    const newFilters = savedFilters.filter(f => f !== filter);
    persistSavedFilters(newFilters);
    set({ savedFilters: newFilters });
  },

  clearFilters: () => {
    persistSavedFilters([]);
    set({ savedFilters: [], filterText: '' });
  },

  // Filtered getters
  getFilteredDueToday: () => {
    const { dueToday, filterText, savedFilters } = get();
    const allTerms = [
      ...filterText.split(',').map(t => t.trim()).filter(Boolean),
      ...savedFilters,
    ];
    if (allTerms.length === 0) return dueToday;
    return dueToday.filter(task => matchesFilter(task, allTerms));
  },

  getFilteredDueLater: () => {
    const { dueLater, filterText, savedFilters } = get();
    const allTerms = [
      ...filterText.split(',').map(t => t.trim()).filter(Boolean),
      ...savedFilters,
    ];
    if (allTerms.length === 0) return dueLater;
    return dueLater.filter(task => matchesFilter(task, allTerms));
  },

  loadArchivedTasks: async () => {
    const archived = await getArchivedTasks();
    set({ archivedTasks: archived });
  },

  getFilteredArchivedTasks: () => {
    const { archivedTasks, filterText, savedFilters } = get();
    const allTerms = [
      ...filterText.split(',').map(t => t.trim()).filter(Boolean),
      ...savedFilters,
    ];
    if (allTerms.length === 0) return archivedTasks;

    // Filter each date group
    const filtered = new Map<string, Task[]>();
    for (const [date, tasks] of archivedTasks) {
      const filteredTasks = tasks.filter(task => matchesFilter(task, allTerms));
      if (filteredTasks.length > 0) {
        filtered.set(date, filteredTasks);
      }
    }
    return filtered;
  },
}));
