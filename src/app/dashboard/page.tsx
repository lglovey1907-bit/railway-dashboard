'use client';
import { useState, useMemo, useEffect } from 'react';
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
import ProfilePage from '@/app/dashboard/profile/page';
import {
 ChevronRight, ChevronDown, Train, Users, MonitorCheck,
 Link2, Edit3, Save, X, ExternalLink, UserCircle,
 FileText, Search, BookOpen, AlertCircle, MoreHorizontal, Plus,
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
  getViewStore, saveViewStore, createView, renameView, duplicateView, deleteView,
  setDefaultView, setActiveView, updateViewFilters, updateViewGroupBy,
  updateSyncInterval, applyFilters, syncViewFields, updateViewFields,
  type ViewStore, type View,
} from '@/lib/views/viewEngine';

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

function OverviewTab() {
 const { user } = useAuthStore();
 const canEdit = user?.cell === 'Planning' || user?.role === 'maintenance' || user?.role === 'admin';
 const [search, setSearch] = useState('');
 const [groupFilter, setGroupFilter] = useState<string>('All');

 // ── Single consolidated Google Sheet ──────────────────────────────────────
 const pageSheet = usePageSheet('sheet_nsg_category_wise', user?.id);
 const sheetConnected = !!pageSheet.url;

 // ── View store (persists across refresh/deploy) ────────────────────────────
 const [viewStore, setViewStore] = useState<ViewStore>(() => getViewStore('sheet_nsg_category_wise'));
 const activeView = viewStore.views.find(v => v.id === viewStore.activeViewId) ?? viewStore.views[0];

 const commitStore = (next: ViewStore) => { setViewStore(next); saveViewStore(next); };

 // Sync view fields from sheet headers whenever headers change
 useEffect(() => {
   if (pageSheet.headers.length === 0 || !activeView) return;
   const synced = syncViewFields(activeView, pageSheet.headers);
   if (synced.length !== activeView.fields.length) {
     commitStore(updateViewFields(viewStore, activeView.id, synced));
   }
 // eslint-disable-next-line react-hooks/exhaustive-deps
 }, [pageSheet.headers.join(','), activeView?.id]);

 // Sync interval → pageSheet poll
 useEffect(() => {
   pageSheet.setPollInterval(viewStore.syncIntervalMinutes * 60_000);
 // eslint-disable-next-line react-hooks/exhaustive-deps
 }, [viewStore.syncIntervalMinutes]);

 // Derive viewMode from active view for backwards-compat with existing rendering code
 const viewMode: ViewMode = (activeView?.id === 'v_nsg' ? 'nsg' :
   activeView?.id === 'v_station' ? 'station' :
   activeView?.id === 'v_section' ? 'section' :
   activeView?.id === 'v_cmi' ? 'cmi' : 'station') as ViewMode;

 // ── User-configurable field list ───────────────────────────────────────────
 const pageFields = usePageFields('fields_nsg_category_wise');

 const CATEGORIES = ['NSG-1','NSG-2','NSG-3','NSG-4','NSG-5','NSG-6','HG-1','HG-2','HG-3'];

 const grouped = useMemo(() => {
 return CATEGORIES.reduce((acc, cat) => {
 acc[cat] = STATION_MASTER.filter(s =>
 s.category === cat &&
 (search === '' || s.name.toLowerCase().includes(search.toLowerCase()) || s.code.toLowerCase().includes(search.toLowerCase()))
 );
 return acc;
 }, {} as Record<string, typeof STATION_MASTER>);
 }, [search]);

 const totals = useMemo(() => ({
 total: STATION_MASTER.length,
 byState: Array.from(new Set(STATION_MASTER.map(s => s.state))).length,
 filled: Object.keys(STATION_PLANNING_DATA).length,
 }), []);

 // All sections / CMIs present in the master list, for grouping + filter dropdown
 const allSections = useMemo(() => Array.from(new Set(STATION_MASTER.map(s => s.section))).sort(), []);
 const allCMIs = useMemo(() => Array.from(new Set(STATION_MASTER.map(s => s.cmi))).sort(), []);

 // Filtered station list shared by station/section/cmi table views
 const filteredStations = useMemo(() => {
 return STATION_MASTER.filter(s =>
 (search === '' || s.name.toLowerCase().includes(search.toLowerCase()) || s.code.toLowerCase().includes(search.toLowerCase()))
 );
 }, [search]);


 return (
 <div className="space-y-4">
 {/* Consolidated Google Sheet — single source for the whole page */}
 <PageSheetLinkBar sheet={pageSheet} canEdit={canEdit} pageLabel="NSG Category Wise"
 expectedFields={['Code', ...pageFields.fields.map(f => f.column)]} />

      {/* View field configurator — dynamically maps sheet columns to display fields */}
      {canEdit && (
        <div className="flex justify-end -mt-1.5">
          <SheetViewBuilder
            fields={pageFields.fields}
            sheetHeaders={pageSheet.headers}
            canEdit={canEdit}
            onToggle={pageFields.toggleField}
            onRename={pageFields.renameField}
            onMove={pageFields.moveField}
            onAdd={pageFields.addField}
            onRemove={pageFields.removeField}
            onReset={pageFields.resetToDefaults}
          />
        </div>
      )}
 {/* Summary strip */}
 <div className="grid grid-cols-3 gap-3">
 {[
 { label: 'Total Stations', value: totals.total, sub: 'Delhi Division', accent: 'blue' },
 { label: 'States / UTs', value: totals.byState, sub: 'covered', accent: 'violet' },
 { label: 'Data Entries', value: totals.filled, sub: 'of ' + totals.total, accent: 'emerald' },
 ].map(({ label, value, sub, accent }) => (
 <GlassCard key={label} className="p-4 relative overflow-hidden">
 <div className={cn('absolute top-0 left-0 right-0 h-0.5',
 accent === 'blue' && 'bg-gradient-to-r from-blue-500 to-blue-400',
 accent === 'violet' && 'bg-gradient-to-r from-violet-500 to-violet-400',
 accent === 'emerald' && 'bg-gradient-to-r from-emerald-500 to-emerald-400')} />
 <p className="text-slate-500 text-[10px] font-semibold uppercase tracking-wider">{label}</p>
 <p className="text-slate-900 text-3xl font-bold mt-1 tracking-tight">{value}</p>
 <p className="text-slate-400 text-[11px] mt-0.5">{sub}</p>
 </GlassCard>
 ))}
 </div>

      {/* ── Notion-style View Bar (req 105-115) ── */}
      <ViewBar
        store={viewStore}
        canEdit={canEdit}
        userId={user?.id ?? ''}
        sheetRows={pageSheet.rows.length}
        fetchedAt={pageSheet.fetchedAt}
        loading={pageSheet.loading}
        onSetActive={id => commitStore(setActiveView(viewStore, id))}
        onCreate={(label, layout, tplId) => commitStore(createView(viewStore, label, layout, user?.id ?? '', tplId))}
        onRename={(id, label) => commitStore(renameView(viewStore, id, label))}
        onDuplicate={id => commitStore(duplicateView(viewStore, id))}
        onDelete={id => commitStore(deleteView(viewStore, id))}
        onSetDefault={id => commitStore(setDefaultView(viewStore, id))}
        onRefetch={pageSheet.refetch}
        onSyncIntervalChange={m => commitStore(updateSyncInterval(viewStore, m))}
        syncInterval={viewStore.syncIntervalMinutes}
      />

      {/* Linked Data Sources overview — shows sync status + cross-device indicator */}
      <LinkedSourcesPanel
        sources={[{
          namespace: 'sheet_nsg_category_wise',
          label: 'NSG Category Wise Data',
          url: pageSheet.url,
          rows: pageSheet.rows.length,
          fetchedAt: pageSheet.fetchedAt,
          loading: pageSheet.loading,
          error: pageSheet.error,
          linkedAt: pageSheet.linkedAt,
          linkedBy: pageSheet.linkedBy,
        }]}
        kvAvailable={pageSheet.kvAvailable}
        onRefetch={() => pageSheet.refetch()}
        onUnlink={() => pageSheet.setUrl('')}
      />
 {/* Search + group filter + edit notice */}
 <div className="flex items-center gap-3 flex-wrap">
 <div className="relative flex-1 min-w-48">
 <Search size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-800/30"/>
 <input value={search} onChange={e => setSearch(e.target.value)}
 placeholder="Search station name or code…"
 className="w-full bg-white border border-slate-900/10 rounded-xl shadow-elevation-xs pl-8 pr-3 py-2 text-xs text-slate-800/70 focus:outline-none focus:border-blue-400/40 placeholder:text-slate-400"/>
 </div>

 {viewMode === 'section' && (
 <select value={groupFilter} onChange={e => setGroupFilter(e.target.value)}
 className="bg-white border border-slate-900/10 rounded-xl shadow-elevation-xs px-3 py-2 text-xs text-slate-800/70 focus:outline-none focus:border-blue-400/40">
 <option value="All"className="bg-slate-900">All Sections</option>
 {allSections.map(sec => <option key={sec} value={sec} className="bg-slate-900">{sec}</option>)}
 </select>
 )}
 {viewMode === 'cmi' && (
 <select value={groupFilter} onChange={e => setGroupFilter(e.target.value)}
 className="bg-white border border-slate-900/10 rounded-xl shadow-elevation-xs px-3 py-2 text-xs text-slate-800/70 focus:outline-none focus:border-blue-400/40">
 <option value="All"className="bg-slate-900">All CMIs</option>
 {allCMIs.map(c => <option key={c} value={c} className="bg-slate-900">{c}</option>)}
 </select>
 )}

 {canEdit && viewMode === 'nsg' && !sheetConnected && (
 <div className="flex items-center gap-1.5 text-xs text-emerald-600 bg-emerald-500/10 border border-emerald-500/20 rounded-xl px-3 py-2">
 <Edit3 size={11} /> You can edit station data directly, or connect a Google Sheet above
 </div>
 )}
 {!canEdit && viewMode === 'nsg' && (
 <p className="text-xs text-slate-800/30 italic">Contact Planning cell to update station data</p>
 )}
 </div>

 {/* ── NSG Category Wise (drill-down cards) ── */}
 {viewMode === 'nsg' && CATEGORIES.map(cat => {
 const stations = grouped[cat];
 if (stations.length === 0) return null;
 return <NSGGroupCard key={cat} category={cat} stations={stations} canEdit={canEdit}
 sheetRows={pageSheet.rows} sheetConnected={sheetConnected} fields={pageFields.visibleFields} />;
 })}

 {/* ── Station Wise (flat table) ── */}
 {viewMode === 'station' && (
 <StationTableView stations={filteredStations} sheetRows={pageSheet.rows} sheetConnected={sheetConnected} fields={pageFields.visibleFields} />
 )}

 {/* ── Section Wise (grouped tables) ── */}
 {viewMode === 'section' && (
 <div className="space-y-4">
 {(groupFilter === 'All' ? allSections : [groupFilter]).map(sec => {
 const stations = filteredStations.filter(s => s.section === sec);
 if (stations.length === 0) return null;
 return (
 <div key={sec}>
 <div className="flex items-center gap-2 mb-2 px-1">
 <div className="w-1.5 h-1.5 rounded-full bg-cyan-400"/>
 <p className="text-slate-800/70 text-sm font-semibold">{sec}</p>
 <span className="text-slate-800/30 text-xs">({stations.length} stations)</span>
 </div>
 <StationTableView stations={stations} sheetRows={pageSheet.rows} sheetConnected={sheetConnected} fields={pageFields.visibleFields} />
 </div>
 );
 })}
 </div>
 )}

 {/* ── CMI Wise (grouped tables) ── */}
 {viewMode === 'cmi' && (
 <div className="space-y-4">
 {(groupFilter === 'All' ? allCMIs : [groupFilter]).map(cmiName => {
 const stations = filteredStations.filter(s => s.cmi === cmiName);
 if (stations.length === 0) return null;
 return (
 <div key={cmiName}>
 <div className="flex items-center gap-2 mb-2 px-1">
 <div className="w-1.5 h-1.5 rounded-full bg-indigo-400"/>
 <p className="text-slate-800/70 text-sm font-semibold">{cmiName}</p>
 <span className="text-slate-800/30 text-xs">({stations.length} stations)</span>
 </div>
 <StationTableView stations={stations} sheetRows={pageSheet.rows} sheetConnected={sheetConnected} fields={pageFields.visibleFields} />
 </div>
 );
 })}
 </div>
 )}
 </div>
 );
}

