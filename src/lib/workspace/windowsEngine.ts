/**
 * Windows Engine
 * Each Cell can have multiple independent "Windows" (pages/workspaces).
 * Each Window has its own RowBasedLayout stored separately.
 * Windows have visibility/permission settings.
 */
import { getRowLayout, saveRowLayout, type RowBasedLayout } from './layoutEngine';
import { sharedRead, sharedWrite } from '@/lib/config/sharedSync';

export type WindowVisibility = 'personal' | 'cell' | 'role' | 'admin' | 'public';

export interface CellWindow {
  id: string;
  cell: string;
  label: string;
  icon?: string;      // emoji or icon name
  color?: string;     // accent color
  description?: string;
  isDefault: boolean;
  isPinned: boolean;
  visibility: WindowVisibility;
  visibleToRoles?: string[];
  visibleToUsers?: string[];
  ownerId: string;
  ownerName: string;
  createdAt: string;
  updatedAt: string;
  isArchived?: boolean;
}

export interface CellWindowStore {
  cell: string;
  windows: CellWindow[];
  activeWindowId: string;
}

// Storage key
const WIN_KEY = (cell: string) =>
  `rly_windows_${cell.replace(/[^a-zA-Z0-9]/g, '_')}`;

// Layout key per window
export const WIN_LAYOUT_KEY = (cell: string, windowId: string) =>
  `${cell}__win__${windowId}`;

function gid() { return `win_${Date.now()}_${Math.floor(Math.random() * 9999)}`; }

function makeDefaultWindow(cell: string, userId: string, userName: string): CellWindow {
  const now = new Date().toISOString();
  return {
    id: gid(), cell, label: 'Main Workspace', icon: '🏠',
    isDefault: true, isPinned: true, visibility: 'cell',
    ownerId: userId, ownerName: userName, createdAt: now, updatedAt: now,
  };
}

export function getWindowStore(cell: string, userId = 'system', userName = 'System'): CellWindowStore {
  if (typeof window === 'undefined') {
    const def = makeDefaultWindow(cell, userId, userName);
    return { cell, windows: [def], activeWindowId: def.id };
  }
  try {
    const raw = localStorage.getItem(WIN_KEY(cell));
    if (raw) return JSON.parse(raw) as CellWindowStore;
  } catch {}
  const def = makeDefaultWindow(cell, userId, userName);
  const store: CellWindowStore = { cell, windows: [def], activeWindowId: def.id };
  saveWindowStore(store);
  return store;
}

function windowLayoutCell(cell: string, windowId: string) {
  return `${cell}__win__${windowId}`;
}

function rowStorageKey(cell: string) {
  return `rly_rowlayout_${cell.replace(/[^a-zA-Z0-9]/g, '_')}`;
}

export async function loadWindowStoreFromCloud(cell: string): Promise<CellWindowStore | null> {
  try {
    const raw = await sharedRead(WIN_KEY(cell));
    if (!raw) return null;
    return raw as CellWindowStore;
  } catch {
    return null;
  }
}

export async function loadWindowLayoutFromCloud(cell: string, windowId: string): Promise<RowBasedLayout | null> {
  try {
    const raw = await sharedRead(rowStorageKey(windowLayoutCell(cell, windowId)));
    if (!raw) return null;
    return raw as RowBasedLayout;
  } catch {
    return null;
  }
}

export function saveWindowStore(store: CellWindowStore): void {
  if (typeof window === 'undefined') return;
  const key = WIN_KEY(store.cell);
  localStorage.setItem(key, JSON.stringify(store));
  sharedWrite(key, store);
}

export function createWindow(
  store: CellWindowStore,
  label: string, icon: string,
  visibility: WindowVisibility,
  userId: string, userName: string,
  visibleToRoles?: string[],
  visibleToUsers?: string[],
  cloneFromId?: string,
): CellWindowStore {
  const now = new Date().toISOString();
  const id = gid();
  const newWin: CellWindow = {
    id, cell: store.cell, label, icon, isDefault: false, isPinned: false,
    visibility, visibleToRoles, visibleToUsers,
    ownerId: userId, ownerName: userName, createdAt: now, updatedAt: now,
  };

  // Clone layout if requested
  if (cloneFromId) {
    const srcLayout = getWindowLayout(store.cell, cloneFromId);
    const cloned: RowBasedLayout = { ...srcLayout, cell: WIN_LAYOUT_KEY(store.cell, id) };
    saveRowLayout(cloned);
  }

  return { ...store, windows: [...store.windows, newWin], activeWindowId: id };
}

export function updateWindow(store: CellWindowStore, id: string, patch: Partial<CellWindow>): CellWindowStore {
  return {
    ...store,
    windows: store.windows.map(w => w.id !== id ? w : { ...w, ...patch, updatedAt: new Date().toISOString() }),
  };
}

export function deleteWindow(store: CellWindowStore, id: string): CellWindowStore {
  const remaining = store.windows.filter(w => w.id !== id);
  if (remaining.length === 0) return store; // never delete the last window
  const nextActive = store.activeWindowId === id
    ? (remaining.find(w => w.isDefault) ?? remaining[0]).id
    : store.activeWindowId;
  return { ...store, windows: remaining, activeWindowId: nextActive };
}

export function getVisibleWindows(
  store: CellWindowStore, userId: string, userRole: string
): CellWindow[] {
  return store.windows.filter(w => {
    if (w.isArchived) return false;
    if (w.visibility === 'public') return true;
    if (w.visibility === 'cell') {
      // If specific users were selected, only they (+ owner) can see it
      if (w.visibleToUsers && w.visibleToUsers.length > 0) {
        return w.ownerId === userId || w.visibleToUsers.includes(userId);
      }
      return true; // no restriction = all cell members
    }
    if (w.visibility === 'personal') return w.ownerId === userId;
    if (w.visibility === 'admin') {
      if (userRole !== 'admin' && userRole !== 'maintenance') return false;
      // If specific admins were selected, only they (+ owner) can see it
      if (w.visibleToUsers && w.visibleToUsers.length > 0) {
        return w.ownerId === userId || w.visibleToUsers.includes(userId);
      }
      return true; // no restriction = all admins
    }
    if (w.visibility === 'role') return (w.visibleToRoles ?? []).includes(userRole);
    return true;
  });
}

/** Get the RowBasedLayout for a specific window */
export function getWindowLayout(cell: string, windowId: string): RowBasedLayout {
  return getRowLayout(windowLayoutCell(cell, windowId));
}

/** Save the RowBasedLayout for a specific window */
export function saveWindowLayout(cell: string, windowId: string, layout: RowBasedLayout): void {
  saveRowLayout({ ...layout, cell: windowLayoutCell(cell, windowId) });
}

export const WINDOW_ICONS = ['🏠','📊','📋','📁','👥','🔍','📈','💼','📌','🗂️','⚡','🎯','📝','🔔','🗓️'];
export const WINDOW_COLORS: { id: string; label: string; cls: string }[] = [
  { id: 'blue',    label: 'Blue',    cls: 'bg-blue-500' },
  { id: 'indigo',  label: 'Indigo',  cls: 'bg-indigo-500' },
  { id: 'violet',  label: 'Violet',  cls: 'bg-violet-500' },
  { id: 'emerald', label: 'Green',   cls: 'bg-emerald-500' },
  { id: 'amber',   label: 'Amber',   cls: 'bg-amber-500' },
  { id: 'rose',    label: 'Rose',    cls: 'bg-rose-500' },
  { id: 'slate',   label: 'Slate',   cls: 'bg-slate-500' },
];
