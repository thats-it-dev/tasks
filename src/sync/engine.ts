import { SyncApiClient, type EntityChange, type ConflictInfo } from './api';
import { syncConfig, getSyncType } from '../lib/syncConfig';
import { v4 as uuidv4 } from 'uuid';
import type Dexie from 'dexie';
import type { Syncable, SyncMeta } from '../lib/types';
import { RetryQueue } from './retryQueue';
import { OperationLog } from './operationLog';

export type SyncStatus = 'idle' | 'syncing' | 'offline' | 'error';

export interface SyncResult {
  pushed: number;
  pulled: number;
  conflicts: ConflictInfo[];
}

type StatusChangeCallback = (status: SyncStatus) => void;
type AuthErrorCallback = () => void;
type SyncCompleteCallback = (result: SyncResult) => void;

/**
 * Generate a unique client ID for this device/browser.
 * Persisted in localStorage.
 */
function getClientId(): string {
  const key = 'sync_client_id';
  let clientId = localStorage.getItem(key);
  if (!clientId) {
    clientId = `client-${uuidv4()}`;
    localStorage.setItem(key, clientId);
  }
  return clientId;
}

/**
 * Configuration for the sync engine.
 */
export interface SyncEngineConfig {
  /** The Dexie database instance */
  db: Dexie;
  /** Function to serialize an entity for sync (entity type, entity) => sync data */
  serialize: (type: string, entity: Syncable) => Record<string, unknown>;
  /** Function to deserialize sync data into entity (entity type, data, existing?) => entity fields */
  deserialize: (type: string, data: Record<string, unknown>, existing?: Syncable) => Partial<Syncable>;
}

export class SyncEngine {
  private api: SyncApiClient | null = null;
  private status: SyncStatus = 'idle';
  private statusCallbacks: Set<StatusChangeCallback> = new Set();
  private authErrorCallbacks: Set<AuthErrorCallback> = new Set();
  private syncCompleteCallbacks: Set<SyncCompleteCallback> = new Set();
  private syncInterval: ReturnType<typeof setInterval> | null = null;
  private clientId: string;
  private config: SyncEngineConfig | null = null;
  private retryQueue: RetryQueue;
  private operationLog: OperationLog;
  private currentSyncPromise: Promise<SyncResult> | null = null;

  constructor() {
    this.clientId = getClientId();
    this.retryQueue = new RetryQueue(() => this.syncNow());
    this.operationLog = new OperationLog();
  }

  /**
   * Configure the sync engine with database and serialization functions.
   */
  configure(config: SyncEngineConfig): void {
    this.config = config;
  }

  /**
   * Initialize the sync engine with an auth token.
   */
  init(syncUrl: string, getToken: () => string | null): void {
    this.api = new SyncApiClient(syncUrl, getToken);
  }

  /**
   * Start background sync with the given interval.
   */
  start(intervalMs = syncConfig.syncIntervalMs): void {
    if (this.syncInterval) {
      this.stop();
    }

    // Initial sync
    this.syncNow().catch(console.error);

    // Set up periodic sync
    this.syncInterval = setInterval(() => {
      this.syncNow().catch(console.error);
    }, intervalMs);
  }

