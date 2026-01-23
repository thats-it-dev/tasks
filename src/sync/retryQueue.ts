/**
 * Retry queue with exponential backoff for failed sync operations.
 * Persists state to localStorage to survive page reloads.
 */

interface RetryState {
  attemptCount: number;
  lastAttempt: number;
  nextAttempt: number;
}

const BACKOFF_MS = [1000, 5000, 15000, 60000, 300000]; // 1s, 5s, 15s, 1m, 5m
const MAX_RETRIES = 5;
const STORAGE_KEY = 'tasks_sync_retry_state';

export class RetryQueue {
  private state: RetryState | null = null;
  private timer: ReturnType<typeof setTimeout> | null = null;
  private onRetry: () => Promise<unknown>;

  constructor(onRetry: () => Promise<unknown>) {
    this.onRetry = onRetry;
    this.loadState();
  }

  private loadState(): void {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        this.state = JSON.parse(stored);
        this.scheduleRetry();
      }
    } catch (e) {
      console.error('Failed to load retry state:', e);
    }
  }

  private saveState(): void {
    try {
      if (this.state) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(this.state));
      } else {
        localStorage.removeItem(STORAGE_KEY);
      }
    } catch (e) {
      console.error('Failed to save retry state:', e);
    }
  }

  /**
   * Record a sync failure and schedule a retry with exponential backoff.
   */
  recordFailure(): void {
    const now = Date.now();
    const attempt = this.state ? this.state.attemptCount + 1 : 1;

    if (attempt > MAX_RETRIES) {
      console.error(`Max sync retries (${MAX_RETRIES}) exceeded. Manual sync required.`);
      // Keep state so we know retries were exhausted, but don't schedule more
      return;
    }

    const backoff = BACKOFF_MS[Math.min(attempt - 1, BACKOFF_MS.length - 1)];
    this.state = {
      attemptCount: attempt,
      lastAttempt: now,
      nextAttempt: now + backoff,
    };
    this.saveState();
    this.scheduleRetry();

    console.log(`Sync failed. Retry ${attempt}/${MAX_RETRIES} scheduled in ${backoff}ms`);
  }

  /**
   * Record a successful sync and clear the retry state.
   */
  recordSuccess(): void {
    this.state = null;
    this.saveState();
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
  }

  /**
   * Check if retries have been exhausted.
   */
  isExhausted(): boolean {
    return this.state !== null && this.state.attemptCount >= MAX_RETRIES;
  }

  /**
   * Get the current retry count.
   */
  getAttemptCount(): number {
    return this.state?.attemptCount ?? 0;
  }

  /**
   * Reset the retry state (e.g., for manual retry).
   */
  reset(): void {
    this.state = null;
    this.saveState();
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
  }

  private scheduleRetry(): void {
    if (!this.state || this.timer) return;
    if (this.state.attemptCount >= MAX_RETRIES) return;

    const delay = Math.max(0, this.state.nextAttempt - Date.now());
    this.timer = setTimeout(async () => {
      this.timer = null;
      try {
        await this.onRetry();
        this.recordSuccess();
      } catch {
        // recordFailure will be called by the sync engine
      }
    }, delay);
  }
}
