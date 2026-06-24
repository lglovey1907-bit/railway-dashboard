'use client';
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { createPortal } from 'react-dom';
import {
 Share2, Users, Lock, Unlock, X, Check, AlertCircle, RefreshCw,
 Globe, Eye, MessageSquare, Edit3, Settings2, UserMinus, Plus, Shield,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
 shareTable, revokeShare, getSharesForTable, getCellPermissionForTable,
 logActivity, type CellShare, type SharePermission,
 PERMISSION_LABELS, PERMISSION_DESCRIPTIONS, getAllActiveCellNames,
} from '@/lib/cellData/collaboration';
import type { TableDef } from '@/lib/cellData/types';

function Portal({ children }: { children: React.ReactNode }) {
 const [m, setM] = useState(false);
 useEffect(() => { setM(true); }, []);
 if (!m) return null;
 return createPortal(children, document.body);
}

const PERM_ICONS: Record<SharePermission, React.ElementType> = {
 view: Eye, comment: MessageSquare, edit: Edit3, manage: Settings2,
};
const PERM_COLORS: Record<SharePermission, string> = {
 view: 'bg-slate-100 text-slate-500 border-slate-200 ',
 comment: 'bg-blue-50 text-blue-600 border-blue-200 ',
 edit: 'bg-emerald-50 text-emerald-700 border-emerald-200 ',
 manage: 'bg-purple-50 text-purple-700 border-purple-200 ',
};

