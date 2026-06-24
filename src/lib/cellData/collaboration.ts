// ─────────────────────────────────────────────────────────────────────────────
// Collaboration & Audit Trail System
// All collaboration state lives in a separate localStorage namespace so it
// doesn't break existing workspace data. The sharing registry is global
// (cross-cell), while audit logs and version history are per-table.
// ─────────────────────────────────────────────────────────────────────────────

export type SharePermission = 'view' | 'comment' | 'edit' | 'manage';

export interface CellShare {
 id: string;
 tableId: string;
 ownerCell: string; // cell that owns the table
 sharedWithCell: string; // cell receiving access
 permission: SharePermission;
 grantedBy: string; // userId who created the share
 grantedAt: string; // ISO timestamp
 revokedAt?: string; // set when revoked (soft delete)
}

// ── Activity Log ──────────────────────────────────────────────────────────────
export type ActivityAction =
 | 'record_created' | 'record_edited' | 'record_deleted'
 | 'column_added' | 'column_deleted' | 'column_renamed'
 | 'table_created' | 'table_renamed' | 'table_deleted' | 'table_locked' | 'table_unlocked'
 | 'permission_changed' | 'collaborator_added' | 'collaborator_removed'
 | 'import_performed' | 'sheet_synced'
 | 'version_saved' | 'version_restored'
 | 'section_added' | 'section_deleted' | 'section_renamed';

export interface ActivityEntry {
 id: string;
 timestamp: string;
 action: ActivityAction;
 tableId?: string;
 tableName?: string;
 rowId?: string;
 fieldId?: string;
 cell: string;
 userId: string;
 userName: string;
 detail?: string; // human-readable description
}

// ── Row-level metadata ────────────────────────────────────────────────────────
export interface RowMeta {
 createdBy: string;
 createdByName: string;
 createdAt: string;
 lastModifiedBy?: string;
 lastModifiedByName?: string;
 lastModifiedAt?: string;
}

// ── Table-level metadata ──────────────────────────────────────────────────────
export interface TableMeta {
 tableId: string;
 createdBy: string;
 createdByName: string;
 createdAt: string;
 lastModifiedBy?: string;
 lastModifiedByName?: string;
 lastModifiedAt?: string;
 locked?: boolean;
 lockedBy?: string;
 lockedAt?: string;
}

// ── Version history ────────────────────────────────────────────────────────────
export interface TableVersion {
 id: string;
 tableId: string;
 versionLabel: string; // e.g."v1.3"
 savedAt: string;
 savedBy: string;
 savedByName: string;
 description?: string; // what changed in this version
 snapshot: string; // JSON.stringify of TableDef at this point
}

// ── Cross-cell collaboration registry (global localStorage key) ───────────────
const COLLAB_KEY = 'rly_collab_registry';
const ACTIVITY_PREFIX = 'rly_activity_';
const META_PREFIX = 'rly_tablemeta_';
const ROWMETA_PREFIX = 'rly_rowmeta_';
const VERSION_PREFIX = 'rly_versions_';

function gid() { return `${Date.now()}${Math.floor(Math.random()*10000)}`; }

// ── Share registry ─────────────────────────────────────────────────────────────
export function getShares(): CellShare[] {
 if (typeof window === 'undefined') return [];
 try { return JSON.parse(localStorage.getItem(COLLAB_KEY) ?? '[]'); } catch { return []; }
}

function saveShares(shares: CellShare[]) {
 if (typeof window === 'undefined') return;
 localStorage.setItem(COLLAB_KEY, JSON.stringify(shares));
}

export function shareTable(
 tableId: string, ownerCell: string, sharedWithCell: string,
 permission: SharePermission, grantedBy: string,
): CellShare {
 const shares = getShares();
 // Remove existing share for same table+cell pair first (update instead of duplicate)
 const filtered = shares.filter(s => !(s.tableId === tableId && s.sharedWithCell === sharedWithCell && !s.revokedAt));
 const entry: CellShare = {
 id: gid(), tableId, ownerCell, sharedWithCell, permission,
 grantedBy, grantedAt: new Date().toISOString(),
 };
 saveShares([...filtered, entry]);
 return entry;
}

