import { sharedWrite } from '@/lib/config/sharedSync';
// ─────────────────────────────────────────────────────────────────────────────
// Tab Access Control — per-tab view/edit permissions
// Admin + Maintenance always have full access.
// Each tab stores its own config under rly_tab_access_<tabId>
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

function tabKey(tabId: string) { return `rly_tab_access_${tabId}`; }

export function getTabAccess(tabId: string): OverviewAccess {
  if (typeof window === 'undefined') return DEFAULT;
  try { return JSON.parse(localStorage.getItem(tabKey(tabId)) ?? 'null') ?? DEFAULT; } catch { return DEFAULT; }
}

export function saveTabAccess(tabId: string, a: OverviewAccess) {
  try { localStorage.setItem(tabKey(tabId), JSON.stringify(a)); } catch { /**/ }
  sharedWrite(`tab_access_${tabId}`, a);
}

/** Backward-compatible wrappers for the Overview tab */
export function getOverviewAccess(): OverviewAccess { return getTabAccess('overview'); }
export function saveOverviewAccess(a: OverviewAccess) { saveTabAccess('overview', a); }

export function canViewTab(
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

export function canEditTab(
  user: { id: string; role: string } | null,
  access: OverviewAccess,
): boolean {
  if (!user) return false;
  if (user.role === 'admin' || user.role === 'maintenance') return true;
  return access.editUserIds.includes(user.id);
}

/** Backward-compatible aliases */
export const canViewOverview = canViewTab;
export const canEditOverview = canEditTab;
