'use client';
import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Database, RefreshCw, Plus, ChevronDown, ChevronUp, Filter, ArrowUpDown,
  X, Check, Edit3, Copy, Trash2, Star, Table2, LayoutGrid, List, Columns,
  Settings2, Search, Eye, EyeOff, ChevronLeft, ChevronRight,
  AlertCircle, CheckCircle2, Hash, Cloud, Monitor, ExternalLink,
  BarChart3, TrendingUp, Layers, Globe, Users, Tag,
  Link2, StickyNote,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/store/authStore';
import { usePageSheet } from '@/lib/sheets/usePageSheet';
import { PageSheetLinkBar } from '@/components/sheets/PageSheetLinkBar';
import { LinkedSourcesPanel } from '@/components/sheets/LinkedSourcesPanel';
import {
  getDBViewStore, saveDBViewStore, dbAddView, dbUpdateView, dbDeleteView,
  detectProperties, mergeProperties, applyDBFilters, applyDBSorts, groupRows,
  computeKPIs, computeDistribution,
  type DBViewStore, type DBView, type Property, type DBFilter, type DBSort, type ViewLayout,
  OP_LABELS, LAYOUT_ICONS,
} from '@/lib/overview/overviewEngine';
import type { SheetRow } from '@/lib/sheets/googleSheets';

// ── Icon map ──────────────────────────────────────────────────────────────────
const ICONS: Record<string, React.ElementType> = {
  Database, Hash, CheckCircle2, AlertCircle, Table2, LayoutGrid, List, Columns,
  BarChart3, TrendingUp, Layers, Globe, Users, Tag, Cloud, Monitor,
};
function Ico({ name, size = 14, className = '' }: { name: string; size?: number; className?: string }) {
  const I = ICONS[name] ?? Database;
  return <I size={size} className={className}/>;
}

// ── KPI Cards ─────────────────────────────────────────────────────────────────
const KPI_COLORS: Record<string, string> = {
  blue:    'border-blue-200 bg-blue-50',
  violet:  'border-violet-200 bg-violet-50',
  emerald: 'border-emerald-200 bg-emerald-50',
  amber:   'border-amber-200 bg-amber-50',
  cyan:    'border-cyan-200 bg-cyan-50',
  indigo:  'border-indigo-200 bg-indigo-50',
  rose:    'border-rose-200 bg-rose-50',
};
const KPI_TEXT: Record<string, string> = {
  blue: 'text-blue-700', violet: 'text-violet-700', emerald: 'text-emerald-700',
  amber: 'text-amber-700', cyan: 'text-cyan-700', indigo: 'text-indigo-700', rose: 'text-rose-700',
};
const KPI_TOP: Record<string, string> = {
  blue: 'bg-blue-500', violet: 'bg-violet-500', emerald: 'bg-emerald-500',
  amber: 'bg-amber-500', cyan: 'bg-cyan-500', indigo: 'bg-indigo-500', rose: 'bg-rose-500',
};

