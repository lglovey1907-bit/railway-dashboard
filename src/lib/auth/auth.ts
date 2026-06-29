import type { User, LoginCredentials, UserRole } from '@/types';
import { mockUsers } from '@/lib/data/mockData';
import { getUserPassword, isEmailVerified, mustChangePassword } from './passwordStore';

// ─────────────────────────────────────────────────────────────────────────────
// Static passwords for admin / maintenance accounts (never change)
// ─────────────────────────────────────────────────────────────────────────────
const STATIC_PASSWORDS: Record<string, string> = {
 // Maintenance account — login via username "Loveyy"; stored against internal email
 'loveyy@internal.rly.in': 'Lg199007',
 // Admin account — login via HRMS ID "SRDCMPS"; stored against internal email
 'srdcmps@internal.rly.in': 'LkBansal',
};
// Fallback for self-registered cell users (set on first login via passwordStore)
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

 // Also check staffDB users (localStorage first, then server fallback for cross-device access)
 if (!user) {
 try {
 let staffList: any[] = JSON.parse(localStorage.getItem('rly_staff_master') ?? '[]');
        let dbUser = staffList.find((s: any) =>
          s.email?.toLowerCase() === emailInput || s.hrmsId?.toLowerCase() === emailInput
        );

        // ── Cross-device fallback: fetch from server if user not in localStorage ──
        if (!dbUser) {
          try {
            // emailInput may be an HRMS ID (no '@'). KV keys are by email, so
            // if it looks like an HRMS ID use ?hrmsId= which scans staffRecord.hrmsId.
            const isEmail = emailInput.includes('@');
            const kvParam = isEmail
              ? `email=${encodeURIComponent(emailInput)}`
              : `hrmsId=${encodeURIComponent(emailInput)}`;
            const res = await fetch(`/api/users?${kvParam}`, { cache: 'no-store' });
            if (res.ok) {
              const serverData = await res.json();
              if (serverData?.staffRecord) {
                // Populate localStorage so future logins on this device are instant
                staffList = [...staffList, serverData.staffRecord];
                localStorage.setItem('rly_staff_master', JSON.stringify(staffList));

                if (serverData.password) {
                  const pwds = JSON.parse(localStorage.getItem('rly_user_passwords') ?? '{}');
                  if (!pwds[emailInput]) { pwds[emailInput] = serverData.password; localStorage.setItem('rly_user_passwords', JSON.stringify(pwds)); }
                }
                if (serverData.mustChange) {
                  const mc: string[] = JSON.parse(localStorage.getItem('rly_must_change_pwd') ?? '[]');
                  if (!mc.includes(emailInput)) localStorage.setItem('rly_must_change_pwd', JSON.stringify([...mc, emailInput]));
                } else {
                  // User already finished first-login on another device — skip OTP on this device too
                  const ver: string[] = JSON.parse(localStorage.getItem('rly_email_verified') ?? '[]');
                  if (!ver.includes(emailInput)) { ver.push(emailInput); localStorage.setItem('rly_email_verified', JSON.stringify(ver)); }
                }
                if (serverData.status && serverData.staffRecord?.id) {
                  const ov = JSON.parse(localStorage.getItem('rly_user_status_overrides') ?? '{}');
                  // Always overwrite — KV has the authoritative status (e.g. admin approved on another device)
                  ov[serverData.staffRecord.id] = serverData.status;
                  localStorage.setItem('rly_user_status_overrides', JSON.stringify(ov));
                }
                dbUser = serverData.staffRecord;
              }
            }
          } catch { /* server unavailable — continue with localStorage only */ }
        }

        // ── Status refresh for same-device users ─────────────────────────────
        // Problem: user registered from THIS device → dbUser found locally (status='pending')
        // → the !dbUser KV fallback never runs → admin's approval (in KV) is never seen.
        // Fix: if local status is still 'pending', always check KV for an updated status.
        if (dbUser) {
          const localOv = JSON.parse(localStorage.getItem('rly_user_status_overrides') ?? '{}');
          const localStatus = localOv[dbUser.id] ?? dbUser.status ?? 'pending';
          if (localStatus === 'pending') {
            try {
              // IMPORTANT: use dbUser.email — not emailInput.
              // If the user logged in with their HRMS ID, emailInput is the HRMS ID (e.g. 'UTSPRSSRCCTC123').
              // KV records are keyed by email address, so ?email=<hrmsId> always returns null.
              const kvEmail = dbUser.email?.toLowerCase().trim() ?? emailInput;
              const res = await fetch(`/api/users?email=${encodeURIComponent(kvEmail)}`, { cache: 'no-store' });
              if (res.ok) {
                const serverData = await res.json();
                if (serverData?.status) {
                  // Admin approved on their device → KV has the real status → apply it here.
                  // Use staffRecord.id if available; fall back to dbUser.id (KV may only have
                  // { email, status } when admin approved before staffRecord was included in POST).
                  const targetId = serverData.staffRecord?.id ?? dbUser.id;
                  localOv[targetId] = serverData.status;
                  localStorage.setItem('rly_user_status_overrides', JSON.stringify(localOv));
                  // Also write back to rly_staff_master so future logins skip the KV round-trip
                  if (serverData.status !== 'pending') {
                    const sIdx = staffList.findIndex((s: any) => s.id === targetId);
                    if (sIdx >= 0) {
                      staffList[sIdx] = {
                        ...staffList[sIdx],
                        status: serverData.status === 'active' ? 'approved' : serverData.status,
                        lastUpdatedAt: new Date().toISOString(),
                      };
                      localStorage.setItem('rly_staff_master', JSON.stringify(staffList));
                    }
                  }
                }
                // Also sync password if KV has one and we don't yet
                if (serverData?.password) {
                  const pwds = JSON.parse(localStorage.getItem('rly_user_passwords') ?? '{}');
                  if (!pwds[emailInput]) { pwds[emailInput] = serverData.password; localStorage.setItem('rly_user_passwords', JSON.stringify(pwds)); }
                }
              }
            } catch { /* KV unavailable — local status used as fallback */ }
          }
        }

        if (dbUser) {
          const statusOverrides = JSON.parse(localStorage.getItem('rly_user_status_overrides') ?? '{}');
          const effectiveStatus = statusOverrides[dbUser.id] ?? dbUser.status ?? 'pending';
          if (effectiveStatus === 'rejected' || effectiveStatus === 'inactive') {
            throw new Error('Account has been deactivated. Contact the Administrator.');
          }

          const allMemberships: any[] = JSON.parse(localStorage.getItem('rly_cell_memberships') ?? '[]');
          const approvedMemberships = allMemberships.filter(
            (m: any) => m.employeeId === dbUser.id && m.approvalStatus === 'approved'
          );
          const primaryCell = dbUser.cell ?? (approvedMemberships[0]?.cellName) ?? 'Unassigned';
          const approvedCells: string[] = approvedMemberships.map((m: any) => m.cellName);

          user = {
            id: dbUser.id, name: dbUser.name, email: dbUser.email,
            role: dbUser.role ?? 'user',
            cell: primaryCell,
            cells: approvedCells,
            designation: dbUser.designation, division: dbUser.division ?? 'Delhi',
            approved: effectiveStatus !== 'pending',
            createdAt: dbUser.registeredAt ?? new Date().toISOString(),
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

 const isStaticAccount = !!STATIC_PASSWORDS[userEmail];

 if (!user.approved && !isStaticAccount) {
 throw new Error('Account pending approval. Contact Sr.DCM/PS or CMI/G.');
 }

 // Status / deleted checks — always skip for maintenance & admin static accounts
 if (typeof window !== 'undefined' && !isStaticAccount) {
 const overrides = JSON.parse(localStorage.getItem('rly_user_status_overrides') ?? '{}');
 const status = overrides[user.id];
 if (status === 'inactive' || status === 'rejected') {
 throw new Error('Account has been deactivated. Contact the Administrator.');
 }
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