// ─── Tab: Revenue ─────────────────────────────────────────────────────────────
// ─── Revenue sub-tabs: Summary | PRS | UTS | Footfall | Ticket Checking ───────
const REVENUE_SUBTABS = [
 { id: 'prs', label: 'PRS' },
 { id: 'uts', label: 'UTS' },
 { id: 'footfall', label: 'Footfall' },
 { id: 'tc', label: 'Ticket Checking' },
] as const;
type RevenueSubTab = typeof REVENUE_SUBTABS[number]['id'];

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

// ─── Tab: Policies / Circulars / SOP ─────────────────────────────────────────
// ─── Policies / Circulars / SOP — sheet-driven, same pattern as NSG page ──────
interface PolicyDoc {
 title: string;
 category: string; // PRS, UTS, Ticket Checking, Catering, GST, etc.
 subCategory: string; // e.g."Tatkal","Refunds","Group Booking"
 circularNo: string;
 date: string;
 link: string;
 issuedBy: string;
}

const POLICY_CATEGORIES = [
 'PRS', 'UTS', 'Ticket Checking', 'Fare Structure', 'Luggage', 'Parcel',
 'Railway Act', 'Catering', 'Special Train', 'Non Fare Revenue',
 'Tenders', 'GST', 'Passenger Amenities',
];

