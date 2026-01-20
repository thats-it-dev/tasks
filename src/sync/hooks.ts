import type Dexie from 'dexie';
import { syncConfig } from '../lib/syncConfig';
import type { SyncStatus } from '../lib/types';

/**
 * Initialize Dexie hooks for automatic sync status tracking.
 *
 * These hooks ensure that any entity modifications (even those bypassing
 * normal operations) are properly marked as pending for sync.
 *
 * Call this once during app initialization, after the database is created.
 */
export function initSyncHooks(db: Dexie): void {
  for (const tableName of syncConfig.tables) {
    const table = db.table(tableName);

    // Hook into entity creation
    table.hook('creating', (_primKey, obj) => {
      // Ensure sync fields are set for new entities
      if (!obj._syncStatus) {
        obj._syncStatus = 'pending';
      }
      if (!obj._localUpdatedAt) {
        obj._localUpdatedAt = new Date();
      }
    });

    // Hook into entity updates
    table.hook('updating', function (modifications) {
      // Skip if this is a sync-initiated update (marked as synced)
      const mods = modifications as Record<string, unknown>;
      const syncStatus = mods._syncStatus as SyncStatus | undefined;
      if (syncStatus === 'synced') {
        return;
      }

      // Mark as pending unless explicitly set otherwise
      return {
        _syncStatus: syncStatus || 'pending',
        _localUpdatedAt: new Date(),
      };
    });
  }
}

/**
 * Check if sync hooks are initialized.
 */
let hooksInitialized = false;

export function ensureSyncHooksInitialized(db: Dexie): void {
  if (!hooksInitialized) {
    initSyncHooks(db);
    hooksInitialized = true;
  }
}
