/**
 * Sync configuration for this app.
 * Modify these values for your specific application.
 */
export const syncConfig = {
  /** Unique identifier for this app (used by sync server) */
  appId: 'tasks',

  /** Dexie table names that should be synced */
  tables: ['tasks'] as const,

  /** Map table names to sync API type names */
  tableToSyncType: {
    tasks: 'tasks',
  } as Record<string, string>,

  /** Default sync server URL */
  defaultSyncUrl: 'https://sync.thatsit.app',

  /** Sync interval in milliseconds */
  syncIntervalMs: 30000,
};

export type SyncableTable = (typeof syncConfig.tables)[number];

/** Get the sync API type name for a table */
export function getSyncType(tableName: string): string {
  return syncConfig.tableToSyncType[tableName] || tableName;
}