export function revokeShare(shareId: string) {
 const shares = getShares().map(s => s.id === shareId ? { ...s, revokedAt: new Date().toISOString() } : s);
 saveShares(shares);
}

export function getSharesForTable(tableId: string): CellShare[] {
 return getShares().filter(s => s.tableId === tableId && !s.revokedAt);
}

export function getSharesForCell(cell: string): CellShare[] {
 return getShares().filter(s => s.sharedWithCell === cell && !s.revokedAt);
}

export function getCellPermissionForTable(cell: string, tableId: string, ownerCell: string): SharePermission | null {
 if (cell === ownerCell) return 'manage'; // always full access to own tables
 const share = getShares().find(s => s.tableId === tableId && s.sharedWithCell === cell && !s.revokedAt);
 return share?.permission ?? null;
}

// ── Activity log ───────────────────────────────────────────────────────────────
function actKey(cell: string) { return `${ACTIVITY_PREFIX}${cell.replace(/[^a-zA-Z0-9]/g, '_')}`; }

export function logActivity(cell: string, entry: Omit<ActivityEntry, 'id' | 'timestamp' | 'cell'>): ActivityEntry {
 if (typeof window === 'undefined') return { id: '', timestamp: '', cell, ...entry };
 const full: ActivityEntry = { id: gid(), timestamp: new Date().toISOString(), cell, ...entry };
 try {
 const key = actKey(cell);
 const existing: ActivityEntry[] = JSON.parse(localStorage.getItem(key) ?? '[]');
 // Keep last 500 entries
 localStorage.setItem(key, JSON.stringify([full, ...existing].slice(0, 500)));
 } catch { /* ignore */ }
 return full;
}

export function getActivityLog(cell: string): ActivityEntry[] {
 if (typeof window === 'undefined') return [];
 try { return JSON.parse(localStorage.getItem(actKey(cell)) ?? '[]'); } catch { return []; }
}

export function getTableActivity(cell: string, tableId: string): ActivityEntry[] {
 return getActivityLog(cell).filter(e => e.tableId === tableId);
}

// ── Table metadata ─────────────────────────────────────────────────────────────
function metaKey(tableId: string) { return `${META_PREFIX}${tableId}`; }

export function getTableMeta(tableId: string): TableMeta | null {
 if (typeof window === 'undefined') return null;
 try { return JSON.parse(localStorage.getItem(metaKey(tableId)) ?? 'null'); } catch { return null; }
}

export function setTableMeta(meta: TableMeta) {
 if (typeof window === 'undefined') return;
 localStorage.setItem(metaKey(meta.tableId), JSON.stringify(meta));
}

export function touchTableMeta(tableId: string, userId: string, userName: string) {
 const existing = getTableMeta(tableId);
 if (!existing) return;
 setTableMeta({ ...existing, lastModifiedBy: userId, lastModifiedByName: userName, lastModifiedAt: new Date().toISOString() });
}

export function createTableMeta(tableId: string, userId: string, userName: string): TableMeta {
 const meta: TableMeta = { tableId, createdBy: userId, createdByName: userName, createdAt: new Date().toISOString() };
 setTableMeta(meta);
 return meta;
}

// ── Row metadata ───────────────────────────────────────────────────────────────
function rowMetaKey(tableId: string) { return `${ROWMETA_PREFIX}${tableId}`; }

export function getRowMetas(tableId: string): Record<string, RowMeta> {
 if (typeof window === 'undefined') return {};
 try { return JSON.parse(localStorage.getItem(rowMetaKey(tableId)) ?? '{}'); } catch { return {}; }
}

export function setRowMeta(tableId: string, rowId: string, meta: RowMeta) {
 if (typeof window === 'undefined') return;
 const all = getRowMetas(tableId);
 localStorage.setItem(rowMetaKey(tableId), JSON.stringify({ ...all, [rowId]: meta }));
}

export function createRowMeta(tableId: string, rowId: string, userId: string, userName: string) {
 setRowMeta(tableId, rowId, { createdBy: userId, createdByName: userName, createdAt: new Date().toISOString() });
}

