'use client';
import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Database, RefreshCw, Plus, ChevronDown, ChevronUp, Filter,
  X, Check, Edit3, Copy, Trash2, Star, Table2, LayoutGrid, List,
  Settings2, Search, CheckCircle2, AlertCircle, ExternalLink,
  Cloud, ChevronLeft, ChevronRight, Columns, MoreHorizontal,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/store/authStore';
import { usePageSheet } from '@/lib/sheets/usePageSheet';
import {
  getDBViewStore, saveDBViewStore, dbAddView, dbUpdateView, dbDeleteView,
  mergeProperties, applyDBFilters, applyDBSorts, groupRows,
  type DBViewStore, type DBView, type Property, type DBFilter, type ViewLayout,
  OP_LABELS, LAYOUT_ICONS,
} from '@/lib/overview/overviewEngine';
import type { SheetRow } from '@/lib/sheets/googleSheets';

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

// ── Add View Modal — full centered modal ──────────────────────────────────────
function AddViewModal({ open, onClose, onAdd, existingViews }: {
  open: boolean; onClose: () => void;
  onAdd: (label: string, layout: ViewLayout, tplId?: string) => void;
  existingViews: DBView[];
}) {
  const [label, setLabel]     = useState('New View');
  const [layout, setLayout]   = useState<ViewLayout>('table');
  const [tplId, setTplId]     = useState('');

  const LAYOUTS: { id: ViewLayout; label: string; desc: string }[] = [
    { id: 'table',   label: 'Table',   desc: 'Rows and columns' },
    { id: 'card',    label: 'Card',    desc: 'Card grid layout' },
    { id: 'list',    label: 'List',    desc: 'Compact list' },
    { id: 'board',   label: 'Board',   desc: 'Kanban columns' },
    { id: 'gallery', label: 'Gallery', desc: 'Visual gallery' },
  ];
  const LAYOUT_ICON_MAP: Record<string, React.ElementType> = { Table2, LayoutGrid, List, Columns };

  const handleCreate = () => {
    if (!label.trim()) return;
    onAdd(label.trim(), layout, tplId || undefined);
    setLabel('New View'); setLayout('table'); setTplId(''); onClose();
  };

  return (
    <Modal open={open} onClose={onClose} maxWidth="max-w-md">
      <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
        <p className="text-sm font-bold text-slate-900">Create New View</p>
        <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400"><X size={15}/></button>
      </div>
      <div className="p-5 space-y-5">
        {/* Name */}
        <div>
          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">View Name</label>
          <input value={label} onChange={e => setLabel(e.target.value)} autoFocus
            onKeyDown={e => e.key === 'Enter' && handleCreate()}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-800 focus:outline-none focus:border-rail-400 focus:bg-white"/>
        </div>

        {/* Layout picker */}
        <div>
          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-2">Layout Type</label>
          <div className="grid grid-cols-5 gap-2">
            {LAYOUTS.map(l => {
              const Icon = LAYOUT_ICON_MAP[LAYOUT_ICONS[l.id]] ?? Table2;
              return (
                <button key={l.id} onClick={() => setLayout(l.id)}
                  className={cn('flex flex-col items-center gap-1.5 p-3 rounded-xl border text-center transition-all',
                    layout === l.id ? 'bg-rail-50 border-rail-400 text-rail-700' : 'border-slate-200 text-slate-500 hover:bg-slate-50 hover:border-slate-300')}>
                  <Icon size={18} className={layout === l.id ? 'text-rail-600' : 'text-slate-400'}/>
                  <span className="text-[10px] font-semibold">{l.label}</span>
                </button>
              );
            })}
          </div>
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
        <button onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-500 hover:bg-white transition-colors">Cancel</button>
        <button onClick={handleCreate} disabled={!label.trim()}
          className="flex-1 py-2.5 rounded-xl bg-rail-600 hover:bg-rail-700 text-white text-sm font-bold disabled:opacity-40 transition-colors">
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
const PAGE_SIZE = 50;

function TableView({ rows, props, search }: { rows: SheetRow[]; props: Property[]; search: string }) {
  const [page, setPage] = useState(0);
  const vis = props.filter(p => p.visible).sort((a, b) => a.order - b.order);
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
              {vis.map(p => (
                <th key={p.id} className="text-left px-3 py-2.5 text-[10px] font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap" style={{ minWidth: p.width ?? 120 }}>{p.label}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {paged.map((row, i) => (
              <tr key={i} className={cn('hover:bg-slate-50 transition-colors', i % 2 === 1 && 'bg-slate-50/40')}>
                <td className="px-3 py-2 text-slate-300 text-[10px] font-mono">{page*PAGE_SIZE+i+1}</td>
                {vis.map(p => (
                  <td key={p.id} className="px-3 py-2 text-slate-700" style={{ maxWidth: p.width ?? 200 }}>
                    <div className="truncate">{String(row[p.column] ?? '—')}</div>
                  </td>
                ))}
              </tr>
            ))}
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

function CardView({ rows, props, search }: { rows: SheetRow[]; props: Property[]; search: string }) {
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
        <div key={i} className="bg-white border border-slate-200 rounded-xl p-4 hover:shadow-md transition-all" style={{ boxShadow: '0 1px 3px rgba(15,23,42,0.06)' }}>
          {titleProp && <p className="text-sm font-bold text-slate-900 truncate mb-2">{String(row[titleProp.column]??'—')}</p>}
          <div className="space-y-1.5">
            {rest.slice(0,4).map(p => (
              <div key={p.id} className="flex items-center justify-between gap-2">
                <span className="text-[10px] text-slate-400 shrink-0">{p.label}</span>
                <span className="text-[11px] text-slate-700 font-medium truncate">{String(row[p.column]??'—')}</span>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function GroupedView({ rows, props, groupBy, search }: { rows: SheetRow[]; props: Property[]; groupBy: string; search: string }) {
  const [collapsed, setCollapsed] = useState(new Set<string>());
  const vis = props.filter(p => p.visible);
  const filtered = useMemo(() => { if (!search) return rows; const q = search.toLowerCase(); return rows.filter(r => vis.some(p => String(r[p.column]??'').toLowerCase().includes(q))); }, [rows, search, vis]);
  const groups = useMemo(() => groupRows(filtered, groupBy), [filtered, groupBy]);
  return (
    <div className="space-y-3">
      {Array.from(groups.entries()).map(([key, grpRows]) => (
        <div key={key} className="bg-white border border-slate-200 rounded-xl overflow-hidden" style={{ boxShadow: '0 1px 3px rgba(15,23,42,0.06)' }}>
          <button onClick={() => setCollapsed(s => { const n = new Set(s); n.has(key)?n.delete(key):n.add(key); return n; })}
            className="w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-50 transition-colors border-b border-slate-100">
            <div className="w-2 h-2 rounded-full bg-rail-500 shrink-0"/>
            <p className="font-semibold text-slate-800 text-sm flex-1 text-left">{key}</p>
            <span className="text-[10px] text-slate-400 bg-slate-100 rounded-full px-2 py-0.5">{grpRows.length} records</span>
            {collapsed.has(key) ? <ChevronDown size={14} className="text-slate-400"/> : <ChevronUp size={14} className="text-slate-400"/>}
          </button>
          {!collapsed.has(key) && <TableView rows={grpRows} props={props} search=""/>}
        </div>
      ))}
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

export function OverviewWorkspace() {
  const { user } = useAuthStore();
  const canEdit = user?.role === 'maintenance' || user?.role === 'admin';
  const pageSheet = usePageSheet('sheet_nsg_category_wise', user?.id);

  const [store, setStore] = useState<DBViewStore>(() => getDBViewStore('sheet_nsg_category_wise'));
  const activeView = store.views.find(v => v.id === store.activeViewId) ?? store.views[0];
  const [search, setSearch] = useState('');

  // Modal states
  const [showProps,   setShowProps]   = useState(false);
  const [showAddView, setShowAddView] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<DBView | null>(null);

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
          {store.views.map(view => {
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

          {activeView && viewProps.length > 0 && (
            <select value={activeView.groupBy ?? ''} onChange={e => commit(dbUpdateView(store, activeView.id, { groupBy: e.target.value || undefined }))}
              className="bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-xs text-slate-600 focus:outline-none focus:border-rail-400 shrink-0">
              <option value="">No group</option>
              {viewProps.map(p => <option key={p.column} value={p.column}>⊞ {p.label}</option>)}
            </select>
          )}

          <div className="ml-auto shrink-0">
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
        <GroupedView rows={processedRows} props={viewProps} groupBy={activeView.groupBy} search={search}/>
      ) : activeView?.layout === 'card' || activeView?.layout === 'gallery' ? (
        <CardView rows={processedRows} props={viewProps} search={search}/>
      ) : (
        <TableView rows={processedRows} props={viewProps} search={search}/>
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
            onAdd={(label, layout, tplId) => commit(dbAddView(store, label, layout, user?.id ?? '', tplId))}
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
    </div>
  );
}