const CAT_BADGE_COLORS = [
 'bg-blue-500/10 text-blue-700 border-blue-500/30',
 'bg-violet-500/10 text-violet-700 border-violet-500/30',
 'bg-amber-500/10 text-amber-700 border-amber-500/30',
 'bg-emerald-500/10 text-emerald-700 border-emerald-500/30',
 'bg-rose-500/10 text-rose-700 border-rose-500/30',
 'bg-cyan-500/10 text-cyan-700 border-cyan-500/30',
];
const CAT_ACCENT_COLORS = [
 'bg-blue-400', 'bg-violet-400', 'bg-amber-400',
 'bg-emerald-400', 'bg-rose-400', 'bg-cyan-400',
];
const catColor = (cat: string) => CAT_BADGE_COLORS[POLICY_CATEGORIES.indexOf(cat) % CAT_BADGE_COLORS.length] ?? CAT_BADGE_COLORS[0];
const catAccent = (cat: string) => CAT_ACCENT_COLORS[POLICY_CATEGORIES.indexOf(cat) % CAT_ACCENT_COLORS.length] ?? CAT_ACCENT_COLORS[0];

function parsePolicyRows(rows: SheetRow[]): PolicyDoc[] {
 const validCategories = new Set(POLICY_CATEGORIES.map(c => c.toLowerCase()));
 return rows
 .map(r => ({
 title: readField(r, ['Title', 'Circular Title', 'Name']),
 category: readField(r, ['Category', 'Section']),
 subCategory: readField(r, ['Sub Category', 'SubCategory', 'Topic']),
 circularNo: readField(r, ['Circular No', 'CC No', 'Number']),
 date: readField(r, ['Date', 'Issue Date']),
 link: readField(r, ['Link', 'PDF Link', 'URL']),
 issuedBy: readField(r, ['Issued By', 'Source', 'Authority']),
 }))
 // Drop rows missing essentials, and any row whose Category isn't one
 // of the 13 known categories (catches stray nav/title rows like
 //"Indian Railway"that shouldn't be treated as real circulars)
 .filter(p => p.title !== 'NA' && p.link !== 'NA' && validCategories.has(p.category.toLowerCase()));
}

