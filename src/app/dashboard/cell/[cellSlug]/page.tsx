'use client';
import { useParams } from 'next/navigation';
import { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { getCellBySlug, type CellRecord } from '@/lib/cells/cellRegistry';
import { WorkspaceBuilder } from '@/components/workspace/WorkspaceBuilder';
import { useAuthStore } from '@/store/authStore';
import { canManageCellStructure } from '@/lib/cellData/useCellDataStructure';
import { getStaffForCell, STAFF_CHANGED_EVENT, type MasterStaffRecord } from '@/lib/staff/masterStaff';
import { AVAILABLE_WIDGETS, type WidgetType } from '@/lib/workspace/layoutEngine';
import {
  Construction, Folder, Briefcase, Users2, Search,
  Settings2, Users, ChevronDown, ChevronUp, Plus, X,
  Table2, FileText, BarChart3, TrendingUp, Activity,
  UserCheck, ClipboardList, Share2, Bell, Link2,
  FileSpreadsheet, AlertCircle, Minus, ChevronRight,
  CheckSquare, PieChart, Globe, ExternalLink,
  Heading, Hash, Database, Bot, BookOpen,
} from 'lucide-react';
import { SearchTrigger } from '@/components/search/UniversalSearch';
import { useWorkspace } from '@/lib/cellData/useWorkspace';
import { cn } from '@/lib/utils';

// ── Icon map for widget picker ────────────────────────────────────────────────
const ICON_MAP: Record<string, React.ElementType> = {
  Table2, FileText, BarChart3, TrendingUp, Activity, Users2,
  UserCheck, ClipboardList, Share2, Bell, Link2, FileSpreadsheet,
  AlertCircle, Minus, ChevronRight, CheckSquare, PieChart, Globe,
  ExternalLink, Heading, Hash, Folder, Plus, Database, Bot, BookOpen,
};
function Ico({ name, size = 14, className = '' }: { name: string; size?: number; className?: string }) {
  const I = ICON_MAP[name] ?? Plus;
  return <I size={size} className={className}/>;
}

// ── Portal slash-command block picker ─────────────────────────────────────────
function SlashCommandPicker({
  triggerRef, open, onClose, onSelect,
}: {
  triggerRef: React.RefObject<HTMLElement>;
  open: boolean;
  onClose: () => void;
  onSelect: (type: WidgetType, title: string) => void;
}) {
  const [search, setSearch] = useState('');
  const [pos, setPos] = useState({ top: 0, left: 0 });
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) { setSearch(''); return; }
    setTimeout(() => inputRef.current?.focus(), 50);
    if (triggerRef.current) {
      const r = triggerRef.current.getBoundingClientRect();
      setPos({ top: r.bottom + 4 + window.scrollY, left: r.left });
    }
  }, [open, triggerRef]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    if (open) window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, onClose]);

  const GROUPS = ['Enterprise', 'Database', 'Content', 'Data', 'People', 'Embed'];
  const filtered = AVAILABLE_WIDGETS.filter(w =>
    !search || w.label.toLowerCase().includes(search.toLowerCase()) ||
    w.description.toLowerCase().includes(search.toLowerCase())
  );
  const byGroup = GROUPS.map(g => ({ group: g, items: filtered.filter(w => w.group === g) })).filter(g => g.items.length > 0);

  if (!open) return null;

  return createPortal(
    <>
      <div className="fixed inset-0 z-[1998]" onClick={onClose}/>
      <div className="fixed z-[1999] w-72 bg-white border border-slate-200 rounded-xl shadow-2xl overflow-hidden"
        style={{ top: pos.top, left: pos.left }}>
        <div className="px-3 py-2.5 border-b border-slate-100 bg-slate-50">
          <div className="relative">
            <Search size={12} className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400"/>
            <input ref={inputRef} value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search blocks…"
              className="w-full pl-6 pr-2 py-1.5 bg-white border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-rail-400"/>
          </div>
        </div>
        <div className="max-h-80 overflow-y-auto py-1">
          {byGroup.map(({ group, items }) => (
            <div key={group}>
              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider px-3 py-1.5">{group}</p>
              {items.map(w => (
                <button key={w.type}
                  onClick={() => { onSelect(w.type as WidgetType, w.label); onClose(); }}
                  className="flex items-center gap-3 w-full px-3 py-2 hover:bg-rail-50 transition-colors text-left">
                  <div className="w-7 h-7 rounded-lg bg-slate-100 flex items-center justify-center shrink-0">
                    <Ico name={w.icon} size={13} className="text-slate-500"/>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-slate-800">{w.label}</p>
                    <p className="text-[10px] text-slate-400 leading-snug">{w.description}</p>
                  </div>
                </button>
              ))}
            </div>
          ))}
          {filtered.length === 0 && (
            <p className="text-xs text-slate-400 text-center py-6">No blocks match "{search}"</p>
          )}
        </div>
      </div>
    </>,
    document.body
  );
}

