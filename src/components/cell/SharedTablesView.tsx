'use client';
import { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuthStore } from '@/store/authStore';
import {
 getSharesForCell,
 type CellShare, type SharePermission,
} from '@/lib/cellData/collaboration';
import { TableEngine } from './TableEngine';
import type { TableDef, CellWorkspace } from '@/lib/cellData/types';
import type { useWorkspace } from '@/lib/cellData/useWorkspace';
import {
 Share2, Eye, Edit3, Settings2, MessageSquare,
 ChevronDown, ChevronUp, Clock, RefreshCw, Lock, AlertCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const PERM_BADGE: Record<SharePermission, { cls: string; icon: React.ElementType; label: string }> = {
 view: { cls: 'bg-slate-100 text-slate-500 border-slate-200 ', icon: Eye, label: 'View Only' },
 comment: { cls: 'bg-blue-100 text-blue-600 border-blue-200 ', icon: MessageSquare, label: 'Comment' },
 edit: { cls: 'bg-emerald-100 text-emerald-700 border-emerald-200 ', icon: Edit3, label: 'Edit' },
 manage: { cls: 'bg-purple-100 text-purple-700 border-purple-200 ', icon: Settings2, label: 'Manage' },
};

function fmtDate(iso: string) {
 return new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

// ── Read owner workspace — tries multiple key variants ─────────────────────────
// This is the critical function. It must handle:
// - Normal cells:"Manpower Planning"→ workspace_v2_Manpower_Planning
// - Legacy cells: tables may have been saved under different key formats
// - Empty ownerCell on legacy tables (patched from share.ownerCell)
function readOwnerWorkspace(ownerCellName: string): CellWorkspace | null {
 if (!ownerCellName || typeof window === 'undefined') return null;

 // Primary key (standard format)
 const primaryKey = `workspace_v2_${ownerCellName.replace(/[^a-zA-Z0-9]/g, '_')}`;
 const raw = localStorage.getItem(primaryKey);
 if (!raw) return null;

 try {
 const ws = JSON.parse(raw) as CellWorkspace;
 return {
 cell: ws.cell ?? ownerCellName,
 sections: ws.sections ?? [],
 tables: (ws.tables ?? []).map((t: any) => ({
 ...t,
 ownerCell: t.ownerCell || ownerCellName, // fix blank ownerCell
 rows: (t.rows ?? []).map((r: any, i: number) => ({ ...r, order: r.order ?? i })),
 columnOrder: t.columnOrder ?? (t.fields ?? []).map((f: any) => f.id),
 filters: t.filters ?? {},
 nominatedUserIds: t.nominatedUserIds ?? [],
 })),
 trash: ws.trash ?? [],
 };
 } catch { return null; }
}

// ── Read-only hook shim for TableEngine ───────────────────────────────────────
function makeShim(table: TableDef): ReturnType<typeof useWorkspace> {
 const ws: CellWorkspace = { cell: table.ownerCell ?? '', sections: [], tables: [table], trash: [] };
 return {
 ws, history: [], future: [], canUndo: false, canRedo: false,
 undo: () => {}, redo: () => {},
 addSection: () => {}, removeSection: () => {}, renameSection: () => {},
 toggleSection: () => {}, moveSectionUp: () => {}, moveSectionDown: () => {},
 addTableToSection: () => {}, addTextToSection: () => {}, addKpiToSection: () => {},
 removeWidget: () => {}, updateWidget: () => {},
 updateTable: () => {}, setFirstColLabel: () => {}, setTableNominees: () => {},
 setTableViewers: () => {}, setTableEditors: () => {},
 setSort: () => {}, setFilter: () => {}, clearFilter: () => {},
 addColumn: () => {}, removeColumn: () => {}, updateColumn: () => {},
 moveColumn: () => {}, setColumnNominees: () => {},
 addRow: () => {}, removeRow: () => {}, moveRow: () => {}, setRowNominees: () => {},
 setCellValue: () => {},
 getCellValue: (_t: TableDef, rId: string, fId: string) => table.values[`${rId}:${fId}`] ?? '',
 importFromSheet: async () => null, linkSheet: async () => null,
 unlinkSheet: () => {}, syncSheet: async () => null,
 restoreFromTrash: () => {}, emptyTrash: () => {},
 } as ReturnType<typeof useWorkspace>;
}

// ── Single shared table card ───────────────────────────────────────────────────
function SharedTableCard({ share, table, userId, userName }: {
 share: CellShare; table: TableDef; userId?: string; userName?: string;
}) {
 const pb = PERM_BADGE[share.permission];
 const PermIcon = pb.icon;
 // eslint-disable-next-line react-hooks/exhaustive-deps
 const shim = useMemo(() => makeShim(table), [table]);

 return (
 <div className="space-y-3">
 <div>
 <div className="flex items-center gap-2 flex-wrap mb-1">
 <h3 className="font-bold text-slate-900 text-sm">{table.name}</h3>
 <span className={cn('inline-flex items-center gap-1 text-[10px] font-semibold border rounded-full px-2 py-0.5', pb.cls)}>
 <PermIcon size={9}/> {pb.label}
 </span>
 {(share.permission === 'view' || share.permission === 'comment') && (
 <span className="inline-flex items-center gap-1 text-[9px] text-slate-400">
 <Lock size={9}/> Read-only
 </span>
 )}
 </div>
 <div className="flex flex-wrap gap-x-4 text-[10px] text-slate-400">
 <span>Owner: <strong className="text-slate-600">{share.ownerCell}</strong></span>
 <span>Shared to: <strong className="text-slate-600">{share.sharedWithCell}</strong></span>
 <span>Permission: <strong className="text-slate-600">{pb.label}</strong></span>
 <span>Shared on: {fmtDate(share.grantedAt)}</span>
 </div>
 </div>
 <TableEngine
 table={table}
 hook={shim}
 cell={share.ownerCell}
 canManage={share.permission === 'manage'}
 userId={userId}
 userName={userName}
 />
 </div>
 );
}

// ── Main export ───────────────────────────────────────────────────────────────
interface Entry { share: CellShare; table: TableDef | null; errorMsg?: string; }

export function SharedTablesView({ cell }: { cell: string }) {
 const { user } = useAuthStore();
 const [entries, setEntries] = useState<Entry[]>([]);
 const [expanded, setExpanded] = useState(true);
 const [lastSynced, setLastSynced] = useState('');
 const [loading, setLoading] = useState(true);

 const reload = useCallback(() => {
 if (typeof window === 'undefined') return;

 const shares = getSharesForCell(cell); // already filters !revokedAt

 const loaded: Entry[] = shares.map(share => {
 const ownerWs = readOwnerWorkspace(share.ownerCell);
 if (!ownerWs) {
 return {
 share, table: null,
 errorMsg: `${share.ownerCell} workspace not initialised yet. The cell head must open their workspace and create at least one table before sharing takes effect.`,
 };
 }
 const found = ownerWs.tables.find(t => t.id === share.tableId) ?? null;
 if (!found) {
 return {
 share, table: null,
 errorMsg: `Table (id: …${share.tableId.slice(-8)}) was not found in ${share.ownerCell}'s workspace. It may have been deleted.`,
 };
 }
 return { share, table: { ...found, ownerCell: found.ownerCell || share.ownerCell } };
 });

 setEntries(loaded);
 setLastSynced(new Date().toLocaleTimeString('en-IN'));
 setLoading(false);
 }, [cell]);

 useEffect(() => {
 // Load immediately on mount
 reload();
 const timer = setInterval(reload, 30_000);
 window.addEventListener('rly_cells_changed', reload);
 const onStorage = (e: StorageEvent) => {
 if (!e.key) return;
 if (e.key === 'rly_collab_registry' || e.key.startsWith('workspace_v2_')) reload();
 };
 window.addEventListener('storage', onStorage);
 return () => {
 clearInterval(timer);
 window.removeEventListener('rly_cells_changed', reload);
 window.removeEventListener('storage', onStorage);
 };
 }, [reload]);

 // Nothing shared — hide completely
 if (!loading && entries.length === 0) return null;

 const validEntries = entries.filter(e => e.table !== null);
 const errorEntries = entries.filter(e => e.table === null);

 return (
 <div className="rounded-2xl border border-purple-200 bg-white overflow-hidden shadow-elevation-sm">
 {/* Header */}
 <button
 onClick={() => setExpanded(v => !v)}
 className="w-full flex items-center justify-between px-5 py-4 hover:bg-purple-50/50 transition-colors"
 >
 <div className="flex items-center gap-3">
 <div className="w-9 h-9 rounded-xl bg-purple-100 border border-purple-200 flex items-center justify-center">
 <Share2 size={16} className="text-purple-600"/>
 </div>
 <div className="text-left">
 <p className="font-bold text-slate-900 text-sm">Shared With Me</p>
 <p className="text-xs text-slate-400">
 {loading
 ? 'Checking for shared tables…'
 : `${validEntries.length} table${validEntries.length !== 1 ? 's' : ''} from other cells${errorEntries.length > 0 ? ` · ${errorEntries.length} unavailable` : ''}`
 }
 {lastSynced && (
 <span className="ml-2 inline-flex items-center gap-1 text-[10px] text-slate-300">
 <Clock size={8}/>{lastSynced}
 </span>
 )}
 </p>
 </div>
 </div>
 <div className="flex items-center gap-1.5">
 <button
 onClick={e => { e.stopPropagation(); reload(); }}
 title="Refresh now"
 className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
 >
 <RefreshCw size={13}/>
 </button>
 {expanded ? <ChevronUp size={15} className="text-slate-400"/> : <ChevronDown size={15} className="text-slate-400"/>}
 </div>
 </button>

 {expanded && (
 <div className="border-t border-purple-100 p-5 space-y-7">
 {/* Valid shared tables */}
 {validEntries.map(({ share, table }) => (
 <SharedTableCard key={share.id} share={share} table={table!} userId={user?.id} userName={user?.name}/>
 ))}

 {/* Error / unavailable */}
 {errorEntries.length > 0 && (
 <div className="space-y-2 pt-2 border-t border-purple-100">
 <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
 Unavailable ({errorEntries.length})
 </p>
 {errorEntries.map(({ share, errorMsg }) => (
 <div key={share.id} className="flex items-start gap-3 px-4 py-3 rounded-xl bg-amber-50 border border-amber-200">
 <AlertCircle size={14} className="text-amber-500 shrink-0 mt-0.5"/>
 <div className="min-w-0">
 <p className="text-xs font-medium text-slate-700">
 From {share.ownerCell} — unavailable
 </p>
 <p className="text-[10px] text-slate-400 mt-0.5">{errorMsg}</p>
 <button onClick={reload} className="text-[10px] text-blue-500 hover:text-blue-700 mt-1 flex items-center gap-1">
 <RefreshCw size={9}/> Try again
 </button>
 </div>
 </div>
 ))}
 </div>
 )}

 {loading && (
 <div className="flex items-center gap-2 text-sm text-slate-400">
 <RefreshCw size={13} className="animate-spin"/> Loading shared tables…
 </div>
 )}
 </div>
 )}
 </div>
 );
}
