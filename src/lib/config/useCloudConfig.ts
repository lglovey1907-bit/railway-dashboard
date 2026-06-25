'use client';
import { useState, useEffect, useCallback, useRef } from 'react';

export interface CloudConfigState<T> {
  value: T | null;
  loading: boolean;
  kvAvailable: boolean;
  set: (v: T | null) => Promise<void>;
  clear: () => Promise<void>;
}

async function apiGet(userId: string, ns: string) {
  try {
    const r = await fetch(
      `/api/config?userId=${encodeURIComponent(userId)}&namespace=${encodeURIComponent(ns)}`,
      { cache: 'no-store' }
    );
    if (!r.ok) return { value: null, kvAvailable: false };
    return await r.json() as { value: string | null; kvAvailable: boolean };
  } catch { return { value: null, kvAvailable: false }; }
}

async function apiSet(userId: string, ns: string, value: string | null) {
  try {
    const r = await fetch('/api/config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, namespace: ns, value }),
    });
    const d = await r.json();
    return d.ok === true;
  } catch { return false; }
}

function lsGet(ns: string): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(ns);
}

function lsSet(ns: string, v: string | null) {
  if (typeof window === 'undefined') return;
  if (v === null) localStorage.removeItem(ns);
  else localStorage.setItem(ns, v);
}

export function useCloudConfig<T>(namespace: string, userId: string | undefined): CloudConfigState<T> {
  const [value,       setValue]   = useState<T | null>(() => {
    // Sync init from localStorage — shows data instantly, no flash
    const raw = lsGet(namespace);
    if (!raw) return null;
    try { return JSON.parse(raw); } catch { return raw as unknown as T; }
  });
  const [loading,     setLoading] = useState(false);
  const [kvAvailable, setKvAvail] = useState(false);
  const alive     = useRef(true);
  // Track which userId+namespace combo has been fetched to avoid duplicate requests
  const lastFetched = useRef<string>('');

  useEffect(() => {
    alive.current = true;
    return () => { alive.current = false; };
  }, []);

  // ── Fetch from Upstash whenever userId OR namespace changes ───────────────
  // Using userId+namespace as the cache key so switching sub-heads re-fetches
  useEffect(() => {
    if (!userId) return;
    const fetchKey = `${userId}::${namespace}`;
    if (fetchKey === lastFetched.current) return;
    lastFetched.current = fetchKey;

    setLoading(true);
    apiGet(userId, namespace).then(({ value: kvRaw, kvAvailable: kv }) => {
      if (!alive.current) return;
      setKvAvail(kv);
      setLoading(false);
      if (kvRaw !== null) {
        lsSet(namespace, kvRaw);
        try { setValue(JSON.parse(kvRaw) as T); }
        catch { setValue(kvRaw as unknown as T); }
      }
    });
  }, [userId, namespace]);

  const set = useCallback(async (v: T | null) => {
    const serialised = v === null ? null : JSON.stringify(v);
    lsSet(namespace, serialised);
    setValue(v);
    if (userId) await apiSet(userId, namespace, serialised);
  }, [namespace, userId]);

  const clear = useCallback(() => set(null), [set]);
  return { value, loading, kvAvailable, set, clear };
}
