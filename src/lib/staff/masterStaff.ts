// ─────────────────────────────────────────────────────────────────────────────
// Master Staff Data — Single Source of Truth
//
// Merges mockUsers + staffDB. For staffDB users, cell membership comes from
// the rly_cell_memberships table (one record per employee per cell).
// Status overrides (rly_user_status_overrides) are applied last so
// deactivate/restore propagates everywhere instantly.
// ─────────────────────────────────────────────────────────────────────────────

import { mockUsers } from '@/lib/data/mockData';

export interface MasterStaffRecord {
 id: string;
 name: string;
 email: string;
 designation: string;
 cell: string;
 role: string;
 hrmsId?: string;
 mobile?: string;
 workingAs?: string;
 fatherHusbandName?: string;
 listOfWorkAssigned?: string;
 datePostingInCell?: string;
 status: 'active' | 'pending' | 'inactive' | 'suspended' | 'rejected' | 'transferred' | 'retired';
 source: 'mock' | 'staff_db';
 registeredAt?: string;
}

const STATUS_KEY = 'rly_user_status_overrides';
const DELETED_KEY = 'rly_deleted_users'; // permanent delete for mock (seed) users
const CELL_INFO_KEY = 'rly_cell_staff_info'; // working-since + work-assigned per employee

export interface CellStaffInfo {
 datePostingInCell?: string;
 listOfWorkAssigned?: string;
}

function getCellStaffInfoMap(): Record<string, CellStaffInfo> {
 if (typeof window === 'undefined') return {};
 try { return JSON.parse(localStorage.getItem(CELL_INFO_KEY) ?? '{}'); } catch { return {}; }
}

/** Save Working Since / Work Assigned for a staff member (set by incharge/admin/maintenance) */
export function updateCellStaffInfo(employeeId: string, info: CellStaffInfo): void {
 if (typeof window === 'undefined') return;
 try {
 const all = getCellStaffInfoMap();
 all[employeeId] = { ...(all[employeeId] ?? {}), ...info };
 localStorage.setItem(CELL_INFO_KEY, JSON.stringify(all));
 } catch {}
 notifyStaffChanged();
}

function getStatusOverrides(): Record<string, string> {
 if (typeof window === 'undefined') return {};
 try { return JSON.parse(localStorage.getItem(STATUS_KEY) ?? '{}'); } catch { return {}; }
}

function getDeletedIds(): Set<string> {
 if (typeof window === 'undefined') return new Set();
 try { return new Set(JSON.parse(localStorage.getItem(DELETED_KEY) ?? '[]')); } catch { return new Set(); }
}

function addToDeleted(id: string) {
 if (typeof window === 'undefined') return;
 try {
 const ids = JSON.parse(localStorage.getItem(DELETED_KEY) ?? '[]');
 if (!ids.includes(id)) { ids.push(id); localStorage.setItem(DELETED_KEY, JSON.stringify(ids)); }
 } catch {}
}

function safeGet<T>(key: string, fallback: T): T {
 if (typeof window === 'undefined') return fallback;
 try { return JSON.parse(localStorage.getItem(key) ?? 'null') ?? fallback; } catch { return fallback; }
}

