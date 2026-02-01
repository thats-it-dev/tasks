import { v4 as uuidv4 } from 'uuid';
import { db } from './db';
import { parseTaskInput } from './parser';
import type { Task } from './types';

/**
 * Create a new task from natural language input
 */
export async function addTask(input: string): Promise<Task> {
  const parsed = parseTaskInput(input);
  const now = new Date();

  const task: Task = {
    id: uuidv4(),
    title: input,
    displayTitle: parsed.displayTitle,
    tags: parsed.tags,
    dueDate: parsed.dueDate || undefined,
    completed: false,
    createdAt: now,
    updatedAt: now,
    _syncStatus: 'pending',
    _localUpdatedAt: now,
    appType: 'tasks',
  };

  await db.tasks.add(task);
  return task;
}

/**
 * Toggle task completion status
 */
export async function toggleTask(id: string): Promise<Task> {
  const task = await db.tasks.get(id);
  if (!task) {
    throw new Error(`Task not found: ${id}`);
  }

  const now = new Date();
  const updates: Partial<Task> = {
    completed: !task.completed,
    completedAt: !task.completed ? now : undefined,
    updatedAt: now,
    _syncStatus: 'pending',
    _localUpdatedAt: now,
  };

  await db.tasks.update(id, updates);
  return { ...task, ...updates };
}

/**
 * Update task fields
 */
export async function updateTask(id: string, updates: Partial<Task>): Promise<Task> {
  const task = await db.tasks.get(id);
  if (!task) {
    throw new Error(`Task not found: ${id}`);
  }

  const now = new Date();
  const fullUpdates: Partial<Task> = {
    ...updates,
    updatedAt: now,
    _syncStatus: 'pending',
    _localUpdatedAt: now,
  };

  await db.tasks.update(id, fullUpdates);
  return { ...task, ...fullUpdates };
}

/**
 * Soft delete a task
 */
export async function deleteTask(id: string): Promise<void> {
  const now = new Date();
  await db.tasks.update(id, {
    deletedAt: now,
    updatedAt: now,
    _syncStatus: 'pending',
    _localUpdatedAt: now,
  });
}

/**
 * Get all non-deleted tasks
 */
export async function getAllTasks(): Promise<Task[]> {
  return db.tasks
    .filter(task => !task.deletedAt)
    .toArray();
}

/**
 * Get tasks grouped by due date
 *
 * Due Today shows:
 * - Tasks due today (always, regardless of completion date)
 * - Overdue tasks that are incomplete OR completed today
 * - Tasks with no due date that are incomplete OR completed today
 */
export async function getTasksByDueDate(): Promise<{
  dueToday: Task[];
  dueLater: Task[];
}> {
  const tasks = await getAllTasks();
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  // Helper to check if task was completed on a previous day
  const wasCompletedOnPreviousDay = (task: Task): boolean => {
    if (!task.completed || !task.completedAt) return false;
    // Handle both Date objects and ISO strings from IndexedDB
    const completedDate = new Date(
      task.completedAt instanceof Date ? task.completedAt : String(task.completedAt)
    );
    if (isNaN(completedDate.getTime())) return false;
    completedDate.setHours(0, 0, 0, 0);
    return completedDate.getTime() < today.getTime();
  };

  const dueToday = tasks.filter(task => {
    if (task.dueDate) {
      const dueDate = new Date(task.dueDate);
      dueDate.setHours(0, 0, 0, 0);
      // Due today: show if incomplete OR completed today (not on a previous day)
      if (dueDate.getTime() === today.getTime()) return !wasCompletedOnPreviousDay(task);
      // Overdue: show if incomplete OR completed today
      if (dueDate < today) return !wasCompletedOnPreviousDay(task);
      return false;
    }
    // No due date: show if incomplete OR completed today (not on a previous day)
    return !wasCompletedOnPreviousDay(task);
  });

  const dueLater = tasks.filter(task => {
    if (!task.dueDate) return false;
    const dueDate = new Date(task.dueDate);
    dueDate.setHours(0, 0, 0, 0);
    return dueDate >= tomorrow;
  });

  // Sort: uncompleted first, then by due date, then by created date
  const sortTasks = (a: Task, b: Task) => {
    if (a.completed !== b.completed) {
      return a.completed ? 1 : -1; // Uncompleted first
    }
    if (a.completed) {
      // Both completed: sort by completion date (most recent first)
      return (b.completedAt?.getTime() || 0) - (a.completedAt?.getTime() || 0);
    }
    // Both uncompleted: sort by due date, then created date
    if (a.dueDate && b.dueDate) {
      const dueDiff = new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
      if (dueDiff !== 0) return dueDiff;
    }
    if (a.dueDate && !b.dueDate) return -1;
    if (!a.dueDate && b.dueDate) return 1;
    return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
  };

  return {
    dueToday: dueToday.sort(sortTasks),
    dueLater: dueLater.sort(sortTasks),
  };
}

/**
 * Get archived tasks grouped by completion date
 *
 * Archive shows tasks that are:
 * - Completed on a previous day AND not due today
 */
export async function getArchivedTasks(): Promise<Map<string, Task[]>> {
  const tasks = await getAllTasks();
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const archived = tasks.filter(task => {
    // Must be completed with a completion date
    if (!task.completed || !task.completedAt) return false;

    const completedDate = new Date(task.completedAt);
    completedDate.setHours(0, 0, 0, 0);

    // Must be completed on a previous day (not today)
    if (completedDate.getTime() >= today.getTime()) return false;

    // Tasks due today stay in main view, not archive
    if (task.dueDate) {
      const dueDate = new Date(task.dueDate);
      dueDate.setHours(0, 0, 0, 0);
      if (dueDate.getTime() === today.getTime()) return false;
    }

    return true;
  });

  // Group by completion date
  const grouped = new Map<string, Task[]>();

  for (const task of archived) {
    const completedDate = new Date(task.completedAt!);
    const dateKey = completedDate.toISOString().split('T')[0]; // YYYY-MM-DD

    if (!grouped.has(dateKey)) {
      grouped.set(dateKey, []);
    }
    grouped.get(dateKey)!.push(task);
  }

  // Sort tasks within each group by completedAt descending
  for (const tasks of grouped.values()) {
    tasks.sort((a, b) => (b.completedAt?.getTime() || 0) - (a.completedAt?.getTime() || 0));
  }

  // Return map with keys sorted newest first
  const sortedKeys = Array.from(grouped.keys()).sort((a, b) => b.localeCompare(a));
  const sortedMap = new Map<string, Task[]>();
  for (const key of sortedKeys) {
    sortedMap.set(key, grouped.get(key)!);
  }

  return sortedMap;
}
