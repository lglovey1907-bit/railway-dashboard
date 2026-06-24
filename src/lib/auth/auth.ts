import type { User, LoginCredentials, UserRole } from '@/types';
import { mockUsers } from '@/lib/data/mockData';
import { getUserPassword, isEmailVerified, mustChangePassword } from './passwordStore';

// ─────────────────────────────────────────────────────────────────────────────
// Static passwords for admin / maintenance accounts (never change)
// ─────────────────────────────────────────────────────────────────────────────
const STATIC_PASSWORDS: Record<string, string> = {
 'lovey.gandhi@delhi.nr.in': 'CMI@Lovey2026',
 'srdcm.ps@delhi.nr.in': 'SrDCM@2026',
 'dcm.ps@delhi.nr.in': 'DCM@PS2026',
 'dcm.tc@delhi.nr.in': 'DCM@TC2026',
 'acm.chg@delhi.nr.in': 'ACM@Chg2026',
};
// Legacy fallback for cell users who haven't been set up in passwordStore yet
const DEFAULT_USER_PASSWORD = 'User@2026';

export const AUTH_TOKEN_KEY = 'rly_dashboard_token';
export const AUTH_USER_KEY = 'rly_dashboard_user';

export interface JWTPayload {
 sub: string;
 email: string;
 role: UserRole;
 cell: string;
 iat: number;
 exp: number;
}

