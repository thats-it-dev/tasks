/**
 * API client for sync endpoints.
 */

// Auth types
export interface AuthStartResponse {
  action: 'signup' | 'signin';
  email: string;
}

export interface AuthUser {
  id: string;
  username: string;
  email: string;
}

export interface TokenResponse {
  access_token: string;
  refresh_token: string;
  user?: AuthUser;
}

// Auth functions (no token required)
export async function authStart(
  baseUrl: string,
  email: string,
  appId: string
): Promise<AuthStartResponse> {
  const response = await fetch(`${baseUrl}/api/v1/auth/start`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, app_id: appId }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Request failed' }));
    throw new Error(error.detail || 'Request failed');
  }

  return response.json();
}

export async function authSignup(
  baseUrl: string,
  email: string,
  username: string,
  appId: string
): Promise<{ message: string }> {
  const response = await fetch(`${baseUrl}/api/v1/auth/signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, username, app_id: appId }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Signup failed' }));
    throw new Error(error.detail || 'Signup failed');
  }

  return response.json();
}

export async function authVerifyMagicLink(
  baseUrl: string,
  token: string
): Promise<TokenResponse> {
  const response = await fetch(`${baseUrl}/api/v1/auth/verify-magic-link`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Invalid or expired link' }));
    throw new Error(error.detail || 'Invalid or expired link');
  }

  return response.json();
}

export async function authSendOtp(
  baseUrl: string,
  email: string,
  appId: string
): Promise<{ message: string }> {
  const response = await fetch(`${baseUrl}/api/v1/auth/otp/send`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, app_id: appId }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Failed to send code' }));
    throw new Error(error.detail || 'Failed to send code');
  }

  return response.json();
}

export async function authVerifyOtp(
  baseUrl: string,
  email: string,
  code: string
): Promise<TokenResponse> {
  const response = await fetch(`${baseUrl}/api/v1/auth/otp/verify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, code }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Invalid code' }));
    throw new Error(error.detail || 'Invalid code');
  }

  return response.json();
}

// Sync types
export interface EntityChangeData {
  id: string;
  [key: string]: unknown;
  updatedAt: string;
}

export interface EntityUpsertChange {
  type: string;
  operation: 'upsert';
  data: EntityChangeData;
}

export interface EntityDeleteChange {
  type: string;
  operation: 'delete';
  id: string;
  deletedAt: string;
}

export type EntityChange = EntityUpsertChange | EntityDeleteChange;

export interface BatchPushRequest {
  changes: EntityChange[];
  clientId: string;
  idempotencyKey?: string;
}

export interface ConflictInfo {
  id: string;
  serverVersion: Record<string, unknown>;
  resolution: 'server_wins' | 'merged';
}

export interface BatchPushResponse {
  applied: string[];
  conflicts: ConflictInfo[];
  syncToken: string;
}

export interface EntityChangeResponse {
  id: string;
  operation: 'upsert' | 'delete';
  data: Record<string, unknown> | null;
  updatedAt: string;
  deletedAt: string | null;
}

export interface ChangesResponse {
  changes: {
    [entityType: string]: EntityChangeResponse[];
  };
  syncToken: string | null;
}

export class SyncApiClient {
  private baseUrl: string;
  private getToken: () => string | null;

  constructor(baseUrl: string, getToken: () => string | null) {
    this.baseUrl = baseUrl.replace(/\/$/, ''); // Remove trailing slash
    this.getToken = getToken;
  }

  private async request<T>(
    method: string,
    path: string,
    body?: unknown
  ): Promise<T> {
    const token = this.getToken();
    if (!token) {
      throw new Error('Not authenticated');
    }

    const response = await fetch(`${this.baseUrl}${path}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) {
      if (response.status === 401) {
        throw new Error('Authentication expired');
      }
      throw new Error(`API error: ${response.status} ${response.statusText}`);
    }

    return response.json();
  }

  async pushChanges(request: BatchPushRequest): Promise<BatchPushResponse> {
    return this.request<BatchPushResponse>('POST', '/api/v1/sync/push', request);
  }

  async getChanges(types: string[], since?: string, clientId?: string): Promise<ChangesResponse> {
    const params = new URLSearchParams({ types: types.join(',') });
    if (since) {
      params.set('since', since);
    }
    if (clientId) {
      params.set('clientId', clientId);
    }
    return this.request<ChangesResponse>('GET', `/api/v1/sync/changes?${params}`);
  }
}
