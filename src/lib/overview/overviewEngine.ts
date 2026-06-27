/**
 * Overview Engine — dynamic KPIs, properties, views, filters, sorts
 * All driven from sheet data — no hardcoded fields (req 19)
 */
import type { SheetRow } from '@/lib/sheets/googleSheets';

export type PropertyType =
  | 'text' | 'number' | 'currency' | 'date' | 'select'
  | 'email' | 'phone' | 'url' | 'checkbox' | 'formula';

export interface Property {
  id: string;
  column: string;
  label: string;
  type: PropertyType;
  visible: boolean;
  order: number;
  width?: number;
  frozen?: boolean;
  wrap?: boolean;
  align?: 'left' | 'center' | 'right';
}

export interface DBFilter {
  id: string;
  field: string;
  op: 'eq'|'neq'|'contains'|'not_contains'|'empty'|'not_empty'|'gt'|'lt';
  value: string;
  logic: 'and'|'or';
}

export type SortDir = 'asc' | 'desc';
export type NullsPos = 'first' | 'last';

export interface DBSort {
  id: string;
  field: string;
  dir: SortDir;
  nulls?: NullsPos;
}

export interface SortPreset {
  id: string;
  name: string;
  sorts: DBSort[];
}

export type ViewLayout = 'table'|'card'|'list'|'board'|'gallery';

export interface DBView {
  id: string;
  label: string;
  layout: ViewLayout;
  properties: Property[];
  filters: DBFilter[];
  sorts: DBSort[];
  groupBy?: string;
  groupBy2?: string;
  isDefault: boolean;
  // Visibility & ownership (Part 1)
  ownerId?: string;          // userId who created the view
  ownerName?: string;
  visibility: 'personal' | 'cell' | 'role' | 'users' | 'admin' | 'public';
  visibleToRoles?: string[];  // UserRole[]
  visibleToUsers?: string[];  // userId[]
  visibleToCells?: string[];  // cell names
  sortPresets?: SortPreset[];
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface DBViewStore {
  sourceKey: string;
  views: DBView[];
  activeViewId: string;
  syncIntervalMinutes: number;
  updatedAt: string;
}

function gid() { return `p${Date.now()}${Math.floor(Math.random() * 9999)}`; }

function guessType(col: string, samples: string[]): PropertyType {
  const h = col.toLowerCase();
  if (h.includes('email')) return 'email';
  if (h.includes('phone') || h.includes('mobile')) return 'phone';
  if (h.includes('url') || h.includes('link')) return 'url';
  if (h.includes('date') || h.includes('time')) return 'date';
  if (h.includes('revenue') || h.includes('amount') || h.includes('cost')) return 'currency';
  const nums = samples.map(Number).filter(n => !isNaN(n) && n !== 0);
  if (nums.length > samples.length * 0.7) return 'number';
  return 'text';
}

export function detectProperties(headers: string[], sampleRows: SheetRow[]): Property[] {
  return headers.map((col, i) => {
    const samples = sampleRows.slice(0, 10).map(r => String(r[col] ?? '').trim()).filter(Boolean);
    return { id: gid(), column: col, label: col, type: guessType(col, samples), visible: true, order: i, width: 160 };
  });
}

export function mergeProperties(saved: Property[], headers: string[]): Property[] {
  const existing = new Set(saved.map(p => p.column));
  const newProps = headers.filter(h => h && !existing.has(h)).map((col, i) => ({
    id: gid(), column: col, label: col, type: 'text' as PropertyType,
    visible: false, order: saved.length + i, width: 160,
  }));
  return [...saved, ...newProps];
}

const LS_KEY = (sk: string) => `rly_dbviews_${sk}`;

export function getDBViewStore(sourceKey: string): DBViewStore {
  if (typeof window === 'undefined') return makeDefault(sourceKey);
  try { const r = localStorage.getItem(LS_KEY(sourceKey)); if (r) return JSON.parse(r); } catch { /* ignore */ }
  return makeDefault(sourceKey);
}

function makeView(id: string, label: string, layout: ViewLayout, isDefault: boolean): DBView {
  const now = new Date().toISOString();
  return { id, label, layout, properties: [], filters: [], sorts: [], isDefault, createdBy: 'system', createdAt: now, updatedAt: now, visibility: 'public' as const };
}

function makeDefault(sourceKey: string): DBViewStore {
  return {
    sourceKey, syncIntervalMinutes: 30, updatedAt: new Date().toISOString(),
    activeViewId: 'dv_all',
    views: [
      makeView('dv_all',     'All Records',    'table', true),
      makeView('dv_station', 'Station Wise',   'table', false),
      makeView('dv_state',   'State Wise',     'table', false),
      makeView('dv_cat',     'Category Wise',  'card',  false),
      makeView('dv_cmi',     'CMI Wise',       'table', false),
      makeView('dv_section', 'Section Wise',   'table', false),
    ],
  };
}

export function saveDBViewStore(store: DBViewStore, userId?: string): void {
  const next = { ...store, updatedAt: new Date().toISOString() };
  if (typeof window !== 'undefined') localStorage.setItem(LS_KEY(store.sourceKey), JSON.stringify(next));
  if (userId) {
    fetch('/api/config', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, namespace: `dbviews_${store.sourceKey.replace(/\W/g, '_')}`, value: JSON.stringify(next) }),
    }).catch(() => {});
  }
}

