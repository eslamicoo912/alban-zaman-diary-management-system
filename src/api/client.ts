const API_BASE = import.meta.env.VITE_API_BASE || '/api';

/**
 * Lightweight JSON fetch helper for the POS.
 *
 * When the owner or an employee has authenticated, the session token is
 * attached as a `Bearer` authorization header so future authenticated
 * endpoints can enforce it. Servers errors surface as thrown Errors with the
 * backend message.
 */
let authToken: string | null = null;

export const setAuthToken = (token: string | null): void => {
  authToken = token;
};

export const getAuthToken = (): string | null => authToken;

export const apiFetch = async (path: string, options: RequestInit = {}): Promise<any> => {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
    ...((options.headers as Record<string, string>) || {}),
  };
  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || `Request failed: ${res.status}`);
  }
  return res.json();
};

export const apiGet = <T>(path: string): Promise<T> => apiFetch(path) as Promise<T>;
export const apiPut = (path: string, body: unknown): Promise<any> =>
  apiFetch(path, { method: 'PUT', body: JSON.stringify(body) });
export const apiPost = (path: string, body?: unknown): Promise<any> =>
  apiFetch(path, { method: 'POST', body: body === undefined ? undefined : JSON.stringify(body) });
export const apiDelete = (path: string): Promise<any> => apiFetch(path, { method: 'DELETE' });

export const getApiBase = (): string => API_BASE;