function PoliciesTab() {
 const { user } = useAuthStore();
 const canEdit = user?.cell === 'Planning' || user?.role === 'maintenance' || user?.role === 'admin';
 const policySheet = usePageSheet('sheet_policies_circulars_sop', user?.id);
 const sheetConnected = !!policySheet.url;

 const [category, setCategory] = useState<string>(POLICY_CATEGORIES[0]);
 const [search, setSearch] = useState('');
 const [openSections, setOpenSections] = useState<Record<string, boolean>>({});

 const docs = useMemo(() => parsePolicyRows(policySheet.rows), [policySheet.rows]);
 const skippedCount = policySheet.rows.length - docs.length;

 const countByCategory = useMemo(() => {
 const m: Record<string, number> = {};
 docs.forEach(d => { m[d.category] = (m[d.category] ?? 0) + 1; });
 return m;
 }, [docs]);

 // Docs for the selected category, optionally filtered by search
 const categoryDocs = useMemo(() => docs.filter(d =>
 d.category.toLowerCase() === category.toLowerCase() &&
 (search === '' ||
 d.title.toLowerCase().includes(search.toLowerCase()) ||
 d.subCategory.toLowerCase().includes(search.toLowerCase()) ||
 d.circularNo.toLowerCase().includes(search.toLowerCase()))
 ), [docs, category, search]);

 // Group into sub-category sections — order follows first appearance in the sheet,
 // matching the source site's section ordering (Reservation, Refunds, Tatkal, ...)
 const sections = useMemo(() => {
 const order: string[] = [];
 const map: Record<string, PolicyDoc[]> = {};
 categoryDocs.forEach(d => {
 const key = d.subCategory === 'NA' ? 'Other' : d.subCategory;
 if (!map[key]) { map[key] = []; order.push(key); }
 map[key].push(d);
 });
 return order.map(key => ({ name: key, docs: map[key] }));
 }, [categoryDocs]);

 // Auto-expand all sections whenever category or search changes
 useEffect(() => {
 const next: Record<string, boolean> = {};
 sections.forEach(s => { next[s.name] = true; });
 setOpenSections(next);
 // eslint-disable-next-line react-hooks/exhaustive-deps
 }, [category]);

 const toggleSection = (name: string) => setOpenSections(p => ({ ...p, [name]: !p[name] }));

 const EXPECTED_FIELDS = ['Category', 'Sub Category', 'Title', 'Circular No', 'Date', 'Link', 'Issued By'];

 return (
 <div className="space-y-4">
 {/* Consolidated Google Sheet — single source for all policies/circulars */}
 <PageSheetLinkBar sheet={policySheet} canEdit={canEdit} pageLabel="Policies / Circulars / SOP"expectedFields={EXPECTED_FIELDS} />

 {!sheetConnected ? (
 <div className="rounded-2xl border border-slate-900/8 bg-white flex flex-col items-center justify-center gap-3 py-16 shadow-elevation-sm">
 <BookOpen size={36} className="text-blue-600"/>
 <p className="text-slate-800/50 text-sm font-medium">No policy data source connected yet</p>
 <p className="text-slate-800/25 text-xs max-w-md text-center leading-relaxed">
 Connect a Google Sheet above with columns: Category, Sub Category, Title, Circular No, Date, Link, Issued By.
 Once connected, every circular and SOP will appear here, grouped by category and sub-category — and stay in sync automatically.
 </p>
 </div>
 ) : (
 <>
 {/* Search */}
 <div className="relative">
 <Search size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-800/30"/>
 <input value={search} onChange={e => setSearch(e.target.value)}
 placeholder="Search policies, circulars, circular number…"
 className="w-full bg-white border border-slate-900/10 rounded-xl shadow-elevation-xs pl-8 pr-3 py-2 text-xs text-slate-800/70 focus:outline-none focus:border-blue-400/40 placeholder:text-slate-400"/>
 </div>

 {skippedCount > 0 && (
 <p className="text-amber-600 text-[10px] flex items-center gap-1.5">
 <AlertCircle size={10}/> {skippedCount} row{skippedCount !== 1 ? 's' : ''} in your sheet skipped — missing Title/Link, or Category isn't one of the 13 recognized categories
 </p>
 )}

 {/* Category selector — top-level, mirrors the source site's category pages */}
 <div className="flex flex-wrap gap-1.5">
 {POLICY_CATEGORIES.map(cat => (
 <button key={cat} onClick={() => setCategory(cat)}
 className={`px-3 py-1.5 rounded-xl text-xs font-medium border transition-all ${category === cat ? `${catColor(cat)} border-opacity-60 shadow-elevation-xs` : 'text-slate-500 border-slate-900/8 bg-white hover:text-slate-800 hover:bg-slate-100 '}`}>
 {cat} <span className="opacity-50">({countByCategory[cat] ?? 0})</span>
 </button>
 ))}
 </div>

 {/* Category heading */}
 <div className="flex items-center gap-2 pt-1">
 <div className={`w-1.5 h-6 rounded-full ${catAccent(category)}`} />
 <h2 className="text-slate-900 text-lg font-bold">{category.toUpperCase()}</h2>
 <span className="text-slate-800/30 text-xs">{categoryDocs.length} document{categoryDocs.length !== 1 ? 's' : ''}</span>
 </div>

 {/* Sub-category sections — Reservation, Refunds, Tatkal, Pass PTO, etc. */}
 {sections.length === 0 ? (
 <div className="text-center py-12 text-slate-800/30 text-sm">No documents found in this category</div>
 ) : (
 <div className="space-y-3">
 {sections.map(section => {
 const isOpen = openSections[section.name] ?? true;
 return (
 <div key={section.name} className="rounded-2xl border border-slate-900/8 bg-white overflow-hidden shadow-elevation-sm">
 <button onClick={() => toggleSection(section.name)}
 className="w-full flex items-center justify-between px-4 py-3 hover:bg-slate-900/5 transition-colors text-left">
 <div className="flex items-center gap-2.5">
 <BookOpen size={14} className="text-blue-600"/>
 <span className="text-slate-800/80 text-sm font-bold uppercase tracking-wide">{section.name}</span>
 <span className="text-slate-800/30 text-[10px] bg-slate-900/5 rounded-full px-2 py-0.5">{section.docs.length}</span>
 </div>
 {isOpen ? <ChevronDown size={15} className="text-slate-800/40"/> : <ChevronRight size={15} className="text-slate-800/40"/>}
 </button>

 {isOpen && (
 <div className="px-4 pb-4 space-y-2 border-t border-slate-900/5 pt-3">
 {section.docs.map((p, i) => (
 <a key={i} href={p.link} target="_blank"rel="noreferrer"className="block">
 <div className="flex items-start gap-3 rounded-xl bg-slate-50 hover:bg-white hover:shadow-elevation-sm border border-slate-900/6 p-3 transition-all cursor-pointer">
 <div className="w-7 h-7 rounded-lg bg-slate-900/5 flex items-center justify-center shrink-0 mt-0.5">
 <FileText size={12} className="text-blue-600"/>
 </div>
 <div className="flex-1 min-w-0">
 <p className="text-sm font-medium leading-snug text-slate-800/80">{p.title}</p>
 <div className="flex items-center gap-2 mt-1 flex-wrap">
 {p.circularNo !== 'NA' && <span className="text-slate-800/30 text-[10px] font-mono">{p.circularNo}</span>}
 {p.date !== 'NA' && <><span className="text-slate-800/20 text-[10px]">·</span><span className="text-slate-800/30 text-[10px]">{p.date}</span></>}
 {p.issuedBy !== 'NA' && <><span className="text-slate-800/20 text-[10px]">·</span><span className="text-slate-800/30 text-[10px]">{p.issuedBy}</span></>}
 </div>
 </div>
 <ExternalLink size={11} className="shrink-0 text-slate-800/25 mt-1"/>
 </div>
 </a>
 ))}
 </div>
 )}
 </div>
 );
 })}
 </div>
 )}
 </>
 )}
 </div>
 );
}

