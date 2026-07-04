'use client';
import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Database, RefreshCw, Plus, ChevronDown, ChevronUp, Filter,
  X, Check, Edit3, Copy, Trash2, Star, Table2, LayoutGrid, List,
  Settings2, Search, CheckCircle2, AlertCircle, ExternalLink,
  Cloud, ChevronLeft, ChevronRight, Columns, MoreHorizontal,
  Printer, Maximize2, PanelRight, ArrowLeft, ArrowRight, FileText,
  GripVertical, ArrowUpDown, Users, Lock, Globe, Building,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/store/authStore';
import { usePageSheet } from '@/lib/sheets/usePageSheet';
import {
  getDBViewStore, saveDBViewStore, dbAddView, dbUpdateView, dbDeleteView,
  mergeProperties, applyDBFilters, applyDBSorts, groupRows, getVisibleViews,
  type DBViewStore, type DBView, type Property, type DBFilter, type DBSort, type ViewLayout, type SortPreset, type SortDir,
  OP_LABELS, LAYOUT_ICONS,
} from '@/lib/overview/overviewEngine';
import type { SheetRow } from '@/lib/sheets/googleSheets';
import { sharedRead } from '@/lib/config/sharedSync';

// ── Universal portal popup ─────────────────────────────────────────────────────
// Renders at fixed position calculated from trigger rect.
// Escapes ALL parent stacking contexts, overflow, z-index.
function PortalPopup({
  triggerRef, open, onClose, children, align = 'left', minWidth = 200,
}: {
  triggerRef: React.RefObject<HTMLElement>;
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
  align?: 'left' | 'right';
  minWidth?: number;
}) {
  const [pos, setPos] = useState({ top: 0, left: 0 });
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    if (!open || !triggerRef.current) return;
    const r = triggerRef.current.getBoundingClientRect();
    const spaceBelow = window.innerHeight - r.bottom;
    const popH = 400; // max expected height
    const top = spaceBelow >= popH ? r.bottom + 4 : r.top - popH - 4;
    const left = align === 'right'
      ? Math.min(r.right - minWidth, window.innerWidth - minWidth - 8)
      : Math.min(r.left, window.innerWidth - minWidth - 8);
    setPos({ top: Math.max(8, top + window.scrollY), left: Math.max(8, left) });
  }, [open, triggerRef, align, minWidth]);

  if (!mounted || !open) return null;

  return createPortal(
    <>
      <div className="fixed inset-0 z-[1998]" onClick={onClose}/>
      <div className="fixed z-[1999]" style={{ top: pos.top, left: pos.left, minWidth }}>
        {children}
      </div>
    </>,
    document.body
  );
}

// ── Universal full-screen modal ────────────────────────────────────────────────
function Modal({ open, onClose, children, maxWidth = 'max-w-sm' }: {
  open: boolean; onClose: () => void; children: React.ReactNode; maxWidth?: string;
}) {
  useEffect(() => {
    if (open) document.body.style.overflow = 'hidden';
    else document.body.style.overflow = '';
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(3px)' }}
      onClick={onClose}>
      <motion.div initial={{ scale: 0.96, opacity: 0, y: 8 }} animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.96, opacity: 0 }} transition={{ type: 'spring', damping: 26, stiffness: 300 }}
        className={cn('bg-white rounded-2xl w-full shadow-2xl overflow-hidden', maxWidth)}
        onClick={e => e.stopPropagation()}>
        {children}
      </motion.div>
    </div>,
    document.body
  );
}

// ── Source drawer ─────────────────────────────────────────────────────────────
function SourceChip({ pageSheet, canEdit, addedBy }: {
  pageSheet: ReturnType<typeof usePageSheet>; canEdit: boolean; addedBy: string;
}) {
  const [open, setOpen] = useState(false);
  const [linkInput, setLinkInput] = useState('');
  const connected = !!pageSheet.url;

  function timeAgo(iso: string | null) {
    if (!iso) return 'Never';
    const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
    if (s < 60) return 'just now';
    if (s < 3600) return `${Math.floor(s / 60)}m ago`;
    if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
    return new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
  }

  return (
    <>
      <button onClick={() => setOpen(true)}
        className={cn('flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-semibold transition-all shrink-0',
          connected ? 'bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100'
                    : 'bg-amber-50 border-amber-200 text-amber-700 hover:bg-amber-100')}>
        {connected ? <CheckCircle2 size={12} className="text-emerald-500"/> : <AlertCircle size={12} className="text-amber-500"/>}
        <span>{connected ? 'Google Sheet' : 'Connect'}</span>
        {connected && <><span className="text-emerald-400">·</span><span className="font-normal">{timeAgo(pageSheet.fetchedAt)}</span></>}
        {pageSheet.loading && <RefreshCw size={10} className="animate-spin"/>}
      </button>

      {open && createPortal(
        <div className="fixed inset-0 z-[2000] flex" onClick={() => setOpen(false)}>
          <div className="flex-1"/>
          <motion.div initial={{ x: 320 }} animate={{ x: 0 }} exit={{ x: 320 }}
            transition={{ type: 'spring', damping: 28, stiffness: 280 }}
            className="w-80 h-full bg-white border-l border-slate-200 shadow-2xl overflow-y-auto"
            onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-slate-50">
              <p className="text-sm font-bold text-slate-900">Data Source</p>
              <button onClick={() => setOpen(false)} className="p-1.5 rounded-lg hover:bg-slate-200 text-slate-400"><X size={14}/></button>
            </div>
            <div className="p-5 space-y-4">
              <div className={cn('flex items-center gap-3 p-3 rounded-xl border',
                connected ? 'bg-emerald-50 border-emerald-200' : 'bg-amber-50 border-amber-200')}>
                {connected ? <CheckCircle2 size={18} className="text-emerald-500 shrink-0"/> : <AlertCircle size={18} className="text-amber-500 shrink-0"/>}
                <div className="min-w-0">
                  <p className={cn('text-xs font-bold', connected ? 'text-emerald-800' : 'text-amber-800')}>{connected ? 'Connected' : 'No data source'}</p>
                  {connected && <p className="text-[10px] text-emerald-600 truncate mt-0.5">{pageSheet.url}</p>}
                </div>
              </div>
              {connected && (
                <div className="grid grid-cols-3 gap-2">
                  {[{ label: 'Records', value: pageSheet.rows.length.toLocaleString('en-IN') },
                    { label: 'Last Sync', value: timeAgo(pageSheet.fetchedAt) },
                    { label: 'Storage', value: pageSheet.kvAvailable ? 'Upstash' : 'Local' }]
                    .map(({ label, value }) => (
                    <div key={label} className="bg-slate-50 rounded-lg p-2.5 text-center">
                      <p className="text-[10px] text-slate-400 font-medium">{label}</p>
                      <p className="text-xs font-bold text-slate-800 mt-0.5">{value}</p>
                    </div>
                  ))}
                </div>
              )}
              {connected && (
                <div className="flex gap-2">
                  <button onClick={pageSheet.refetch}
                    className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold">
                    <RefreshCw size={12}/> Sync now
                  </button>
                  <a href={pageSheet.url} target="_blank" rel="noreferrer"
                    className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-600 text-xs font-medium">
                    <ExternalLink size={12}/> Open
                  </a>
                </div>
              )}
              {canEdit && (
                <div className="space-y-2 pt-2 border-t border-slate-100">
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">{connected ? 'Change source' : 'Connect Google Sheet'}</p>
                  <p className="text-[10px] text-slate-400">Publish sheet → File → Share → Publish to web → CSV → paste URL</p>
                  <input value={linkInput} onChange={e => setLinkInput(e.target.value)}
                    placeholder="https://docs.google.com/spreadsheets/d/…"
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-mono focus:outline-none focus:border-emerald-400"/>
                  <div className="flex gap-2">
                    {connected && (
                      <button onClick={() => { pageSheet.setUrl(''); setLinkInput(''); setOpen(false); }}
                        className="flex-1 px-3 py-2 rounded-lg border border-red-200 text-red-600 text-xs font-medium hover:bg-red-50">Disconnect</button>
                    )}
                    <button onClick={() => { if (linkInput.trim()) { pageSheet.setUrl(linkInput.trim(), addedBy); setLinkInput(''); setOpen(false); } }}
                      disabled={!linkInput.trim()}
                      className="flex-1 px-3 py-2 rounded-lg bg-rail-600 text-white text-xs font-semibold hover:bg-rail-700 disabled:opacity-40">
                      {connected ? 'Update' : 'Connect'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        </div>,
        document.body
      )}
    </>
  );
}

// ── Filter Builder — portal-based ─────────────────────────────────────────────
function FilterBuilder({ view, onUpdate }: { view: DBView; onUpdate: (f: DBFilter[]) => void }) {
  const [open, setOpen] = useState(false);
  const [filters, setFilters] = useState<DBFilter[]>(view.filters);
  const btnRef = useRef<HTMLButtonElement>(null!);
  const headers = view.properties.filter(p => p.visible).map(p => p.column);
  const allHeaders = view.properties.map(p => p.column);
  const cols = headers.length > 0 ? headers : allHeaders;

  // sync when view changes
  useEffect(() => { setFilters(view.filters); }, [view.id]);

  const add = () => {
    if (!cols.length) return;
    const f: DBFilter = { id: `f${Date.now()}`, field: cols[0], op: 'contains', value: '', logic: 'and' };
    const n = [...filters, f]; setFilters(n); onUpdate(n);
  };
  const upd = (id: string, patch: Partial<DBFilter>) => { const n = filters.map(f => f.id !== id ? f : { ...f, ...patch }); setFilters(n); onUpdate(n); };
  const del = (id: string) => { const n = filters.filter(f => f.id !== id); setFilters(n); onUpdate(n); };

  return (
    <>
      <button ref={btnRef} onClick={() => setOpen(o => !o)}
        className={cn('flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition-all whitespace-nowrap',
          filters.length > 0 ? 'bg-amber-50 border-amber-200 text-amber-700' : 'bg-white border-slate-200 text-slate-500 hover:border-slate-300')}>
        <Filter size={11}/>
        Filter
        {filters.length > 0 && <span className="bg-amber-200 text-amber-800 text-[10px] font-bold rounded-full px-1.5">{filters.length}</span>}
      </button>

      <PortalPopup triggerRef={btnRef} open={open} onClose={() => setOpen(false)} minWidth={420}>
        <div className="bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 bg-slate-50">
            <p className="text-xs font-bold text-slate-700">Filters</p>
            <button onClick={() => setOpen(false)} className="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded-lg"><X size={12}/></button>
          </div>
          <div className="p-3 space-y-2 max-h-72 overflow-y-auto">
            {filters.length === 0 && <p className="text-xs text-slate-400 text-center py-4">No filters applied — click + Add filter below</p>}
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
                  {(cols.length > 0 ? cols : ['—']).map(h => <option key={h} value={h}>{h}</option>)}
                </select>
                <select value={f.op} onChange={e => upd(f.id, { op: e.target.value as DBFilter['op'] })}
                  className="bg-white border border-slate-200 rounded px-1.5 py-1 text-[11px] text-slate-700 focus:outline-none">
                  {(Object.entries(OP_LABELS) as [DBFilter['op'], string][]).map(([op, lbl]) => (
                    <option key={op} value={op}>{lbl}</option>
                  ))}
                </select>
                {!['empty','not_empty'].includes(f.op) && (
                  <input value={f.value} onChange={e => upd(f.id, { value: e.target.value })}
                    placeholder="value" className="w-20 bg-white border border-slate-200 rounded px-1.5 py-1 text-[11px] focus:outline-none focus:border-rail-400"/>
                )}
                <button onClick={() => del(f.id)} className="p-1 text-slate-300 hover:text-red-500 rounded hover:bg-red-50"><Trash2 size={11}/></button>
              </div>
            ))}
            <button onClick={add} disabled={cols.length === 0}
              className="flex items-center gap-1.5 text-xs text-rail-600 hover:text-rail-700 font-medium disabled:opacity-40 mt-1">
              <Plus size={11}/> Add filter
            </button>
          </div>
          {filters.length > 0 && (
            <div className="px-4 py-2.5 border-t border-slate-100 bg-slate-50 flex justify-between">
              <button onClick={() => { setFilters([]); onUpdate([]); }} className="text-xs text-red-500 hover:text-red-700">Clear all</button>
              <button onClick={() => setOpen(false)} className="text-xs text-rail-600 font-semibold hover:text-rail-700">Done</button>
            </div>
          )}
        </div>
      </PortalPopup>
    </>
  );
}