// ── Compact staff bar (collapsed by default on smaller cells) ─────────────────
function StaffBar({ cell, canManage }: { cell: string; canManage: boolean }) {
  const [staff, setStaff] = useState<MasterStaffRecord[]>([]);
  const [open, setOpen] = useState(false);

  const reload = useCallback(() => setStaff(getStaffForCell(cell)), [cell]);
  useEffect(() => {
    reload();
    window.addEventListener(STAFF_CHANGED_EVENT, reload);
    return () => window.removeEventListener(STAFF_CHANGED_EVENT, reload);
  }, [reload]);

  const ROLE_COLORS: Record<string, string> = {
    CMI: 'from-indigo-500 to-indigo-700', COS: 'from-violet-500 to-violet-700',
    OS: 'from-teal-500 to-teal-700', Dealer: 'from-amber-500 to-amber-700',
    Incharge: 'from-emerald-500 to-emerald-700', default: 'from-slate-400 to-slate-600',
  };

  return (
    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden" style={{ boxShadow: '0 1px 3px rgba(15,23,42,0.06)' }}>
      <button onClick={() => setOpen(o => !o)} className="w-full flex items-center gap-3 px-5 py-3 hover:bg-slate-50 transition-colors">
        <div className="w-7 h-7 rounded-xl bg-rail-50 border border-rail-100 flex items-center justify-center">
          <Users size={13} className="text-rail-600"/>
        </div>
        <p className="text-sm font-bold text-slate-900 flex-1 text-left">Staff</p>
        <div className="flex items-center gap-2">
          {staff.length > 0 && (
            <div className="flex -space-x-1.5">
              {staff.slice(0, 5).map(s => {
                const initials = s.name.split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase();
                const grad = ROLE_COLORS[s.workingAs ?? ''] ?? ROLE_COLORS.default;
                return (
                  <div key={s.id} title={s.name}
                    className={cn('w-7 h-7 rounded-full bg-gradient-to-br border-2 border-white flex items-center justify-center text-[9px] font-bold text-white shrink-0', grad)}>
                    {initials}
                  </div>
                );
              })}
              {staff.length > 5 && <div className="w-7 h-7 rounded-full bg-slate-200 border-2 border-white flex items-center justify-center text-[9px] font-bold text-slate-600">+{staff.length - 5}</div>}
            </div>
          )}
          <span className="text-xs text-slate-400">{staff.length} member{staff.length !== 1 ? 's' : ''}</span>
          {open ? <ChevronUp size={14} className="text-slate-400"/> : <ChevronDown size={14} className="text-slate-400"/>}
        </div>
      </button>
      {open && (
        <div className="border-t border-slate-100 px-5 py-4 overflow-x-auto">
          {staff.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-6 text-center">
              <Users2 size={22} className="text-slate-200"/>
              <p className="text-sm text-slate-400">No staff assigned to {cell}</p>
            </div>
          ) : (
            <div className="flex gap-3 pb-1" style={{ minWidth: 'max-content' }}>
              {staff.map(s => {
                const initials = s.name.split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase();
                const grad = ROLE_COLORS[s.workingAs ?? ''] ?? ROLE_COLORS.default;
                const isPending = s.status === 'pending';
                return (
                  <div key={s.id} className={cn(
                    'flex-shrink-0 w-44 bg-white border border-slate-200 rounded-xl p-3.5 hover:shadow-md hover:-translate-y-0.5 transition-all',
                    isPending && 'border-amber-200 bg-amber-50/20'
                  )} style={{ boxShadow: '0 1px 3px rgba(15,23,42,0.06)' }}>
                    <div className="flex items-center gap-2.5 mb-2.5">
                      <div className={cn('w-9 h-9 rounded-xl bg-gradient-to-br flex items-center justify-center text-xs font-bold text-white shrink-0', grad)}>
                        {initials}
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-slate-900 truncate">{s.name}</p>
                        <p className="text-[10px] text-slate-400 truncate">{s.designation}</p>
                      </div>
                    </div>
                    {s.workingAs && (
                      <div className="flex items-center gap-1.5">
                        <Briefcase size={9} className="text-slate-300 shrink-0"/>
                        <span className="text-[10px] text-slate-500 font-medium truncate">{s.workingAs}</span>
                        {isPending && <span className="text-[8px] bg-amber-100 text-amber-700 border border-amber-200 rounded-full px-1.5 ml-auto shrink-0">Pending</span>}
                      </div>
                    )}
                    {s.hrmsId && <p className="text-[9px] font-mono text-slate-400 bg-slate-100 rounded px-1.5 py-0.5 mt-1.5 inline-block">{s.hrmsId}</p>}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Cell workspace header ─────────────────────────────────────────────────────
function CellHeader({ cell, canManage, onAddBlock }: {
  cell: CellRecord; canManage: boolean; onAddBlock: (type: WidgetType, title: string) => void;
}) {
  const [showPicker, setShowPicker] = useState(false);
  const addBtnRef = useRef<HTMLButtonElement>(null!);
  const workspaceHook = useWorkspace(cell.name);
  const tables = workspaceHook.ws.tables ?? [];

  return (
    <div className="bg-white border border-slate-200 rounded-xl px-5 py-3.5 flex items-center justify-between gap-4"
      style={{ boxShadow: '0 1px 3px rgba(15,23,42,0.06)' }}>
      <div>
        <h1 className="text-base font-black text-slate-900 tracking-tight">{cell.name}</h1>
        <p className="text-[10px] text-slate-400 mt-0.5">Delhi Division · Commercial Branch · {cell.description || 'Cell Workspace'}</p>
      </div>

      <div className="flex items-center gap-2">
        {/* Universal search */}
        <SearchTrigger cell={cell.name} tables={tables}/>

        {canManage && (
          <div className="relative">
            <button ref={addBtnRef} onClick={() => setShowPicker(o => !o)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-rail-600 hover:bg-rail-700 text-white text-xs font-semibold shadow-sm transition-all">
              <Plus size={13}/> Add block
            </button>
            <SlashCommandPicker
              triggerRef={addBtnRef}
              open={showPicker}
              onClose={() => setShowPicker(false)}
              onSelect={(type, title) => { onAddBlock(type, title); setShowPicker(false); }}
            />
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function DynamicCellPage() {
  const { cellSlug } = useParams<{ cellSlug: string }>();
  const { user } = useAuthStore();
  const [cell, setCell] = useState<CellRecord | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [pendingWidget, setPendingWidget] = useState<{ type: WidgetType; title: string } | null>(null);

  useEffect(() => {
    const found = getCellBySlug(cellSlug ?? '');
    setCell(found); setLoaded(true);
  }, [cellSlug]);

  if (!loaded) return (
    <div className="flex items-center justify-center py-20">
      <div className="w-8 h-8 border-2 border-rail-400/30 border-t-rail-600 rounded-full animate-spin"/>
    </div>
  );

  if (!cell) return (
    <div className="flex flex-col items-center justify-center py-20 gap-4">
      <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center"><Folder size={28} className="text-slate-300"/></div>
      <p className="text-slate-500 text-sm font-medium">Cell not found: <code className="bg-slate-100 px-1.5 py-0.5 rounded text-xs">{cellSlug}</code></p>
    </div>
  );

  if (cell.status !== 'active') return (
    <div className="flex flex-col items-center justify-center py-20 gap-4">
      <div className="w-16 h-16 rounded-2xl bg-amber-100 flex items-center justify-center"><Construction size={28} className="text-amber-500"/></div>
      <p className="text-slate-700 text-sm font-semibold">{cell.name} — {cell.status}</p>
      <p className="text-slate-400 text-xs">Contact an administrator to reactivate this cell.</p>
    </div>
  );

  const canManage = canManageCellStructure(user, cell.name);

  return (
    <div className="space-y-3 pb-10">
      {/* Cell header with Add Block */}
      <CellHeader
        cell={cell} canManage={canManage}
        onAddBlock={(type, title) => setPendingWidget({ type, title })}
      />

      {/* Compact staff bar — collapsible */}
      <StaffBar cell={cell.name} canManage={canManage}/>

      {/* ── Primary workspace — WorkspaceBuilder is now the main body ──────── */}
      {/* All blocks: tables, staff, approval queue, links, KPIs, etc. live here */}
      <WorkspaceBuilder cell={cell.name} pendingWidget={pendingWidget} onPendingConsumed={() => setPendingWidget(null)}/>
    </div>
  );
}