// ─── Main page with 3 tabs ────────────────────────────────────────────────────
// ─── Built-in tabs ────────────────────────────────────────────────────────────
const BUILTIN_TABS = [
 { id: 'overview', label: 'Overview', icon: Train },
 { id: 'profile', label: 'Profile', icon: UserCircle },
 { id: 'revenue', label: 'Revenue', icon: MonitorCheck },
 { id: 'policies', label: 'Policies / Circulars / SOP', icon: FileText },
] as const;

// ─── Custom tab type (user-created) ──────────────────────────────────────────
interface CustomTab {
 id: string;
 label: string;
 content: string; // rich-text notes content
}

const CUSTOM_TABS_KEY = 'rly_dashboard_custom_tabs';

function loadCustomTabs(): CustomTab[] {
 if (typeof window === 'undefined') return [];
 try { return JSON.parse(localStorage.getItem(CUSTOM_TABS_KEY) ?? '[]'); } catch { return []; }
}
function saveCustomTabs(tabs: CustomTab[]) {
 if (typeof window !== 'undefined') localStorage.setItem(CUSTOM_TABS_KEY, JSON.stringify(tabs));
}

// ─── Custom tab content renderer ──────────────────────────────────────────────
function CustomTabContent({ tab, onUpdate, canEdit }: {
 tab: CustomTab; onUpdate: (content: string) => void; canEdit: boolean;
}) {
 const [editing, setEditing] = useState(false);
 const [draft, setDraft] = useState(tab.content);
 const save = () => { onUpdate(draft); setEditing(false); };

 if (editing && canEdit) return (
 <div className="space-y-3">
 <textarea value={draft} onChange={e => setDraft(e.target.value)} rows={16} autoFocus
 placeholder="Add content for this tab — notes, links, instructions, reports…"
 className="w-full bg-white border border-slate-200 rounded-2xl px-4 py-3 text-sm text-slate-800 focus:outline-none focus:border-blue-400 resize-y min-h-[200px] shadow-elevation-xs"/>
 <div className="flex gap-2 justify-end">
 <button onClick={() => setEditing(false)} className="px-4 py-2 text-sm text-slate-500 hover:bg-slate-100 rounded-xl">Cancel</button>
 <button onClick={save} className="px-4 py-2 text-sm bg-blue-600 text-white hover:bg-blue-700 rounded-xl">Save</button>
 </div>
 </div>
 );

 return (
 <div className="relative group min-h-[120px]">
 {tab.content
 ? <div className="bg-white border border-slate-200 rounded-2xl p-5 text-sm text-slate-700 whitespace-pre-wrap leading-relaxed shadow-elevation-sm">{tab.content}</div>
 : <div className="bg-white border border-dashed border-slate-300 rounded-2xl p-10 flex flex-col items-center justify-center gap-2">
 <FileText size={28} className="text-slate-200"/>
 <p className="text-sm text-slate-400">This tab is empty</p>
 {canEdit && <button onClick={() => setEditing(true)} className="text-xs text-blue-500 hover:text-blue-700 mt-1">+ Add content</button>}
 </div>
 }
 {canEdit && tab.content && (
 <button onClick={() => setEditing(true)}
 className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-white border border-slate-200 text-xs text-slate-500 hover:text-slate-700 shadow-elevation-xs transition-opacity">
 <Edit3 size={11}/> Edit
 </button>
 )}
 </div>
 );
}

