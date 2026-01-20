import Dexie, { type Table } from 'dexie';
import type { Syncable, SyncMeta } from './types';

/**
 * Example syncable entity.
 * Replace this with your app's entities.
 */
export interface Item extends Syncable {
  title: string;
  content: string;
  createdAt: Date;
  updatedAt: Date;
}

export class AppDatabase extends Dexie {
  items!: Table<Item, string>;
  syncMeta!: Table<SyncMeta, string>;

  constructor() {
    super('AppDatabase');

    // Version 1: Initial schema
    // All syncable tables need: id, _syncStatus, deletedAt indexes
    this.version(1).stores({
      items: 'id, _syncStatus, deletedAt, createdAt, updatedAt',
      syncMeta: 'key',
    });
  }
}

export const db = new AppDatabase();

/**
 * Serialization functions for sync.
 * Customize these for your entity types.
 */
export function serializeEntity(type: string, entity: Syncable): Record<string, unknown> {
  switch (type) {
    case 'items': {
      const item = entity as Item;
      return {
        title: item.title,
        content: item.content,
        createdAt: item.createdAt.toISOString(),
        updatedAt: item.updatedAt.toISOString(),
      };
    }
    default:
      throw new Error(`Unknown entity type: ${type}`);
  }
}

export function deserializeEntity(
  type: string,
  data: Record<string, unknown>,
  existing?: Syncable
): Partial<Syncable> {
  switch (type) {
    case 'items': {
      const existingItem = existing as Item | undefined;
      return {
        title: (data.title as string) || existingItem?.title || '',
        content: (data.content as string) || existingItem?.content || '',
        createdAt: data.createdAt ? new Date(data.createdAt as string) : existingItem?.createdAt || new Date(),
        updatedAt: data.updatedAt ? new Date(data.updatedAt as string) : new Date(),
      } as Partial<Item>;
    }
    default:
      throw new Error(`Unknown entity type: ${type}`);
  }
}
