'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

export class ApiError extends Error {
  constructor(public status: number, message: string, public details?: Record<string, string>) {
    super(message);
  }
}

/** Fetch an admin endpoint. Mutations carry the CSRF header the API requires. */
export async function api<T = unknown>(path: string, init: RequestInit & { json?: unknown } = {}): Promise<T> {
  const { json, headers, ...rest } = init;
  let res: Response;
  try {
    res = await fetch(`/api/admin${path}`, {
      credentials: 'same-origin',
      cache: 'no-store',
      ...rest,
      headers: {
        'x-bigsa-admin': '1',
        ...(json !== undefined ? { 'content-type': 'application/json' } : {}),
        ...headers,
      },
      body: json !== undefined ? JSON.stringify(json) : rest.body,
    });
  } catch (e) {
    if ((e as Error).name === 'AbortError') throw e;
    throw new ApiError(0, 'Can’t reach the server. Check your connection and try again.');
  }
  if (res.status === 401 && typeof window !== 'undefined' && !path.startsWith('/auth/')) {
    window.location.href = `/admin/login?next=${encodeURIComponent(window.location.pathname)}`;
    throw new ApiError(401, 'Signed out');
  }
  const method = (rest.method ?? 'GET').toUpperCase();
  if (res.ok && method !== 'GET' && method !== 'HEAD' && !path.startsWith('/auth/')) refreshPublicSite();
  if (res.status === 204) return undefined as T;
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(res.status, data.error ?? 'Request failed', data.details);
  return data as T;
}

/**
 * After any successful change, ask the website (same origin) to refresh its
 * cached public pages, so the change is visible immediately. Several quick
 * changes in a row (reordering, toggles) are combined into one refresh.
 */
let refreshTimer: ReturnType<typeof setTimeout> | undefined;
function refreshPublicSite() {
  if (typeof window === 'undefined') return;
  clearTimeout(refreshTimer);
  refreshTimer = setTimeout(() => {
    void fetch('/admin/refresh', { method: 'POST', credentials: 'same-origin', headers: { 'x-bigsa-admin': '1' }, keepalive: true }).catch(() => undefined);
  }, 300);
}

const isAbort = (e: unknown) => (e as Error)?.name === 'AbortError';

/**
 * Data hook for admin screens.
 * - Only the latest request can update the screen: when the path changes (typing
 *   in a search box, switching a filter) the previous request is cancelled, so a
 *   slow, older response can never overwrite a newer one.
 * - `reload()` refreshes in the background: what's on screen stays visible
 *   (no flash back to a spinner) and is swapped when fresh data arrives.
 * - `mutate()` changes the local copy immediately, for optimistic updates.
 */
export function useApi<T>(path: string | null) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(Boolean(path));
  const ctrl = useRef<AbortController | null>(null);

  const load = useCallback(async () => {
    ctrl.current?.abort();
    if (!path) return;
    const c = new AbortController();
    ctrl.current = c;
    setLoading(true);
    try {
      const next = await api<T>(path, { signal: c.signal });
      if (c.signal.aborted) return;
      setData(next);
      setError(null);
    } catch (e) {
      if (isAbort(e) || c.signal.aborted) return;
      setError((e as Error).message);
    } finally {
      if (ctrl.current === c) setLoading(false);
    }
  }, [path]);

  useEffect(() => {
    void load();
    return () => ctrl.current?.abort();
  }, [load]);

  const mutate = useCallback((fn: (d: T) => T) => setData((d) => (d === null ? d : fn(d))), []);

  return { data, error, loading, reload: load, setData, mutate };
}

/**
 * Optimistic update: show the change at once, send it, and put things back with
 * an error message if the server refuses. Returns true when the server accepted it.
 */
export async function optimistic(apply: () => void, request: () => Promise<unknown>, rollback: () => void, onError: (msg: string) => void): Promise<boolean> {
  apply();
  try {
    await request();
    return true;
  } catch (e) {
    rollback();
    onError((e as Error).message);
    return false;
  }
}

/** The value after the user has stopped changing it for `ms` milliseconds. */
export function useDebounced<T>(value: T, ms = 250): T {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return v;
}

export async function upload(files: File[], extra: Record<string, string> = {}) {
  const fd = new FormData();
  for (const f of files) fd.append('files', f, f.name);
  for (const [k, v] of Object.entries(extra)) fd.set(k, v);
  return api<{ id: string; filename: string; mime: string; size: number; width: number | null; height: number | null }[]>('/media', { method: 'POST', body: fd });
}

/** <input type="datetime-local"> value (Bhutan time, UTC+6) <-> ISO. */
export function toLocalInput(iso: string | null | undefined): string {
  if (!iso) return '';
  const d = new Date(new Date(iso).getTime() + 6 * 3600 * 1000);
  return d.toISOString().slice(0, 16);
}
export function fromLocalInput(v: string): string | null {
  if (!v) return null;
  return new Date(`${v}:00+06:00`).toISOString();
}