// ── Sort Builder — portal-based, multi-level, drag-to-reorder ─────────────────
const SORT_DIRS: { v: SortDir; label: string }[] = [
  { v: 'asc',  label: 'A → Z / Ascending' },
  { v: 'desc', label: 'Z → A / Descending' },
];
const NULLS_OPTS = [
  { v: 'last',  label: 'Empty last' },
  { v: 'first', label: 'Empty first' },
];

function SortBuilder({ view, allProps, onUpdate }: {
  view: DBView; allProps: Property[]; onUpdate: (sorts: DBSort[]) => void;
}) {
  const [open, setOpen]       = useState(false);
  const [sorts, setSorts]     = useState<DBSort[]>(view.sorts);
  const [presets, setPresets] = useState<SortPreset[]>(view.sortPresets ?? []);
  const [newPresetName, setNewPresetName] = useState('');
  const [showSavePreset, setShowSavePreset] = useState(false);
  const btnRef = useRef<HTMLButtonElement>(null!);
  const cols = allProps.map(p => ({ column: p.column, label: p.label }));

  useEffect(() => { setSorts(view.sorts); setPresets(view.sortPresets ?? []); }, [view.id]);

  const apply = (next: DBSort[]) => { setSorts(next); onUpdate(next); };

  const addRule = () => {
    const col = cols.find(c => !sorts.some(s => s.field === c.column)) ?? cols[0];
    if (!col) return;
    apply([...sorts, { id: `s${Date.now()}`, field: col.column, dir: 'asc', nulls: 'last' }]);
  };

  const updRule = (id: string, patch: Partial<DBSort>) => {
    apply(sorts.map(s => s.id !== id ? s : { ...s, ...patch }));
  };

  const delRule = (id: string) => apply(sorts.filter(s => s.id !== id));

  const moveRule = (id: string, dir: 'up' | 'down') => {
    const arr = [...sorts]; const idx = arr.findIndex(s => s.id === id);
    const ni = dir === 'up' ? idx - 1 : idx + 1;
    if (ni < 0 || ni >= arr.length) return;
    [arr[idx], arr[ni]] = [arr[ni], arr[idx]];
    apply(arr);
  };

  const savePreset = () => {
    if (!newPresetName.trim()) return;
    const p: SortPreset = { id: `sp${Date.now()}`, name: newPresetName.trim(), sorts: JSON.parse(JSON.stringify(sorts)) };
    const next = [...presets, p]; setPresets(next);
    setNewPresetName(''); setShowSavePreset(false);
    // Persisted via the view update that called onUpdate above
  };

  const applyPreset = (preset: SortPreset) => {
    apply(JSON.parse(JSON.stringify(preset.sorts)));
  };

  return (
    <>
      <button ref={btnRef} onClick={() => setOpen(o => !o)}
        className={cn(
          'flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition-all whitespace-nowrap',
          sorts.length > 0
            ? 'bg-indigo-50 border-indigo-200 text-indigo-700'
            : 'bg-white border-slate-200 text-slate-500 hover:border-slate-300'
        )}>
        <ArrowUpDown size={11}/>
        Sort
        {sorts.length > 0 && <span className="bg-indigo-200 text-indigo-800 text-[10px] font-bold rounded-full px-1.5">{sorts.length}</span>}
      </button>

      <PortalPopup triggerRef={btnRef} open={open} onClose={() => setOpen(false)} minWidth={460}>
        <div className="bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 bg-slate-50">
            <div className="flex items-center gap-2">
              <ArrowUpDown size={13} className="text-indigo-500"/>
              <p className="text-xs font-bold text-slate-700">Sort Rules</p>
              {sorts.length > 0 && (
                <span className="text-[10px] bg-indigo-100 text-indigo-700 rounded-full px-1.5 font-semibold">{sorts.length} active</span>
              )}
            </div>
            <button onClick={() => setOpen(false)} className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200"><X size={12}/></button>
          </div>

          {/* Sort rules */}
          <div className="p-3 space-y-2 max-h-64 overflow-y-auto">
            {sorts.length === 0 && (
              <p className="text-xs text-slate-400 text-center py-4">No sort rules — click + Add rule below</p>
            )}
            {sorts.map((s, i) => (
              <div key={s.id} className="flex items-center gap-2 bg-slate-50 rounded-xl p-2.5 group">
                {/* Drag handle + move */}
                <div className="flex flex-col gap-0.5">
                  <button onClick={() => moveRule(s.id, 'up')} disabled={i === 0}
                    className="p-0.5 rounded text-slate-300 hover:text-slate-600 disabled:opacity-20"><ChevronUp size={10}/></button>
                  <GripVertical size={12} className="text-slate-300 mx-auto"/>
                  <button onClick={() => moveRule(s.id, 'down')} disabled={i === sorts.length - 1}
                    className="p-0.5 rounded text-slate-300 hover:text-slate-600 disabled:opacity-20"><ChevronDown size={10}/></button>
                </div>

                {/* Priority badge */}
                <span className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-700 text-[10px] font-bold flex items-center justify-center shrink-0">{i+1}</span>

                {/* Field */}
                <select value={s.field} onChange={e => updRule(s.id, { field: e.target.value })}
                  className="flex-1 bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-[11px] text-slate-700 focus:outline-none focus:border-indigo-400 min-w-0">
                  {cols.map(c => <option key={c.column} value={c.column}>{c.label}</option>)}
                </select>

                {/* Direction */}
                <select value={s.dir} onChange={e => updRule(s.id, { dir: e.target.value as SortDir })}
                  className="bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-[11px] text-slate-700 focus:outline-none focus:border-indigo-400">
                  {SORT_DIRS.map(d => <option key={d.v} value={d.v}>{d.label}</option>)}
                </select>

                {/* Nulls */}
                <select value={s.nulls ?? 'last'} onChange={e => updRule(s.id, { nulls: e.target.value as 'first'|'last' })}
                  className="bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-[11px] text-slate-600 focus:outline-none focus:border-indigo-400">
                  {NULLS_OPTS.map(n => <option key={n.v} value={n.v}>{n.label}</option>)}
                </select>

                <button onClick={() => delRule(s.id)} className="p-1.5 rounded-lg text-slate-300 hover:text-red-500 hover:bg-red-50 transition-all shrink-0">
                  <Trash2 size={11}/>
                </button>
              </div>
            ))}

            <button onClick={addRule} disabled={cols.length === 0 || sorts.length >= cols.length}
              className="flex items-center gap-1.5 text-xs text-indigo-600 hover:text-indigo-800 font-semibold disabled:opacity-40 mt-1">
              <Plus size={11}/> Add sort rule
            </button>
          </div>

          {/* Presets */}
          {(presets.length > 0 || sorts.length > 0) && (
            <div className="border-t border-slate-100 px-4 py-3 space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Saved Presets</p>
                {sorts.length > 0 && (
                  <button onClick={() => setShowSavePreset(s => !s)}
                    className="text-[10px] text-indigo-600 font-semibold hover:text-indigo-800">
                    + Save current
                  </button>
                )}
              </div>
              {showSavePreset && (
                <div className="flex gap-2">
                  <input value={newPresetName} onChange={e => setNewPresetName(e.target.value)} autoFocus
                    placeholder="Preset name…" onKeyDown={e => e.key === 'Enter' && savePreset()}
                    className="flex-1 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-[11px] focus:outline-none focus:border-indigo-400"/>
                  <button onClick={savePreset} disabled={!newPresetName.trim()}
                    className="px-3 py-1.5 text-[11px] bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-40 font-semibold">Save</button>
                </div>
              )}
              {presets.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {presets.map(p => (
                    <button key={p.id} onClick={() => applyPreset(p)}
                      className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 text-[10px] text-indigo-700 font-semibold transition-all">
                      {p.name}
                      <span className="text-indigo-400 font-normal">({p.sorts.length})</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Footer */}
          {sorts.length > 0 && (
            <div className="border-t border-slate-100 px-4 py-2.5 bg-slate-50 flex justify-between">
              <button onClick={() => apply([])} className="text-xs text-red-500 hover:text-red-700 font-medium">Clear all</button>
              <button onClick={() => setOpen(false)} className="text-xs text-indigo-600 font-semibold hover:text-indigo-800">Done</button>
            </div>
          )}
        </div>
      </PortalPopup>
    </>
  );
}

// ── Add View Modal — full centered modal ──────────────────────────────────────
type VisibilityOption = DBView['visibility'];
const VISIBILITY_OPTIONS: { id: VisibilityOption; label: string; icon: React.ElementType; desc: string }[] = [
  { id: 'personal', label: 'Only Me',       icon: Lock,     desc: 'Private to your account' },
  { id: 'cell',     label: 'Cell Members',  icon: Building, desc: 'All members of this Cell' },
  { id: 'role',     label: 'By Role',       icon: Users,    desc: 'Admin, Incharge, etc.' },
  { id: 'admin',    label: 'Admin Only',    icon: Lock,     desc: 'Maintenance & Admin only' },
  { id: 'public',   label: 'System Wide',   icon: Globe,    desc: 'Visible to everyone' },
];

function AddViewModal({ open, onClose, onAdd, existingViews }: {
  open: boolean; onClose: () => void;
  onAdd: (label: string, layout: ViewLayout, tplId?: string, visibility?: VisibilityOption, roles?: string[]) => void;
  existingViews: DBView[];
}) {
  const [label,      setLabel]      = useState('New View');
  const [layout,     setLayout]     = useState<ViewLayout>('table');
  const [tplId,      setTplId]      = useState('');
  const [visibility, setVisibility] = useState<VisibilityOption>('cell');
  const [selRoles,   setSelRoles]   = useState<string[]>([]);

  const LAYOUTS: { id: ViewLayout; label: string }[] = [
    { id: 'table', label: 'Table' }, { id: 'card', label: 'Card' }, { id: 'list', label: 'List' },
    { id: 'board', label: 'Board' }, { id: 'gallery', label: 'Gallery' },
  ];
  const LAYOUT_ICON_MAP: Record<string, React.ElementType> = { Table2, LayoutGrid, List, Columns };
  const ALL_ROLES = ['admin','maintenance','incharge','user'];

  const handleCreate = () => {
    if (!label.trim()) return;
    onAdd(label.trim(), layout, tplId || undefined, visibility, selRoles.length ? selRoles : undefined);
    setLabel('New View'); setLayout('table'); setTplId(''); setVisibility('cell'); setSelRoles([]); onClose();
  };

  return (
    <Modal open={open} onClose={onClose} maxWidth="max-w-md">
      <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
        <p className="text-sm font-bold text-slate-900">Create New View</p>
        <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400"><X size={15}/></button>
      </div>
      <div className="p-5 space-y-5 max-h-[70vh] overflow-y-auto">
        {/* Name */}
        <div>
          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">View Name</label>
          <input value={label} onChange={e => setLabel(e.target.value)} autoFocus
            onKeyDown={e => e.key === 'Enter' && handleCreate()}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-800 focus:outline-none focus:border-rail-400 focus:bg-white"/>
        </div>
        {/* Layout */}
        <div>
          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-2">Layout Type</label>
          <div className="grid grid-cols-5 gap-2">
            {LAYOUTS.map(l => {
              const Icon = LAYOUT_ICON_MAP[LAYOUT_ICONS[l.id]] ?? Table2;
              return (
                <button key={l.id} onClick={() => setLayout(l.id)}
                  className={cn('flex flex-col items-center gap-1.5 p-3 rounded-xl border text-center transition-all',
                    layout === l.id ? 'bg-rail-50 border-rail-400 text-rail-700' : 'border-slate-200 text-slate-500 hover:bg-slate-50')}>
                  <Icon size={18} className={layout === l.id ? 'text-rail-600' : 'text-slate-400'}/>
                  <span className="text-[10px] font-semibold">{l.label}</span>
                </button>
              );
            })}
          </div>
        </div>
        {/* Visibility */}
        <div>
          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-2">Visibility</label>
          <div className="space-y-1.5">
            {VISIBILITY_OPTIONS.map(opt => {
              const Icon = opt.icon;
              return (
                <button key={opt.id} onClick={() => setVisibility(opt.id)}
                  className={cn('flex items-center gap-3 w-full px-3 py-2.5 rounded-xl border text-left transition-all',
                    visibility === opt.id ? 'bg-rail-50 border-rail-400' : 'border-slate-200 hover:bg-slate-50')}>
                  <div className={cn('w-7 h-7 rounded-lg flex items-center justify-center shrink-0',
                    visibility === opt.id ? 'bg-rail-100' : 'bg-slate-100')}>
                    <Icon size={13} className={visibility === opt.id ? 'text-rail-600' : 'text-slate-400'}/>
                  </div>
                  <div>
                    <p className={cn('text-xs font-semibold', visibility === opt.id ? 'text-rail-800' : 'text-slate-700')}>{opt.label}</p>
                    <p className="text-[10px] text-slate-400">{opt.desc}</p>
                  </div>
                  {visibility === opt.id && <Check size={14} className="text-rail-600 ml-auto shrink-0"/>}
                </button>
              );
            })}
          </div>
          {/* Role selector */}
          {visibility === 'role' && (
            <div className="mt-3 p-3 bg-slate-50 rounded-xl border border-slate-200">
              <p className="text-[10px] font-bold text-slate-500 mb-2">Select Roles</p>
              <div className="flex flex-wrap gap-2">
                {ALL_ROLES.map(role => (
                  <button key={role} onClick={() => setSelRoles(r => r.includes(role) ? r.filter(x => x !== role) : [...r, role])}
                    className={cn('px-2.5 py-1.5 rounded-lg text-xs font-semibold border capitalize transition-all',
                      selRoles.includes(role) ? 'bg-rail-600 border-rail-600 text-white' : 'border-slate-200 text-slate-600 hover:bg-slate-100')}>
                    {role}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
        {/* Template */}
        <div>
          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">Start from</label>
          <select value={tplId} onChange={e => setTplId(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-700 focus:outline-none focus:border-rail-400">
            <option value="">Blank view</option>
            {existingViews.map(v => <option key={v.id} value={v.id}>Copy from: {v.label}</option>)}
          </select>
        </div>
      </div>
      <div className="flex gap-3 px-5 py-4 border-t border-slate-100 bg-slate-50">
        <button onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-500 hover:bg-white">Cancel</button>
        <button onClick={handleCreate} disabled={!label.trim()}
          className="flex-1 py-2.5 rounded-xl bg-rail-600 hover:bg-rail-700 text-white text-sm font-bold disabled:opacity-40">
          Create View
        </button>
      </div>
    </Modal>
  );
}

// ── Delete View Confirm Modal ─────────────────────────────────────────────────
function DeleteViewModal({ open, viewLabel, onConfirm, onClose }: {
  open: boolean; viewLabel: string; onConfirm: () => void; onClose: () => void;
}) {
  return (
    <Modal open={open} onClose={onClose} maxWidth="max-w-sm">
      <div className="p-6 text-center space-y-4">
        <div className="w-12 h-12 rounded-2xl bg-red-50 flex items-center justify-center mx-auto">
          <Trash2 size={20} className="text-red-500"/>
        </div>
        <div>
          <p className="text-sm font-bold text-slate-900">Delete View</p>
          <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
            Are you sure you want to delete <strong className="text-slate-700">"{viewLabel}"</strong>?<br/>
            Only the view configuration will be deleted. Your data and records will remain unchanged.
          </p>
        </div>
        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-500 hover:bg-slate-50">Cancel</button>
          <button onClick={() => { onConfirm(); onClose(); }}
            className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-sm font-bold transition-colors">
            Delete View
          </button>
        </div>
      </div>
    </Modal>
  );
}

// ── Properties Panel Modal ────────────────────────────────────────────────────
function PropertiesPanel({ view, allHeaders, onUpdate, onClose }: {
  view: DBView; allHeaders: string[]; onUpdate: (p: Property[]) => void; onClose: () => void;
}) {
  const [props, setProps] = useState<Property[]>(() => mergeProperties(view.properties, allHeaders));
  const [search, setSearch] = useState('');
  const [renaming, setRenaming] = useState<string | null>(null);
  const [draftLabel, setDraftLabel] = useState('');

  const sorted = [...props].sort((a, b) => a.order - b.order);
  const filtered = sorted.filter(p => !search || p.column.toLowerCase().includes(search.toLowerCase()) || p.label.toLowerCase().includes(search.toLowerCase()));

  const toggle = (id: string) => { const n = props.map(p => p.id !== id ? p : { ...p, visible: !p.visible }); setProps(n); onUpdate(n); };
  const move = (id: string, dir: 'up'|'down') => {
    const s = [...sorted]; const idx = s.findIndex(p => p.id === id); const ni = dir === 'up' ? idx-1 : idx+1;
    if (ni < 0 || ni >= s.length) return;
    [s[idx], s[ni]] = [s[ni], s[idx]];
    const n = s.map((p, i) => ({ ...p, order: i })); setProps(n); onUpdate(n);
  };
  const rename = (id: string, label: string) => { const n = props.map(p => p.id !== id ? p : { ...p, label }); setProps(n); onUpdate(n); setRenaming(null); };

  return (
    <Modal open onClose={onClose} maxWidth="max-w-sm">
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
      <div className="max-h-72 overflow-y-auto divide-y divide-slate-50">
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
              <button onClick={() => move(prop.id, 'down')} disabled={idx === filtered.length-1} className="p-1 rounded hover:bg-slate-200 text-slate-300 disabled:opacity-20"><ChevronDown size={10}/></button>
            </div>
          </div>
        ))}
      </div>
      <div className="px-4 py-3 border-t border-slate-100 bg-slate-50 flex justify-between text-[10px] text-slate-400">
        <span>{props.filter(p=>p.visible).length} of {props.length} visible</span>
        <button onClick={() => { const a = props.map(p=>({...p,visible:true})); setProps(a); onUpdate(a); }} className="hover:text-rail-600">Show all</button>
      </div>
    </Modal>
  );
}

// ── Data views ────────────────────────────────────────────────────────────────

// ── Record Detail Panel ────────────────────────────────────────────────────────
// Opens as a right-side peek panel or centered modal.
// Fully dynamic — renders all properties from the data, zero hardcoded fields.
type RecordOpenMode = 'peek' | 'modal';

interface RecordDetailProps {
  row: SheetRow;
  allRows: SheetRow[];
  rowIndex: number;       // index in allRows for prev/next navigation
  props: Property[];
  mode: RecordOpenMode;
  canEdit: boolean;
  onClose: () => void;
  onNavigate: (index: number) => void;
}

// Print the record in a clean A4 layout
function printRecord(row: SheetRow, props: Property[]) {
  const vis = props.filter(p => p.visible).sort((a, b) => a.order - b.order);
  const title = String(row[vis[0]?.column ?? ''] ?? 'Record');
  const html = `<!DOCTYPE html>
<html>
<head>
  <title>${title} — Station Profile</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 40px; color: #1e293b; }
    .header { border-bottom: 3px solid #1d4ed8; padding-bottom: 16px; margin-bottom: 24px; }
    .org { font-size: 11px; color: #64748b; text-transform: uppercase; letter-spacing: 1px; }
    .title { font-size: 22px; font-weight: bold; margin: 6px 0; }
    .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px 32px; }
    .field { border-bottom: 1px solid #f1f5f9; padding: 8px 0; }
    .label { font-size: 10px; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 2px; }
    .value { font-size: 13px; font-weight: 500; }
    .footer { margin-top: 32px; border-top: 1px solid #e2e8f0; padding-top: 12px; font-size: 10px; color: #94a3b8; display: flex; justify-content: space-between; }
    @media print { body { margin: 20px; } }
  </style>
</head>
<body>
  <div class="header">
    <div class="org">Northern Railway · Delhi Division · Commercial Branch</div>
    <div class="title">${title}</div>
    <div class="org">Station Profile</div>
  </div>
  <div class="grid">
    ${vis.slice(1).map(p => `
      <div class="field">
        <div class="label">${p.label}</div>
        <div class="value">${String(row[p.column] ?? '—')}</div>
      </div>
    `).join('')}
  </div>
  <div class="footer">
    <span>Printed by: Commercial Branch Dashboard</span>
    <span>Date: ${new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
  </div>
</body>
</html>`;
  const w = window.open('', '_blank');
  if (!w) return;
  w.document.write(html);
  w.document.close();
  w.onload = () => { w.print(); };
}

function RecordDetail({ row, allRows, rowIndex, props, mode, canEdit, onClose, onNavigate }: RecordDetailProps) {
  const vis = props.filter(p => p.visible).sort((a, b) => a.order - b.order);
  const [editMode, setEditMode] = useState(false);
  const [edits, setEdits] = useState<SheetRow>({ ...row });

  // Reset edits when row changes
  useEffect(() => { setEdits({ ...row }); setEditMode(false); }, [row]);

  // Keyboard navigation
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft' && rowIndex > 0) onNavigate(rowIndex - 1);
      if (e.key === 'ArrowRight' && rowIndex < allRows.length - 1) onNavigate(rowIndex + 1);
      if (e.ctrlKey && e.key === 'p') { e.preventDefault(); printRecord(row, props); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [row, rowIndex, allRows.length, onClose, onNavigate, props]);

  const titleProp = vis[0];
  const titleVal = String(row[titleProp?.column ?? ''] ?? 'Record');

  // Group properties into sections of ~5 each for visual clarity
  const propSections: Property[][] = [];
  const otherProps = vis.slice(1);
  for (let i = 0; i < otherProps.length; i += 6) {
    propSections.push(otherProps.slice(i, i + 6));
  }

  const Content = (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-start justify-between px-6 py-5 border-b border-slate-100 shrink-0">
        <div className="flex-1 min-w-0 pr-4">
          <div className="flex items-center gap-2 mb-1">
            <FileText size={14} className="text-rail-500 shrink-0"/>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Record</span>
          </div>
          <h2 className="text-xl font-black text-slate-900 leading-tight truncate">{titleVal}</h2>
          {titleProp && (
            <p className="text-[10px] text-slate-400 mt-0.5">{titleProp.label}</p>
          )}
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <button onClick={() => printRecord(row, props)} title="Print record (Ctrl+P)"
            className="p-2 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors">
            <Printer size={14}/>
          </button>
          {canEdit && (
            <button onClick={() => setEditMode(e => !e)}
              className={cn('px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-colors',
                editMode ? 'bg-rail-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200')}>
              {editMode ? 'Editing' : 'Edit'}
            </button>
          )}
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors">
            <X size={15}/>
          </button>
        </div>
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between px-6 py-2 border-b border-slate-100 bg-slate-50 shrink-0">
        <button onClick={() => rowIndex > 0 && onNavigate(rowIndex - 1)}
          disabled={rowIndex === 0}
          className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
          <ArrowLeft size={12}/> Prev
        </button>
        <span className="text-[10px] text-slate-400">{rowIndex + 1} of {allRows.length}</span>
        <button onClick={() => rowIndex < allRows.length - 1 && onNavigate(rowIndex + 1)}
          disabled={rowIndex === allRows.length - 1}
          className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
          Next <ArrowRight size={12}/>
        </button>
      </div>

      {/* Properties */}
      <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
        {propSections.map((section, si) => (
          <div key={si} className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {section.map(p => (
                <div key={p.id} className="group">
                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1">{p.label}</p>
                  {editMode ? (
                    <input
                      value={String(edits[p.column] ?? '')}
                      onChange={e => setEdits(prev => ({ ...prev, [p.column]: e.target.value }))}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-sm text-slate-800 focus:outline-none focus:border-rail-400 focus:bg-white"
                    />
                  ) : (
                    <p className={cn('text-sm text-slate-800 font-medium leading-snug',
                      !row[p.column] && 'text-slate-300 italic')}>
                      {String(row[p.column] ?? '—')}
                    </p>
                  )}
                </div>
              ))}
            </div>
            {si < propSections.length - 1 && <div className="border-t border-slate-100"/>}
          </div>
        ))}

        {editMode && (
          <div className="pt-2 border-t border-slate-100 flex gap-3">
            <button onClick={() => setEditMode(false)}
              className="flex-1 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-500 hover:bg-slate-50">Cancel</button>
            <button
              onClick={() => {
                // In a real app: patch Google Sheet via API.
                // Here: show a toast explaining this is read-only from sheet.
                setEditMode(false);
              }}
              className="flex-1 py-2.5 rounded-xl bg-rail-600 text-white text-sm font-bold hover:bg-rail-700">
              Save Changes
            </button>
          </div>
        )}

        {/* Keyboard shortcuts hint */}
        <div className="bg-slate-50 rounded-xl px-4 py-3 text-[10px] text-slate-400 space-y-1">
          <p className="font-semibold text-slate-500 mb-1.5">Keyboard shortcuts</p>
          <div className="grid grid-cols-2 gap-x-4 gap-y-0.5">
            <span><kbd className="bg-white border border-slate-200 rounded px-1">←</kbd> Previous</span>
            <span><kbd className="bg-white border border-slate-200 rounded px-1">→</kbd> Next</span>
            <span><kbd className="bg-white border border-slate-200 rounded px-1">Esc</kbd> Close</span>
            <span><kbd className="bg-white border border-slate-200 rounded px-1">Ctrl+P</kbd> Print</span>
          </div>
        </div>
      </div>
    </div>
  );

  if (mode === 'peek') {
    // Side peek — slide in from right, database visible in background
    return createPortal(
      <div className="fixed inset-0 z-[1500]" onClick={onClose}>
        <motion.div
          initial={{ x: 480 }} animate={{ x: 0 }} exit={{ x: 480 }}
          transition={{ type: 'spring', damping: 28, stiffness: 280 }}
          className="absolute right-0 top-0 h-full w-full max-w-lg bg-white border-l border-slate-200 shadow-2xl"
          onClick={e => e.stopPropagation()}>
          {Content}
        </motion.div>
      </div>,
      document.body
    );
  }

  // Center modal
  return createPortal(
    <div className="fixed inset-0 z-[1500] flex items-center justify-center p-6"
      style={{ backgroundColor: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(3px)' }}
      onClick={onClose}>
      <motion.div
        initial={{ scale: 0.96, opacity: 0, y: 10 }} animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.96, opacity: 0 }}
        className="w-full max-w-2xl h-[80vh] bg-white rounded-2xl shadow-2xl overflow-hidden"
        onClick={e => e.stopPropagation()}>
        {Content}
      </motion.div>
    </div>,
    document.body
  );
}

const PAGE_SIZE = 50;

function TableView({ rows, props, search, onOpen }: { rows: SheetRow[]; props: Property[]; search: string; onOpen?: (row: SheetRow, idx: number) => void }) {
  const [page, setPage] = useState(0);
  const vis = props.filter(p => p.visible).sort((a, b) => a.order - b.order);
  const titleCol = vis[0]?.column; // first visible property = title (clickable)

  const filtered = useMemo(() => {
    if (!search) return rows;
    const q = search.toLowerCase();
    return rows.filter(r => vis.some(p => String(r[p.column] ?? '').toLowerCase().includes(q)));
  }, [rows, search, vis]);
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paged = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  if (!vis.length) return <div className="text-center py-10 text-slate-400 text-sm">No properties visible — click Properties to show columns</div>;

  return (
    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden" style={{ boxShadow: '0 1px 3px rgba(15,23,42,0.06)' }}>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200">
              <th className="text-left px-3 py-2.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider w-10">#</th>
              {vis.map((p, pi) => (
                <th key={p.id} className="text-left px-3 py-2.5 text-[10px] font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap" style={{ minWidth: p.width ?? 120 }}>
                  {p.label}{pi === 0 && <span className="ml-1 text-[8px] text-rail-400 font-normal normal-case tracking-normal">Title</span>}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {paged.map((row, i) => {
              const globalIdx = page * PAGE_SIZE + i;
              return (
                <tr key={i} className={cn('group hover:bg-blue-50/30 transition-colors cursor-default', i % 2 === 1 && 'bg-slate-50/40')}>
                  <td className="px-3 py-2 text-slate-300 text-[10px] font-mono">{globalIdx + 1}</td>
                  {vis.map((p, pi) => (
                    <td key={p.id} className="px-3 py-2 text-slate-700" style={{ maxWidth: p.width ?? 200 }}>
                      {pi === 0 && onOpen ? (
                        // Title column — clickable, bold, link style
                        <button
                          onClick={() => onOpen(row, globalIdx)}
                          className="text-left font-semibold text-rail-700 hover:text-rail-900 hover:underline truncate max-w-full flex items-center gap-1 group/title">
                          {String(row[p.column] ?? '—')}
                          <Maximize2 size={10} className="opacity-0 group-hover/title:opacity-100 text-rail-400 shrink-0"/>
                        </button>
                      ) : (
                        <div className="truncate">{String(row[p.column] ?? '—')}</div>
                      )}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="flex items-center justify-between px-4 py-2.5 border-t border-slate-100 bg-slate-50">
        <p className="text-[10px] text-slate-400">{filtered.length.toLocaleString('en-IN')} records · page {page+1}/{totalPages||1}</p>
        <div className="flex gap-1">
          <button onClick={() => setPage(0)} disabled={page===0} className="p-1 rounded hover:bg-slate-200 text-slate-400 disabled:opacity-20"><ChevronLeft size={12}/></button>
          <button onClick={() => setPage(p=>p-1)} disabled={page===0} className="px-2 py-1 rounded hover:bg-slate-200 text-slate-500 text-xs disabled:opacity-20">Prev</button>
          <button onClick={() => setPage(p=>p+1)} disabled={page>=totalPages-1} className="px-2 py-1 rounded hover:bg-slate-200 text-slate-500 text-xs disabled:opacity-20">Next</button>
          <button onClick={() => setPage(totalPages-1)} disabled={page>=totalPages-1} className="p-1 rounded hover:bg-slate-200 text-slate-400 disabled:opacity-20"><ChevronRight size={12}/></button>
        </div>
      </div>
    </div>
  );
}

function CardView({ rows, props, search, onOpen }: { rows: SheetRow[]; props: Property[]; search: string; onOpen?: (row: SheetRow, idx: number) => void }) {
  const vis = props.filter(p => p.visible).sort((a, b) => a.order - b.order);
  const [titleProp, ...rest] = vis;
  const filtered = useMemo(() => {
    if (!search) return rows;
    const q = search.toLowerCase();
    return rows.filter(r => vis.some(p => String(r[p.column]??'').toLowerCase().includes(q)));
  }, [rows, search, vis]);
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3">
      {filtered.slice(0, 200).map((row, i) => (
        <div key={i}
          onClick={() => onOpen?.(row, i)}
          className={cn(
            'bg-white border border-slate-200 rounded-xl p-4 transition-all',
            onOpen ? 'cursor-pointer hover:border-rail-300 hover:shadow-md hover:-translate-y-0.5 group' : 'hover:shadow-sm'
          )}
          style={{ boxShadow: '0 1px 3px rgba(15,23,42,0.06)' }}>
          {/* Title */}
          {titleProp && (
            <div className="flex items-start justify-between gap-2 mb-2.5">
              <p className="text-sm font-bold text-slate-900 leading-snug line-clamp-2">
                {String(row[titleProp.column]??'—')}
              </p>
              {onOpen && <Maximize2 size={11} className="text-slate-300 group-hover:text-rail-400 transition-colors shrink-0 mt-0.5"/>}
            </div>
          )}
          {/* Properties */}
          <div className="space-y-1.5">
            {rest.slice(0,5).map(p => (
              <div key={p.id} className="flex items-center justify-between gap-2">
                <span className="text-[10px] text-slate-400 shrink-0">{p.label}</span>
                <span className="text-[11px] text-slate-700 font-medium truncate">{String(row[p.column]??'—')}</span>
              </div>
            ))}
          </div>
          {/* Open hint */}
          {onOpen && (
            <p className="text-[9px] text-slate-300 mt-2.5 group-hover:text-rail-400 transition-colors">Click to open record</p>
          )}
        </div>
      ))}
    </div>
  );
}

// ── Layout-aware Grouped View ─────────────────────────────────────────────────
// Renders groups containing the CORRECT inner layout (cards, table, list, gallery)
// groupBy2 adds a nested second-level grouping within each first-level group

type InnerLayout = 'table' | 'card' | 'gallery' | 'list';

function GroupHeader({ label, count, collapsed, onToggle, depth = 0 }: {
  label: string; count: number; collapsed: boolean; onToggle: () => void; depth?: number;
}) {
  const DEPTH_STYLES = [
    'bg-slate-50 border-b border-slate-200 px-4 py-2.5',         // depth 0
    'bg-slate-100/60 border-b border-slate-200 px-5 py-2',       // depth 1
  ];
  const DOT_COLORS = ['bg-rail-500', 'bg-emerald-500'];
  return (
    <button onClick={onToggle}
      className={cn("w-full flex items-center gap-2.5 hover:bg-slate-100/80 transition-colors", DEPTH_STYLES[depth] ?? DEPTH_STYLES[1])}>
      {depth > 0 && <span className="w-3 h-px bg-slate-300 shrink-0"/>}
      <span className={cn("w-2 h-2 rounded-full shrink-0", DOT_COLORS[depth] ?? 'bg-slate-400')}/>
      <span className={cn("font-semibold text-slate-800 flex-1 text-left", depth === 0 ? "text-sm" : "text-xs")}>{label}</span>
      <span className="text-[10px] text-slate-400 bg-white border border-slate-200 rounded-full px-2 py-0.5 shrink-0">{count}</span>
      {collapsed
        ? <ChevronDown size={13} className="text-slate-400 shrink-0"/>
        : <ChevronUp size={13} className="text-slate-400 shrink-0"/>}
    </button>
  );
}

function GroupedView({ rows, props, groupBy, groupBy2, layout, search, onOpen }: {
  rows: SheetRow[]; props: Property[]; groupBy: string; groupBy2?: string;
  layout: InnerLayout; search: string; onOpen?: (row: SheetRow, idx: number) => void;
}) {
  const [collapsed, setCollapsed] = useState(new Set<string>());
  const vis = props.filter(p => p.visible);

  const filtered = useMemo(() => {
    if (!search) return rows;
    const q = search.toLowerCase();
    return rows.filter(r => vis.some(p => String(r[p.column]??'').toLowerCase().includes(q)));
  }, [rows, search, vis]);

  const groups = useMemo(() => groupRows(filtered, groupBy), [filtered, groupBy]);

  const toggle = (key: string) => setCollapsed(s => {
    const n = new Set(s); n.has(key) ? n.delete(key) : n.add(key); return n;
  });

  // Inner renderer — same layout as the view, just scoped to this group's rows
  function renderInner(grpRows: SheetRow[]) {
    if (layout === 'card' || layout === 'gallery') return <CardView rows={grpRows} props={props} search="" onOpen={onOpen}/>;
    return <TableView rows={grpRows} props={props} search="" onOpen={onOpen}/>;
  }

  return (
    <div className="space-y-3">
      {Array.from(groups.entries()).map(([key, grpRows]) => {
        const isCollapsed = collapsed.has(key);
        return (
          <div key={key} className="bg-white border border-slate-200 rounded-xl overflow-hidden"
            style={{ boxShadow: "0 1px 3px rgba(15,23,42,0.06)" }}>
            <GroupHeader label={key} count={grpRows.length} collapsed={isCollapsed} onToggle={() => toggle(key)} depth={0}/>

            {!isCollapsed && (
              <div className={cn(layout === 'table' || layout === 'list' ? "" : "p-4")}>
                {/* Nested grouping */}
                {groupBy2 ? (
                  <div className="space-y-0">
                    {Array.from(groupRows(grpRows, groupBy2).entries()).map(([key2, rows2]) => {
                      const k2 = `${key}::${key2}`;
                      const isCollapsed2 = collapsed.has(k2);
                      return (
                        <div key={key2}>
                          <GroupHeader label={key2} count={rows2.length} collapsed={isCollapsed2} onToggle={() => toggle(k2)} depth={1}/>
                          {!isCollapsed2 && (
                            <div className={cn(layout === 'table' || layout === 'list' ? "" : "p-4 pt-3")}>
                              {renderInner(rows2)}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ) : renderInner(grpRows)}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── View Context Menu — portal-based ──────────────────────────────────────────
function ViewMenu({ view, canEdit, isActive, totalViews, btnRef, open, onClose, onRename, onDuplicate, onDelete, onOpenProps }: {
  view: DBView; canEdit: boolean; isActive: boolean; totalViews: number;
  btnRef: React.RefObject<HTMLElement>; open: boolean; onClose: () => void;
  onRename: () => void; onDuplicate: () => void; onDelete: () => void; onOpenProps: () => void;
}) {
  if (!canEdit || !open) return null;
  return (
    <PortalPopup triggerRef={btnRef} open={open} onClose={onClose} minWidth={160}>
      <div className="bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden py-1">
        <button onClick={() => { onRename(); onClose(); }} className="flex items-center gap-2 px-3 py-2 text-xs text-slate-700 hover:bg-slate-50 w-full"><Edit3 size={11} className="text-slate-400"/> Rename</button>
        <button onClick={() => { onDuplicate(); onClose(); }} className="flex items-center gap-2 px-3 py-2 text-xs text-slate-700 hover:bg-slate-50 w-full"><Copy size={11} className="text-slate-400"/> Duplicate</button>
        <button onClick={() => { onOpenProps(); onClose(); }} className="flex items-center gap-2 px-3 py-2 text-xs text-slate-700 hover:bg-slate-50 w-full"><Settings2 size={11} className="text-slate-400"/> Properties</button>
        {totalViews > 1 && (
          <>
            <div className="border-t border-slate-100 my-1"/>
            <button onClick={() => { onDelete(); onClose(); }} className="flex items-center gap-2 px-3 py-2 text-xs text-red-600 hover:bg-red-50 w-full"><Trash2 size={11}/> Delete view</button>
          </>
        )}
      </div>
    </PortalPopup>
  );
}

// ── WorkspaceBar: sticky single header ────────────────────────────────────────
const LAYOUT_ICON_MAP: Record<string, React.ElementType> = { Table2, LayoutGrid, List, Columns };

export function OverviewWorkspace({ canEdit: canEditProp }: { canEdit?: boolean } = {}) {
  const { user } = useAuthStore();
  // canEditProp from parent overrides internal role check (used for access-controlled overview)
  const canEdit = canEditProp !== undefined
    ? canEditProp
    : (user?.role === 'maintenance' || user?.role === 'admin');
  const pageSheet = usePageSheet('sheet_nsg_category_wise', user?.id);

  const [store, setStore] = useState<DBViewStore>(() => getDBViewStore('sheet_nsg_category_wise'));
  const activeView = store.views.find(v => v.id === store.activeViewId) ?? store.views[0];
  const [search, setSearch] = useState('');

  // Modal states
  const [showProps,   setShowProps]   = useState(false);
  const [showAddView, setShowAddView] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<DBView | null>(null);

  // Record detail state
  const [recordOpen,  setRecordOpen]  = useState(false);
  const [recordIdx,   setRecordIdx]   = useState(0);
  const [recordMode,  setRecordMode]  = useState<RecordOpenMode>('peek');

  // View renaming (inline)
  const [renaming, setRenaming] = useState<string | null>(null);
  const [renameDraft, setRenameDraft] = useState('');

  // View context menus — one per view, tracked by viewId
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const menuBtnRefs = useRef<Record<string, HTMLButtonElement>>({});

  // Sync interval popup
  const [showSync, setShowSync] = useState(false);
  const syncBtnRef = useRef<HTMLButtonElement>(null!);

  const commit = useCallback((next: DBViewStore) => {
    setStore(next); saveDBViewStore(next, user?.id);
  }, [user?.id]);

  // ── Cloud sync: fetch from _shared_ on mount + re-read when useAppSync finishes ──
  useEffect(() => {
    const SK = 'sheet_nsg_category_wise';
    const NS = `dbviews_${SK.replace(/[^a-zA-Z0-9]/g, '_')}`;
    const LS_KEY = `rly_dbviews_${SK}`;

    // Phase 1: direct cloud read on mount (handles case where user is already logged in)
    sharedRead(NS).then((cloudData) => {
      if (!cloudData) return;
      try {
        const cd = cloudData as DBViewStore;
        // Only apply cloud data if it has more properties than what we loaded from localStorage
        const localStore = getDBViewStore(SK);
        const localPropCount = localStore.views.reduce((s, v) => s + (v.properties?.length ?? 0), 0);
        const cloudPropCount = (cd.views ?? []).reduce((s: number, v: DBView) => s + (v.properties?.length ?? 0), 0);
        if (cloudPropCount > 0 || localPropCount === 0) {
          const updated = { ...cd, sourceKey: SK };
          localStorage.setItem(LS_KEY, JSON.stringify(updated));
          setStore(updated);
        }
      } catch { /* ignore parse errors */ }
    }).catch(() => {});

    // Phase 2: listen for useAppSync bulk-sync completion event
    const handleSyncComplete = () => {
      const fresh = getDBViewStore(SK);
      setStore(fresh);
    };
    window.addEventListener('rly_cloud_sync_complete', handleSyncComplete);
    return () => window.removeEventListener('rly_cloud_sync_complete', handleSyncComplete);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Open a record by index in the processedRows array
  const openRecord = useCallback((row: SheetRow, idx: number, mode: RecordOpenMode = 'peek') => {
    setRecordIdx(idx);
    setRecordMode(mode);
    setRecordOpen(true);
  }, []);

  // Auto-detect properties from sheet headers
  useEffect(() => {
    if (!pageSheet.headers.length || !activeView) return;
    const merged = mergeProperties(activeView.properties, pageSheet.headers);
    if (merged.length > activeView.properties.length) {
      commit(dbUpdateView(store, activeView.id, { properties: merged }));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pageSheet.headers.join(','), activeView?.id]);

  useEffect(() => {
    pageSheet.setPollInterval(store.syncIntervalMinutes * 60_000);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [store.syncIntervalMinutes]);

  const processedRows = useMemo(() => {
    let rows = pageSheet.rows as SheetRow[];
    if (activeView?.filters?.length) rows = applyDBFilters(rows, activeView.filters);
    if (activeView?.sorts?.length) rows = applyDBSorts(rows, activeView.sorts);
    return rows;
  }, [pageSheet.rows, activeView?.filters, activeView?.sorts]);

  const viewProps = activeView?.properties ?? [];

  function timeAgo(iso: string | null) {
    if (!iso) return '—';
    const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
    if (s < 60) return 'just now';
    if (s < 3600) return `${Math.floor(s / 60)}m ago`;
    return `${Math.floor(s / 3600)}h ago`;
  }

  return (
    <div className="space-y-3 pb-10">

      {/* ── Sticky WorkspaceBar ──────────────────────────────────────────── */}
      <div className="bg-white border border-slate-200 rounded-xl sticky top-0 z-30"
        style={{ boxShadow: '0 2px 8px rgba(15,23,42,0.08)', overflow: 'visible' }}>

        {/* Row 1: View tabs */}
        <div className="flex items-center border-b border-slate-100 px-2" style={{ overflowX: 'auto', overflowY: 'visible' }}>
          {getVisibleViews(store.views, user?.id ?? '', user?.role ?? 'user').map(view => {
            const Icon = LAYOUT_ICON_MAP[LAYOUT_ICONS[view.layout]] ?? Table2;
            const isActive = view.id === store.activeViewId;
            return (
              <div key={view.id} className="relative shrink-0">
                {renaming === view.id ? (
                  <div className="flex items-center px-3 py-2.5">
                    <input value={renameDraft} onChange={e => setRenameDraft(e.target.value)} autoFocus
                      className="text-xs font-semibold bg-white border border-rail-300 rounded px-1.5 py-0.5 w-24 focus:outline-none"
                      onBlur={() => { commit(dbUpdateView(store, view.id, { label: renameDraft.trim() || view.label })); setRenaming(null); }}
                      onKeyDown={e => { if (e.key === 'Enter') { commit(dbUpdateView(store, view.id, { label: renameDraft.trim() || view.label })); setRenaming(null); } if (e.key === 'Escape') setRenaming(null); }}/>
                  </div>
                ) : (
                  <div className={cn('flex items-center gap-1.5 px-3 py-2.5 border-b-2 transition-all cursor-pointer select-none whitespace-nowrap',
                    isActive ? 'text-rail-600 border-rail-600' : 'text-slate-500 border-transparent hover:text-slate-700 hover:bg-slate-50')}>
                    <button onClick={() => commit({ ...store, activeViewId: view.id })} className="flex items-center gap-1.5 text-xs font-semibold">
                      <Icon size={12} className={isActive ? 'text-rail-500' : 'text-slate-400'}/>
                      {view.label}
                      {view.isDefault && <Star size={9} className="text-amber-400 fill-amber-400"/>}
                    </button>
                    {canEdit && (
                      <button
                        ref={el => { if (el) menuBtnRefs.current[view.id] = el; }}
                        onClick={e => { e.stopPropagation(); setOpenMenu(m => m === view.id ? null : view.id); }}
                        className="p-0.5 rounded hover:bg-slate-100 text-slate-300 hover:text-slate-500">
                        <MoreHorizontal size={12}/>
                      </button>
                    )}
                  </div>
                )}

                {/* Per-view context menu — portal */}
                <ViewMenu
                  view={view} canEdit={canEdit} isActive={isActive} totalViews={store.views.length}
                  btnRef={{ current: menuBtnRefs.current[view.id] }}
                  open={openMenu === view.id} onClose={() => setOpenMenu(null)}
                  onRename={() => { setRenameDraft(view.label); setRenaming(view.id); }}
                  onDuplicate={() => commit(dbAddView(store, view.label + ' (copy)', view.layout, user?.id ?? '', view.id))}
                  onDelete={() => setDeleteTarget(view)}
                  onOpenProps={() => setShowProps(true)}
                />
              </div>
            );
          })}

          {/* + Add view */}
          {canEdit && (
            <button onClick={() => setShowAddView(true)}
              className="flex items-center gap-1 px-2.5 py-2.5 text-[11px] font-medium text-slate-400 hover:text-rail-600 hover:bg-slate-50 transition-colors rounded-lg shrink-0 ml-1">
              <Plus size={12}/> Add view
            </button>
          )}

          {/* Right: sync info */}
          <div className="ml-auto flex items-center gap-2 px-3 shrink-0">
            <span className={cn('w-1.5 h-1.5 rounded-full shrink-0', pageSheet.rows.length > 0 ? 'bg-emerald-500' : 'bg-slate-300')}/>
            <span className="text-[10px] text-slate-400 whitespace-nowrap hidden lg:block">
              {pageSheet.rows.length > 0 ? `${pageSheet.rows.length.toLocaleString('en-IN')} records · ${timeAgo(pageSheet.fetchedAt)}` : 'No data'}
            </span>
            <button ref={syncBtnRef} onClick={() => setShowSync(s => !s)}
              className="text-[10px] text-slate-400 hover:text-slate-600 px-1.5 py-1 rounded hover:bg-slate-100 whitespace-nowrap">
              ⏱ {store.syncIntervalMinutes}m
            </button>
            <button onClick={pageSheet.refetch} disabled={pageSheet.loading}
              className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 disabled:opacity-40">
              <RefreshCw size={12} className={pageSheet.loading ? 'animate-spin' : ''}/>
            </button>
          </div>
        </div>

        {/* Row 2: Search + Properties + Filter + Group + Source */}
        <div className="flex items-center gap-2 px-3 py-2" style={{ overflowX: 'auto', overflowY: 'visible' }}>
          <div className="relative min-w-36 flex-1 max-w-56">
            <Search size={11} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400"/>
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search…"
              className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-7 pr-3 py-1.5 text-xs text-slate-700 focus:outline-none focus:border-rail-400"/>
          </div>

          <button onClick={() => setShowProps(true)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold border border-slate-200 bg-white text-slate-500 hover:border-rail-300 hover:text-rail-600 transition-all shrink-0 whitespace-nowrap">
            <Settings2 size={11}/>
            <span className="hidden sm:inline">Properties</span>
            <span className="text-[10px] text-slate-300">{viewProps.filter(p=>p.visible).length}/{viewProps.length}</span>
          </button>

          {activeView && (
            <FilterBuilder
              view={activeView}
              onUpdate={f => commit(dbUpdateView(store, activeView.id, { filters: f }))}
            />
          )}

          {/* Sort Builder */}
          {activeView && viewProps.length > 0 && (
            <SortBuilder
              view={activeView}
              allProps={viewProps}
              onUpdate={sorts => commit(dbUpdateView(store, activeView.id, { sorts }))}
            />
          )}

          {activeView && viewProps.length > 0 && (
            <>
              {/* Primary group-by */}
              <select value={activeView.groupBy ?? ''}
                onChange={e => commit(dbUpdateView(store, activeView.id, {
                  groupBy: e.target.value || undefined,
                  groupBy2: e.target.value ? activeView.groupBy2 : undefined, // clear nested if primary cleared
                }))}
                className="bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-xs text-slate-600 focus:outline-none focus:border-rail-400 shrink-0 whitespace-nowrap">
                <option value="">No group</option>
                {viewProps.map(p => <option key={p.column} value={p.column}>⊞ {p.label}</option>)}
              </select>

              {/* Secondary (nested) group-by — only shown when primary is set */}
              {activeView.groupBy && (
                <select value={activeView.groupBy2 ?? ''}
                  onChange={e => commit(dbUpdateView(store, activeView.id, { groupBy2: e.target.value || undefined }))}
                  className="bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-xs text-slate-600 focus:outline-none focus:border-rail-400 shrink-0 whitespace-nowrap">
                  <option value="">No sub-group</option>
                  {viewProps.filter(p => p.column !== activeView.groupBy).map(p => (
                    <option key={p.column} value={p.column}>↳ {p.label}</option>
                  ))}
                </select>
              )}
            </>
          )}

          <div className="ml-auto flex items-center gap-2 shrink-0">
            {/* Record open mode toggle */}
            <div className="flex items-center bg-slate-100 rounded-lg p-0.5">
              <button onClick={() => setRecordMode('peek')} title="Side peek"
                className={cn('p-1.5 rounded-md transition-all', recordMode === 'peek' ? 'bg-white shadow-sm text-slate-700' : 'text-slate-400 hover:text-slate-600')}>
                <PanelRight size={12}/>
              </button>
              <button onClick={() => setRecordMode('modal')} title="Center modal"
                className={cn('p-1.5 rounded-md transition-all', recordMode === 'modal' ? 'bg-white shadow-sm text-slate-700' : 'text-slate-400 hover:text-slate-600')}>
                <Maximize2 size={12}/>
              </button>
            </div>
            <SourceChip pageSheet={pageSheet} canEdit={canEdit} addedBy={user?.name ?? 'Admin'}/>
          </div>
        </div>
      </div>

      {/* ── Data view ──────────────────────────────────────────────────────── */}
      {!pageSheet.url ? (
        <div className="bg-white border-2 border-dashed border-slate-200 rounded-xl py-20 flex flex-col items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center">
            <Database size={26} className="text-slate-300"/>
          </div>
          <div className="text-center">
            <p className="text-sm font-bold text-slate-500">No data source connected</p>
            <p className="text-xs text-slate-400 mt-1">Click the status chip in the toolbar above to connect a Google Sheet</p>
          </div>
        </div>
      ) : processedRows.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-xl py-12 text-center text-slate-400 text-sm">No records match your filters</div>
      ) : activeView?.groupBy ? (
        // GroupedView preserves the view's layout type — cards stay cards, tables stay tables
        <GroupedView
          rows={processedRows} props={viewProps} search={search}
          groupBy={activeView.groupBy}
          groupBy2={activeView.groupBy2}
          layout={(activeView.layout === 'card' || activeView.layout === 'gallery') ? 'card' : 'table'}
          onOpen={(row, idx) => openRecord(row, idx)}
        />
      ) : activeView?.layout === 'card' || activeView?.layout === 'gallery' ? (
        <CardView rows={processedRows} props={viewProps} search={search} onOpen={(row, idx) => openRecord(row, idx)}/>
      ) : (
        <TableView rows={processedRows} props={viewProps} search={search} onOpen={(row, idx) => openRecord(row, idx)}/>
      )}

      {/* ── All portal-based modals ─────────────────────────────────────── */}

      {/* Sync interval picker */}
      <PortalPopup triggerRef={syncBtnRef} open={showSync} onClose={() => setShowSync(false)} align="right" minWidth={120}>
        <div className="bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden py-1">
          {[5,15,30,60].map(m => (
            <button key={m} onClick={() => { commit({ ...store, syncIntervalMinutes: m }); setShowSync(false); }}
              className={cn('flex items-center justify-between w-full px-3 py-2 text-xs',
                store.syncIntervalMinutes===m ? 'bg-rail-50 text-rail-700 font-semibold' : 'text-slate-600 hover:bg-slate-50')}>
              Every {m} min {store.syncIntervalMinutes===m && <Check size={11}/>}
            </button>
          ))}
        </div>
      </PortalPopup>

      {/* Add View Modal */}
      <AnimatePresence>
        {showAddView && (
          <AddViewModal
            open={showAddView}
            onClose={() => setShowAddView(false)}
            onAdd={(label, layout, tplId, vis, roles) => commit(dbAddView(store, label, layout, user?.id ?? '', user?.name ?? 'Admin', tplId, vis, roles))}
            existingViews={store.views}
          />
        )}
      </AnimatePresence>

      {/* Delete View Confirm */}
      <AnimatePresence>
        {deleteTarget && (
          <DeleteViewModal
            open={!!deleteTarget}
            viewLabel={deleteTarget.label}
            onConfirm={() => commit(dbDeleteView(store, deleteTarget.id))}
            onClose={() => setDeleteTarget(null)}
          />
        )}
      </AnimatePresence>

      {/* Properties Panel */}
      <AnimatePresence>
        {showProps && activeView && (
          <PropertiesPanel
            view={activeView} allHeaders={pageSheet.headers}
            onUpdate={props => commit(dbUpdateView(store, activeView.id, { properties: props }))}
            onClose={() => setShowProps(false)}
          />
        )}
      </AnimatePresence>

      {/* Record Detail — peek or modal */}
      <AnimatePresence>
        {recordOpen && processedRows[recordIdx] && (
          <RecordDetail
            row={processedRows[recordIdx]}
            allRows={processedRows}
            rowIndex={recordIdx}
            props={viewProps}
            mode={recordMode}
            canEdit={canEdit}
            onClose={() => setRecordOpen(false)}
            onNavigate={idx => setRecordIdx(idx)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
