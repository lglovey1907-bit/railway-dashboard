'use client';
import { useState, useEffect, useCallback, useRef } from 'react';
import { fetchGoogleSheet, type SheetRow } from './googleSheets';
import { useCloudConfig } from '@/lib/config/useCloudConfig';

const POLL_INTERVAL_MS = 30_000;

function cacheKey(sk: string) { return `${sk}_cache`; }
function metaKey(sk: string)  { return `${sk}_meta`; }

interface SheetMeta {
  url: string; sheetName?: string;
  syncedAt?: string; linkedBy?: string; linkedAt?: string;
}

export interface PageSheetState {
  url: string;
  rows: SheetRow[];
  headers: string[];
  fetchedAt: string | null;
  loading: boolean;
  error: string | null;
  sheetName: string;
  linkedAt: string;
  linkedBy: string;
  kvAvailable: boolean;
  setUrl: (url: string, linkedBy?: string) => void;
  setPollInterval: (ms: number) => void;
  setUserId: (id: string) => void;  // kept for API compat, no longer needed
  refetch: () => void;
  clear: () => void;
}

/**
 * FIX: userId is passed directly to useCloudConfig — NOT stored in useState.
 * Previously: useState(initialUserId) → only set once on first render when
 * user was null → userId stayed '' forever → Upstash never queried.
 *
 * Now: userId prop is passed directly. When authStore hydrates and user.id
 * becomes available, useCloudConfig's useEffect re-runs and fetches from Upstash.
 */
