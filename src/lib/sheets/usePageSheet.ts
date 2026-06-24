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
  setUserId: (id: string) => void;
  refetch: () => void;
  clear: () => void;
}

export function usePageSheet(storageKey: string, initialUserId?: string): PageSheetState {
  const [url,       setUrlState]  = useState('');
  const [rows,      setRows]      = useState<SheetRow[]>([]);
  const [headers,   setHeaders]   = useState<string[]>([]);
  const [fetchedAt, setFetchedAt] = useState<string | null>(null);
  const [loading,   setLoading]   = useState(false);
  const [error,     setError]     = useState<string | null>(null);
  const [linkedAt,  setLinkedAt]  = useState('');
  const [linkedBy,  setLinkedBy]  = useState('');
  const [sheetName, setSheetName] = useState('');
  const [userId,    setUserId]    = useState(initialUserId ?? '');
  const pollRef         = useRef<ReturnType<typeof setInterval> | null>(null);
  const pollIntervalRef = useRef<number>(POLL_INTERVAL_MS);
  const appliedCloud    = useRef(false);   // track if we already applied cloud value

  // Cloud config — reads Upstash on mount whenever userId is known
  const cloud = useCloudConfig<string>(storageKey, userId || undefined);

  // ── Step 1: On mount, load from localStorage immediately ─────────────────
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

    // Restore cached rows so page shows data instantly
    try {
      const rawCache = localStorage.getItem(cacheKey(storageKey));
      if (rawCache) {
        const cached = JSON.parse(rawCache);
        if (cached.rows?.length) {
          setRows(cached.rows);
          setHeaders(cached.headers ?? []);
          setFetchedAt(cached.fetchedAt ?? null);
        }
      }
    } catch { /* ignore */ }
  }, [storageKey]);

  // ── Step 2: When Upstash resolves, apply URL if it differs ───────────────
  // This is the critical fix: we watch cloud.value directly and apply it
  // as soon as it arrives, without waiting for cloud.loading to be false
  // (loading can stay true on devices where KV fetch is slow)
  useEffect(() => {
    const cloudUrl = cloud.value;
    if (!cloudUrl) return;               // Upstash has nothing — keep localStorage
    if (appliedCloud.current) return;    // only apply once per session
    // Cloud URL is the authoritative cross-device value
    // Always apply it, even if it matches current url
    appliedCloud.current = true;
    setUrlState(cloudUrl);
    // Write back to localStorage so future mounts are instant
    if (typeof window !== 'undefined') {
      localStorage.setItem(storageKey, cloudUrl);
      const existing = localStorage.getItem(metaKey(storageKey));
      if (!existing) {
        localStorage.setItem(metaKey(storageKey), JSON.stringify({ url: cloudUrl }));
      }
    }
  }, [cloud.value, storageKey]);

  // Reset appliedCloud flag when userId changes (e.g. different user logs in)
  useEffect(() => { appliedCloud.current = false; }, [userId]);

  // ── Step 3: Fetch sheet data whenever url changes ────────────────────────
  const doFetch = useCallback(async (targetUrl: string) => {
    if (!targetUrl) { setRows([]); setHeaders([]); setError(null); return; }
    setLoading(true);
    const result = await fetchGoogleSheet(targetUrl);
    if (result.rows.length > 0) {
      setRows(result.rows);
      setHeaders(result.headers);
      setFetchedAt(result.fetchedAt);
      setError(null);
      try {
        localStorage.setItem(cacheKey(storageKey), JSON.stringify({
          rows: result.rows, headers: result.headers, fetchedAt: result.fetchedAt,
        }));
      } catch { /* quota */ }
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

  // ── Mutations ────────────────────────────────────────────────────────────
  const setUrl = useCallback((newUrl: string, by?: string) => {
    const now = new Date().toISOString();
    setUrlState(newUrl);
    setLinkedAt(now);
    if (by) setLinkedBy(by);
    if (typeof window !== 'undefined') {
      if (newUrl) {
        const meta: SheetMeta = { url: newUrl, linkedAt: now, linkedBy: by ?? '' };
        localStorage.setItem(metaKey(storageKey), JSON.stringify(meta));
        localStorage.setItem(storageKey, newUrl);
      } else {
        localStorage.removeItem(metaKey(storageKey));
        localStorage.removeItem(storageKey);
        localStorage.removeItem(cacheKey(storageKey));
        setRows([]); setHeaders([]); setFetchedAt(null); setError(null);
      }
    }
    // Save to Upstash for cross-device sync
    cloud.set(newUrl || null);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storageKey, cloud.set]);

  const setPollInterval = useCallback((ms: number) => {
    pollIntervalRef.current = ms;
    if (pollRef.current) clearInterval(pollRef.current);
    if (url) pollRef.current = setInterval(() => doFetch(url), ms);
  }, [url, doFetch]);

  const refetch = useCallback(() => { if (url) doFetch(url); }, [url, doFetch]);
  const clear   = useCallback(() => setUrl(''), [setUrl]);

  return {
    url, rows, headers, fetchedAt, loading, error, sheetName,
    linkedAt, linkedBy, kvAvailable: cloud.kvAvailable,
    setUrl, setPollInterval, setUserId, refetch, clear,
  };
}
