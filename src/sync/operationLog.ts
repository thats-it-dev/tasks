/**
 * Operation log for crash recovery.
 *
 * Tracks in-flight sync operations so they can be recovered after a crash.
 * If an operation is found in the log on startup, it means the previous
 * session crashed mid-sync - the items are still 'pending' so will retry.
 */

interface Operation {
  id: string;
  type: 'push' | 'pull';
  startedAt: number;
  entityIds: string[];
}

const STORAGE_KEY = 'tasks_sync_operation_log';

export class OperationLog {
  private current: Operation | null = null;

  constructor() {
    // Check for orphaned operation from crash
    this.checkForOrphanedOperation();
  }

  private checkForOrphanedOperation(): void {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const op = JSON.parse(stored) as Operation;
        console.warn(
          `Found orphaned sync operation from crash: ${op.type} started at ${new Date(op.startedAt).toISOString()}, ` +
          `affecting ${op.entityIds.length} entities. Items remain pending and will retry on next sync.`
        );
        // Clear it - items are still 'pending' in IndexedDB so will retry
        localStorage.removeItem(STORAGE_KEY);
      }
    } catch (e) {
      console.error('Failed to check for orphaned operation:', e);
      localStorage.removeItem(STORAGE_KEY);
    }
  }

  /**
   * Start tracking an operation. Call before beginning push/pull.
   */
  start(type: 'push' | 'pull', entityIds: string[]): string {
    const id = `${type}-${Date.now()}`;
    this.current = {
      id,
      type,
      startedAt: Date.now(),
      entityIds,
    };
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.current));
    } catch (e) {
      console.error('Failed to save operation log:', e);
    }
    return id;
  }

  /**
   * Mark the current operation as complete. Call after successful push/pull.
   */
  complete(): void {
    this.current = null;
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (e) {
      console.error('Failed to clear operation log:', e);
    }
  }

  /**
   * Get the current operation (if any).
   */
  getCurrent(): Operation | null {
    return this.current;
  }
}