// ─── Add / rename dialog ──────────────────────────────────────────────────────
function TabNameDialog({ initial, title, onSave, onClose }: {
 initial?: string; title: string; onSave: (label: string) => void; onClose: () => void;
}) {
 const [value, setValue] = useState(initial ?? '');
 const commit = () => { if (value.trim()) { onSave(value.trim()); onClose(); } };
 return (
 <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"onClick={onClose}>
 <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
 className="bg-white border border-slate-200 rounded-2xl p-6 w-full max-w-sm shadow-2xl"onClick={e => e.stopPropagation()}>
 <p className="font-bold text-slate-900 mb-4">{title}</p>
 <input value={value} onChange={e => setValue(e.target.value)} autoFocus
 onKeyDown={e => { if (e.key === 'Enter') commit(); if (e.key === 'Escape') onClose(); }}
 placeholder="Tab name…"
 className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2.5 text-sm text-slate-800 focus:outline-none focus:border-blue-400 mb-4"/>
 <div className="flex gap-2 justify-end">
 <button onClick={onClose} className="px-4 py-2 text-sm text-slate-500 hover:bg-slate-100 rounded-xl">Cancel</button>
 <button onClick={commit} disabled={!value.trim()} className="px-4 py-2 text-sm bg-blue-600 text-white hover:bg-blue-700 rounded-xl disabled:opacity-40">Save</button>
 </div>
 </motion.div>
 </div>
 );
}