function btoa64(obj: object): string {
 return btoa(JSON.stringify(obj)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
}

export function createToken(user: User): string {
 const header = btoa64({ alg: 'HS256', typ: 'JWT' });
 const payload = btoa64({
 sub: user.id,
 email: user.email,
 role: user.role,
 cell: user.cell,
 iat: Math.floor(Date.now() / 1000),
 exp: Math.floor(Date.now() / 1000) + 86400 * 7,
 });
 const signature = btoa64({ sig: `${user.id}_${user.role}` });
 return `${header}.${payload}.${signature}`;
}

export function decodeToken(token: string): JWTPayload | null {
 try {
 const parts = token.split('.');
 if (parts.length !== 3) return null;
 const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')));
 if (payload.exp < Math.floor(Date.now() / 1000)) return null;
 return payload as JWTPayload;
 } catch {
 return null;
 }
}

export async function authenticateUser(
 credentials: LoginCredentials
): Promise<{ user: User; token: string } | null> {
 await new Promise(resolve => setTimeout(resolve, 600));

 const emailInput = credentials.email.trim().toLowerCase();

 // Find user by email OR by HRMS ID (User ID field)
 const allMockUsers = mockUsers;
 let user = allMockUsers.find(u => u.email.toLowerCase() === emailInput);

 // Try HRMS ID match if not found by email
 if (!user) {
 user = allMockUsers.find(u => u.hrmsId?.toLowerCase() === emailInput);
 }

 // Also check staffDB users
 if (!user) {
 try {
 const staffDB: any[] = JSON.parse(localStorage.getItem('rly_staff_master') ?? '[]');
 const dbUser = staffDB.find((s: any) =>
 s.email?.toLowerCase() === emailInput || s.hrmsId?.toLowerCase() === emailInput
 );
 if (dbUser) {
 // Map staffDB record to User shape
 const statusOverrides = JSON.parse(localStorage.getItem('rly_user_status_overrides') ?? '{}');
 const status = statusOverrides[dbUser.id] ?? dbUser.status ?? 'pending';
 if (status === 'rejected' || status === 'inactive') {
 throw new Error('Account has been deactivated. Contact the Administrator.');
 }
 if (status === 'pending') {
 throw new Error('Account pending approval. Contact your Cell Head or Administrator.');
 }
 user = {
 id: dbUser.id, name: dbUser.name, email: dbUser.email,
 role: dbUser.role ?? 'user', cell: dbUser.cell ?? 'Unassigned',
 designation: dbUser.designation, division: dbUser.division ?? 'Delhi',
 approved: true, createdAt: dbUser.registeredAt ?? new Date().toISOString(),
 hrmsId: dbUser.hrmsId, workingAs: dbUser.workingAs,
 mobile: dbUser.mobile, mobileNumber: dbUser.mobile,
 mustChangePassword: mustChangePassword(dbUser.email),
 } as User;
 }
 } catch (e: any) {
 if (e.message) throw e;
 }
 }

 if (!user) return null;

 const userEmail = user.email.toLowerCase();

 if (!user.approved) {
 throw new Error('Account pending approval. Contact Sr.DCM/PS or CMI/G.');
 }

 // Check status overrides for mock users too
 if (typeof window !== 'undefined') {
 const overrides = JSON.parse(localStorage.getItem('rly_user_status_overrides') ?? '{}');
 const status = overrides[user.id];
 if (status === 'inactive' || status === 'rejected') {
 throw new Error('Account has been deactivated. Contact the Administrator.');
 }
 // Check deleted list
 const deleted: string[] = JSON.parse(localStorage.getItem('rly_deleted_users') ?? '[]');
 if (deleted.includes(user.id)) {
 throw new Error('Account not found.');
 }
 }

 // Password check:
 // 1. Static password for admin/maintenance accounts
 if (STATIC_PASSWORDS[userEmail]) {
 if (credentials.password !== STATIC_PASSWORDS[userEmail]) return null;
 } else {
 // 2. Check passwordStore (set when user was created)
 const storedPwd = typeof window !== 'undefined' ? getUserPassword(userEmail) : null;
 const expectedPwd = storedPwd ?? DEFAULT_USER_PASSWORD;
 if (credentials.password !== expectedPwd) return null;
 }

 // Set mustChangePassword flag on user object
 const needsChange = typeof window !== 'undefined' ? mustChangePassword(userEmail) : false;

 const finalUser: User = { ...user, mustChangePassword: needsChange };
 const token = createToken(finalUser);
 return { user: finalUser, token };
}

export function getStoredAuth(): { user: User; token: string } | null {
 if (typeof window === 'undefined') return null;
 try {
 const token = localStorage.getItem(AUTH_TOKEN_KEY);
 const userStr = localStorage.getItem(AUTH_USER_KEY);
 if (!token || !userStr) return null;
 const payload = decodeToken(token);
 if (!payload) { clearStoredAuth(); return null; }
 return { user: JSON.parse(userStr), token };
 } catch {
 return null;
 }
}

export function storeAuth(user: User, token: string): void {
 if (typeof window === 'undefined') return;
 localStorage.setItem(AUTH_TOKEN_KEY, token);
 localStorage.setItem(AUTH_USER_KEY, JSON.stringify(user));
}

export function clearStoredAuth(): void {
 if (typeof window === 'undefined') return;
 localStorage.removeItem(AUTH_TOKEN_KEY);
 localStorage.removeItem(AUTH_USER_KEY);
}

// ─── RBAC ────────────────────────────────────────────────────────────────────
export type Permission =
 | 'view:all-cells'
 | 'view:own-cell'
 | 'manage:users'
 | 'approve:registrations'
 | 'configure:datasources'
 | 'manage:dashboards'
 | 'approve:reports'
 | 'export:reports'
 | 'submit:data'
 | 'request:export'
 | 'view:confidential';

const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
 maintenance: [
 'view:all-cells', 'manage:users', 'approve:registrations',
 'configure:datasources', 'manage:dashboards', 'approve:reports',
 'export:reports', 'submit:data', 'request:export', 'view:confidential',
 ],
 admin: [
 'view:all-cells', 'manage:users', 'approve:reports',
 'export:reports', 'submit:data', 'request:export', 'view:confidential',
 ],
 incharge: [
 // Full control of their own cell only — same as admin but scoped to one cell
 'view:own-cell', 'manage:dashboards', 'approve:reports',
 'export:reports', 'submit:data', 'request:export',
 ],
 user: [
 'view:own-cell', 'submit:data', 'request:export',
 ],
};

export function hasPermission(role: UserRole, permission: Permission): boolean {
 return ROLE_PERMISSIONS[role]?.includes(permission) ?? false;
}

export function canViewCell(user: User, cell: string): boolean {
 if (user.role === 'maintenance' || user.role === 'admin') return true;
 // incharge: full control of own cell only, cannot see other cells
 if (user.role === 'incharge') return user.cell === cell;
 return user.cell === cell || cell === 'All';
}