// ── Distribution bar ──────────────────────────────────────────────────────────
function DistBar({ label, count, pct, max, color }: { label: string; count: number; pct: number; max: number; color: string }) {
  return (
    <div className="flex items-center gap-2.5 group py-1">
      <div className="w-28 shrink-0 text-xs text-slate-600 font-medium truncate" title={label}>{label}</div>
      <div className="flex-1 bg-slate-100 rounded-full h-2 overflow-hidden">
        <motion.div initial={{ width: 0 }} animate={{ width: `${(count / max) * 100}%` }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className={`h-full rounded-full ${color}`}/>
      </div>
      <div className="w-12 text-right text-[11px] text-slate-500 shrink-0">{count} <span className="text-slate-300">({pct}%)</span></div>
    </div>
  );
}

// ── Analytics Panel ───────────────────────────────────────────────────────────
function AnalyticsPanel({ rows, headers }: { rows: SheetRow[]; headers: string[] }) {
  const [col1, setCol1] = useState('');
  const [col2, setCol2] = useState('');
  const [show, setShow] = useState(false);

  // Pick first two categorical columns as defaults
  useEffect(() => {
    const cats = headers.filter(h => {
      const u = new Set(rows.map(r => r[h]).filter(Boolean)).size;
      return u > 1 && u <= 50 && u < rows.length * 0.9;
    });
    if (cats[0] && !col1) setCol1(cats[0]);
    if (cats[1] && !col2) setCol2(cats[1]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [headers.join(',')]);

  const dist1 = useMemo(() => col1 ? computeDistribution(rows, col1).slice(0, 10) : [], [rows, col1]);
  const dist2 = useMemo(() => col2 ? computeDistribution(rows, col2).slice(0, 10) : [], [rows, col2]);
  const max1 = dist1[0]?.count ?? 1;
  const max2 = dist2[0]?.count ?? 1;

  if (!rows.length || !headers.length) return null;

  const COLORS = ['bg-blue-400','bg-violet-400','bg-emerald-400','bg-amber-400','bg-cyan-400','bg-rose-400','bg-indigo-400'];

  return (
    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden" style={{ boxShadow: '0 1px 3px rgba(15,23,42,0.06)' }}>
      <button onClick={() => setShow(s => !s)}
        className="w-full flex items-center justify-between px-5 py-3.5 hover:bg-slate-50 transition-colors">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-violet-50 border border-violet-100 flex items-center justify-center">
            <BarChart3 size={13} className="text-violet-600"/>
          </div>
          <p className="text-sm font-bold text-slate-900">Analytics</p>
          <span className="text-[10px] text-slate-400">Distribution charts · auto-computed from data</span>
        </div>
        {show ? <ChevronUp size={14} className="text-slate-400"/> : <ChevronDown size={14} className="text-slate-400"/>}
      </button>
      {show && (
        <div className="border-t border-slate-100 p-5">
          <div className="grid grid-cols-2 gap-6">
            {[{ col: col1, setCol: setCol1, dist: dist1, max: max1 },
              { col: col2, setCol: setCol2, dist: dist2, max: max2 }].map(({ col, setCol, dist, max }, pi) => (
              <div key={pi}>
                <div className="flex items-center justify-between mb-3">
                  <select value={col} onChange={e => setCol(e.target.value)}
                    className="text-xs font-semibold text-slate-700 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-rail-400">
                    <option value="">Select column…</option>
                    {headers.map(h => <option key={h} value={h}>{h}</option>)}
                  </select>
                  <span className="text-[10px] text-slate-400">{dist.length} values</span>
                </div>
                <div className="space-y-0.5">
                  {dist.map(({ label, count, pct }, i) => (
                    <DistBar key={label} label={label} count={count} pct={pct} max={max}
                      color={COLORS[i % COLORS.length]}/>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Properties Panel (per-view field config) ──────────────────────────────────
function PropertiesPanel({ view, allHeaders, onUpdate, onClose }: {
  view: DBView; allHeaders: string[];
  onUpdate: (props: Property[]) => void; onClose: () => void;
}) {
  const [props, setProps] = useState<Property[]>(() => mergeProperties(view.properties, allHeaders));
  const [search, setSearch] = useState('');
  const [renaming, setRenaming] = useState<string | null>(null);
  const [draftLabel, setDraftLabel] = useState('');

  const sorted = [...props].sort((a, b) => a.order - b.order);
  const filtered = sorted.filter(p => !search || p.column.toLowerCase().includes(search.toLowerCase()) || p.label.toLowerCase().includes(search.toLowerCase()));

  const toggle = (id: string) => {
    const next = props.map(p => p.id !== id ? p : { ...p, visible: !p.visible });
    setProps(next); onUpdate(next);
  };
  const move = (id: string, dir: 'up'|'down') => {
    const s = [...sorted];
    const idx = s.findIndex(p => p.id === id);
    const ni = dir === 'up' ? idx - 1 : idx + 1;
    if (ni < 0 || ni >= s.length) return;
    [s[idx], s[ni]] = [s[ni], s[idx]];
    const next = s.map((p, i) => ({ ...p, order: i }));
    setProps(next); onUpdate(next);
  };
  const rename = (id: string, label: string) => {
    const next = props.map(p => p.id !== id ? p : { ...p, label });
    setProps(next); onUpdate(next); setRenaming(null);
  };

  return (
    <div className="fixed inset-0 z-[500] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4" onClick={onClose}>
      <motion.div initial={{ scale: 0.96, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
        className="bg-white rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <p className="text-sm font-bold text-slate-900">Properties · {view.label}</p>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400"><X size={15}/></button>
        </div>
        <div className="px-4 py-2.5 border-b border-slate-100">
          <div className="relative">
            <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400"/>
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search properties…"
              className="w-full pl-7 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-rail-400"/>
          </div>
        </div>
        <div className="max-h-80 overflow-y-auto divide-y divide-slate-50">
          {filtered.map((prop, idx) => (
            <div key={prop.id} className="flex items-center gap-2 px-4 py-2.5 hover:bg-slate-50 group">
              <button onClick={() => toggle(prop.id)}
                className={cn('w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-colors',
                  prop.visible ? 'bg-rail-600 border-rail-600' : 'border-slate-300 hover:border-rail-400')}>
                {prop.visible && <Check size={10} className="text-white"/>}
              </button>
              {renaming === prop.id ? (
                <input value={draftLabel} onChange={e => setDraftLabel(e.target.value)} autoFocus
                  className="flex-1 text-xs bg-white border border-rail-300 rounded px-1.5 py-0.5 focus:outline-none"
                  onBlur={() => rename(prop.id, draftLabel.trim() || prop.column)}
                  onKeyDown={e => { if (e.key === 'Enter') rename(prop.id, draftLabel.trim() || prop.column); if (e.key === 'Escape') setRenaming(null); }}/>
              ) : (
                <div className="flex-1 min-w-0">
                  <p className={cn('text-xs truncate', prop.visible ? 'text-slate-800 font-medium' : 'text-slate-400')}>{prop.label}</p>
                  {prop.label !== prop.column && <p className="text-[9px] text-slate-300 truncate">{prop.column}</p>}
                </div>
              )}
              <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                <button onClick={() => { setDraftLabel(prop.label); setRenaming(prop.id); }} className="p-1 rounded hover:bg-slate-200 text-slate-300 hover:text-slate-600"><Edit3 size={10}/></button>
                <button onClick={() => move(prop.id, 'up')} disabled={idx === 0} className="p-1 rounded hover:bg-slate-200 text-slate-300 disabled:opacity-20"><ChevronUp size={10}/></button>
                <button onClick={() => move(prop.id, 'down')} disabled={idx === filtered.length - 1} className="p-1 rounded hover:bg-slate-200 text-slate-300 disabled:opacity-20"><ChevronDown size={10}/></button>
              </div>
            </div>
          ))}
        </div>
        <div className="px-4 py-3 border-t border-slate-100 bg-slate-50 flex justify-between text-[10px] text-slate-400">
          <span>{props.filter(p => p.visible).length} of {props.length} visible</span>
          <button onClick={() => { const all = props.map(p => ({ ...p, visible: true })); setProps(all); onUpdate(all); }} className="hover:text-rail-600 transition-colors">Show all</button>
        </div>
      </motion.div>
    </div>
  );
}

// ── Filter Builder ────────────────────────────────────────────────────────────
function FilterBuilder({ view, onUpdate }: { view: DBView; onUpdate: (f: DBFilter[]) => void }) {
  const [open, setOpen] = useState(false);
  const [filters, setFilters] = useState<DBFilter[]>(view.filters);
  const headers = view.properties.map(p => p.column);

  const add = () => {
    if (!headers.length) return;
    const f: DBFilter = { id: `f${Date.now()}`, field: headers[0], op: 'contains', value: '', logic: 'and' };
    const next = [...filters, f]; setFilters(next); onUpdate(next);
  };
  const upd = (id: string, patch: Partial<DBFilter>) => {
    const next = filters.map(f => f.id !== id ? f : { ...f, ...patch }); setFilters(next); onUpdate(next);
  };
  const del = (id: string) => { const next = filters.filter(f => f.id !== id); setFilters(next); onUpdate(next); };

  return (
    <div className="relative">
      <button onClick={() => setOpen(o => !o)}
        className={cn('flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all',
          filters.length > 0 ? 'bg-amber-50 border-amber-200 text-amber-700' : 'bg-white border-slate-200 text-slate-500 hover:border-slate-300')}>
        <Filter size={12}/>
        Filter
        {filters.length > 0 && <span className="bg-amber-200 text-amber-800 text-[10px] font-bold rounded-full px-1.5 py-0.5">{filters.length}</span>}
      </button>
      {open && (
        <div className="absolute top-full left-0 mt-1.5 z-50 w-96 bg-white border border-slate-200 rounded-xl shadow-lg overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 bg-slate-50">
            <p className="text-xs font-bold text-slate-700">Filters</p>
            <button onClick={() => setOpen(false)} className="p-1 text-slate-400 hover:text-slate-600"><X size={12}/></button>
          </div>
          <div className="p-3 space-y-2 max-h-64 overflow-y-auto">
            {filters.length === 0 && <p className="text-xs text-slate-400 text-center py-3">No filters applied</p>}
            {filters.map((f, i) => (
              <div key={f.id} className="flex items-center gap-1.5 bg-slate-50 rounded-lg p-2">
                {i > 0 && (
                  <select value={f.logic} onChange={e => upd(f.id, { logic: e.target.value as 'and'|'or' })}
                    className="text-[10px] bg-white border border-slate-200 rounded px-1 py-0.5 text-slate-600 focus:outline-none w-12">
                    <option value="and">AND</option><option value="or">OR</option>
                  </select>
                )}
                <select value={f.field} onChange={e => upd(f.id, { field: e.target.value })}
                  className="flex-1 bg-white border border-slate-200 rounded px-1.5 py-1 text-[11px] text-slate-700 focus:outline-none min-w-0">
                  {headers.map(h => <option key={h} value={h}>{h}</option>)}
                </select>
                <select value={f.op} onChange={e => upd(f.id, { op: e.target.value as DBFilter['op'] })}
                  className="bg-white border border-slate-200 rounded px-1.5 py-1 text-[11px] text-slate-700 focus:outline-none">
                  {(Object.entries(OP_LABELS) as [DBFilter['op'], string][]).map(([op, lbl]) => (
                    <option key={op} value={op}>{lbl}</option>
                  ))}
                </select>
                {!['empty', 'not_empty'].includes(f.op) && (
                  <input value={f.value} onChange={e => upd(f.id, { value: e.target.value })}
                    placeholder="value" className="w-20 bg-white border border-slate-200 rounded px-1.5 py-1 text-[11px] focus:outline-none focus:border-rail-400"/>
                )}
                <button onClick={() => del(f.id)} className="p-1 text-slate-300 hover:text-red-500"><Trash2 size={11}/></button>
              </div>
            ))}
            <button onClick={add} disabled={!headers.length}
              className="flex items-center gap-1.5 text-xs text-rail-600 hover:text-rail-700 font-medium disabled:opacity-40">
              <Plus size={11}/> Add filter
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Table View ────────────────────────────────────────────────────────────────
const PAGE_SIZE = 50;

function TableView({ rows, props, search }: { rows: SheetRow[]; props: Property[]; search: string }) {
  const [page, setPage] = useState(0);
  const visProps = props.filter(p => p.visible).sort((a, b) => a.order - b.order);

  const filtered = useMemo(() => {
    if (!search) return rows;
    const q = search.toLowerCase();
    return rows.filter(r => visProps.some(p => String(r[p.column] ?? '').toLowerCase().includes(q)));
  }, [rows, search, visProps]);

  const total = filtered.length;
  const totalPages = Math.ceil(total / PAGE_SIZE);
  const paged = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  if (!visProps.length) return (
    <div className="text-center py-10 text-slate-400 text-sm">No properties visible — click Properties to show columns</div>
  );

  return (
    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden" style={{ boxShadow: '0 1px 3px rgba(15,23,42,0.06)' }}>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200">
              <th className="text-left px-3 py-2.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider w-10 shrink-0">#</th>
              {visProps.map(p => (
                <th key={p.id} className="text-left px-3 py-2.5 text-[10px] font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap"
                  style={{ minWidth: p.width ?? 120 }}>{p.label}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {paged.map((row, i) => (
              <tr key={i} className={cn('hover:bg-slate-50 transition-colors', i % 2 === 1 && 'bg-slate-50/40')}>
                <td className="px-3 py-2 text-slate-300 text-[10px] font-mono">{page * PAGE_SIZE + i + 1}</td>
                {visProps.map(p => (
                  <td key={p.id} className="px-3 py-2 text-slate-700" style={{ maxWidth: p.width ?? 200 }}>
                    <div className={cn('truncate', p.wrap && 'whitespace-normal break-words')}>
                      {String(row[p.column] ?? '—')}
                    </div>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {/* Pagination */}
      <div className="flex items-center justify-between px-4 py-2.5 border-t border-slate-100 bg-slate-50">
        <p className="text-[10px] text-slate-400">{total.toLocaleString('en-IN')} records · page {page + 1} of {totalPages || 1}</p>
        <div className="flex gap-1">
          <button onClick={() => setPage(0)} disabled={page === 0} className="p-1 rounded hover:bg-slate-200 text-slate-400 disabled:opacity-20"><ChevronLeft size={12}/></button>
          <button onClick={() => setPage(p => p - 1)} disabled={page === 0} className="px-2 py-1 rounded hover:bg-slate-200 text-slate-500 text-xs disabled:opacity-20">Prev</button>
          <button onClick={() => setPage(p => p + 1)} disabled={page >= totalPages - 1} className="px-2 py-1 rounded hover:bg-slate-200 text-slate-500 text-xs disabled:opacity-20">Next</button>
          <button onClick={() => setPage(totalPages - 1)} disabled={page >= totalPages - 1} className="p-1 rounded hover:bg-slate-200 text-slate-400 disabled:opacity-20"><ChevronRight size={12}/></button>
        </div>
      </div>
    </div>
  );
}

// ── Card View ─────────────────────────────────────────────────────────────────
function CardView({ rows, props, search }: { rows: SheetRow[]; props: Property[]; search: string }) {
  const visProps = props.filter(p => p.visible).sort((a, b) => a.order - b.order);
  const [titleProp, ...restProps] = visProps;
  const filtered = useMemo(() => {
    if (!search) return rows;
    const q = search.toLowerCase();
    return rows.filter(r => visProps.some(p => String(r[p.column] ?? '').toLowerCase().includes(q)));
  }, [rows, search, visProps]);

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3">
      {filtered.slice(0, 200).map((row, i) => (
        <div key={i} className="bg-white border border-slate-200 rounded-xl p-4 hover:shadow-md hover:-translate-y-0.5 transition-all"
          style={{ boxShadow: '0 1px 3px rgba(15,23,42,0.06)' }}>
          {titleProp && (
            <p className="text-sm font-bold text-slate-900 truncate mb-2">{String(row[titleProp.column] ?? '—')}</p>
          )}
          <div className="space-y-1.5">
            {restProps.slice(0, 4).map(p => (
              <div key={p.id} className="flex items-center justify-between gap-2">
                <span className="text-[10px] text-slate-400 shrink-0">{p.label}</span>
                <span className="text-[11px] text-slate-700 font-medium truncate">{String(row[p.column] ?? '—')}</span>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Grouped View ──────────────────────────────────────────────────────────────
function GroupedView({ rows, props, groupBy, search }: { rows: SheetRow[]; props: Property[]; groupBy: string; search: string }) {
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const filtered = useMemo(() => {
    if (!search) return rows;
    const q = search.toLowerCase();
    const vis = props.filter(p => p.visible);
    return rows.filter(r => vis.some(p => String(r[p.column] ?? '').toLowerCase().includes(q)));
  }, [rows, search, props]);
  const groups = useMemo(() => groupRows(filtered, groupBy), [filtered, groupBy]);

  return (
    <div className="space-y-3">
      {Array.from(groups.entries()).map(([key, groupRows]) => (
        <div key={key} className="bg-white border border-slate-200 rounded-xl overflow-hidden" style={{ boxShadow: '0 1px 3px rgba(15,23,42,0.06)' }}>
          <button onClick={() => setCollapsed(s => { const n = new Set(s); n.has(key) ? n.delete(key) : n.add(key); return n; })}
            className="w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-50 transition-colors border-b border-slate-100">
            <div className="w-2 h-2 rounded-full bg-rail-500 shrink-0"/>
            <p className="font-semibold text-slate-800 text-sm flex-1 text-left">{key}</p>
            <span className="text-[10px] text-slate-400 bg-slate-100 rounded-full px-2 py-0.5">{groupRows.length} records</span>
            {collapsed.has(key) ? <ChevronDown size={14} className="text-slate-400"/> : <ChevronUp size={14} className="text-slate-400"/>}
          </button>
          {!collapsed.has(key) && (
            <TableView rows={groupRows} props={props} search=""/>
          )}
        </div>
      ))}
    </div>
  );
}

// ── View Tab Bar ──────────────────────────────────────────────────────────────
const LAYOUT_ICON_MAP: Record<string, React.ElementType> = { Table2, LayoutGrid, List, Columns };

function ViewTabBar({ store, canEdit, userId, sheetRows, fetchedAt, loading, onRefetch,
  onSetActive, onCreate, onRename, onDelete, onSyncChange, syncInterval }: {
  store: DBViewStore; canEdit: boolean; userId: string;
  sheetRows: number; fetchedAt: string | null; loading: boolean;
  onRefetch: () => void; onSetActive: (id: string) => void;
  onCreate: (label: string, layout: ViewLayout, tplId?: string) => void;
  onRename: (id: string, label: string) => void;
  onDelete: (id: string) => void;
  onSyncChange: (m: number) => void; syncInterval: number;
}) {
  const [menuView, setMenuView] = useState<string | null>(null);
  const [renaming, setRenaming] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  const [showNew, setShowNew] = useState(false);
  const [newLabel, setNewLabel] = useState('New View');
  const [newLayout, setNewLayout] = useState<ViewLayout>('table');
  const [newTpl, setNewTpl] = useState('');
  const [showSync, setShowSync] = useState(false);

  function timeAgo(iso: string | null) {
    if (!iso) return '—';
    const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
    if (s < 60) return 'just now';
    if (s < 3600) return `${Math.floor(s / 60)}m ago`;
    return `${Math.floor(s / 3600)}h ago`;
  }

  return (
    <div className="bg-white border border-slate-200 rounded-xl overflow-visible" style={{ boxShadow: '0 1px 3px rgba(15,23,42,0.06)' }}>
      <div className="flex items-center overflow-x-auto scrollbar-none border-b border-slate-100 px-2">
        {store.views.map(view => {
          const Icon = LAYOUT_ICON_MAP[LAYOUT_ICONS[view.layout]] ?? Table2;
          const isActive = view.id === store.activeViewId;
          return (
            <div key={view.id} className="relative shrink-0">
              {renaming === view.id ? (
                <div className="flex items-center gap-1.5 px-3 py-2.5">
                  <input value={draft} onChange={e => setDraft(e.target.value)} autoFocus
                    className="text-xs font-semibold bg-white border border-rail-300 rounded px-1.5 py-0.5 w-28 focus:outline-none"
                    onBlur={() => { onRename(view.id, draft.trim() || view.label); setRenaming(null); }}
                    onKeyDown={e => { if (e.key === 'Enter') { onRename(view.id, draft.trim() || view.label); setRenaming(null); } if (e.key === 'Escape') setRenaming(null); }}/>
                </div>
              ) : (
                <button onClick={() => onSetActive(view.id)}
                  onDoubleClick={() => { setDraft(view.label); setRenaming(view.id); }}
                  className={cn('flex items-center gap-1.5 px-3 py-2.5 text-xs font-semibold border-b-2 transition-all whitespace-nowrap',
                    isActive ? 'text-rail-600 border-rail-600' : 'text-slate-500 border-transparent hover:text-slate-700 hover:bg-slate-50')}>
                  <Icon size={12} className={isActive ? 'text-rail-500' : 'text-slate-400'}/>
                  {view.label}
                  {view.isDefault && <Star size={9} className="text-amber-400 fill-amber-400"/>}
                  {canEdit && isActive && (
                    <span onClick={e => { e.stopPropagation(); setMenuView(m => m === view.id ? null : view.id); }}
                      className="p-0.5 rounded hover:bg-slate-100 text-slate-300 hover:text-slate-500">
                      <ChevronDown size={10}/>
                    </span>
                  )}
                </button>
              )}
              {menuView === view.id && canEdit && (
                <div className="absolute top-full left-0 mt-0.5 z-50 w-40 bg-white border border-slate-200 rounded-xl shadow-lg overflow-hidden" onClick={() => setMenuView(null)}>
                  <button onClick={() => { setDraft(view.label); setRenaming(view.id); }} className="flex items-center gap-2 px-3 py-2 text-xs text-slate-700 hover:bg-slate-50 w-full"><Edit3 size={11} className="text-slate-400"/> Rename</button>
                  <button onClick={() => onCreate(view.label + ' (copy)', view.layout, view.id)} className="flex items-center gap-2 px-3 py-2 text-xs text-slate-700 hover:bg-slate-50 w-full"><Copy size={11} className="text-slate-400"/> Duplicate</button>
                  <div className="border-t border-slate-100"/>
                  <button onClick={() => onDelete(view.id)} className="flex items-center gap-2 px-3 py-2 text-xs text-red-600 hover:bg-red-50 w-full"><Trash2 size={11}/> Delete</button>
                </div>
              )}
            </div>
          );
        })}
        {canEdit && (
          <div className="relative shrink-0 ml-1">
            <button onClick={() => setShowNew(s => !s)}
              className="flex items-center gap-1 px-2.5 py-2.5 text-[11px] font-medium text-slate-400 hover:text-rail-600 hover:bg-slate-50 transition-colors rounded-lg">
              <Plus size={12}/> Add view
            </button>
            {showNew && (
              <div className="absolute top-full left-0 mt-1 z-50 w-56 bg-white border border-slate-200 rounded-xl shadow-lg overflow-hidden p-4 space-y-3" onClick={e => e.stopPropagation()}>
                <input value={newLabel} onChange={e => setNewLabel(e.target.value)} autoFocus
                  onKeyDown={e => { if (e.key === 'Enter' && newLabel.trim()) { onCreate(newLabel, newLayout, newTpl || undefined); setShowNew(false); setNewLabel('New View'); }}}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:border-rail-400"/>
                <div className="grid grid-cols-3 gap-1.5">
                  {(['table','card','list','board','gallery'] as ViewLayout[]).map(l => {
                    const Icon = LAYOUT_ICON_MAP[LAYOUT_ICONS[l]] ?? Table2;
                    return (
                      <button key={l} onClick={() => setNewLayout(l)}
                        className={cn('flex flex-col items-center gap-1 p-2 rounded-lg border text-[10px] font-medium transition-all',
                          newLayout === l ? 'bg-rail-50 border-rail-300 text-rail-700' : 'border-slate-200 text-slate-500 hover:bg-slate-50')}>
                        <Icon size={13}/> {l}
                      </button>
                    );
                  })}
                </div>
                <select value={newTpl} onChange={e => setNewTpl(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none text-slate-700">
                  <option value="">Start blank</option>
                  {store.views.map(v => <option key={v.id} value={v.id}>{v.label}</option>)}
                </select>
                <div className="flex gap-2 justify-end">
                  <button onClick={() => setShowNew(false)} className="px-3 py-1.5 text-xs text-slate-500 hover:bg-slate-100 rounded-lg">Cancel</button>
                  <button onClick={() => { if (newLabel.trim()) { onCreate(newLabel, newLayout, newTpl || undefined); setShowNew(false); setNewLabel('New View'); }}}
                    disabled={!newLabel.trim()} className="px-3 py-1.5 text-xs bg-rail-600 text-white rounded-lg hover:bg-rail-700 disabled:opacity-40">Create</button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
      <div className="flex items-center justify-between px-4 py-2">
        <div className="flex items-center gap-2 text-[10px] text-slate-400">
          <span className={cn('w-1.5 h-1.5 rounded-full', sheetRows > 0 ? 'bg-emerald-500' : 'bg-slate-300')}/>
          {sheetRows > 0 ? `${sheetRows.toLocaleString('en-IN')} records · synced ${timeAgo(fetchedAt)}` : 'No data connected'}
        </div>
        <div className="flex items-center gap-1.5">
          <div className="relative">
            <button onClick={() => setShowSync(s => !s)} className="flex items-center gap-1 text-[10px] text-slate-400 hover:text-slate-600 px-2 py-1 rounded-lg hover:bg-slate-100">
              ⏱ Every {syncInterval}m
            </button>
            {showSync && (
              <div className="absolute right-0 top-full mt-1 z-50 bg-white border border-slate-200 rounded-xl shadow-lg p-2 w-32">
                {[5,15,30,60].map(m => (
                  <button key={m} onClick={() => { onSyncChange(m); setShowSync(false); }}
                    className={cn('flex items-center justify-between w-full px-2 py-1.5 text-xs rounded-lg transition-colors',
                      syncInterval === m ? 'bg-rail-50 text-rail-700 font-semibold' : 'text-slate-600 hover:bg-slate-50')}>
                    {m} min {syncInterval === m && <Check size={11}/>}
                  </button>
                ))}
              </div>
            )}
          </div>
          <button onClick={onRefetch} disabled={loading}
            className="flex items-center gap-1 text-[10px] text-slate-400 hover:text-slate-600 px-2 py-1 rounded-lg hover:bg-slate-100 disabled:opacity-40">
            <RefreshCw size={11} className={loading ? 'animate-spin' : ''}/> Sync
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main OverviewWorkspace ────────────────────────────────────────────────────
export function OverviewWorkspace() {
  const { user } = useAuthStore();
  const canEdit = user?.role === 'maintenance' || user?.role === 'admin';

  const pageSheet = usePageSheet('sheet_nsg_category_wise', user?.id);
  const sheetConnected = !!pageSheet.url;

  const [store, setStore] = useState<DBViewStore>(() => getDBViewStore('sheet_nsg_category_wise'));
  const activeView = store.views.find(v => v.id === store.activeViewId) ?? store.views[0];
  const [search, setSearch] = useState('');
  const [showProps, setShowProps] = useState(false);
  const [showSort, setShowSort] = useState(false);
  const [sorts, setSorts] = useState<DBSort[]>(activeView?.sorts ?? []);

  const commit = useCallback((next: DBViewStore) => {
    setStore(next);
    saveDBViewStore(next, user?.id);
  }, [user?.id]);

  // Auto-detect properties from sheet headers
  useEffect(() => {
    if (!pageSheet.headers.length || !activeView) return;
    const merged = mergeProperties(activeView.properties, pageSheet.headers);
    if (merged.length > activeView.properties.length) {
      // Only auto-set visible for the FIRST-EVER detection
      const isFirst = activeView.properties.length === 0;
      const withVisible = isFirst ? merged : merged;
      commit(dbUpdateView(store, activeView.id, { properties: withVisible }));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pageSheet.headers.join(','), activeView?.id]);

  // Sync interval
  useEffect(() => {
    pageSheet.setPollInterval(store.syncIntervalMinutes * 60_000);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [store.syncIntervalMinutes]);

  // Derive processed rows for active view
  const processedRows = useMemo(() => {
    let rows = pageSheet.rows as SheetRow[];
    if (activeView?.filters?.length) rows = applyDBFilters(rows, activeView.filters);
    const activeSorts = activeView?.sorts ?? [];
    if (activeSorts.length) rows = applyDBSorts(rows, activeSorts);
    return rows;
  }, [pageSheet.rows, activeView?.filters, activeView?.sorts]);

  // KPIs
  const kpis = useMemo(() => computeKPIs(pageSheet.rows, pageSheet.headers, pageSheet.fetchedAt, pageSheet.url), [pageSheet.rows, pageSheet.headers, pageSheet.fetchedAt, pageSheet.url]);

  const viewProps = activeView?.properties ?? [];

  return (
    <div className="space-y-4 pb-10">
      {/* Data source link bar */}
      <PageSheetLinkBar sheet={pageSheet} canEdit={canEdit} pageLabel="NSG Category Wise"
        expectedFields={viewProps.filter(p => p.visible).map(p => p.column)}/>

      {/* KPI Cards — auto-computed from sheet data */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {kpis.map(kpi => (
          <motion.div key={kpi.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
            className={cn('rounded-xl border p-4 relative overflow-hidden', KPI_COLORS[kpi.color] ?? 'border-slate-200 bg-white')}
            style={{ boxShadow: '0 1px 3px rgba(15,23,42,0.06)' }}>
            <div className={cn('absolute top-0 left-0 right-0 h-1 rounded-t-xl', KPI_TOP[kpi.color])}/>
            <p className="text-[9px] font-bold text-slate-500 uppercase tracking-wider mt-1">{kpi.label}</p>
            <p className={cn('text-2xl font-black mt-1 tracking-tight', KPI_TEXT[kpi.color])}>{kpi.value}</p>
            {kpi.sub && <p className="text-[10px] text-slate-400 mt-0.5 truncate">{kpi.sub}</p>}
          </motion.div>
        ))}
      </div>

      {/* Analytics panel */}
      {pageSheet.rows.length > 0 && (
        <AnalyticsPanel rows={pageSheet.rows} headers={pageSheet.headers}/>
      )}

      {/* View Tab Bar */}
      <ViewTabBar
        store={store} canEdit={canEdit} userId={user?.id ?? ''}
        sheetRows={pageSheet.rows.length} fetchedAt={pageSheet.fetchedAt} loading={pageSheet.loading}
        onRefetch={pageSheet.refetch}
        onSetActive={id => commit({ ...store, activeViewId: id })}
        onCreate={(label, layout, tplId) => commit(dbAddView(store, label, layout, user?.id ?? '', tplId))}
        onRename={(id, label) => commit(dbUpdateView(store, id, { label }))}
        onDelete={id => commit(dbDeleteView(store, id))}
        onSyncChange={m => commit({ ...store, syncIntervalMinutes: m })}
        syncInterval={store.syncIntervalMinutes}
      />

      {/* Linked Sources Panel */}
      <LinkedSourcesPanel
        sources={[{ namespace: 'sheet_nsg_category_wise', label: 'NSG Category Wise Data',
          url: pageSheet.url, rows: pageSheet.rows.length, fetchedAt: pageSheet.fetchedAt,
          loading: pageSheet.loading, error: pageSheet.error, linkedAt: pageSheet.linkedAt, linkedBy: pageSheet.linkedBy }]}
        kvAvailable={pageSheet.kvAvailable} onRefetch={pageSheet.refetch} onUnlink={() => pageSheet.setUrl('')}/>

      {/* Toolbar: Search + Properties + Filters + Sort + Group */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"/>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search records…"
            className="w-full bg-white border border-slate-200 rounded-lg pl-8 pr-3 py-2 text-xs text-slate-700 focus:outline-none focus:border-rail-400 shadow-xs"/>
        </div>
        {/* Properties button */}
        <button onClick={() => setShowProps(true)}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold border border-slate-200 bg-white text-slate-500 hover:border-rail-300 hover:text-rail-600 transition-all">
          <Settings2 size={12}/> Properties
          <span className="text-[10px] text-slate-300">{viewProps.filter(p=>p.visible).length}/{viewProps.length}</span>
        </button>
        {/* Filters */}
        {activeView && (
          <FilterBuilder view={activeView} onUpdate={f => commit(dbUpdateView(store, activeView.id, { filters: f }))}/>
        )}
        {/* Group by */}
        {activeView && pageSheet.headers.length > 0 && (
          <select value={activeView.groupBy ?? ''} onChange={e => commit(dbUpdateView(store, activeView.id, { groupBy: e.target.value || undefined }))}
            className="bg-white border border-slate-200 rounded-lg px-2.5 py-2 text-xs text-slate-600 focus:outline-none focus:border-rail-400">
            <option value="">No grouping</option>
            {pageSheet.headers.map(h => <option key={h} value={h}>Group: {h}</option>)}
          </select>
        )}
      </div>

      {/* Data view */}
      {!sheetConnected ? (
        <div className="bg-white border-2 border-dashed border-slate-200 rounded-xl py-16 flex flex-col items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center">
            <Database size={26} className="text-slate-300"/>
          </div>
          <div className="text-center">
            <p className="text-sm font-bold text-slate-500">No data source connected</p>
            <p className="text-xs text-slate-400 mt-1">Connect a Google Sheet above to display records here</p>
          </div>
        </div>
      ) : processedRows.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-xl py-12 text-center text-slate-400 text-sm">
          No records match your filters
        </div>
      ) : activeView?.groupBy ? (
        <GroupedView rows={processedRows} props={viewProps} groupBy={activeView.groupBy} search={search}/>
      ) : activeView?.layout === 'card' || activeView?.layout === 'gallery' ? (
        <CardView rows={processedRows} props={viewProps} search={search}/>
      ) : (
        <TableView rows={processedRows} props={viewProps} search={search}/>
      )}

      {/* Properties panel modal */}
      <AnimatePresence>
        {showProps && activeView && (
          <PropertiesPanel
            view={activeView}
            allHeaders={pageSheet.headers}
            onUpdate={props => commit(dbUpdateView(store, activeView.id, { properties: props }))}
            onClose={() => setShowProps(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