export function usePageSheet(storageKey: string, userId?: string): PageSheetState {
  const [url,       setUrlState]  = useState('');
  const [rows,      setRows]      = useState<SheetRow[]>([]);
  const [headers,   setHeaders]   = useState<string[]>([]);
  const [fetchedAt, setFetchedAt] = useState<string | null>(null);
  const [loading,   setLoading]   = useState(false);
  const [error,     setError]     = useState<string | null>(null);
  const [linkedAt,  setLinkedAt]  = useState('');
  const [linkedBy,  setLinkedBy]  = useState('');
  const [sheetName, setSheetName] = useState('');
  const pollRef         = useRef<ReturnType<typeof setInterval> | null>(null);
  const pollIntervalRef = useRef<number>(POLL_INTERVAL_MS);
  const appliedRef      = useRef<string>(''); // tracks which userId's cloud value was applied

  // ── KEY FIX: userId passed directly, not stored in useState ──────────────
  // useCloudConfig re-fetches from Upstash whenever userId changes
  const cloud = useCloudConfig<string>(storageKey, userId);

  // ── Step 1: Load from localStorage on mount ───────────────────────────────
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const rawMeta = localStorage.getItem(metaKey(storageKey));
      if (rawMeta) {
        const meta: SheetMeta = JSON.parse(rawMeta);
        if (meta.url) {
          setUrlState(meta.url);
          setLinkedAt(meta.linkedAt ?? '');
          setLinkedBy(meta.linkedBy ?? '');
          setSheetName(meta.sheetName ?? '');
        }
      } else {
        const legacy = localStorage.getItem(storageKey);
        if (legacy) setUrlState(legacy);
      }
    } catch { /* ignore */ }

    // Try localStorage cache first (instant on return visits)
    try {
      const rawCache = localStorage.getItem(cacheKey(storageKey));
      if (rawCache) {
        const cached = JSON.parse(rawCache);
        if (cached.rows?.length) {
          setRows(cached.rows);
          setHeaders(cached.headers ?? []);
          setFetchedAt(cached.fetchedAt ?? null);
          return; // localStorage hit — Upstash will be checked below in background
        }
      }
    } catch { /* ignore */ }
    // No localStorage cache (fresh device) — try Upstash for cross-device data
    import('@/lib/config/sharedSync').then(({ sharedRead }) => {
      sharedRead(cacheKey(storageKey)).then((val: unknown) => {
        if (!val || typeof val !== 'object') return;
        const cached = val as { rows: unknown[]; headers: string[]; fetchedAt: string };
        if (!Array.isArray(cached.rows) || cached.rows.length === 0) return;
        setRows(cached.rows as SheetRow[]);
        setHeaders(cached.headers ?? []);
        setFetchedAt(cached.fetchedAt ?? null);
        // Warm localStorage for next visit
        try { localStorage.setItem(cacheKey(storageKey), JSON.stringify(cached)); } catch { /* quota */ }
      }).catch(() => {});
    }).catch(() => {});
  }, [storageKey]);

  // ── Step 2: Apply Upstash value when it arrives ───────────────────────────
  // Runs whenever cloud.value changes (i.e. when Upstash fetch completes)
  // appliedRef prevents re-applying the same value on subsequent renders
  useEffect(() => {
    const cloudUrl = cloud.value;
    if (!cloudUrl) return;
    if (!userId) return;                       // no user yet, wait
    if (appliedRef.current === userId) return; // already applied for this user
    appliedRef.current = userId;               // mark as applied for this user

    // Apply the Upstash URL — this is the cross-device value
    setUrlState(cloudUrl);

    // Persist to localStorage so future mounts are instant
    if (typeof window !== 'undefined') {
      localStorage.setItem(storageKey, cloudUrl);
      if (!localStorage.getItem(metaKey(storageKey))) {
        localStorage.setItem(metaKey(storageKey), JSON.stringify({ url: cloudUrl }));
      }
    }
  }, [cloud.value, userId, storageKey]);

  // ── Step 3: Fetch + poll when URL changes ─────────────────────────────────
  const doFetch = useCallback(async (targetUrl: string) => {
    if (!targetUrl) { setRows([]); setHeaders([]); setError(null); return; }
    setLoading(true);
    const result = await fetchGoogleSheet(targetUrl);
    if (result.rows.length > 0) {
      setRows(result.rows);
      setHeaders(result.headers);
      setFetchedAt(result.fetchedAt);
      setError(null);
      const cachePayload = { rows: result.rows, headers: result.headers, fetchedAt: result.fetchedAt };
      try { localStorage.setItem(cacheKey(storageKey), JSON.stringify(cachePayload)); } catch { /* quota */ }
      // Sync to Upstash so other devices (Windows, etc.) can read the sheet data
      import('@/lib/config/sharedSync').then(({ sharedWrite }) => {
        sharedWrite(cacheKey(storageKey), cachePayload);
      }).catch(() => {});
    } else {
      if (result.error) setError(result.error);
      setFetchedAt(result.fetchedAt);
    }
    setLoading(false);
  }, [storageKey]);

  useEffect(() => {
    if (!url) return;
    doFetch(url);
    if (pollRef.current) clearInterval(pollRef.current);
    pollRef.current = setInterval(() => doFetch(url), pollIntervalRef.current);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [url, doFetch]);

  // ── Mutations ─────────────────────────────────────────────────────────────
  const setUrl = useCallback((newUrl: string, by?: string) => {
    const now = new Date().toISOString();
    setUrlState(newUrl);
    setLinkedAt(now);
    if (by) setLinkedBy(by);
    if (typeof window !== 'undefined') {
      if (newUrl) {
        localStorage.setItem(metaKey(storageKey), JSON.stringify({
          url: newUrl, linkedAt: now, linkedBy: by ?? '',
        }));
        localStorage.setItem(storageKey, newUrl);
      } else {
        localStorage.removeItem(metaKey(storageKey));
        localStorage.removeItem(storageKey);
        localStorage.removeItem(cacheKey(storageKey));
        setRows([]); setHeaders([]); setFetchedAt(null); setError(null);
      }
    }
    // Save to Upstash — this is the cross-device write
    cloud.set(newUrl || null);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storageKey, cloud.set]);

  const setPollInterval = useCallback((ms: number) => {
    pollIntervalRef.current = ms;
    if (pollRef.current) clearInterval(pollRef.current);
    if (url) pollRef.current = setInterval(() => doFetch(url), ms);
  }, [url, doFetch]);

  const refetch   = useCallback(() => { if (url) doFetch(url); }, [url, doFetch]);
  const clear     = useCallback(() => setUrl(''), [setUrl]);
  const setUserId = useCallback(() => {}, []); // no-op, kept for API compat

  return {
    url, rows, headers, fetchedAt, loading, error, sheetName,
    linkedAt, linkedBy, kvAvailable: cloud.kvAvailable,
    setUrl, setPollInterval, setUserId, refetch, clear,
  };
}
