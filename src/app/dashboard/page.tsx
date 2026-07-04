'use client';
import { useState, useMemo, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { RevenueTrendChart } from '@/components/charts/RevenueTrendChart';
import { CellDistributionChart, TargetAchievementChart } from '@/components/charts/CellCharts';
import { GlassCard } from '@/components/ui/GlassCard';
import { useAuthStore } from '@/store/authStore';
import { Badge } from '@/components/ui/Badge';
import { STATION_MASTER, STATION_PLANNING_DATA } from '@/lib/data/mockData';
import type { StationPlanningInfo } from '@/lib/data/mockData';
import { cn } from '@/lib/utils';
import { usePageSheet } from '@/lib/sheets/usePageSheet';
import { usePageFields } from '@/lib/sheets/usePageFields';
import { findRowByCode, readField, type SheetRow } from '@/lib/sheets/googleSheets';
import { PageSheetLinkBar } from '@/components/sheets/PageSheetLinkBar';
import { SheetViewBuilder } from '@/components/sheets/SheetViewBuilder';
import { PowerBIEmbed } from '@/components/embeds/PowerBIEmbed';
import { PoliciesWorkspace } from '@/components/policies/PoliciesWorkspace';
import { WorkspaceBuilder } from '@/components/workspace/WorkspaceBuilder';
import { OverviewWorkspace } from '@/components/overview/OverviewWorkspace';
import { OverviewAccessModal } from '@/components/overview/OverviewAccessModal';
import { HandoutDirectoryTab } from '@/components/handout/HandoutDirectoryTab';
import {
  getTabAccess, saveTabAccess, canViewTab, canEditTab,
  type OverviewAccess,
} from '@/lib/overview/overviewAccess';
import {
 ChevronRight, ChevronDown, Train, Users, MonitorCheck,
 Link2, Edit3, Save, X, ExternalLink, UserCircle,
 FileText, Search, BookOpen, AlertCircle, MoreHorizontal, Plus,
 LayoutDashboard, TrendingUp, Trash2, Lock, Settings, ClipboardList,
} from 'lucide-react';

// ─── Category colour map ──────────────────────────────────────────────────────
const CAT_COLOR: Record<string, { bg: string; border: string; text: string; dot: string }> = {
 'NSG-1': { bg: 'bg-blue-600/20', border: 'border-blue-500/40', text: 'text-blue-700 ', dot: 'bg-blue-400' },
 'NSG-2': { bg: 'bg-violet-600/20', border: 'border-violet-500/40', text: 'text-violet-700 ', dot: 'bg-violet-400' },
 'NSG-3': { bg: 'bg-cyan-600/20', border: 'border-cyan-500/40', text: 'text-cyan-700 ', dot: 'bg-cyan-400' },
 'NSG-4': { bg: 'bg-emerald-600/20',border: 'border-emerald-500/40',text: 'text-emerald-700 ',dot: 'bg-emerald-400'},
 'NSG-5': { bg: 'bg-amber-600/20', border: 'border-amber-500/40', text: 'text-amber-700 ', dot: 'bg-amber-400' },
 'NSG-6': { bg: 'bg-slate-600/20', border: 'border-slate-500/40', text: 'text-slate-300', dot: 'bg-slate-400' },
 'HG-1': { bg: 'bg-rose-600/20', border: 'border-rose-500/40', text: 'text-rose-700 ', dot: 'bg-rose-400' },
 'HG-2': { bg: 'bg-orange-600/20', border: 'border-orange-500/40', text: 'text-orange-700 ', dot: 'bg-orange-400' },
 'HG-3': { bg: 'bg-fuchsia-600/20',border: 'border-fuchsia-500/40',text: 'text-fuchsia-700 ',dot: 'bg-fuchsia-400'},
};

// ─── Field alias map: dashboard field → possible sheet column names ──────────
import type { PageField } from '@/lib/sheets/usePageFields';
import { ViewBar } from '@/components/views/ViewBar';
import { LinkedSourcesPanel } from '@/components/sheets/LinkedSourcesPanel';
import { ViewFilterPanel } from '@/components/views/ViewFilterPanel';
import {
  getViewStore, saveViewStore, loadViewStoreFromCloud, createView, renameView, duplicateView, deleteView,
  setDefaultView, setActiveView, updateViewFilters, updateViewGroupBy,
  updateSyncInterval, applyFilters, syncViewFields, updateViewFields,
  type ViewStore, type View,
} from '@/lib/views/viewEngine';
import { sharedRead } from '@/lib/config/sharedSync';

// ─── Station detail card — reads from page-level consolidated sheet ──────────
function StationDetailCard({
 code, name, state, category, canEdit, sheetRow, sheetConnected, fields,
}: {
 code: string; name: string; state: string; category: string; canEdit: boolean;
 sheetRow: SheetRow | null; sheetConnected: boolean; fields: PageField[];
}) {
 const c = CAT_COLOR[category] ?? CAT_COLOR['NSG-6'];

 // Local manual-edit fallback (used only when no sheet is connected, or as override)
 const defaultInfo: StationPlanningInfo = {
 code, platforms: 0, utsCountersAvailable: 0, utsCountersWorking: 0,
 staff: 0, prsCountersAvailable: 0, prsCountersWorking: 0,
 prsCounterType: '-', terminalType: '-',
 };
 const [info, setInfo] = useState<StationPlanningInfo>(STATION_PLANNING_DATA[code] ?? defaultInfo);
 const [editing, setEditing] = useState(false);
 const [draft, setDraft] = useState<StationPlanningInfo>(info);

 const save = () => { setInfo({ ...draft, lastUpdated: new Date().toISOString().slice(0, 10) }); setEditing(false); };
 const cancel = () => { setDraft(info); setEditing(false); };

 // Local (non-sheet) field map — used only as fallback display when no sheet connected
 const LOCAL_FALLBACK: Record<string, string | number> = {
 'Platforms': info.platforms,
 'UTS Available': info.utsCountersAvailable,
 'UTS Working': info.utsCountersWorking,
 'Staff': info.staff,
 'PRS Available': info.prsCountersAvailable,
 'PRS Working': info.prsCountersWorking,
 'PRS Type': info.prsCounterType,
 'Terminal': info.terminalType,
 };

 const F = ({ label, column }: { label: string; column: string }) => {
 let val: string;
 if (sheetConnected) {
 val = readField(sheetRow, [column]);
 } else {
 const lv = LOCAL_FALLBACK[column];
 val = lv === undefined ? 'NA' : (lv === 0 || lv === '-' ? '—' : String(lv));
 }
 const isNA = val === 'NA';
 return (
 <div className="flex flex-col">
 <span className="text-slate-800/30 text-[9px] uppercase tracking-wider leading-none mb-0.5">{label}</span>
 <span className={cn('text-xs font-semibold', isNA ? 'text-slate-800/25 italic' : 'text-slate-800/80 ')}>{val}</span>
 </div>
 );
 };

 const EditF = ({ label, field, type = 'number' }: { label: string; field: keyof StationPlanningInfo; type?: string }) => (
 <div className="flex flex-col gap-0.5">
 <label className="text-slate-800/30 text-[9px] uppercase tracking-wider">{label}</label>
 {type === 'select-prs' ? (
 <select value={draft.prsCounterType}
 onChange={e => setDraft(p => ({ ...p, prsCounterType: e.target.value as StationPlanningInfo['prsCounterType'] }))}
 className="bg-slate-900/5 border border-slate-900/15 rounded px-1.5 py-1 text-xs text-slate-800/80 focus:outline-none focus:border-blue-400/60">
 {['Advance','Current','Both','-'].map(o => <option key={o} value={o} className="bg-slate-900">{o}</option>)}
 </select>
 ) : type === 'select-terminal' ? (
 <select value={draft.terminalType}
 onChange={e => setDraft(p => ({ ...p, terminalType: e.target.value as StationPlanningInfo['terminalType'] }))}
 className="bg-slate-900/5 border border-slate-900/15 rounded px-1.5 py-1 text-xs text-slate-800/80 focus:outline-none focus:border-blue-400/60">
 {['RH','NRH','-'].map(o => <option key={o} value={o} className="bg-slate-900">{o}</option>)}
 </select>
 ) : (
 <input type="number"min={0} value={(draft[field] as number)}
 onChange={e => setDraft(p => ({ ...p, [field]: Number(e.target.value) }))}
 className="bg-slate-900/5 border border-slate-900/15 rounded px-1.5 py-1 text-xs text-slate-800/80 w-full focus:outline-none focus:border-blue-400/60"/>
 )}
 </div>
 );

 return (
 <div className={`rounded-xl border ${c.border} ${c.bg} backdrop-blur-sm p-3 relative`}>
 {/* Station header */}
 <div className="flex items-start justify-between mb-2 gap-2">
 <div>
 <div className="flex items-center gap-1.5 mb-0.5">
 <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${c.bg} ${c.border} border ${c.text}`}>{code}</span>
 <span className={`text-[9px] font-medium ${c.text} opacity-70`}>{category}</span>
 <span className="text-[9px] text-slate-800/30">{state}</span>
 </div>
 <p className="text-slate-800/80 text-xs font-semibold leading-tight">{name}</p>
 </div>
 {canEdit && !sheetConnected && (
 <div className="flex items-center gap-1 shrink-0">
 {!editing ? (
 <button onClick={() => { setDraft(info); setEditing(true); }}
 className="p-1 rounded hover:bg-blue-500/20 text-blue-600 hover:text-blue-600 transition-colors">
 <Edit3 size={11} />
 </button>
 ) : (
 <>
 <button onClick={save} className="p-1 rounded hover:bg-emerald-500/20 text-emerald-600 transition-colors"><Save size={11}/></button>
 <button onClick={cancel} className="p-1 rounded hover:bg-red-500/20 text-red-600 transition-colors"><X size={11}/></button>
 </>
 )}
 </div>
 )}
 </div>

 {/* Sheet sync indicator per card */}
 {sheetConnected && (
 <div className="flex items-center gap-1 text-[9px] mb-2 w-fit rounded px-1.5 py-0.5 border"
 style={sheetRow
 ? { color: '#34d399', backgroundColor: 'rgba(16,185,129,0.1)', borderColor: 'rgba(16,185,129,0.2)' }
 : { color: '#fbbf24', backgroundColor: 'rgba(251,191,36,0.1)', borderColor: 'rgba(251,191,36,0.2)' }}>
 <Link2 size={8}/> {sheetRow ? 'Live from sheet' : 'No row found in sheet for this code'}
 </div>
 )}

 {/* Fields — dynamic, user-configurable via"Manage Fields"*/}
 {!editing ? (
 <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
 {fields.map(f => <F key={f.id} label={f.label} column={f.column} />)}
 {fields.length === 0 && (
 <p className="col-span-2 text-slate-800/20 text-[10px] italic">No fields configured — use"Manage Fields"above</p>
 )}
 </div>
 ) : (
 <div className="grid grid-cols-2 gap-2">
 <EditF label="Platforms"field="platforms"/>
 <EditF label="UTS Available"field="utsCountersAvailable"/>
 <EditF label="UTS Working"field="utsCountersWorking"/>
 <EditF label="Staff"field="staff"/>
 <EditF label="PRS Available"field="prsCountersAvailable"/>
 <EditF label="PRS Working"field="prsCountersWorking"/>
 <EditF label="PRS Type"field="prsCounterType"type="select-prs"/>
 <EditF label="Terminal"field="terminalType"type="select-terminal"/>
 </div>
 )}

 {!sheetConnected && info.lastUpdated && (
 <p className="text-slate-800/20 text-[8px] mt-2">Updated {info.lastUpdated} · {info.updatedBy}</p>
 )}
 </div>
 );
}

// ─── NSG Group card ───────────────────────────────────────────────────────────
function NSGGroupCard({
 category, stations, canEdit, sheetRows, sheetConnected, fields,
}: {
 category: string; stations: typeof STATION_MASTER; canEdit: boolean;
 sheetRows: SheetRow[]; sheetConnected: boolean; fields: PageField[];
}) {
 const [open, setOpen] = useState(false);
 const c = CAT_COLOR[category] ?? CAT_COLOR['NSG-6'];
 const filled = sheetConnected
 ? stations.filter(s => findRowByCode(sheetRows, s.code)).length
 : stations.filter(s => STATION_PLANNING_DATA[s.code]).length;

 return (
 <div className={`relative rounded-2xl border ${c.border} ${c.bg} backdrop-blur-sm overflow-hidden transition-shadow hover:shadow-elevation-md`}
 style={{ boxShadow: 'var(--shadow-sm)' }}>
 {/* Left accent bar — gives the row a clear point of visual origin */}
 <div className={`absolute left-0 top-0 bottom-0 w-1 ${c.dot}`} />
 {/* Summary card — always visible, clickable */}
 <button onClick={() => setOpen(o => !o)}
 className="w-full p-4 pl-6 flex items-center justify-between hover:bg-slate-900/5 transition-colors text-left">
 <div className="flex items-center gap-3">
 <div className={`w-3.5 h-3.5 rounded-full ${c.dot} shadow-md ring-4 ring-white/60 `} />
 <div>
 <p className={`text-base font-bold tracking-tight ${c.text}`}>{category}</p>
 <p className="text-slate-500 text-xs mt-0.5">
 <span className="font-semibold text-slate-700">{stations.length}</span> Stations ·{' '}
 <span className="font-semibold text-slate-700">{filled}</span> data entries
 </p>
 </div>
 </div>
 <div className="flex items-center gap-3">
 <div className="text-right hidden sm:block">
 <p className="text-slate-400 text-[9px] font-semibold uppercase tracking-wider">States covered</p>
 <p className="text-slate-600 text-xs font-medium">
 {Array.from(new Set(stations.map(s => s.state))).join(', ')}
 </p>
 </div>
 {open ? <ChevronDown size={16} className="text-slate-500"/> : <ChevronRight size={16} className="text-slate-500"/>}
 </div>
 </button>

 {/* Expanded station grid */}
 <AnimatePresence>
 {open && (
 <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
 exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.25 }}
 className="overflow-hidden border-t border-slate-900/8">
 <div className="p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
 {stations.map(s => (
 <StationDetailCard key={s.code} code={s.code} name={s.name}
 state={s.state} category={s.category} canEdit={canEdit}
 sheetRow={sheetConnected ? findRowByCode(sheetRows, s.code) : null}
 sheetConnected={sheetConnected} fields={fields} />
 ))}
 </div>
 </motion.div>
 )}
 </AnimatePresence>
 </div>
 );
}

// ─── Tab: NSG Category Wise ───────────────────────────────────────────────────
type ViewMode = 'nsg' | 'station' | 'section' | 'cmi';

const VIEW_OPTIONS: { id: ViewMode; label: string }[] = [
  { id: 'nsg', label: 'NSG Category Wise' },
  { id: 'station', label: 'Station Wise' },
  { id: 'section', label: 'Section Wise' },
  { id: 'cmi', label: 'CMI Wise' },
];

type RevenueSubTab = 'prs' | 'uts' | 'footfall' | 'tc';
const REVENUE_SUBTABS: { id: RevenueSubTab; label: string }[] = [
  { id: 'prs', label: 'PRS' },
  { id: 'uts', label: 'UTS' },
  { id: 'footfall', label: 'Footfall' },
  { id: 'tc', label: 'Ticket Checking' },
];
// Shared tabular view for Station / Section / CMI modes
function StationTableView({
 stations, sheetRows, sheetConnected, fields,
}: {
 stations: typeof STATION_MASTER; sheetRows: SheetRow[]; sheetConnected: boolean; fields: PageField[];
}) {
 return (
 <div className="rounded-2xl border border-slate-900/8 overflow-hidden">
 <div className="overflow-x-auto">
 <table className="w-full text-xs">
 <thead>
 <tr className="bg-slate-50 border-b border-slate-900/10">
 <th className="px-3 py-2.5 text-left text-slate-800/40 font-semibold uppercase tracking-wider text-[10px]">Station Name</th>
 <th className="px-3 py-2.5 text-left text-slate-800/40 font-semibold uppercase tracking-wider text-[10px]">Station Code</th>
 <th className="px-3 py-2.5 text-left text-slate-800/40 font-semibold uppercase tracking-wider text-[10px]">Category</th>
 <th className="px-3 py-2.5 text-left text-slate-800/40 font-semibold uppercase tracking-wider text-[10px]">State</th>
 <th className="px-3 py-2.5 text-left text-slate-800/40 font-semibold uppercase tracking-wider text-[10px]">CMI</th>
 {sheetConnected && fields.map(f => (
 <th key={f.id} className="px-3 py-2.5 text-left text-slate-800/40 font-semibold uppercase tracking-wider text-[10px] whitespace-nowrap">{f.label}</th>
 ))}
 </tr>
 </thead>
 <tbody>
 {stations.map((s, i) => {
 const c = CAT_COLOR[s.category] ?? CAT_COLOR['NSG-6'];
 const row = sheetConnected ? findRowByCode(sheetRows, s.code) : null;
 return (
 <tr key={s.code} className={cn('border-b border-slate-900/5 hover:bg-slate-900/5 transition-colors', i % 2 === 1 && 'bg-slate-900/2 ')}>
 <td className="px-3 py-2 text-slate-800/75 font-medium whitespace-nowrap">{s.name}</td>
 <td className="px-3 py-2">
 <span className="text-blue-700 font-mono text-[11px] font-bold">{s.code}</span>
 </td>
 <td className="px-3 py-2">
 <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full border ${c.bg} ${c.border} ${c.text}`}>{s.category}</span>
 </td>
 <td className="px-3 py-2 text-slate-800/40">{s.state}</td>
 <td className="px-3 py-2 text-slate-800/55">{s.cmi}</td>
 {sheetConnected && fields.map(f => {
 const val = readField(row, [f.column]);
 return (
 <td key={f.id} className={cn('px-3 py-2 whitespace-nowrap', val === 'NA' ? 'text-slate-800/25 italic' : 'text-slate-800/60 ')}>{val}</td>
 );
 })}
 </tr>
 );
 })}
 {stations.length === 0 && (
 <tr><td colSpan={5 + (sheetConnected ? fields.length : 0)} className="text-center text-slate-800/20 py-8 text-sm">No stations found</td></tr>
 )}
 </tbody>
 </table>
 </div>
 <div className="px-4 py-2 bg-slate-50 border-t border-slate-900/8 text-slate-800/30 text-[10px]">
 {stations.length} station{stations.length !== 1 ? 's' : ''}
 </div>
 </div>
 );
}