/** Returns ALL staff from both sources, with correct cell assignment */
export function getAllMasterStaff(): MasterStaffRecord[] {
 const overrides = getStatusOverrides();
 const deletedIds = getDeletedIds(); // mock users permanently deleted by admin
 const cellInfoMap = getCellStaffInfoMap(); // working-since + work-assigned overrides

 // ── 1. mockUsers (static seed — filter out permanently deleted ones) ─────────
 const fromMock: MasterStaffRecord[] = mockUsers
 .filter(u => !deletedIds.has(u.id))
 .map(u => {
 const ci = cellInfoMap[u.id] ?? {};
 return {
 id: u.id,
 name: u.name,
 email: u.email,
 designation: u.designation,
 cell: u.cell, // direct field on mockUser
 role: u.role,
 hrmsId: u.hrmsId,
 mobile: u.mobileNumber,
 workingAs: u.workingAs,
 fatherHusbandName: u.fatherHusbandName,
 listOfWorkAssigned: ci.listOfWorkAssigned ?? u.listOfWorkAssigned,
 datePostingInCell: ci.datePostingInCell ?? u.datePostingInCell,
 status: (overrides[u.id] ?? (u.approved ? 'active' : 'pending')) as MasterStaffRecord['status'],
 source: 'mock' as const,
 registeredAt: u.createdAt,
 };
 });

 // ── 2. staffDB records (signed-up / admin-added users) ────────────────────
 const fromDB: MasterStaffRecord[] = [];
 try {
 const dbStaff = safeGet<any[]>('rly_staff_master', []);
 const memberships = safeGet<any[]>('rly_cell_memberships', []);
 const mockIds = new Set(fromMock.map(m => m.id));

 dbStaff.filter(s => !mockIds.has(s.id)).forEach(s => {
 // Find all approved cell memberships for this employee
 const approvedMemberships = memberships.filter(
 m => m.employeeId === s.id && m.approvalStatus === 'approved'
 );
 const pendingMemberships = memberships.filter(
 m => m.employeeId === s.id && m.approvalStatus === 'pending'
 );

 const resolvedStatus = (overrides[s.id] ?? (
 s.status === 'pending' ? 'pending' :
 s.status === 'rejected' ? 'rejected' :
 'active'
 )) as MasterStaffRecord['status'];

 const ci = cellInfoMap[s.id] ?? {};
 const baseRecord = {
 id: s.id, name: s.name, email: s.email, designation: s.designation,
 role: s.role ?? 'user', hrmsId: s.hrmsId, mobile: s.mobile,
 workingAs: s.workingAs, fatherHusbandName: s.fatherHusbandName,
 source: 'staff_db' as const, registeredAt: s.registeredAt,
 listOfWorkAssigned: ci.listOfWorkAssigned,
 datePostingInCell: ci.datePostingInCell,
 };
 if (approvedMemberships.length > 0) {
 approvedMemberships.forEach(m => {
 fromDB.push({ ...baseRecord, cell: m.cellName, status: resolvedStatus });
 });
 } else if (pendingMemberships.length > 0) {
 pendingMemberships.forEach(m => {
 fromDB.push({ ...baseRecord, cell: m.cellName, status: 'pending' });
 });
 } else {
 fromDB.push({ ...baseRecord, cell: 'Unassigned', status: resolvedStatus });
 }
 });
 } catch { /* ignore if staffDB unavailable */ }

 return [...fromMock, ...fromDB];
}

/**
 * Staff for a specific cell.
 * Shows: users whose cell === cellName (exact), AND active/pending status.
 * Excludes: 'All' cell admin/maintenance users (they appear in Users page, not cell rosters).
 * Deduplicates by id so one employee doesn't appear twice in the same cell.
 */
export function getStaffForCell(cellName: string): MasterStaffRecord[] {
 const ACTIVE = new Set<string>(['active', 'pending']);
 const seen = new Set<string>();
 return getAllMasterStaff().filter(s => {
 if (s.cell !== cellName) return false;
 if (!ACTIVE.has(s.status)) return false;
 if (seen.has(s.id)) return false; // dedup
 seen.add(s.id);
 return true;
 });
}

/** Auto-calculated stats for a cell */
export function getCellStaffStats(cellName: string) {
 const all = getAllMasterStaff().filter(s => s.cell === cellName);
 // Dedup by id for counting
 const byId = new Map<string, MasterStaffRecord>();
 all.forEach(s => { if (!byId.has(s.id)) byId.set(s.id, s); });
 const unique = Array.from(byId.values());
 return {
 total: unique.length,
 active: unique.filter(s => s.status === 'active').length,
 pending: unique.filter(s => s.status === 'pending').length,
 inactive: unique.filter(s => ['inactive','suspended','retired','rejected'].includes(s.status)).length,
 };
}

/** Deactivate — soft delete, fires cross-component event */
export function deactivateMasterStaff(id: string, byId?: string, byName?: string): void {
 const overrides = getStatusOverrides();
 overrides[id] = 'inactive';
 if (typeof window !== 'undefined') {
 localStorage.setItem(STATUS_KEY, JSON.stringify(overrides));
 // Also update staffDB record if it exists
 const staff = safeGet<any[]>('rly_staff_master', []);
 const idx = staff.findIndex((s: any) => s.id === id);
 if (idx >= 0) {
 staff[idx] = { ...staff[idx], status: 'rejected', lastUpdatedAt: new Date().toISOString() };
 localStorage.setItem('rly_staff_master', JSON.stringify(staff));
 }
 // Audit
 const audit = safeGet<any[]>('rly_staff_audit', []);
 audit.push({ id: `a${Date.now()}`, employeeId: id, timestamp: new Date().toISOString(),
 action: 'User deactivated', performedBy: byId, performedByName: byName });
 localStorage.setItem('rly_staff_audit', JSON.stringify(audit.slice(-2000)));
 }
 notifyStaffChanged();
 try { require('./staffDB').pushStatusToServer(id, 'inactive'); } catch { /* non-critical */ }
}