export function dbAddView(
  store: DBViewStore, label: string, layout: ViewLayout, userId: string, userName: string,
  tplId?: string,
  visibility: DBView['visibility'] = 'cell',
  visibleToRoles?: string[], visibleToUsers?: string[],
): DBViewStore {
  const tpl = tplId ? store.views.find(v => v.id === tplId) : null;
  const now = new Date().toISOString();
  const v: DBView = {
    id: `dv_${Date.now()}`, label, layout,
    properties: tpl ? JSON.parse(JSON.stringify(tpl.properties)) : [],
    filters:    tpl ? JSON.parse(JSON.stringify(tpl.filters))    : [],
    sorts:      tpl ? JSON.parse(JSON.stringify(tpl.sorts))      : [],
    groupBy: tpl?.groupBy, groupBy2: tpl?.groupBy2,
    isDefault: false,
    ownerId: userId, ownerName: userName,
    visibility, visibleToRoles, visibleToUsers,
    createdBy: userId, createdAt: now, updatedAt: now,
  };
  return { ...store, views: [...store.views, v], activeViewId: v.id };
}

export function dbUpdateView(store: DBViewStore, id: string, patch: Partial<DBView>): DBViewStore {
  return { ...store, views: store.views.map(v => v.id !== id ? v : { ...v, ...patch, updatedAt: new Date().toISOString() }) };
}

export function dbDeleteView(store: DBViewStore, id: string): DBViewStore {
  if (store.views.length <= 1) return store;
  const rem = store.views.filter(v => v.id !== id);
  return { ...store, views: rem, activeViewId: store.activeViewId === id ? (rem.find(v => v.isDefault) ?? rem[0]).id : store.activeViewId };
}

export function applyDBFilters(rows: SheetRow[], filters: DBFilter[]): SheetRow[] {
  if (!filters.length) return rows;
  return rows.filter(row => {
    let result = true;
    filters.forEach((f, i) => {
      const val = String(row[f.field] ?? '').toLowerCase().trim();
      const cmp = f.value.toLowerCase().trim();
      let match = false;
      switch (f.op) {
        case 'eq':          match = val === cmp; break;
        case 'neq':         match = val !== cmp; break;
        case 'contains':    match = val.includes(cmp); break;
        case 'not_contains':match = !val.includes(cmp); break;
        case 'empty':       match = val === ''; break;
        case 'not_empty':   match = val !== ''; break;
        case 'gt':          match = parseFloat(val) > parseFloat(cmp); break;
        case 'lt':          match = parseFloat(val) < parseFloat(cmp); break;
      }
      if (i === 0) result = match;
      else if (f.logic === 'or') result = result || match;
      else result = result && match;
    });
    return result;
  });
}

