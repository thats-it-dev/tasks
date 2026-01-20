export type SyncStatus = 'synced' | 'pending' | 'conflict';

/**
 * Base interface for syncable entities.
 * All Dexie tables that participate in sync should extend this.
 */
export interface Syncable {
  id: string;
  _syncStatus: SyncStatus;
  _localUpdatedAt: Date;
  deletedAt?: Date;
}

/**
 * Sync metadata stored in IndexedDB.
 */
export interface SyncMeta {
  key: string;
  value: string;
}
