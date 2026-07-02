/**
 * SyncManager — Central cross-device sync service
 *
 * Every localStorage write in the app goes through syncedSave().
 * Every page load calls syncedLoad() to get the authoritative cloud value.
 *
 * Architecture:
 *   WRITE:  localStorage (instant) → Upstash (background, cross-device)
 *   READ:   localStorage (instant render) → Upstash override on auth
 *
 * Upstash key format:  user:{userId}:config:{namespace}
 * localStorage key:    whatever the module already uses (unchanged)
 *
 * This means ZERO refactoring of existing code — just wrap save/load calls.
 */

const API_BASE = '/api/config';

/**
 * Shared "user" id used for organization-wide config that must be identical
 * for every user on every device (e.g. the cell registry, custom tabs,
 * financial data). Anything saved under this id is visible to ALL users,
 * not just the device/user that wrote it.
 */
export const SHARED_UID = '_shared_';

// ── Low-level Upstash REST calls ─────────────────────────────────────────────
async function upstashGet(userId: string, ns: string): Promise<string | null> {
  try {
    const r = await fetch(
      `${API_BASE}?userId=${encodeURIComponent(userId)}&namespace=${encodeURIComponent(ns)}`,
      { cache: 'no-store' }
    );
    if (!r.ok) return null;
    const d = await r.json();
    return d.value ?? null;
  } catch { return null; }
}

async function upstashSet(userId: string, ns: string, value: string | null): Promise<boolean> {
  try {
    const r = await fetch(API_BASE, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, namespace: ns, value }),
    });
    const d = await r.json();
    return d.ok === true;
  } catch { return false; }
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Save data to BOTH localStorage and Upstash.
 * localStorage write is synchronous (instant).
 * Upstash write is async/background (non-blocking).
 *
 * @param lsKey    - localStorage key (existing key, unchanged)
 * @param nsKey    - Upstash namespace key (human-readable, e.g. 'cell_ws_UTS_PRS')
 * @param userId   - authenticated user ID
 * @param value    - data to save (any JSON-serializable value)
 */
export function syncedSave(
  lsKey: string,
  nsKey: string,
  userId: string | undefined,
  value: unknown
): void {
  // Always write localStorage synchronously
  if (typeof window !== 'undefined') {
    localStorage.setItem(lsKey, JSON.stringify(value));
  }
  // Write to Upstash in background if user is known
  if (userId) {
    upstashSet(userId, nsKey, JSON.stringify(value)).catch(() => {
      // Silent failure — localStorage is the fallback
    });
  }
}

/**
 * Load data, with Upstash taking precedence over localStorage.
 *
 * @param lsKey      - localStorage key
 * @param nsKey      - Upstash namespace key
 * @param userId     - authenticated user ID
 * @param onLoad     - callback called with the authoritative value
 * @param comparator - optional: (local, cloud) → which is newer? defaults to cloud always wins
 */
export async function syncedLoad<T>(
  lsKey: string,
  nsKey: string,
  userId: string | undefined,
  onLoad: (value: T, source: 'local' | 'cloud') => void,
  comparator?: (local: T, cloud: T) => 'local' | 'cloud'
): Promise<void> {
  // Read localStorage first (instant)
  let local: T | null = null;
  if (typeof window !== 'undefined') {
    const raw = localStorage.getItem(lsKey);
    if (raw) {
      try { local = JSON.parse(raw) as T; } catch { /* ignore */ }
    }
    if (local !== null) onLoad(local, 'local');
  }

  // Then check Upstash (cross-device, authoritative)
  if (!userId) return;
  const cloudRaw = await upstashGet(userId, nsKey);
  if (!cloudRaw) return;

  let cloud: T;
  try { cloud = JSON.parse(cloudRaw) as T; } catch { return; }

  // Determine which is newer
  let winner: 'local' | 'cloud' = 'cloud'; // default: cloud wins
  if (local !== null && comparator) {
    winner = comparator(local, cloud);
  }

  if (winner === 'cloud') {
    // Update localStorage with the cloud value
    if (typeof window !== 'undefined') {
      localStorage.setItem(lsKey, cloudRaw);
    }
    onLoad(cloud, 'cloud');
  }
}

/**
 * Timestamp-based comparator — newer updatedAt wins.
 * Use this for workspaces that track updatedAt.
 */
export function newerWins<T extends { updatedAt?: string }>(
  local: T, cloud: T
): 'local' | 'cloud' {
  const lt = local.updatedAt ?? '';
  const ct = cloud.updatedAt ?? '';
  return ct > lt ? 'cloud' : 'local';
}

/**
 * Bulk load: fetch multiple namespaces in parallel.
 * Useful on page load to pre-fetch all workspace data.
 */
export async function bulkLoad(
  userId: string,
  entries: Array<{ lsKey: string; nsKey: string; onLoad: (v: unknown) => void }>
): Promise<void> {
  await Promise.all(
    entries.map(e =>
      syncedLoad(e.lsKey, e.nsKey, userId, e.onLoad)
    )
  );
}

// ── Namespace key helpers — consistent naming across modules ─────────────────
export const NS = {
  cellWorkspace:    (cell: string)      => `cell_ws_${cell.replace(/\W/g, '_')}`,
  cellLayout:       (cell: string)      => `cell_layout_${cell.replace(/\W/g, '_')}`,
  cellRowLayout:    (cell: string)      => `cell_rowlayout_${cell.replace(/\W/g, '_')}`,
  cellLinks:        (cell: string)      => `links_${cell.replace(/[^a-zA-Z0-9]/g, '_')}`,  // matches GoogleLinksRepo nsKey
  cellCollab:       ()                  => 'cell_collab_registry',
  cellRegistry:     ()                  => 'cell_registry',
  policyWorkspace:  (subHead: string)   => `policy_ws_${subHead.replace(/\W/g, '_')}`,
  viewStore:        (sourceKey: string) => `view_store_${sourceKey.replace(/\W/g, '_')}`,
  pageSheetUrl:     (storageKey: string)=> `sheet_url_${storageKey}`,
  pageSheetFields:  (storageKey: string)=> `sheet_fields_${storageKey}`,
  powerBi:          (storageKey: string)=> `powerbi_${storageKey}`,
  customTabs:       ()                  => 'dashboard_custom_tabs',
  staffMaster:      ()                  => 'staff_master',
  staffMembers:     ()                  => 'staff_memberships',
  staffStatus:      ()                  => 'staff_status_overrides',
  staffRequests:    ()                  => 'staff_requests',
  userPasswords:    ()                  => 'user_passwords',     // intentionally per-user
};
