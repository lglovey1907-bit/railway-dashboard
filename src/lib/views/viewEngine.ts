import { cloudWrite, cloudRead } from '@/lib/config/cloudSync';

// ─────────────────────────────────────────────────────────────────────────────
// View Engine — Notion-style multiple views per data source (req 105-115)
//
// Every view is stored in localStorage under a per-source key so it persists
// across refresh, logout, and Vercel deployments.
// ─────────────────────────────────────────────────────────────────────────────

export type ViewLayout = 'table' | 'card' | 'list' | 'board' | 'gallery';

export interface ViewFilter {
  id: string;
  field: string;        // column name to filter on
  op: 'eq' | 'neq' | 'contains' | 'not_contains' | 'empty' | 'not_empty';
  value: string;
}

export interface ViewSort {
  field: string;
  dir: 'asc' | 'desc';
}

export interface ViewField {
  column: string;       // exact sheet column name
  label: string;        // display label (user-editable)
  visible: boolean;
  order: number;
  width?: number;       // px, optional
  frozen?: boolean;
}

export interface View {
  id: string;
  label: string;                // user-editable name (req 105)
  layout: ViewLayout;
  fields: ViewField[];          // per-view field config (req 106)
  filters: ViewFilter[];        // per-view filters (req 111)
  sorts: ViewSort[];            // per-view sorting
  groupBy?: string;             // column to group by (req 112)
  isDefault: boolean;
  isPersonal: boolean;          // personal vs shared (req 114)
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface ViewStore {
  sourceKey: string;            // e.g. 'sheet_nsg_category_wise'
  views: View[];
  activeViewId: string;
  syncIntervalMinutes: number;  // req 108 — configurable sync frequency
}

// ── Storage ───────────────────────────────────────────────────────────────────
function storeKey(sourceKey: string) {
  return `rly_views_${sourceKey}`;
}

function gid() { return `v${Date.now()}${Math.floor(Math.random() * 9999)}`; }
function fid() { return `f${Date.now()}${Math.floor(Math.random() * 9999)}`; }

// ── Built-in views for the NSG/Overview page ──────────────────────────────────
function makeBuiltinViews(): View[] {
  const now = new Date().toISOString();
  return [
    {
      id: 'v_nsg', label: 'NSG Category Wise', layout: 'card',
      fields: [], filters: [], sorts: [], isDefault: true,
      isPersonal: false, createdBy: 'system', createdAt: now, updatedAt: now,
    },
    {
      id: 'v_station', label: 'Station Wise', layout: 'table',
      fields: [], filters: [], sorts: [{ field: 'Name', dir: 'asc' }],
      isDefault: false, isPersonal: false, createdBy: 'system', createdAt: now, updatedAt: now,
    },
    {
      id: 'v_section', label: 'Section Wise', layout: 'table',
      fields: [], filters: [], sorts: [], groupBy: 'Section',
      isDefault: false, isPersonal: false, createdBy: 'system', createdAt: now, updatedAt: now,
    },
    {
      id: 'v_cmi', label: 'CMI Wise', layout: 'table',
      fields: [], filters: [], sorts: [], groupBy: 'CMI',
      isDefault: false, isPersonal: false, createdBy: 'system', createdAt: now, updatedAt: now,
    },
  ];
}

export function getViewStore(sourceKey: string): ViewStore {
  if (typeof window === 'undefined') return makeDefault(sourceKey);
  try {
    const raw = localStorage.getItem(storeKey(sourceKey));
    if (raw) return JSON.parse(raw) as ViewStore;
  } catch { /* ignore */ }
  return makeDefault(sourceKey);
}

function makeDefault(sourceKey: string): ViewStore {
  const views = makeBuiltinViews();
  return {
    sourceKey, views,
    activeViewId: views[0].id,
    syncIntervalMinutes: 30,
  };
}

export function saveViewStore(store: ViewStore, userId?: string): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(storeKey(store.sourceKey), JSON.stringify(store));
  // Sync to Upstash for cross-device persistence
  if (userId) {
    cloudWrite(userId, `view_store_${store.sourceKey}`, store)
      .catch(e => console.warn('[viewEngine] cloud write failed:', e));
  }
}

export async function loadViewStoreFromCloud(sourceKey: string, userId: string): Promise<ViewStore | null> {
  if (!userId) return null;
  const { value } = await cloudRead(userId, `view_store_${sourceKey}`);
  if (!value) return null;
  const store = value as ViewStore;
  if (typeof window !== 'undefined') {
    localStorage.setItem(storeKey(sourceKey), JSON.stringify(store));
  }
  return store;
}

