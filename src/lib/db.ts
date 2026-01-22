import Dexie, { type Table } from 'dexie';
import type { Task, SyncMeta } from './types';

export class TasksDatabase extends Dexie {
  tasks!: Table<Task, string>;
  syncMeta!: Table<SyncMeta, string>;

  constructor() {
    super('TasksDatabase');

    // Version 1: Initial schema
    this.version(1).stores({
      tasks: 'id, completed, dueDate, _syncStatus, deletedAt, createdAt, updatedAt, *tags',
      syncMeta: 'key',
    });
  }
}

export const db = new TasksDatabase();

/**
 * Serialization for sync backend
 */
export function serializeTask(task: Task): Record<string, unknown> {
  return {
    title: task.title,
    displayTitle: task.displayTitle,
    tags: task.tags,
    dueDate: task.dueDate?.toISOString(),
    completed: task.completed,
    completedAt: task.completedAt?.toISOString(),
    createdAt: task.createdAt.toISOString(),
    updatedAt: task.updatedAt.toISOString(),
    noteId: task.noteId,
    appType: task.appType,
  };
}

/**
 * Deserialization from sync backend
 */
export function deserializeTask(
  data: Record<string, unknown>,
  existing?: Task
): Partial<Task> {
  return {
    title: (data.title as string) || existing?.title || '',
    displayTitle: (data.displayTitle as string) || existing?.displayTitle || '',
    tags: (data.tags as string[]) || existing?.tags || [],
    dueDate: data.dueDate ? new Date(data.dueDate as string) : existing?.dueDate,
    completed: (data.completed as boolean) ?? existing?.completed ?? false,
    completedAt: data.completedAt ? new Date(data.completedAt as string) : existing?.completedAt,
    createdAt: data.createdAt ? new Date(data.createdAt as string) : existing?.createdAt || new Date(),
    updatedAt: data.updatedAt ? new Date(data.updatedAt as string) : new Date(),
    noteId: (data.noteId as string) || existing?.noteId,
    appType: ((data.appType as 'tasks' | 'notes') || existing?.appType || 'tasks'),
  };
}