export function touchRowMeta(tableId: string, rowId: string, userId: string, userName: string) {
 const all = getRowMetas(tableId);
 const existing = all[rowId];
 if (!existing) { createRowMeta(tableId, rowId, userId, userName); return; }
 setRowMeta(tableId, rowId, { ...existing, lastModifiedBy: userId, lastModifiedByName: userName, lastModifiedAt: new Date().toISOString() });
}

// ── Version history ────────────────────────────────────────────────────────────
function versionKey(tableId: string) { return `${VERSION_PREFIX}${tableId}`; }

export function getVersions(tableId: string): TableVersion[] {
 if (typeof window === 'undefined') return [];
 try { return JSON.parse(localStorage.getItem(versionKey(tableId)) ?? '[]'); } catch { return []; }
}

export function saveVersion(tableId: string, tableDef: unknown, userId: string, userName: string, description = ''): TableVersion {
 const existing = getVersions(tableId);
 const vNum = existing.length + 1;
 const entry: TableVersion = {
 id: gid(), tableId,
 versionLabel: `v1.${vNum}`,
 savedAt: new Date().toISOString(),
 savedBy: userId, savedByName: userName,
 description,
 snapshot: JSON.stringify(tableDef),
 };
 // Keep last 30 versions per table
 const updated = [entry, ...existing].slice(0, 30);
 if (typeof window !== 'undefined') localStorage.setItem(versionKey(tableId), JSON.stringify(updated));
 return entry;
}

export function deleteVersionsForTable(tableId: string) {
 if (typeof window !== 'undefined') localStorage.removeItem(versionKey(tableId));
}

// ── Permission helpers ─────────────────────────────────────────────────────────
export const PERMISSION_LABELS: Record<SharePermission, string> = {
 view: 'View Only',
 comment: 'Comment',
 edit: 'Edit',
 manage: 'Manage',
};

export const PERMISSION_DESCRIPTIONS: Record<SharePermission, string> = {
 view: 'Can view records only',
 comment: 'Can view and add comments',
 edit: 'Can add, modify, and delete records',
 manage: 'Can manage permissions and collaborators',
};

// ── Dynamic cell list — always reads from registry, includes admin-created cells ─
export const ALL_CELLS = [
 'Planning', 'Manpower Planning', 'Security D&AR', 'Legal', 'Marketing',
 'Catering', 'Publicity', 'Ticket Checking', 'UTS PRS', 'JTBS/YTSK/STBA',
 'Store', 'Sanitation', 'Parking', 'License Porter', 'Complaint/RailMadad',
 'Concession', 'PA', 'Commercial Control', 'Union/DRUCC', 'DAK',
]; // kept as fallback for SSR — use getAllActiveCellNames() client-side

/** Returns all active cell names from the registry (includes newly created cells).
 * Falls back to ALL_CELLS when called server-side. */
export function getAllActiveCellNames(): string[] {
 if (typeof window === 'undefined') return ALL_CELLS;
 try {
 const raw = localStorage.getItem('rly_cell_registry');
 if (!raw) return ALL_CELLS;
 const parsed = JSON.parse(raw) as Array<{ name: string; status: string }>;
 const fromRegistry = parsed.filter(c => c.status === 'active').map(c => c.name);
 return fromRegistry.length > 0 ? fromRegistry : ALL_CELLS;
 } catch { return ALL_CELLS; }
}

export function humanReadableAction(action: ActivityAction): string {
 const m: Record<ActivityAction, string> = {
 record_created: 'added a record',
 record_edited: 'modified a record',
 record_deleted: 'deleted a record',
 column_added: 'added a column',
 column_deleted: 'deleted a column',
 column_renamed: 'renamed a column',
 table_created: 'created a table',
 table_renamed: 'renamed a table',
 table_deleted: 'deleted a table',
 table_locked: 'locked a table',
 table_unlocked: 'unlocked a table',
 permission_changed: 'changed permissions',
 collaborator_added: 'added a collaborator',
 collaborator_removed: 'removed a collaborator',
 import_performed: 'imported data',
 sheet_synced: 'synced with Google Sheet',
 version_saved: 'saved a version',
 version_restored: 'restored a version',
 section_added: 'added a section',
 section_deleted: 'deleted a section',
 section_renamed: 'renamed a section',
 };
 return m[action] ?? action;
}
