/**
 * Sync configuration for this app.
 * Modify these values for your specific application.
 */
export const syncConfig = {
  /** Unique identifier for this app (used by sync server) */
  appId: 'my-app',

  /** Dexie table names that should be synced */
  tables: ['items'] as const,

  /** Default sync server URL */
  defaultSyncUrl: 'https://sync.thatsit.app',

  /** Sync interval in milliseconds */
  syncIntervalMs: 30000,
};

export type SyncableTable = (typeof syncConfig.tables)[number];