  /**
   * Stop background sync.
   */
  stop(): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
  }

  /**
   * Force a full sync by clearing the sync token.
   * This will re-fetch all data from the server.
   * Waits for any in-progress sync to complete first.
   */
  async forceFullSync(): Promise<SyncResult> {
    if (!this.config) {
      throw new Error('SyncEngine not configured');
    }

    // Wait for any in-progress sync to complete first
    if (this.currentSyncPromise) {
      try {
        await this.currentSyncPromise;
      } catch {
        // Ignore errors from previous sync - we're forcing a new one
      }
    }

    // Check if we're offline before attempting sync
    if (!navigator.onLine) {
      this.setStatus('offline');
      return { pushed: 0, pulled: 0, conflicts: [] };
    }

    // Clear the sync token to force a full pull
    const syncMeta = this.config.db.table<SyncMeta, string>('syncMeta');
    await syncMeta.delete('lastSyncToken');

    // Create new sync promise for the full sync
    this.setStatus('syncing');
    this.currentSyncPromise = this.performSync();

    try {
      return await this.currentSyncPromise;
    } finally {
      this.currentSyncPromise = null;
    }
  }

  /**
   * Perform a sync immediately.
   * If a sync is already in progress, returns the existing promise.
   */
  async syncNow(): Promise<SyncResult> {
    if (!this.api) {
      throw new Error('SyncEngine not initialized');
    }

    if (!this.config) {
      throw new Error('SyncEngine not configured');
    }

    // If sync is in progress, return the existing promise so callers can await it
    if (this.currentSyncPromise) {
      return this.currentSyncPromise;
    }

    // Check if we're offline before attempting sync
    if (!navigator.onLine) {
      this.setStatus('offline');
      return { pushed: 0, pulled: 0, conflicts: [] };
    }

    this.setStatus('syncing');

    this.currentSyncPromise = this.performSync();

    try {
      return await this.currentSyncPromise;
    } finally {
      this.currentSyncPromise = null;
    }
  }

  /**
   * Internal sync implementation.
   */
  private async performSync(): Promise<SyncResult> {
    try {
      // 1. Push local changes
      const pushResult = await this.pushChanges();

      // 2. Pull remote changes
      const pullResult = await this.pullChanges();

      // Clear retry queue on success
      this.retryQueue.recordSuccess();

      this.setStatus('idle');

      const result = {
        pushed: pushResult.pushed,
        pulled: pullResult.pulled,
        conflicts: pushResult.conflicts,
      };

      // Notify listeners that sync completed
      this.notifySyncComplete(result);

      return result;
    } catch (error) {
      console.error('Sync error:', error);

      // Schedule retry with exponential backoff
      this.retryQueue.recordFailure();

      if (error instanceof Error) {
        if (error.message === 'Not authenticated' || error.message === 'Authentication expired') {
          this.setStatus('error');
          this.notifyAuthError();
        } else if (!navigator.onLine) {
          this.setStatus('offline');
        } else {
          this.setStatus('error');
        }
      }

      throw error;
    }
  }

  /**
   * Push local pending changes to the server.
   */
  private async pushChanges(): Promise<{ pushed: number; conflicts: ConflictInfo[] }> {
    if (!this.api || !this.config) {
      throw new Error('SyncEngine not initialized or configured');
    }

    const { db, serialize } = this.config;
    const changes: EntityChange[] = [];

    // Gather pending changes from all configured tables
    for (const tableName of syncConfig.tables) {
      const table = db.table(tableName);
      const syncType = getSyncType(tableName);
      const pendingEntities = await table
        .where('_syncStatus')
        .equals('pending')
        .toArray();

      for (const entity of pendingEntities) {
        if (entity.deletedAt) {
          changes.push({
            type: syncType,
            operation: 'delete',
            id: entity.id,
            deletedAt: entity.deletedAt.toISOString(),
          });
        } else {
          const data = serialize(tableName, entity);
          changes.push({
            type: syncType,
            operation: 'upsert',
            data: {
              id: entity.id,
              ...data,
              updatedAt: entity._localUpdatedAt.toISOString(),
            },
          });
        }
      }
    }

    if (changes.length === 0) {
      return { pushed: 0, conflicts: [] };
    }

    // Generate idempotency key for this batch
    const idempotencyKey = `${this.clientId}-${Date.now()}-${uuidv4()}`;

    // Track operation for crash recovery
    const entityIds = changes.map(c => c.operation === 'delete' ? c.id : c.data.id);
    this.operationLog.start('push', entityIds);

    // Push to server
    const result = await this.api.pushChanges({
      changes,
      clientId: this.clientId,
      idempotencyKey,
    });

    // Mark applied entities as synced
    for (const tableName of syncConfig.tables) {
      const table = db.table(tableName);
      const syncType = getSyncType(tableName);
      const appliedIds = result.applied.filter((id) =>
        changes.some((c) => c.type === syncType && (c.operation === 'delete' ? c.id : c.data.id) === id)
      );

      if (appliedIds.length > 0) {
        await table
          .where('id')
          .anyOf(appliedIds)
          .modify({ _syncStatus: 'synced' });
      }
    }

    // Handle conflicts
    for (const conflict of result.conflicts) {
      for (const tableName of syncConfig.tables) {
        const table = db.table(tableName);
        const entity = await table.get(conflict.id);
        if (entity) {
          await table.update(conflict.id, { _syncStatus: 'conflict' });
          break;
        }
      }
    }

    // NOTE: Do NOT update sync token here. The sync token should only be updated
    // by pullChanges() to avoid skipping changes from other devices. The clientId
    // parameter in pullChanges() already ensures we don't re-pull our own changes.

    // Mark operation complete
    this.operationLog.complete();

    return { pushed: result.applied.length, conflicts: result.conflicts };
  }

  /**
   * Pull remote changes from the server.
   */
  private async pullChanges(): Promise<{ pulled: number }> {
    if (!this.api || !this.config) {
      throw new Error('SyncEngine not initialized or configured');
    }

    const { db, deserialize } = this.config;
    const syncMeta = db.table<SyncMeta, string>('syncMeta');

    // Get last sync token
    const lastSyncMeta = await syncMeta.get('lastSyncToken');
    const since = lastSyncMeta?.value;

    // Convert table names to sync types for the API request
    const syncTypes = syncConfig.tables.map(t => getSyncType(t));

    // Fetch changes from server
    const result = await this.api.getChanges(syncTypes, since, this.clientId);

    let pulled = 0;

    // Apply remote changes for each table
    for (const tableName of syncConfig.tables) {
      // Use sync type to read from response
      const syncType = getSyncType(tableName);
      const tableChanges = result.changes[syncType] || [];
      const table = db.table(tableName);

      for (const change of tableChanges) {
        if (change.operation === 'delete') {
          // Mark entity as deleted locally
          const existing = await table.get(change.id);
          if (existing) {
            await table.update(change.id, {
              deletedAt: change.deletedAt ? new Date(change.deletedAt) : new Date(),
              _syncStatus: 'synced',
            });
            pulled++;
          }
        } else if (change.operation === 'upsert' && change.data) {
          // Check if we have a local pending change
          const existing = await table.get(change.id);

          if (existing && existing._syncStatus === 'pending') {
            // Skip - local changes take precedence until synced
            continue;
          }

          // Deserialize and apply
          const entityData = deserialize(tableName, change.data, existing);
          const updatedAt = new Date(change.data.updatedAt as string);

          if (existing) {
            await table.update(change.id, {
              ...entityData,
              _syncStatus: 'synced',
              _localUpdatedAt: updatedAt,
            });
          } else {
            await table.put({
              id: change.id,
              ...entityData,
              _syncStatus: 'synced',
              _localUpdatedAt: updatedAt,
            });
          }
          pulled++;
        }
      }
    }

    // Update sync token
    if (result.syncToken) {
      await syncMeta.put({ key: 'lastSyncToken', value: result.syncToken });
    }

    return { pulled };
  }

  /**
   * Get the current sync status.
   */
  getStatus(): SyncStatus {
    return this.status;
  }

  /**
   * Subscribe to status changes.
   */
  onStatusChange(callback: StatusChangeCallback): () => void {
    this.statusCallbacks.add(callback);
    return () => {
      this.statusCallbacks.delete(callback);
    };
  }

  private setStatus(status: SyncStatus): void {
    this.status = status;
    this.statusCallbacks.forEach((cb) => cb(status));
  }

  /**
   * Subscribe to auth errors (e.g., token expiry).
   */
  onAuthError(callback: AuthErrorCallback): () => void {
    this.authErrorCallbacks.add(callback);
    return () => {
      this.authErrorCallbacks.delete(callback);
    };
  }

  private notifyAuthError(): void {
    this.authErrorCallbacks.forEach((cb) => cb());
  }

  /**
   * Subscribe to sync completion events.
   * Called after each successful sync with the result.
   */
  onSyncComplete(callback: SyncCompleteCallback): () => void {
    this.syncCompleteCallbacks.add(callback);
    return () => {
      this.syncCompleteCallbacks.delete(callback);
    };
  }

  private notifySyncComplete(result: SyncResult): void {
    this.syncCompleteCallbacks.forEach((cb) => cb(result));
  }
}

// Singleton instance
export const syncEngine = new SyncEngine();