// ── View mutations ────────────────────────────────────────────────────────────
export function createView(
  store: ViewStore,
  label: string,
  layout: ViewLayout,
  userId: string,
  templateFromId?: string,
): ViewStore {
  const now = new Date().toISOString();
  const template = templateFromId
    ? store.views.find(v => v.id === templateFromId)
    : null;
  const newView: View = {
    id: gid(), label, layout,
    fields:  template ? JSON.parse(JSON.stringify(template.fields))  : [],
    filters: template ? JSON.parse(JSON.stringify(template.filters)) : [],
    sorts:   template ? JSON.parse(JSON.stringify(template.sorts))   : [],
    groupBy: template?.groupBy,
    isDefault: false, isPersonal: false,
    createdBy: userId, createdAt: now, updatedAt: now,
  };
  return { ...store, views: [...store.views, newView], activeViewId: newView.id };
}

export function renameView(store: ViewStore, viewId: string, label: string): ViewStore {
  return {
    ...store,
    views: store.views.map(v =>
      v.id !== viewId ? v : { ...v, label, updatedAt: new Date().toISOString() }
    ),
  };
}

export function duplicateView(store: ViewStore, viewId: string): ViewStore {
  const src = store.views.find(v => v.id === viewId);
  if (!src) return store;
  const now = new Date().toISOString();
  const copy: View = {
    ...JSON.parse(JSON.stringify(src)),
    id: gid(), label: `${src.label} (copy)`,
    isDefault: false, createdAt: now, updatedAt: now,
  };
  return { ...store, views: [...store.views, copy], activeViewId: copy.id };
}

export function deleteView(store: ViewStore, viewId: string): ViewStore {
  if (store.views.length <= 1) return store; // must keep at least one
  const remaining = store.views.filter(v => v.id !== viewId);
  const activeId = store.activeViewId === viewId
    ? (remaining.find(v => v.isDefault) ?? remaining[0]).id
    : store.activeViewId;
  return { ...store, views: remaining, activeViewId: activeId };
}

export function setDefaultView(store: ViewStore, viewId: string): ViewStore {
  return {
    ...store,
    views: store.views.map(v => ({ ...v, isDefault: v.id === viewId })),
  };
}

export function setActiveView(store: ViewStore, viewId: string): ViewStore {
  return { ...store, activeViewId: viewId };
}

export function updateViewFields(store: ViewStore, viewId: string, fields: ViewField[]): ViewStore {
  return {
    ...store,
    views: store.views.map(v =>
      v.id !== viewId ? v : { ...v, fields, updatedAt: new Date().toISOString() }
    ),
  };
}

export function updateViewFilters(store: ViewStore, viewId: string, filters: ViewFilter[]): ViewStore {
  return {
    ...store,
    views: store.views.map(v =>
      v.id !== viewId ? v : { ...v, filters, updatedAt: new Date().toISOString() }
    ),
  };
}

export function updateViewGroupBy(store: ViewStore, viewId: string, groupBy: string | undefined): ViewStore {
  return {
    ...store,
    views: store.views.map(v =>
      v.id !== viewId ? v : { ...v, groupBy, updatedAt: new Date().toISOString() }
    ),
  };
}

export function updateSyncInterval(store: ViewStore, minutes: number): ViewStore {
  return { ...store, syncIntervalMinutes: minutes };
}

// ── Per-view field helpers ────────────────────────────────────────────────────
/**
 * Merges sheet headers into a view's field list.
 * New columns are added as hidden; existing user config is preserved.
 */
export function syncViewFields(
  view: View, sheetHeaders: string[]
): ViewField[] {
  const existing = new Set(view.fields.map(f => f.column));
  const newFields: ViewField[] = sheetHeaders
    .filter(h => h && !existing.has(h))
    .map((h, i) => ({
      column: h, label: h,
      visible: view.fields.length === 0, // first sync: all visible
      order: view.fields.length + i,
    }));
  return [...view.fields, ...newFields];
}

// ── Filter application ────────────────────────────────────────────────────────
export function applyFilters<T extends Record<string, string>>(
  rows: T[], filters: ViewFilter[]
): T[] {
  if (!filters.length) return rows;
  return rows.filter(row =>
    filters.every(f => {
      const val = (row[f.field] ?? '').toLowerCase();
      const cmp = f.value.toLowerCase();
      switch (f.op) {
        case 'eq':          return val === cmp;
        case 'neq':         return val !== cmp;
        case 'contains':    return val.includes(cmp);
        case 'not_contains':return !val.includes(cmp);
        case 'empty':       return val === '';
        case 'not_empty':   return val !== '';
        default:            return true;
      }
    })
  );
}

export const LAYOUT_OPTIONS: { id: ViewLayout; label: string; icon: string }[] = [
  { id: 'table',   label: 'Table',   icon: 'Table2' },
  { id: 'card',    label: 'Card',    icon: 'LayoutGrid' },
  { id: 'list',    label: 'List',    icon: 'List' },
  { id: 'board',   label: 'Kanban',  icon: 'Columns' },
  { id: 'gallery', label: 'Gallery', icon: 'Image' },
];

export const OP_LABELS: Record<ViewFilter['op'], string> = {
  eq:          'equals',
  neq:         'not equals',
  contains:    'contains',
  not_contains:'does not contain',
  empty:       'is empty',
  not_empty:   'is not empty',
};