export function applyDBSorts(rows: SheetRow[], sorts: DBSort[]): SheetRow[] {
  if (!sorts.length) return rows;
  return [...rows].sort((a, b) => {
    for (const s of sorts) {
      const av = String(a[s.field] ?? '').trim();
      const bv = String(b[s.field] ?? '').trim();
      // Nulls handling
      const aEmpty = av === '' || av === '—' || av === 'undefined' || av === 'null';
      const bEmpty = bv === '' || bv === '—' || bv === 'undefined' || bv === 'null';
      if (aEmpty && bEmpty) continue;
      if (aEmpty) return s.nulls === 'first' ? -1 : 1;
      if (bEmpty) return s.nulls === 'first' ? 1 : -1;
      // Numeric or string compare
      const an = parseFloat(av), bn = parseFloat(bv);
      let cmp = (!isNaN(an) && !isNaN(bn)) ? an - bn : av.localeCompare(bv, 'en', { sensitivity: 'base' });
      if (cmp !== 0) return s.dir === 'asc' ? cmp : -cmp;
    }
    return 0;
  });
}

/** Filter views visible to the current user */
export function getVisibleViews(views: DBView[], userId: string, userRole: string, cellName?: string): DBView[] {
  return views.filter(v => {
    if (v.visibility === 'public') return true;
    if (v.visibility === 'personal') return v.ownerId === userId;
    if (v.visibility === 'admin') return userRole === 'admin' || userRole === 'maintenance';
    if (v.visibility === 'role') return (v.visibleToRoles ?? []).includes(userRole);
    if (v.visibility === 'users') return (v.visibleToUsers ?? []).includes(userId);
    if (v.visibility === 'cell') return true; // all cell members
    return true;
  });
}

export function groupRows(rows: SheetRow[], groupBy: string): Map<string, SheetRow[]> {
  const map = new Map<string, SheetRow[]>();
  rows.forEach(row => {
    const key = String(row[groupBy] ?? '—').trim() || '—';
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(row);
  });
  const sorted = Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  return new Map(sorted);
}

// Auto-compute KPIs from any dataset
export interface KPICard { id: string; label: string; value: string|number; sub?: string; color: string; icon: string; }
export interface DistItem { label: string; count: number; pct: number; }

export function computeKPIs(rows: SheetRow[], headers: string[], fetchedAt: string|null, url: string): KPICard[] {
  const cards: KPICard[] = [
    { id: 'records', label: 'Total Records', value: rows.length.toLocaleString('en-IN'), sub: 'rows in dataset', color: 'blue', icon: 'Database' },
    { id: 'cols', label: 'Properties', value: headers.length, sub: 'columns', color: 'violet', icon: 'Columns' },
  ];
  if (!rows.length) return cards;
  // Top categorical columns as KPIs
  const COLORS = ['emerald','amber','cyan','indigo','rose'];
  const catCols = headers.filter(h => { const u = new Set(rows.map(r => r[h]).filter(Boolean)).size; return u > 1 && u <= 100 && u < rows.length * 0.9; });
  catCols.slice(0, 4).forEach((col, i) => {
    const u = new Set(rows.map(r => r[col]).filter(Boolean)).size;
    cards.push({ id: `u_${col}`, label: `Unique ${col}s`, value: u, sub: col.toLowerCase(), color: COLORS[i % COLORS.length], icon: 'Hash' });
  });
  cards.push({
    id: 'sync', label: 'Last Sync',
    value: fetchedAt ? new Date(fetchedAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : '—',
    sub: url ? (fetchedAt ? new Date(fetchedAt).toLocaleDateString('en-IN') : 'Never') : 'No source',
    color: url ? 'emerald' : 'amber', icon: url ? 'CheckCircle2' : 'AlertCircle',
  });
  return cards;
}

export function computeDistribution(rows: SheetRow[], col: string): DistItem[] {
  if (!rows.length || !col) return [];
  const counts: Record<string, number> = {};
  rows.forEach(r => { const v = String(r[col] ?? '').trim() || '—'; counts[v] = (counts[v] ?? 0) + 1; });
  const total = rows.length;
  return Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 20)
    .map(([label, count]) => ({ label, count, pct: Math.round(count / total * 100) }));
}

export const OP_LABELS: Record<DBFilter['op'], string> = {
  eq: 'equals', neq: '≠', contains: 'contains', not_contains: "doesn't contain",
  empty: 'is empty', not_empty: 'is not empty', gt: '>', lt: '<',
};

export const LAYOUT_ICONS: Record<ViewLayout, string> = {
  table: 'Table2', card: 'LayoutGrid', list: 'List', board: 'Columns', gallery: 'Image',
};
