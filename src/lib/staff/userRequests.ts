// ─────────────────────────────────────────────────────────────────────────────
// User Request System — Cell Heads submit, Admin/Maintenance approve
// ─────────────────────────────────────────────────────────────────────────────

export type RequestType = 'add' | 'remove' | 'transfer' | 'role_change' | 'status_change';
export type RequestStatus = 'pending' | 'approved' | 'rejected' | 'clarification_needed';
export type UserStatus = 'active' | 'pending' | 'inactive' | 'suspended' | 'rejected' | 'transferred' | 'retired';

export interface UserRequest {
 id: string;
 type: RequestType;
 status: RequestStatus;

 // Who filed the request
 requestedBy: string; // userId
 requestedByName: string;
 requestedAt: string;

 // Target employee
 targetEmployeeId?: string; // null for new additions
 targetName: string;
 targetEmail?: string;
 targetMobile?: string;
 targetDesignation?: string;
 targetHrmsId?: string;
 targetWorkingAs?: string;
 reportingOfficer?: string;

 // Cell info
 fromCell?: string; // for remove/transfer
 toCell?: string; // for add/transfer
 role?: string; // role being requested

 // Notes
 reason?: string;
 clarification?: string;

 // Resolution
 resolvedBy?: string;
 resolvedByName?: string;
 resolvedAt?: string;
 rejectionReason?: string;
}

const REQ_KEY = 'rly_user_requests';
const USER_STATUS_KEY = 'rly_user_status_overrides'; // employeeId → UserStatus

function gid() { return `req_${Date.now()}_${Math.floor(Math.random()*10000)}`; }
function safeGet<T>(key: string, fb: T): T {
 if (typeof window === 'undefined') return fb;
 try { return JSON.parse(localStorage.getItem(key) ?? 'null') ?? fb; } catch { return fb; }
}

// ── Requests CRUD ─────────────────────────────────────────────────────────────
export function getAllRequests(): UserRequest[] { return safeGet<UserRequest[]>(REQ_KEY, []); }
function saveRequests(r: UserRequest[]) { if (typeof window !== 'undefined') localStorage.setItem(REQ_KEY, JSON.stringify(r)); }

export function getPendingRequests(): UserRequest[] { return getAllRequests().filter(r => r.status === 'pending'); }
export function getRequestsByType(type: RequestType): UserRequest[] { return getAllRequests().filter(r => r.type === type); }
export function getRequestsForEmployee(employeeId: string): UserRequest[] { return getAllRequests().filter(r => r.targetEmployeeId === employeeId); }

export function createRequest(data: Omit<UserRequest, 'id' | 'status' | 'requestedAt'>): UserRequest {
 const req: UserRequest = { ...data, id: gid(), status: 'pending', requestedAt: new Date().toISOString() };
 saveRequests([...getAllRequests(), req]);
 return req;
}

export function resolveRequest(
 id: string,
 resolution: 'approved' | 'rejected' | 'clarification_needed',
 resolvedBy: string, resolvedByName: string,
 rejectionReason?: string,
): UserRequest | null {
 const all = getAllRequests();
 const idx = all.findIndex(r => r.id === id);
 if (idx < 0) return null;
 all[idx] = {
 ...all[idx], status: resolution,
 resolvedBy, resolvedByName, resolvedAt: new Date().toISOString(),
 rejectionReason,
 };
 saveRequests(all);
 return all[idx];
}

// ── User status overrides (persists status for mock + real users) ─────────────
export function getUserStatusOverrides(): Record<string, UserStatus> {
 return safeGet<Record<string, UserStatus>>(USER_STATUS_KEY, {});
}

export function setUserStatus(employeeId: string, status: UserStatus): void {
 const all = getUserStatusOverrides();
 all[employeeId] = status;
 if (typeof window !== 'undefined') localStorage.setItem(USER_STATUS_KEY, JSON.stringify(all));
}

export function getUserStatus(employeeId: string, defaultStatus: UserStatus = 'active'): UserStatus {
 return getUserStatusOverrides()[employeeId] ?? defaultStatus;
}

// ── Direct admin add (no request flow needed) ─────────────────────────────────
export function adminAddUser(data: {
 name: string; email: string; mobile?: string; designation: string;
 cell: string; hrmsId?: string; workingAs?: string; reportingOfficer?: string;
 role?: string;
}, addedBy: string, addedByName: string, autoApprove: boolean): string {
 const { registerEmployee, addAudit } = require('./staffDB');
 const id = `u_${Date.now()}_${Math.floor(Math.random()*10000)}`;
 const resolvedRole = data.role && data.role !== 'user'
 ? data.role
 : (data.workingAs === 'Incharge' ? 'incharge' : 'user');
 registerEmployee({
 id, name: data.name, email: data.email, mobile: data.mobile,
 designation: data.designation, cell: data.cell, division: 'Delhi',
 role: resolvedRole, hrmsId: data.hrmsId, workingAs: data.workingAs,
 });
 // Set default password and flag must-change on first login
 if (data.email) {
 const { registerUserPassword } = require('../auth/passwordStore');
 registerUserPassword(data.email, data.cell, data.designation);
 }
 if (autoApprove) {
 const { approveMembership, getAllMemberships } = require('./staffDB');
 const m = getAllMemberships().find((m: any) => m.employeeId === id);
 if (m) approveMembership(m.id, addedBy, addedByName);
 setUserStatus(id, 'active');
 addAudit(id, 'Added by administrator (auto-approved)', addedBy, addedByName);
 } else {
 addAudit(id, 'Added by administrator (pending approval)', addedBy, addedByName);
 }
 return id;
}

// ── Label helpers ─────────────────────────────────────────────────────────────
export const REQUEST_TYPE_LABELS: Record<RequestType, string> = {
 add: 'Add Staff', remove: 'Remove Staff', transfer: 'Transfer',
 role_change: 'Role Change', status_change: 'Status Change',
};

export const STATUS_LABELS: Record<RequestStatus, string> = {
 pending: 'Pending', approved: 'Approved', rejected: 'Rejected',
 clarification_needed: 'Needs Clarification',
};

export const USER_STATUS_LABELS: Record<UserStatus, string> = {
 active: 'Active', pending: 'Pending Approval', inactive: 'Inactive',
 suspended: 'Suspended', rejected: 'Rejected', transferred: 'Transferred', retired: 'Retired',
};

export const USER_STATUS_COLORS: Record<UserStatus, string> = {
 active: 'bg-emerald-100 text-emerald-700 border-emerald-300 ',
 pending: 'bg-amber-100 text-amber-700 border-amber-300 ',
 inactive: 'bg-slate-100 text-slate-500 border-slate-300 ',
 suspended: 'bg-red-100 text-red-700 border-red-300 ',
 rejected: 'bg-red-100 text-red-600 border-red-200 ',
 transferred: 'bg-blue-100 text-blue-700 border-blue-300 ',
 retired: 'bg-purple-100 text-purple-600 border-purple-200 ',
};
