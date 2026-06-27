export type ApprovalStatus = 'pending' | 'approved' | 'rejected' | 'suspended';
export type CellRole = 'head' | 'delegate' | 'editor' | 'viewer';

export interface StaffMember {
 id: string; hrmsId?: string; name: string; email: string; mobile?: string;
 designation: string; division: string; cell?: string; role: 'maintenance' | 'admin' | 'user';
 workingAs?: string; fatherHusbandName?: string; photoUrl?: string;
 status: ApprovalStatus; registeredAt: string; lastUpdatedAt: string; lastLogin?: string;
}

export interface CellMembership {
 id: string; employeeId: string; cellName: string; cellRole: CellRole;
 approvalStatus: ApprovalStatus; appliedAt: string;
 approvedBy?: string; approvedByName?: string; approvedAt?: string; rejectedReason?: string;
}

export interface StaffAuditEntry {
 id: string; employeeId: string; timestamp: string; action: string;
 performedBy?: string; performedByName?: string; detail?: string;
}

const STAFF_KEY = 'rly_staff_master';
const MEMBER_KEY = 'rly_cell_memberships';
const AUDIT_KEY = 'rly_staff_audit';
function gid() { return `s${Date.now()}${Math.floor(Math.random()*10000)}`; }
function safeGet<T>(key: string, fallback: T): T {
 if (typeof window === 'undefined') return fallback;
 try { return JSON.parse(localStorage.getItem(key) ?? 'null') ?? fallback; } catch { return fallback; }
}

export function getAllStaff(): StaffMember[] { return safeGet<StaffMember[]>(STAFF_KEY, []); }
export function getStaffById(id: string): StaffMember | null { return getAllStaff().find(s => s.id === id) ?? null; }
export function getStaffByEmail(email: string): StaffMember | null { return getAllStaff().find(s => s.email.toLowerCase() === email.toLowerCase()) ?? null; }
function saveStaff(s: StaffMember[]) { if (typeof window !== 'undefined') localStorage.setItem(STAFF_KEY, JSON.stringify(s)); }

export function registerEmployee(data: {
 id: string; name: string; email: string; mobile?: string; designation: string;
 cell: string; division: string; role?: 'maintenance'|'admin'|'user';
 hrmsId?: string; workingAs?: string; fatherHusbandName?: string;
}): { staff: StaffMember; membership: CellMembership } {
 const now = new Date().toISOString();
 const staff: StaffMember = {
 id: data.id, hrmsId: data.hrmsId, name: data.name, email: data.email,
 mobile: data.mobile, designation: data.designation, division: data.division,
 role: data.role ?? 'user', workingAs: data.workingAs, fatherHusbandName: data.fatherHusbandName,
 status: 'pending', registeredAt: now, lastUpdatedAt: now,
 };
 const existing = getAllStaff();
 if (!existing.find(s => s.id === data.id)) saveStaff([...existing, staff]);
 const membership = addCellMembership(data.id, data.cell, 'viewer');
 addAudit(data.id, 'Employee registered', undefined, undefined, `Applied for ${data.cell}`);
 return { staff, membership };
}

export function updateStaffRecord(id: string, patch: Partial<Omit<StaffMember, 'id'|'registeredAt'>>): StaffMember | null {
 const all = getAllStaff(); const idx = all.findIndex(s => s.id === id);
 if (idx < 0) return null;
 all[idx] = { ...all[idx], ...patch, lastUpdatedAt: new Date().toISOString() };
 saveStaff(all); return all[idx];
}

export function getAllMemberships(): CellMembership[] { return safeGet<CellMembership[]>(MEMBER_KEY, []); }
function saveMemberships(m: CellMembership[]) { if (typeof window !== 'undefined') localStorage.setItem(MEMBER_KEY, JSON.stringify(m)); }

export function addCellMembership(employeeId: string, cellName: string, role: CellRole = 'viewer'): CellMembership {
 const all = getAllMemberships();
 const existing = all.find(m => m.employeeId === employeeId && m.cellName === cellName);
 if (existing) return existing;
 const m: CellMembership = { id: gid(), employeeId, cellName, cellRole: role, approvalStatus: 'pending', appliedAt: new Date().toISOString() };
 saveMemberships([...all, m]); return m;
}

export function getMembershipsForCell(cellName: string): CellMembership[] { return getAllMemberships().filter(m => m.cellName === cellName); }
export function getPendingForCell(cellName: string): CellMembership[] { return getMembershipsForCell(cellName).filter(m => m.approvalStatus === 'pending'); }
export function getMembershipsForEmployee(id: string): CellMembership[] { return getAllMemberships().filter(m => m.employeeId === id); }

export function approveMembership(membershipId: string, approverId: string, approverName: string): CellMembership | null {
 const all = getAllMemberships(); const idx = all.findIndex(m => m.id === membershipId); if (idx < 0) return null;
 const now = new Date().toISOString();
 all[idx] = { ...all[idx], approvalStatus: 'approved', approvedBy: approverId, approvedByName: approverName, approvedAt: now };
 saveMemberships(all);
 const staffAll = getAllStaff(); const sIdx = staffAll.findIndex(s => s.id === all[idx].employeeId);
 if (sIdx >= 0 && staffAll[sIdx].status === 'pending') { staffAll[sIdx] = { ...staffAll[sIdx], status: 'approved', lastUpdatedAt: now }; saveStaff(staffAll); }
 addAudit(all[idx].employeeId, `Approved for ${all[idx].cellName}`, approverId, approverName);
 return all[idx];
}

export function rejectMembership(membershipId: string, approverId: string, approverName: string, reason: string): CellMembership | null {
 const all = getAllMemberships(); const idx = all.findIndex(m => m.id === membershipId); if (idx < 0) return null;
 all[idx] = { ...all[idx], approvalStatus: 'rejected', approvedBy: approverId, approvedByName: approverName, approvedAt: new Date().toISOString(), rejectedReason: reason };
 saveMemberships(all);
 addAudit(all[idx].employeeId, `Rejected from ${all[idx].cellName}`, approverId, approverName, reason);
 return all[idx];
}

export function getAllAudit(): StaffAuditEntry[] { return safeGet<StaffAuditEntry[]>(AUDIT_KEY, []); }
export function getAudit(employeeId: string): StaffAuditEntry[] {
 return getAllAudit().filter(e => e.employeeId === employeeId).sort((a, b) => b.timestamp.localeCompare(a.timestamp));
}
export function addAudit(employeeId: string, action: string, performedBy?: string, performedByName?: string, detail?: string) {
 if (typeof window === 'undefined') return;
 const all = getAllAudit();
 all.push({ id: gid(), employeeId, timestamp: new Date().toISOString(), action, performedBy, performedByName, detail });
 localStorage.setItem(AUDIT_KEY, JSON.stringify(all.slice(-2000)));
}

export function getCellStats(cellName: string) {
 const m = getMembershipsForCell(cellName);
 return { total: m.length, pending: m.filter(x => x.approvalStatus === 'pending').length, approved: m.filter(x => x.approvalStatus === 'approved').length, rejected: m.filter(x => x.approvalStatus === 'rejected').length };
}