export function CollaborationPanel({
 table, cell, userId, userName, canManage, onLockToggle, onClose,
}: {
 table: TableDef; cell: string; userId?: string; userName?: string;
 canManage: boolean; onLockToggle?: () => void; onClose: () => void;
}) {
 const [shares, setShares] = useState<CellShare[]>([]);
 const [selectedCell, setSelectedCell] = useState('');
 const [selectedPerm, setSelectedPerm] = useState<SharePermission>('view');
 const [saving, setSaving] = useState(false);
 const [tab, setTab] = useState<'share' | 'access'>('share');
 const [allCellNames, setAllCellNames] = useState<string[]>([]);

 useEffect(() => {
 setShares(getSharesForTable(table.id));
 // Load dynamic cell list from registry (includes admin-created cells)
 setAllCellNames(getAllActiveCellNames());
 // Re-read if registry changes in same tab
 const handler = () => setAllCellNames(getAllActiveCellNames());
 window.addEventListener('rly_cells_changed', handler);
 const storageHandler = (e: StorageEvent) => {
 if (e.key === 'rly_cell_registry') setAllCellNames(getAllActiveCellNames());
 };
 window.addEventListener('storage', storageHandler);
 return () => {
 window.removeEventListener('rly_cells_changed', handler);
 window.removeEventListener('storage', storageHandler);
 };
 }, [table.id]);

 const refresh = () => setShares(getSharesForTable(table.id));

 /** Broadcast to all open tabs/panels so SharedTablesView updates immediately (req 61) */
 const notifyShareChange = () => {
 window.dispatchEvent(new CustomEvent('rly_cells_changed'));
 };

 const addShare = () => {
 if (!selectedCell) return;
 setSaving(true);
 const grantedBy = userId ?? 'system';
 shareTable(table.id, cell, selectedCell, selectedPerm, grantedBy);
 logActivity(cell, {
 action: 'collaborator_added',
 tableId: table.id,
 tableName: table.name,
 userId: grantedBy,
 userName: userName ?? grantedBy,
 detail: `Shared with ${selectedCell} (${PERMISSION_LABELS[selectedPerm]})`,
 });
 notifyShareChange();
 refresh();
 setSaving(false);
 setSelectedCell('');
 };

 const revoke = (shareId: string) => {
 const s = shares.find(x => x.id === shareId);
 revokeShare(shareId);
 if (userId && s) {
 logActivity(cell, {
 action: 'collaborator_removed',
 tableId: table.id,
 tableName: table.name,
 userId,
 userName: userName ?? userId,
 detail: `Removed access for ${s.sharedWithCell}`,
 });
 }
 notifyShareChange();
 refresh();
 };

 const otherCells = allCellNames.filter(c => c !== cell && !shares.some(s => s.sharedWithCell === c));

 return (
 <Portal>
 <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
 className="fixed inset-0 z-[300] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
 onClick={onClose}>
 <motion.div initial={{ scale: 0.96, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.96, opacity: 0 }}
 className="bg-white border border-slate-200 rounded-2xl w-full max-w-xl shadow-2xl overflow-hidden"
 onClick={e => e.stopPropagation()}>

 {/* Header */}
 <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
 <div className="flex items-center gap-3">
 <div className="w-9 h-9 rounded-xl bg-purple-100 border border-purple-200 flex items-center justify-center">
 <Share2 size={16} className="text-purple-600"/>
 </div>
 <div>
 <h3 className="font-bold text-slate-900 text-sm">{table.name}</h3>
 <p className="text-xs text-slate-400">Owned by {cell} · {shares.length} active share{shares.length!==1?'s':''}</p>
 </div>
 </div>
 <div className="flex items-center gap-2">
 {canManage && onLockToggle && (
 <button onClick={onLockToggle}
 className={cn('flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium border transition-all',
 table.locked ? 'bg-amber-50 text-amber-700 border-amber-200 ' : 'bg-slate-100 text-slate-500 border-slate-200 hover:border-amber-300 ')}>
 {table.locked ? <><Unlock size={12}/> Unlock</> : <><Lock size={12}/> Lock</>}
 </button>
 )}
 <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X size={16}/></button>
 </div>
 </div>

 {/* Tabs */}
 <div className="flex border-b border-slate-100">
 {(['share', 'access'] as const).map(t => (
 <button key={t} onClick={() => setTab(t)}
 className={cn('flex-1 py-3 text-xs font-medium capitalize transition-colors',
 tab === t ? 'text-purple-600 border-b-2 border-purple-500' : 'text-slate-500 hover:text-slate-800 ')}>
 {t === 'share' ? 'Share with Cell' : 'Current Access'}
 </button>
 ))}
 </div>

 <div className="p-5 max-h-[440px] overflow-y-auto">
 {tab === 'share' ? (
 <div className="space-y-5">
 {table.locked && (
 <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2.5">
 <Lock size={14} className="text-amber-600 shrink-0"/>
 <p className="text-xs text-amber-700">This table is locked. Unlock it before changing sharing settings.</p>
 </div>
 )}
 {!canManage && (
 <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5">
 <Shield size={14} className="text-slate-400 shrink-0"/>
 <p className="text-xs text-slate-500">Only the Head of Cell (CMI/COS) or Maintenance/Admin can share this table.</p>
 </div>
 )}

 {canManage && !table.locked && (
 <>
 <div>
 <label className="text-xs font-semibold text-slate-600 block mb-2">Select Cell</label>
 <select value={selectedCell} onChange={e => setSelectedCell(e.target.value)}
 className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2.5 text-sm text-slate-800 focus:outline-none focus:border-purple-400">
 <option value="">— Choose a Cell —</option>
 {otherCells.map(c => <option key={c} value={c}>{c}</option>)}
 </select>
 {otherCells.length === 0 && <p className="text-xs text-slate-400 mt-1.5">All cells already have access to this table.</p>}
 </div>

 <div>
 <label className="text-xs font-semibold text-slate-600 block mb-2">Permission Level</label>
 <div className="grid grid-cols-2 gap-2">
 {(Object.keys(PERMISSION_LABELS) as SharePermission[]).map(p => {
 const Icon = PERM_ICONS[p];
 const active = selectedPerm === p;
 return (
 <button key={p} onClick={() => setSelectedPerm(p)}
 className={cn('flex items-start gap-2 p-3 rounded-xl border transition-all text-left', active ? PERM_COLORS[p] : 'border-slate-200 hover:border-slate-300 ')}>
 <Icon size={13} className="mt-0.5 shrink-0"/>
 <div>
 <p className="text-xs font-semibold">{PERMISSION_LABELS[p]}</p>
 <p className="text-[10px] opacity-70 mt-0.5">{PERMISSION_DESCRIPTIONS[p]}</p>
 </div>
 {active && <Check size={12} className="ml-auto shrink-0"/>}
 </button>
 );
 })}
 </div>
 </div>

 <button onClick={addShare} disabled={!selectedCell || saving}
 className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-purple-600 text-white text-sm font-medium hover:bg-purple-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
 {saving
 ? <><RefreshCw size={14} className="animate-spin"/> Sharing…</>
 : <><Share2 size={14}/> Share Table</>
 }
 </button>
 </>
 )}

 {/* Ownership reminder */}
 <div className="rounded-xl bg-slate-50 border border-slate-200 p-3">
 <p className="text-xs font-semibold text-slate-600 flex items-center gap-1.5 mb-1"><Shield size={12}/> Data Ownership</p>
 <p className="text-[11px] text-slate-400 leading-relaxed">
 <strong className="text-slate-600">{cell}</strong> always remains the owner.
 Shared cells can access data per their permission level but cannot delete this table, transfer ownership, or remove the owner.
 </p>
 </div>
 </div>
 ) : (
 <div className="space-y-2">
 {/* Owner */}
 <div className="flex items-center justify-between p-3 rounded-xl bg-purple-50 border border-purple-200">
 <div className="flex items-center gap-2.5">
 <div className="w-8 h-8 rounded-full bg-purple-200 flex items-center justify-center text-xs font-bold text-purple-700">{cell[0]}</div>
 <div>
 <p className="text-xs font-semibold text-slate-800">{cell}</p>
 <p className="text-[10px] text-slate-400">Owner · Full access</p>
 </div>
 </div>
 <span className="text-[10px] font-semibold bg-purple-100 text-purple-700 border border-purple-200 rounded-full px-2 py-0.5">Owner</span>
 </div>

 {/* Shared cells */}
 {shares.length === 0 ? (
 <p className="text-xs text-slate-400 text-center py-6">Not shared with any other cells yet</p>
 ) : (
 shares.map(share => {
 const Icon = PERM_ICONS[share.permission];
 return (
 <div key={share.id} className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200">
 <div className="flex items-center gap-2.5">
 <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-xs font-bold text-blue-700">{share.sharedWithCell[0]}</div>
 <div>
 <p className="text-xs font-semibold text-slate-800">{share.sharedWithCell}</p>
 <p className="text-[10px] text-slate-400">Since {new Date(share.grantedAt).toLocaleDateString()}</p>
 </div>
 </div>
 <div className="flex items-center gap-2">
 {canManage ? (
 <select value={share.permission}
 onChange={e => {
 const newPerm = e.target.value as SharePermission;
 shareTable(share.tableId, cell, share.sharedWithCell, newPerm, userId ?? '');
 if (userId) logActivity(cell, { action: 'permission_changed', tableId: table.id, tableName: table.name, userId, userName: userName ?? userId, detail: `Permission for ${share.sharedWithCell} → ${PERMISSION_LABELS[newPerm]}` });
 notifyShareChange();
 refresh();
 }}
 className="text-xs bg-white border border-slate-200 rounded-lg px-2 py-1 text-slate-700 focus:outline-none focus:border-purple-400">
 {(Object.keys(PERMISSION_LABELS) as SharePermission[]).map(p => (
 <option key={p} value={p}>{PERMISSION_LABELS[p]}</option>
 ))}
 </select>
 ) : (
 <span className={cn('text-[10px] font-medium border rounded-full px-2 py-0.5 flex items-center gap-1', PERM_COLORS[share.permission])}>
 <Icon size={9}/>{PERMISSION_LABELS[share.permission]}
 </span>
 )}
 {canManage && (
 <button onClick={() => revoke(share.id)} title="Revoke access"
 className="p-1.5 rounded-lg hover:bg-red-100 text-slate-300 hover:text-red-500 transition-colors">
 <UserMinus size={13}/>
 </button>
 )}
 </div>
 </div>
 );
 })
 )}
 </div>
 )}
 </div>
 </motion.div>
 </motion.div>
 </Portal>
 );
}
