/**
 * RideFlow AI — API client
 *
 * Centralized fetch wrapper for the NestJS backend.
 * Automatically attaches Supabase JWT from localStorage.
 */

const API_BASE = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:4000';

interface ApiOptions extends RequestInit {
  skipAuth?: boolean;
}

function getSessionToken(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    // Supabase stores session in localStorage with key sb-*-auth-token
    const sbKey = Object.keys(localStorage).find((k) =>
      k.startsWith('sb-') && k.endsWith('-auth-token'),
    );
    if (!sbKey) return null;
    const raw = localStorage.getItem(sbKey);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed?.access_token ?? null;
  } catch {
    return null;
  }
}

export async function api<T = unknown>(
  path: string,
  options: ApiOptions = {},
): Promise<T> {
  const { skipAuth = false, ...fetchOptions } = options;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(fetchOptions.headers as Record<string, string>),
  };

  if (!skipAuth) {
    const token = getSessionToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
  }

  // 15-second timeout via AbortSignal
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15_000);

  try {
    const res = await fetch(`${API_BASE}/api${path}`, {
      ...fetchOptions,
      headers,
      signal: fetchOptions.signal ?? controller.signal,
    });

    if (!res.ok) {
      const errorBody = await res.text();
      throw new ApiError(res.status, errorBody || res.statusText);
    }

    if (res.status === 204) return undefined as T;
    return res.json() as Promise<T>;
  } finally {
    clearTimeout(timeoutId);
  }
}

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

// ── Convenience methods ─────────────────────────────────────

export const apiClient = {
  get: <T>(path: string, opts?: ApiOptions) =>
    api<T>(path, { ...opts, method: 'GET' }),

  post: <T>(path: string, body?: unknown, opts?: ApiOptions) =>
    api<T>(path, {
      ...opts,
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined,
    }),

  patch: <T>(path: string, body?: unknown, opts?: ApiOptions) =>
    api<T>(path, {
      ...opts,
      method: 'PATCH',
      body: body ? JSON.stringify(body) : undefined,
    }),

  delete: <T>(path: string, opts?: ApiOptions) =>
    api<T>(path, { ...opts, method: 'DELETE' }),
};
