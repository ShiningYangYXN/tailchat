import {
  buildResourceQuery,
  readAuth,
  requestHeaders,
  type ResourceQuery,
} from './core';

export const API_BASE = '/admin-next/api';
export const AUTH_STORAGE_KEY = 'tailchat:admin-next:auth';
export const UNAUTHORIZED_EVENT = 'tailchat:admin-next:unauthorized';

export class ApiError extends Error {
  constructor(message: string, public status: number) {
    super(message);
  }
}

export async function api<T>(
  path: string,
  init: RequestInit & { auth?: boolean } = {}
): Promise<T> {
  const session = readAuth(window.localStorage.getItem(AUTH_STORAGE_KEY));
  const needsAuth = init.auth !== false;
  const form = init.body instanceof FormData;
  const response = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      ...requestHeaders(
        needsAuth ? session?.token || '' : '',
        Boolean(init.body) && !form
      ),
      ...init.headers,
    },
  });

  if (response.status === 401 && needsAuth) {
    window.localStorage.removeItem(AUTH_STORAGE_KEY);
    window.dispatchEvent(new Event(UNAUTHORIZED_EVENT));
  }

  if (!response.ok) {
    const message =
      (await response.text()) || `${response.status} ${response.statusText}`;
    throw new ApiError(message, response.status);
  }

  if (response.status === 204) return undefined as T;
  const type = response.headers.get('content-type') || '';
  return (
    type.includes('application/json') ? response.json() : response.text()
  ) as Promise<T>;
}

export async function listResource<T extends Record<string, unknown>>(
  resource: string,
  options: ResourceQuery
): Promise<{ rows: T[]; total: number }> {
  const response = await fetch(
    `${API_BASE}/${resource}?${buildResourceQuery(options)}`,
    {
      headers: requestHeaders(
        readAuth(window.localStorage.getItem(AUTH_STORAGE_KEY))?.token || '',
        false
      ),
    }
  );
  if (response.status === 401) {
    window.localStorage.removeItem(AUTH_STORAGE_KEY);
    window.dispatchEvent(new Event(UNAUTHORIZED_EVENT));
  }
  if (!response.ok)
    throw new ApiError(
      (await response.text()) || response.statusText,
      response.status
    );
  return {
    rows: await response.json(),
    total: Number(response.headers.get('X-Total-Count') || 0),
  };
}

export function callAction<T>(action: string, params: Record<string, unknown>) {
  return api<T>('/callAction', {
    method: 'POST',
    body: JSON.stringify({ action, params }),
  });
}