export default function DashboardPage() {
 const { user } = useAuthStore();
 const canEdit = user?.role === 'maintenance' || user?.role === 'admin';

 const [activeTab, setActiveTab] = useState<string>('overview');
 const [customTabs, setCustomTabs] = useState<CustomTab[]>([]);
 const [showAddDialog, setShowAddDialog] = useState(false);
 const [renameTarget, setRenameTarget] = useState<CustomTab | null>(null);
 const [tabMenuOpen, setTabMenuOpen] = useState<string | null>(null); // id of tab whose menu is open

 useEffect(() => { setCustomTabs(loadCustomTabs()); }, []);

 const persistCustomTabs = (tabs: CustomTab[]) => {
 setCustomTabs(tabs);
 saveCustomTabs(tabs);
 };

 const addTab = (label: string) => {
 const id = `custom_${Date.now()}`;
 const tab: CustomTab = { id, label, content: '' };
 persistCustomTabs([...customTabs, tab]);
 setActiveTab(id);
 };

 const renameTab = (id: string, label: string) => {
 persistCustomTabs(customTabs.map(t => t.id === id ? { ...t, label } : t));
 };

 const deleteTab = (id: string) => {
 const remaining = customTabs.filter(t => t.id !== id);
 persistCustomTabs(remaining);
 if (activeTab === id) setActiveTab('overview');
 };

 const updateTabContent = (id: string, content: string) => {
 persistCustomTabs(customTabs.map(t => t.id === id ? { ...t, content } : t));
 };

 const activeCustomTab = customTabs.find(t => t.id === activeTab);

 return (
 <div className="space-y-4 pb-6"onClick={() => setTabMenuOpen(null)}>
 {/* Header row */}
 <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
 className="flex items-center justify-between gap-3 flex-wrap">

 {/* Horizontal tab nav */}
 <div className="flex items-center gap-1 bg-white rounded-2xl p-1 border border-slate-900/8 flex-wrap shadow-elevation-sm">

 {/* Built-in tabs */}
 {BUILTIN_TABS.map(({ id, label, icon: Icon }) => (
 <button key={id} onClick={() => setActiveTab(id)}
 className={cn('flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200',
 activeTab === id
 ? 'bg-blue-600 text-white border border-blue-600 shadow-elevation-sm'
 : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100 ')}>
 <Icon size={14}/>{label}
 </button>
 ))}

 {/* Custom tabs */}
 {customTabs.map(tab => (
 <div key={tab.id} className="relative">
 <button
 onClick={() => setActiveTab(tab.id)}
 onContextMenu={e => { e.preventDefault(); setTabMenuOpen(tab.id); }}
 className={cn('flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 group',
 activeTab === tab.id
 ? 'bg-blue-600 text-white border border-blue-600 shadow-elevation-sm'
 : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100 ')}>
 <FileText size={14}/>{tab.label}
 {/* Edit indicator on hover */}
 {canEdit && activeTab === tab.id && (
 <span onClick={e => { e.stopPropagation(); setTabMenuOpen(t => t === tab.id ? null : tab.id); }}
 className="ml-0.5 p-0.5 rounded hover:bg-white/20 transition-colors">
 <MoreHorizontal size={12}/>
 </span>
 )}
 </button>

 {/* Dropdown menu */}
 <AnimatePresence>
 {tabMenuOpen === tab.id && (
 <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 4 }}
 onClick={e => e.stopPropagation()}
 className="absolute top-full left-0 mt-1 z-50 bg-white border border-slate-200 rounded-xl shadow-2xl overflow-hidden min-w-[140px]">
 <button onClick={() => { setRenameTarget(tab); setTabMenuOpen(null); }}
 className="w-full flex items-center gap-2 px-3 py-2 text-xs text-slate-700 hover:bg-slate-100">
 <Edit3 size={11}/> Rename
 </button>
 <button onClick={() => { deleteTab(tab.id); setTabMenuOpen(null); }}
 className="w-full flex items-center gap-2 px-3 py-2 text-xs text-red-600 hover:bg-red-50">
 <X size={11}/> Delete tab
 </button>
 </motion.div>
 )}
 </AnimatePresence>
 </div>
 ))}

 {/* Add tab button */}
 {canEdit && (
 <button onClick={() => setShowAddDialog(true)}
 className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl text-xs font-medium text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-all border border-dashed border-slate-300 hover:border-blue-300">
 <Plus size={13}/> Add Tab
 </button>
 )}
 </div>

 {/* Logged-in user pill */}
 <div className="flex items-center gap-2.5 bg-white border border-slate-900/8 rounded-2xl pl-3 pr-2 py-1.5 shadow-elevation-sm">
 <div className="text-right leading-tight">
 <p className="text-slate-800/70 text-xs font-medium">{user?.name}</p>
 <p className="text-slate-800/30 text-[10px]">{user?.cell} · {user?.designation}</p>
 </div>
 <Badge label={user?.role ?? ''} variant="role"/>
 </div>
 </motion.div>

 {/* Tab content */}
 <AnimatePresence mode="wait">
 <motion.div key={activeTab} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
 exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.18 }}>
 {activeTab === 'overview' && <OverviewTab />}
 {activeTab === 'profile' && <ProfilePage />}
 {activeTab === 'revenue' && <RevenueTab />}
 {activeTab === 'policies' && <PoliciesTab />}
 {activeCustomTab && (
 <CustomTabContent
 tab={activeCustomTab}
 onUpdate={content => updateTabContent(activeCustomTab.id, content)}
 canEdit={canEdit}
 />
 )}
 </motion.div>
 </AnimatePresence>

 {/* Dialogs */}
 <AnimatePresence>
 {showAddDialog && (
 <TabNameDialog title="Add New Tab"onSave={addTab} onClose={() => setShowAddDialog(false)}/>
 )}
 {renameTarget && (
 <TabNameDialog title="Rename Tab"initial={renameTarget.label}
 onSave={label => renameTab(renameTarget.id, label)}
 onClose={() => setRenameTarget(null)}/>
 )}
 </AnimatePresence>
 </div>
 );
}
