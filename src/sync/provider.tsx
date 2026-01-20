import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { syncEngine, type SyncStatus } from './engine';
import { ensureSyncHooksInitialized } from './hooks';
import { syncConfig } from '../lib/syncConfig';
import type Dexie from 'dexie';

interface SyncContextValue {
  status: SyncStatus;
  isEnabled: boolean;
  syncNow: () => Promise<void>;
  enable: (syncUrl: string, accessToken: string, refreshToken: string) => void;
  disable: () => void;
}

const SyncContext = createContext<SyncContextValue | null>(null);

const SYNC_URL_KEY = 'syncUrl';
const AUTH_TOKEN_KEY = 'authToken';
const REFRESH_TOKEN_KEY = 'refreshToken';

/**
 * Refresh the access token using the refresh token.
 * Returns the new tokens if successful, null otherwise.
 */
async function refreshAccessToken(
  syncUrl: string,
  refreshToken: string
): Promise<{ accessToken: string; refreshToken: string } | null> {
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
  }
}

interface SyncProviderProps {
  children: React.ReactNode;
  /** The Dexie database instance */
  db: Dexie;
}

export function SyncProvider({ children, db }: SyncProviderProps) {
  const [status, setStatus] = useState<SyncStatus>('idle');
  const [isEnabled, setIsEnabled] = useState(false);

  // Initialize sync hooks on mount
  useEffect(() => {
    ensureSyncHooksInitialized(db);
  }, [db]);

  // Check for existing sync config on mount and refresh token
  useEffect(() => {
    const syncUrl = localStorage.getItem(SYNC_URL_KEY);
    const refreshToken = localStorage.getItem(REFRESH_TOKEN_KEY);

    if (syncUrl && refreshToken) {
      // Refresh the access token on startup to ensure we have a valid token
      refreshAccessToken(syncUrl, refreshToken).then((tokens) => {
        if (tokens) {
          // Store the new tokens
          localStorage.setItem(AUTH_TOKEN_KEY, tokens.accessToken);
          localStorage.setItem(REFRESH_TOKEN_KEY, tokens.refreshToken);

          // Initialize and start sync
          syncEngine.init(syncUrl, () => localStorage.getItem(AUTH_TOKEN_KEY));
          syncEngine.start(syncConfig.syncIntervalMs);
          setIsEnabled(true);
        } else {
          // Refresh failed - clear credentials
          localStorage.removeItem(AUTH_TOKEN_KEY);
          localStorage.removeItem(REFRESH_TOKEN_KEY);
          localStorage.removeItem(SYNC_URL_KEY);
        }
      });
    }

    return () => {
      syncEngine.stop();
    };
  }, []);

  // Subscribe to status changes
  useEffect(() => {
    return syncEngine.onStatusChange(setStatus);
  }, []);

  // Handle auth errors (token expiry) - try to refresh before logging out
  useEffect(() => {
    return syncEngine.onAuthError(async () => {
      const syncUrl = localStorage.getItem(SYNC_URL_KEY);
      const refreshToken = localStorage.getItem(REFRESH_TOKEN_KEY);

      if (syncUrl && refreshToken) {
        const tokens = await refreshAccessToken(syncUrl, refreshToken);
        if (tokens) {
          // Refresh succeeded - store new tokens and retry sync
          localStorage.setItem(AUTH_TOKEN_KEY, tokens.accessToken);
          localStorage.setItem(REFRESH_TOKEN_KEY, tokens.refreshToken);
          // Retry sync with new token
          syncEngine.syncNow().catch(console.error);
          return;
        }
      }

      // Refresh failed - clear credentials and disable sync
      localStorage.removeItem(AUTH_TOKEN_KEY);
      localStorage.removeItem(REFRESH_TOKEN_KEY);
      localStorage.removeItem(SYNC_URL_KEY);
      setIsEnabled(false);
      syncEngine.stop();
    });
  }, []);

  // Sync on window focus
  useEffect(() => {
    if (!isEnabled) return;

    const onFocus = () => {
      syncEngine.syncNow().catch(console.error);
    };

    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, [isEnabled]);

  const value = useMemo<SyncContextValue>(
    () => ({
      status,
      isEnabled,
      syncNow: async () => {
        await syncEngine.syncNow();
      },
      enable: (syncUrl: string, accessToken: string, refreshToken: string) => {
        localStorage.setItem(SYNC_URL_KEY, syncUrl);
        localStorage.setItem(AUTH_TOKEN_KEY, accessToken);
        localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
        syncEngine.init(syncUrl, () => localStorage.getItem(AUTH_TOKEN_KEY));
        syncEngine.start(syncConfig.syncIntervalMs);
        setIsEnabled(true);
      },
      disable: async () => {
        syncEngine.stop();
        localStorage.removeItem(SYNC_URL_KEY);
        localStorage.removeItem(AUTH_TOKEN_KEY);
        localStorage.removeItem(REFRESH_TOKEN_KEY);
        // Clear sync token so next login does a full sync
        const syncMeta = db.table('syncMeta');
        await syncMeta.delete('lastSyncToken');
        setIsEnabled(false);
        setStatus('idle');
      },
    }),
    [status, isEnabled, db]
  );

  return <SyncContext.Provider value={value}>{children}</SyncContext.Provider>;
}

export function useSync(): SyncContextValue {
  const context = useContext(SyncContext);
  if (!context) {
    throw new Error('useSync must be used within a SyncProvider');
  }
  return context;
}

export function useSyncStatus(): SyncStatus {
  const { status } = useSync();
  return status;
}
