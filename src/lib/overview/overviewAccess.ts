// ─────────────────────────────────────────────────────────────────────────────
// Overview Page Access Control
// Admin + Maintenance always have full view+edit access.
// Additional users can be granted view or edit access here.
// ─────────────────────────────────────────────────────────────────────────────

export type ViewMode = 'all' | 'selected';

export interface OverviewAccess {
  /** 'all' = any logged-in user can view; 'selected' = only chosen roles/users */
  viewMode: ViewMode;
  /** Role names allowed to view when viewMode === 'selected' */
  viewRoles: string[];
  /** Specific user IDs allowed to view when viewMode === 'selected' */
  viewUserIds: string[];
  /** Extra user IDs allowed to edit (Admin+Maintenance always can edit) */
  editUserIds: string[];
}

const DEFAULT: OverviewAccess = {
  viewMode: 'all',
  viewRoles: [],
  viewUserIds: [],
  editUserIds: [],
};

const KEY = 'rly_overview_access';

export function getOverviewAccess(): OverviewAccess {
  if (typeof window === 'undefined') return DEFAULT;
  try { return JSON.parse(localStorage.getItem(KEY) ?? 'null') ?? DEFAULT; } catch { return DEFAULT; }
}

export function saveOverviewAccess(a: OverviewAccess) {
  try { localStorage.setItem(KEY, JSON.stringify(a)); } catch { /**/ }
}

export function canViewOverview(
  user: { id: string; role: string } | null,
  access: OverviewAccess,
): boolean {
  if (!user) return false;
  if (user.role === 'admin' || user.role === 'maintenance') return true;
  if (access.viewMode === 'all') return true;
  if (access.viewRoles.includes(user.role)) return true;
  if (access.viewUserIds.includes(user.id)) return true;
  return false;
}

export function canEditOverview(
  user: { id: string; role: string } | null,
  access: OverviewAccess,
): boolean {
  if (!user) return false;
  if (user.role === 'admin' || user.role === 'maintenance') return true;
  return access.editUserIds.includes(user.id);
}
