import { create } from 'zustand';
import { syncEngine, type SyncStatus } from '../sync/engine';
import { syncConfig } from '../lib/syncConfig';
import { db, serializeTask, deserializeTask } from '../lib/db';
import type { Syncable } from '../lib/types';
import { ensureSyncHooksInitialized } from '../sync/hooks';

// Configure sync engine with database and serialization
syncEngine.configure({
  db,
  serialize: (_type: string, entity: Syncable) => serializeTask(entity as Parameters<typeof serializeTask>[0]),
  deserialize: (_type: string, data: Record<string, unknown>, existing?: Syncable) =>
    deserializeTask(data, existing as Parameters<typeof deserializeTask>[1]),
});

const SYNC_URL_KEY = 'syncUrl';
const AUTH_TOKEN_KEY = 'authToken';
const REFRESH_TOKEN_KEY = 'refreshToken';

interface SyncStore {
  status: SyncStatus;
  isEnabled: boolean;

  // Actions
  enable: (syncUrl: string, accessToken: string, refreshToken: string) => void;
  disable: () => Promise<void>;
  syncNow: () => Promise<void>;
  forceFullSync: () => Promise<void>;
  initialize: () => Promise<void>;
  onSyncComplete: (callback: () => void) => () => void;
}

// Prevent concurrent refresh attempts (token rotation means old token is invalidated)
let refreshPromise: Promise<{ accessToken: string; refreshToken: string } | null> | null = null;

async function refreshAccessToken(
  syncUrl: string,
  refreshToken: string
): Promise<{ accessToken: string; refreshToken: string } | null> {
  // If a refresh is already in progress, wait for it
  if (refreshPromise) {
    return refreshPromise;
  }

  refreshPromise = (async () => {
    try {
      const response = await fetch(`${syncUrl}/api/v1/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh_token: refreshToken }),
      });

      if (!response.ok) {
        return null;
      }

      const data = await response.json();
      return {
        accessToken: data.access_token,
        refreshToken: data.refresh_token,
      };
    } catch {
      return null;
    } finally {
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}

export const useSyncStore = create<SyncStore>((set, get) => ({
  status: 'idle',
  isEnabled: false,

  enable: (syncUrl: string, accessToken: string, refreshToken: string) => {
    localStorage.setItem(SYNC_URL_KEY, syncUrl);
    localStorage.setItem(AUTH_TOKEN_KEY, accessToken);
    localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
    syncEngine.init(syncUrl, () => localStorage.getItem(AUTH_TOKEN_KEY));
    syncEngine.start(syncConfig.syncIntervalMs);
    set({ isEnabled: true });
  },

  disable: async () => {
    syncEngine.stop();
    localStorage.removeItem(SYNC_URL_KEY);
    localStorage.removeItem(AUTH_TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
    await db.syncMeta.delete('lastSyncToken');
    set({ isEnabled: false, status: 'idle' });
  },

  syncNow: async () => {
    await syncEngine.syncNow();
  },

  forceFullSync: async () => {
    await syncEngine.forceFullSync();
  },

  onSyncComplete: (callback: () => void) => {
    return syncEngine.onSyncComplete(() => callback());
  },

  initialize: async () => {
    // Initialize sync hooks to track local changes
    ensureSyncHooksInitialized(db);

    // Subscribe to status changes
    syncEngine.onStatusChange((status) => set({ status }));

    // Handle auth errors
    syncEngine.onAuthError(async () => {
      const syncUrl = localStorage.getItem(SYNC_URL_KEY);
      const refreshToken = localStorage.getItem(REFRESH_TOKEN_KEY);

      if (syncUrl && refreshToken) {
        const tokens = await refreshAccessToken(syncUrl, refreshToken);
        if (tokens) {
          localStorage.setItem(AUTH_TOKEN_KEY, tokens.accessToken);
          localStorage.setItem(REFRESH_TOKEN_KEY, tokens.refreshToken);
          syncEngine.syncNow().catch(console.error);
          return;
        }
      }

      // Refresh failed - disable sync
      await get().disable();
    });

    // Check for existing sync config
    const syncUrl = localStorage.getItem(SYNC_URL_KEY);
    const refreshToken = localStorage.getItem(REFRESH_TOKEN_KEY);

    if (syncUrl && refreshToken) {
      const tokens = await refreshAccessToken(syncUrl, refreshToken);
      if (tokens) {
        localStorage.setItem(AUTH_TOKEN_KEY, tokens.accessToken);
        localStorage.setItem(REFRESH_TOKEN_KEY, tokens.refreshToken);
        syncEngine.init(syncUrl, () => localStorage.getItem(AUTH_TOKEN_KEY));
        syncEngine.start(syncConfig.syncIntervalMs);
        set({ isEnabled: true });
      } else {
        // Refresh failed - clear credentials
        localStorage.removeItem(AUTH_TOKEN_KEY);
        localStorage.removeItem(REFRESH_TOKEN_KEY);
        localStorage.removeItem(SYNC_URL_KEY);
      }
    }
  },
}));
