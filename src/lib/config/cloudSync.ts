/**
 * cloudSync — universal Upstash sync for any localStorage namespace
 *
 * Architecture:
 *   write: localStorage (instant) + Upstash (cross-device, background)
 *   read:  localStorage first (instant render) → Upstash overrides on load
 *
 * Used by: policy workspace, cell workspace, view engine, collab registry,
 *          custom tabs, staff data
 */

const API = '/api/config';

export async function cloudWrite(
  userId: string, namespace: string, value: unknown
): Promise<boolean> {
  if (!userId) return false;
  try {
    const serialised = value === null ? null : JSON.stringify(value);
    const r = await fetch(API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, namespace, value: serialised }),
    });
    const d = await r.json();
    return d.ok === true;
  } catch (e) {
    console.warn('[cloudSync] write failed:', namespace, e);
    return false;
  }
}

export async function cloudRead(
  userId: string, namespace: string
): Promise<{ value: unknown | null; kvAvailable: boolean }> {
  if (!userId) return { value: null, kvAvailable: false };
  try {
    const r = await fetch(
      `${API}?userId=${encodeURIComponent(userId)}&namespace=${encodeURIComponent(namespace)}`,
      { cache: 'no-store' }
    );
    if (!r.ok) return { value: null, kvAvailable: false };
    const d = await r.json();
    const parsed = d.value !== null ? (() => { try { return JSON.parse(d.value); } catch { return d.value; } })() : null;
    return { value: parsed, kvAvailable: d.kvAvailable ?? false };
  } catch (e) {
    console.warn('[cloudSync] read failed:', namespace, e);
    return { value: null, kvAvailable: false };
  }
}

/**
 * Save to BOTH localStorage and Upstash atomically.
 * Returns true if Upstash write succeeded.
 */
export function syncedWrite<T>(
  userId: string, lsKey: string, cloudKey: string, value: T
): Promise<boolean> {
  if (typeof window !== 'undefined') {
    localStorage.setItem(lsKey, JSON.stringify(value));
  }
  return cloudWrite(userId, cloudKey, value);
}

/**
 * Read from localStorage immediately, then check Upstash.
 * Calls onCloudValue when Upstash responds (may be null if nothing stored).
 */
export function syncedRead<T>(
  userId: string, lsKey: string, cloudKey: string,
  onCloudValue: (v: T | null, kvAvailable: boolean) => void
): T | null {
  // Sync: read localStorage immediately
  let local: T | null = null;
  if (typeof window !== 'undefined') {
    const raw = localStorage.getItem(lsKey);
    if (raw) { try { local = JSON.parse(raw); } catch { /* ignore */ } }
  }
  // Async: read Upstash in background
  cloudRead(userId, cloudKey).then(({ value, kvAvailable }) => {
    if (value !== null) {
      // Upstash has data — write back to localStorage and notify
      if (typeof window !== 'undefined') {
        localStorage.setItem(lsKey, JSON.stringify(value));
      }
      onCloudValue(value as T, kvAvailable);
    } else {
      onCloudValue(null, kvAvailable);
    }
  });
  return local;
}
