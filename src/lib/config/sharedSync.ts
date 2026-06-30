/**
 * sharedSync — Shared (global) namespace sync
 *
 * Uses the fixed userId '_shared_' for content that should be identical
 * across all users: overview workspace, financial data, tab access, DB views.
 *
 * Architecture:
 *   WRITE (admin/maintenance only): localStorage + Upstash under _shared_
 *   READ  (all users): Upstash _shared_ → localStorage on login
 */

const SHARED_UID = '_shared_';
const API = '/api/config';

/** Push data to the shared Upstash namespace (fire-and-forget) */
export function sharedWrite(namespace: string, value: unknown): void {
  if (typeof window === 'undefined') return;
  try {
    const serialised = value === null ? null : JSON.stringify(value);
    fetch(API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: SHARED_UID, namespace, value: serialised }),
    }).catch(() => {/* silent */});
  } catch { /* silent */ }
}

/** Pull a single namespace from shared Upstash. Returns null if unavailable. */
export async function sharedRead(namespace: string): Promise<unknown | null> {
  try {
    const r = await fetch(
      `${API}?userId=${encodeURIComponent(SHARED_UID)}&namespace=${encodeURIComponent(namespace)}`,
      { cache: 'no-store' },
    );
    if (!r.ok) return null;
    const d = await r.json();
    if (!d.value) return null;
    try { return JSON.parse(d.value); } catch { return d.value; }
  } catch { return null; }
}

/** Save to localStorage AND push to shared Upstash (for admin writes) */
export function sharedSyncedWrite(lsKey: string, namespace: string, value: unknown): void {
  if (typeof window !== 'undefined') {
    try { localStorage.setItem(lsKey, JSON.stringify(value)); } catch { /* silent */ }
  }
  sharedWrite(namespace, value);
}

export { SHARED_UID };