/** Restore inactive user back to active */
export function restoreMasterStaff(id: string, byId?: string, byName?: string): void {
 const overrides = getStatusOverrides();
 overrides[id] = 'active';
 if (typeof window !== 'undefined') {
 localStorage.setItem(STATUS_KEY, JSON.stringify(overrides));
 const staff = safeGet<any[]>('rly_staff_master', []);
 const idx = staff.findIndex((s: any) => s.id === id);
 if (idx >= 0) {
 staff[idx] = { ...staff[idx], status: 'approved', lastUpdatedAt: new Date().toISOString() };
 localStorage.setItem('rly_staff_master', JSON.stringify(staff));
 }
 const audit = safeGet<any[]>('rly_staff_audit', []);
 audit.push({ id: `a${Date.now()}`, employeeId: id, timestamp: new Date().toISOString(),
 action: 'User restored to active', performedBy: byId, performedByName: byName });
 localStorage.setItem('rly_staff_audit', JSON.stringify(audit.slice(-2000)));
 }
 notifyStaffChanged();
 try { require('./staffDB').pushStatusToServer(id, 'active'); } catch { /* non-critical */ }
}

export const STAFF_CHANGED_EVENT = 'rly_staff_changed';
export function notifyStaffChanged() {
 if (typeof window !== 'undefined') {
 window.dispatchEvent(new CustomEvent(STAFF_CHANGED_EVENT));
 }
}

// ── Cross-device sync: pull staff + memberships from the server (KV) ─────────
// Merges server-side records (written from any browser/device) into the local
// rly_staff_master / rly_cell_memberships tables so signups, approvals, and
// cell assignments made elsewhere become visible here too.
async function pullStaffFromServer(): Promise<void> {
 if (typeof window === 'undefined') return;
 try {
 const res = await fetch('/api/users?all=true');
 if (!res.ok) return;
 const records: any[] = await res.json();
 if (!Array.isArray(records) || !records.length) return;

 let changed = false;

 // Merge staff records
 const localStaff = safeGet<any[]>('rly_staff_master', []);
 const staffById = new Map(localStaff.map(s => [s.id, s]));
 for (const rec of records) {
 const sr = rec?.staffRecord;
 if (!sr?.id) continue;
 const merged = { ...sr, status: rec.status ?? sr.status };
 const existing = staffById.get(sr.id);
 if (!existing || (merged.lastUpdatedAt ?? '') > (existing.lastUpdatedAt ?? '') || existing.status !== merged.status) {
 staffById.set(sr.id, { ...existing, ...merged });
 changed = true;
 }
 }
 if (changed) localStorage.setItem('rly_staff_master', JSON.stringify(Array.from(staffById.values())));

 // Merge cell memberships
 const localMemberships = safeGet<any[]>('rly_cell_memberships', []);
 const membershipById = new Map(localMemberships.map(m => [m.id, m]));
 let membershipsChanged = false;
 for (const rec of records) {
 const list: any[] = Array.isArray(rec?.memberships) ? rec.memberships : [];
 for (const m of list) {
 if (!m?.id) continue;
 const existing = membershipById.get(m.id);
 if (!existing || JSON.stringify(existing) !== JSON.stringify(m)) {
 membershipById.set(m.id, m);
 membershipsChanged = true;
 }
 }
 }
 if (membershipsChanged) localStorage.setItem('rly_cell_memberships', JSON.stringify(Array.from(membershipById.values())));

 if (changed || membershipsChanged) notifyStaffChanged();
 } catch { /* ignore — offline or KV unavailable, local data remains authoritative */ }
}

// Auto-start a background poll (module-singleton) as soon as this module is
// used in the browser, so every page that reads master staff data stays in
// sync with approvals/edits made on other browsers/devices.
if (typeof window !== 'undefined') {
 const w = window as any;
 if (!w.__rlyStaffSyncStarted) {
 w.__rlyStaffSyncStarted = true;
 pullStaffFromServer();
 setInterval(pullStaffFromServer, 8000);
 }
}