function RevenueTab() {
 const { user } = useAuthStore();
 const canEdit = user?.cell === 'Planning' || user?.role === 'maintenance' || user?.role === 'admin';
 const [subTab, setSubTab] = useState<RevenueSubTab>('prs');

 return (
 <div className="space-y-4">
 {/* Horizontal sub-nav */}
 <div className="flex gap-1 bg-white rounded-2xl p-1 border border-slate-900/8 w-fit flex-wrap shadow-elevation-sm">
 {REVENUE_SUBTABS.map(({ id, label }) => (
 <button key={id} onClick={() => setSubTab(id)}
 className={cn('px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200',
 subTab === id
 ? 'bg-blue-600 text-white border border-blue-600 shadow-elevation-sm'
 : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100 ')}>
 {label}
 </button>
 ))}
 </div>

 {/* PRS — Power BI embed */}
 {subTab === 'prs' && (
 <PowerBIEmbed storageKey="powerbi_revenue_prs"title="PRS Revenue Report"canEdit={canEdit} />
 )}

 {/* UTS — Power BI embed */}
 {subTab === 'uts' && (
 <PowerBIEmbed storageKey="powerbi_revenue_uts"title="UTS Revenue Report"canEdit={canEdit} />
 )}

 {/* Footfall — Power BI embed */}
 {subTab === 'footfall' && (
 <PowerBIEmbed storageKey="powerbi_revenue_footfall"title="Footfall Report"canEdit={canEdit} />
 )}

 {/* Ticket Checking — Power BI embed */}
 {subTab === 'tc' && (
 <PowerBIEmbed storageKey="powerbi_revenue_tc"title="Ticket Checking Revenue Report"canEdit={canEdit} />
 )}
 </div>
 );
}

interface CustomTab { id: string; label: string; content: string; }

function CustomTabContent({ tab }: { tab: CustomTab; onUpdate: (c: string) => void; canEdit: boolean }) {
  // Each custom tab gets its own full workspace, scoped by tab.id
  return (
    <WorkspaceBuilder
      cell={`dashboard_tab_${tab.id}`}
      enterprise
      hideSidebar
    />
  );
}

function TabNameDialog({ title, initial = '', onSave, onClose }: {
  title: string; initial?: string; onSave: (l: string) => void; onClose: () => void;
}) {
  const [val, setVal] = useState(initial);
  return (
    <div className="fixed inset-0 z-[500] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl border border-slate-200 w-80 shadow-2xl p-5 space-y-4" onClick={e => e.stopPropagation()}>
        <p className="text-sm font-bold text-slate-900">{title}</p>
        <input value={val} onChange={e => setVal(e.target.value)} autoFocus
          onKeyDown={e => { if (e.key === 'Enter' && val.trim()) { onSave(val.trim()); } if (e.key === 'Escape') onClose(); }}
          placeholder="Tab name" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-rail-400"/>
        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 text-xs text-slate-500 hover:bg-slate-100 rounded-lg">Cancel</button>
          <button onClick={() => { if (val.trim()) onSave(val.trim()); }} disabled={!val.trim()}
            className="px-4 py-2 text-xs bg-rail-600 text-white rounded-lg hover:bg-rail-700 disabled:opacity-40 font-semibold">Save</button>
        </div>
      </div>
    </div>
  );
}

// ── Custom tab button with portal dropdown (avoids overflow-x-auto clipping) ─
interface CustomTab { id: string; label: string; content: string }
function CustomTabButton({ tab, isActive, canEdit, menuOpen, onSwitch, onMenuToggle, onMenuClose, onRename, onDelete }: {
  tab: CustomTab; isActive: boolean; canEdit: boolean; menuOpen: string | null;
  onSwitch: () => void; onMenuToggle: (id: string) => void; onMenuClose: () => void;
  onRename: () => void; onDelete: () => void;
}) {
  const btnRef = useRef<HTMLDivElement>(null);
  const isOpen = menuOpen === tab.id;

  // Portal dropdown position
  const [pos, setPos] = useState({ top: 0, left: 0 });
  useEffect(() => {
    if (isOpen && btnRef.current) {
      const r = btnRef.current.getBoundingClientRect();
      setPos({ top: r.bottom + 4, left: r.left });
    }
  }, [isOpen]);

  return (
    <div ref={btnRef} className="relative flex-shrink-0 group/ctab">
      <button onClick={onSwitch}
        className={cn('flex items-center gap-1 px-4 py-3 text-xs font-semibold border-b-2 whitespace-nowrap transition-all',
          isActive ? 'text-rail-600 border-rail-600' : 'text-slate-500 border-transparent hover:text-slate-700')}>
        {tab.label}
        {canEdit && (
          <span
            onClick={e => { e.stopPropagation(); onMenuToggle(tab.id); }}
            className="ml-0.5 p-0.5 rounded opacity-0 group-hover/ctab:opacity-100 hover:bg-slate-100 text-slate-300 hover:text-slate-600 transition-opacity">
            <MoreHorizontal size={11}/>
          </span>
        )}
      </button>
      {isOpen && typeof document !== 'undefined' && createPortal(
        <>
          <div className="fixed inset-0 z-[900]" onClick={onMenuClose}/>
          <div className="fixed z-[901] bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden w-36"
            style={{ top: pos.top, left: pos.left }}>
            <button onClick={() => { onRename(); onMenuClose(); }}
              className="flex items-center gap-2 px-3 py-2 text-xs text-slate-700 hover:bg-slate-50 w-full">
              <Edit3 size={11} className="text-slate-400"/> Rename
            </button>
            <button onClick={() => { onDelete(); onMenuClose(); }}
              className="flex items-center gap-2 px-3 py-2 text-xs text-red-600 hover:bg-red-50 w-full">
              <Trash2 size={11}/> Delete
            </button>
          </div>
        </>,
        document.body,
      )}
    </div>
  );
}

export default function DashboardHomePage() {
  const { user } = useAuthStore();

  // ── Tab access control ────────────────────────────────────────────────────
  // accessModalTab: the tabId whose gear was clicked (null = modal closed)
  const [accessModalTab, setAccessModalTab] = useState<string | null>(null);
  // Per-tab access configs — keyed by tabId
  const [tabAccessMap, setTabAccessMap] = useState<Record<string, OverviewAccess>>(() => {
    if (typeof window === 'undefined') return {};
    const ids = ['overview', 'revenue', 'policies'];
    const map: Record<string, OverviewAccess> = {};
    ids.forEach(id => { map[id] = getTabAccess(id); });
    return map;
  });

  // Derived: overview tab
  const overviewAccess = tabAccessMap['overview'] ?? { viewMode: 'all', viewRoles: [], viewUserIds: [], editUserIds: [] };
  const canViewOv  = canViewTab(user, overviewAccess);
  const canEditOv  = canEditTab(user, overviewAccess);
  const isManager  = user?.role === 'admin' || user?.role === 'maintenance';

  const canEdit = isManager;  // custom tab edit (rename/delete) = admin/maintenance

  // Helper: get access for any tab (reads localStorage on demand for custom tabs)
  const getAccess = (tabId: string): OverviewAccess =>
    tabAccessMap[tabId] ?? getTabAccess(tabId);
  const updateAccess = (tabId: string, access: OverviewAccess) => {
    setTabAccessMap(prev => ({ ...prev, [tabId]: access }));
  };

  // ── Custom tabs ────────────────────────────────────────────────────────────
  const [customTabs, setCustomTabs] = useState<CustomTab[]>(() => {
    if (typeof window === 'undefined') return [];
    try { return JSON.parse(localStorage.getItem('rly_dashboard_custom_tabs') ?? '[]'); } catch { return []; }
  });
  const [activeTab, setActiveTab] = useState<string>('overview');
  const [activeCustomTab, setActiveCustomTab] = useState<CustomTab | null>(null);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [renameTarget, setRenameTarget] = useState<CustomTab | null>(null);
  const [menuOpen, setMenuOpen] = useState<string | null>(null);
  // Station code pre-selected when navigating from Overview → Handout tab
  const [handoutCode, setHandoutCode] = useState<string | undefined>();
  // True after the first cloud read completes (either direct sharedRead or useAppSync event).
  // Used to guard the persist effect from overwriting cloud data with the initial empty state.
  const tabsSynced = useRef(false);

  const BUILTIN_TABS: { id: string; label: string; icon: React.ElementType }[] = [
    { id: 'overview',  label: 'Overview',                   icon: LayoutDashboard },
    { id: 'revenue',   label: 'Revenue',                    icon: TrendingUp },
    { id: 'policies',  label: 'Policies / Circulars / SOP', icon: FileText },
    { id: 'handout',   label: 'Handout',                    icon: ClipboardList },
  ];

  // ── Listen for "open handout for station" event from Overview ──────────────
  useEffect(() => {
    const handler = (e: CustomEvent<{ stationCode: string }>) => {
      setHandoutCode(e.detail.stationCode);
      setActiveTab('handout');
      setActiveCustomTab(null);
    };
    window.addEventListener('handout_open', handler as EventListener);
    return () => window.removeEventListener('handout_open', handler as EventListener);
  }, []);

  // ── Cloud sync for custom tabs ─────────────────────────────────────────────
  // Fetches tabs from Upstash on mount AND listens for useAppSync to complete.
  // This ensures tabs created on another browser/device are visible immediately.
  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Direct cloud read — populates state on first render without waiting for
    // the full useAppSync bulk-fetch to complete.
    sharedRead('dashboard_custom_tabs').then((cloudData) => {
      tabsSynced.current = true;
      if (!cloudData) return;
      const tabs = Array.isArray(cloudData) ? (cloudData as CustomTab[]) : [];
      if (tabs.length > 0) {
        localStorage.setItem('rly_dashboard_custom_tabs', JSON.stringify(tabs));
        setCustomTabs(tabs);
      }
    }).catch(() => { tabsSynced.current = true; });

    // Also listen for useAppSync completion — it bulk-fetches all namespaces
    // (including dashboard_custom_tabs) and writes them to localStorage.
    const handleSyncComplete = () => {
      tabsSynced.current = true;
      try {
        const fresh = JSON.parse(localStorage.getItem('rly_dashboard_custom_tabs') ?? '[]');
        if (Array.isArray(fresh)) setCustomTabs(fresh);
      } catch { /* ignore */ }
    };
    window.addEventListener('rly_cloud_sync_complete', handleSyncComplete);
    return () => window.removeEventListener('rly_cloud_sync_complete', handleSyncComplete);
  }, []);

  // ── Persist custom tabs mutations to localStorage + Upstash ───────────────
  useEffect(() => {
    if (typeof window === 'undefined') return;
    // Guard: do NOT write empty state to localStorage before cloud sync completes.
    // On a fresh browser, customTabs starts as [] while Upstash may have real tabs.
    // Writing [] here would overwrite what useAppSync is about to populate.
    if (!tabsSynced.current && customTabs.length === 0) return;
    localStorage.setItem('rly_dashboard_custom_tabs', JSON.stringify(customTabs));
    // Sync to Upstash — only when tabs exist OR sync has confirmed cloud is empty
    if (user?.id && (customTabs.length > 0 || tabsSynced.current)) {
      import('@/lib/config/cloudSync').then(({ cloudWrite }) => {
        cloudWrite(user!.id, 'dashboard_custom_tabs', customTabs)
          .catch(() => {/* ignore */});
      });
      import('@/lib/config/sharedSync').then(({ sharedWrite }) => {
        sharedWrite('dashboard_custom_tabs', customTabs);
      });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customTabs]);

  const addTab = (label: string) => {
    const newTab: CustomTab = { id: `ct_${Date.now()}`, label, content: '' };
    setCustomTabs(prev => [...prev, newTab]);
    setActiveTab(newTab.id);
    setActiveCustomTab(newTab);
    setShowAddDialog(false);
  };

  const renameTab = (id: string, label: string) => {
    setCustomTabs(prev => prev.map(t => t.id !== id ? t : { ...t, label }));
    setRenameTarget(null);
  };

  const deleteTab = (id: string) => {
    setCustomTabs(prev => prev.filter(t => t.id !== id));
    if (activeTab === id) { setActiveTab('overview'); setActiveCustomTab(null); }
  };

  const updateTabContent = (id: string, content: string) => {
    setCustomTabs(prev => prev.map(t => t.id !== id ? t : { ...t, content }));
    if (activeCustomTab?.id === id) setActiveCustomTab(prev => prev ? { ...prev, content } : null);
  };

  const switchToBuiltin = (id: string) => { setActiveTab(id); setActiveCustomTab(null); };
  const switchToCustom = (tab: CustomTab) => { setActiveTab(tab.id); setActiveCustomTab(tab); };

  return (
    <div className="space-y-4 pb-10">
      {/* Tab bar */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-visible" style={{ boxShadow: '0 1px 3px rgba(15,23,42,0.06)' }}>
        <div className="flex items-center overflow-x-auto scrollbar-none border-b border-slate-100 px-2">
          {BUILTIN_TABS.map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id && !activeCustomTab;
            const isOverview = tab.id === 'overview';
            return (
              <div key={tab.id} className="flex items-center shrink-0 group/ovtab">
                <button onClick={() => switchToBuiltin(tab.id)}
                  className={cn('flex items-center gap-1.5 px-4 py-3 text-xs font-semibold border-b-2 whitespace-nowrap transition-all',
                    isActive ? 'text-rail-600 border-rail-600' : 'text-slate-500 border-transparent hover:text-slate-700 hover:bg-slate-50')}>
                  <Icon size={13} className={isActive ? 'text-rail-500' : 'text-slate-400'}/>
                  {tab.label}
                  {/* Lock badge when tab has restricted access */}
                  {getAccess(tab.id).viewMode === 'selected' && (
                    <Lock size={9} className="text-amber-500 ml-0.5"/>
                  )}
                </button>
                {/* Access settings icon — built-in tabs, admin/maintenance only */}
                {isManager && (
                  <button
                    onClick={e => { e.stopPropagation(); setAccessModalTab(tab.id); }}
                    title={`Configure who can view/edit "${tab.label}"`}
                    className={cn(
                      'p-1 mr-1 rounded transition-all text-slate-400 hover:text-rail-600 hover:bg-rail-50',
                      'opacity-0 group-hover/ovtab:opacity-100',
                      accessModalTab === tab.id && 'opacity-100 text-rail-600',
                    )}>
                    <Settings size={11}/>
                  </button>
                )}
              </div>
            );
          })}
          {customTabs.map(tab => {
            const isActive = activeTab === tab.id;
            return (
              <div key={tab.id} className="flex items-center shrink-0 group/ctab">
                <CustomTabButton
                  tab={tab}
                  isActive={isActive}
                  canEdit={canEdit}
                  menuOpen={menuOpen}
                  onSwitch={() => switchToCustom(tab)}
                  onMenuToggle={id => setMenuOpen(m => m === id ? null : id)}
                  onMenuClose={() => setMenuOpen(null)}
                  onRename={() => setRenameTarget(tab)}
                  onDelete={() => deleteTab(tab.id)}
                />
                {/* Lock badge + gear for custom tabs */}
                {isManager && (
                  <div className="flex items-center gap-0.5 ml-0.5">
                    {getAccess(tab.id).viewMode === 'selected' && (
                      <Lock size={9} className="text-amber-500"/>
                    )}
                    <button
                      onClick={e => { e.stopPropagation(); setAccessModalTab(tab.id); }}
                      title={`Configure who can view/edit "${tab.label}"`}
                      className={cn(
                        'p-1 rounded transition-all text-slate-400 hover:text-rail-600 hover:bg-rail-50',
                        'opacity-0 group-hover/ctab:opacity-100',
                        accessModalTab === tab.id && 'opacity-100 text-rail-600',
                      )}>
                      <Settings size={11}/>
                    </button>
                  </div>
                )}
              </div>
            );
          })}
          {canEdit && (
            <button onClick={() => setShowAddDialog(true)}
              className="flex items-center gap-1 px-3 py-3 text-xs font-medium text-slate-400 hover:text-rail-600 hover:bg-slate-50 transition-colors ml-1 shrink-0">
              <Plus size={12}/> Add Tab
            </button>
          )}
          {/* User badge */}
          <div className="ml-auto px-4 py-2 flex items-center gap-2 shrink-0">
            <span className="text-xs text-slate-600 font-semibold">{user?.name}</span>
            <span className="text-[10px] bg-violet-100 text-violet-700 border border-violet-200 rounded-full px-2 py-0.5 font-bold capitalize">{user?.role}</span>
          </div>
        </div>
      </div>

      {/* Tab content */}
      <AnimatePresence mode="wait">
        <motion.div key={activeTab} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }}>
          {activeTab === 'overview'  && !activeCustomTab && (
            canViewOv
              ? <OverviewWorkspace canEdit={canEditOv}/>
              : <div className="flex flex-col items-center justify-center py-24 text-center">
                  <div className="w-14 h-14 bg-amber-50 border border-amber-200 rounded-2xl flex items-center justify-center mb-4">
                    <Lock size={22} className="text-amber-500"/>
                  </div>
                  <p className="font-bold text-slate-800 text-sm mb-1">Access Restricted</p>
                  <p className="text-xs text-slate-500 max-w-xs">
                    You don&apos;t have permission to view the Overview page.
                    Contact your Admin or Maintenance officer to request access.
                  </p>
                </div>
          )}
          {activeTab === 'revenue'   && !activeCustomTab && <RevenueTab />}
          {activeTab === 'policies'  && !activeCustomTab && <PoliciesWorkspace />}
          {activeTab === 'handout'   && !activeCustomTab && (
            <HandoutDirectoryTab initialCode={handoutCode}/>
          )}
          {activeCustomTab && (
            canViewTab(user, getAccess(activeCustomTab.id))
              ? <CustomTabContent
                  tab={activeCustomTab}
                  onUpdate={content => updateTabContent(activeCustomTab.id, content)}
                  canEdit={canEdit || canEditTab(user, getAccess(activeCustomTab.id))}
                />
              : <div className="flex flex-col items-center justify-center py-24 text-center">
                  <div className="w-14 h-14 bg-amber-50 border border-amber-200 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <Lock size={22} className="text-amber-500"/>
                  </div>
                  <p className="font-bold text-slate-800 text-sm mb-1">Access Restricted</p>
                  <p className="text-xs text-slate-500 max-w-xs">
                    You don&apos;t have permission to view this tab. Contact your Admin or Maintenance user.
                  </p>
                </div>
          )}
        </motion.div>
      </AnimatePresence>

      {/* Dialogs */}
      {/* Tab name dialogs inside AnimatePresence for smooth transitions */}
      <AnimatePresence>
        {showAddDialog && (
          <TabNameDialog title="Add New Tab" onSave={addTab} onClose={() => setShowAddDialog(false)}/>
        )}
        {renameTarget && (
          <TabNameDialog title="Rename Tab" initial={renameTarget.label}
            onSave={label => renameTab(renameTarget.id, label)}
            onClose={() => setRenameTarget(null)}/>
        )}
      </AnimatePresence>

      {/* Access control modal — outside AnimatePresence (uses createPortal) */}
      {accessModalTab && (
        <OverviewAccessModal
          tabId={accessModalTab}
          tabLabel={
            BUILTIN_TABS.find(t => t.id === accessModalTab)?.label ??
            customTabs.find(t => t.id === accessModalTab)?.label ??
            accessModalTab
          }
          onClose={() => setAccessModalTab(null)}
          onSave={access => { updateAccess(accessModalTab, access); setAccessModalTab(null); }}
        />
      )}
    </div>
  );
}
