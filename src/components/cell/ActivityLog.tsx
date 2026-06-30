'use client';
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { createPortal } from 'react-dom';
import {
 History, RotateCcw, Clock, User, ChevronDown, ChevronRight,
 X, AlertCircle, Check, GitBranch,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
 getTableActivity, getVersions, saveVersion, type ActivityEntry, type TableVersion,
 humanReadableAction,
} from '@/lib/cellData/collaboration';
import type { TableDef } from '@/lib/cellData/types';

function Portal({ children }: { children: React.ReactNode }) {
 const [m, setM] = useState(false);
 useEffect(() => { setM(true); }, []);
 if (!m) return null;
 return createPortal(children, document.body);
}

function timeAgo(iso: string): string {
 const diff = Date.now() - new Date(iso).getTime();
 const m = Math.floor(diff / 60000);
 if (m < 1) return 'just now';
 if (m < 60) return `${m}m ago`;
 const h = Math.floor(m / 60);
 if (h < 24) return `${h}h ago`;
 return new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

function exactTime(iso: string): string {
 return new Date(iso).toLocaleString('en-IN', {
 day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
 });
}

const ACTION_COLORS: Record<string, string> = {
 record_created: 'bg-emerald-100 text-emerald-700 ',
 record_edited: 'bg-blue-100 text-blue-700 ',
 record_deleted: 'bg-red-100 text-red-700 ',
 column_added: 'bg-violet-100 text-violet-700 ',
 column_deleted: 'bg-red-100 text-red-700 ',
 table_locked: 'bg-amber-100 text-amber-700 ',
 sheet_synced: 'bg-emerald-100 text-emerald-700 ',
 collaborator_added: 'bg-purple-100 text-purple-700 ',
 version_restored: 'bg-indigo-100 text-indigo-700 ',
};

export function ActivityLogModal({
 table, cell, userId, userName, canManage, onRestoreVersion, onClose,
}: {
 table: TableDef; cell: string; userId?: string; userName?: string;
 canManage: boolean; onRestoreVersion?: (snapshot: string) => void; onClose: () => void;
}) {
 const [tab, setTab] = useState<'activity' | 'versions'>('activity');
 const [activity, setActivity] = useState<ActivityEntry[]>([]);
 const [versions, setVersions] = useState<TableVersion[]>([]);
 const [expandEntry, setExpandEntry] = useState<string | null>(null);
 const [confirmRestore, setConfirmRestore] = useState<TableVersion | null>(null);
 const [saving, setSaving] = useState(false);

 useEffect(() => {
 setActivity(getTableActivity(cell, table.id));
 setVersions(getVersions(table.id));
 }, [cell, table.id]);

 const handleSaveVersion = () => {
 if (!userId || !userName) return;
 setSaving(true);
 saveVersion(table.id, table, userId, userName, 'Manual save');
 setVersions(getVersions(table.id));
 setSaving(false);
 };

 return (
 <Portal>
 <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
 className="fixed inset-0 z-[2100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
 onClick={onClose}>
 <motion.div initial={{ scale: 0.96, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.96, opacity: 0 }}
 className="bg-white border border-slate-200 rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden"
 onClick={e => e.stopPropagation()}>

 {/* Header */}
 <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
 <div className="flex items-center gap-3">
 <div className="w-9 h-9 rounded-xl bg-indigo-100 border border-indigo-200 flex items-center justify-center">
 <History size={16} className="text-indigo-600"/>
 </div>
 <div>
 <h3 className="font-bold text-slate-900 text-sm">History — {table.name}</h3>
 <p className="text-xs text-slate-400">{activity.length} activities · {versions.length} saved version{versions.length!==1?'s':''}</p>
 </div>
 </div>
 <button onClick={onClose}><X size={16} className="text-slate-400 hover:text-slate-600"/></button>
 </div>

 {/* Tabs */}
 <div className="flex border-b border-slate-100">
 {(['activity', 'versions'] as const).map(t => (
 <button key={t} onClick={() => setTab(t)}
 className={cn('flex-1 py-3 text-xs font-medium capitalize transition-colors',
 tab === t ? 'text-indigo-600 border-b-2 border-indigo-500' : 'text-slate-500 hover:text-slate-800 ')}>
 {t === 'activity' ? `Activity Log (${activity.length})` : `Version History (${versions.length})`}
 </button>
 ))}
 </div>

 <div className="max-h-[480px] overflow-y-auto">
 {tab === 'activity' ? (
 <div>
 {activity.length === 0 ? (
 <div className="text-center py-12">
 <History size={28} className="text-slate-200 mx-auto mb-2"/>
 <p className="text-sm text-slate-400">No activity recorded yet</p>
 <p className="text-xs text-slate-300 mt-1">Actions on this table will appear here</p>
 </div>
 ) : (
 <div className="divide-y divide-slate-50">
 {activity.map(entry => {
 const colorClass = ACTION_COLORS[entry.action] ?? 'bg-slate-100 text-slate-500 ';
 const isExpanded = expandEntry === entry.id;
 return (
 <button key={entry.id} onClick={() => setExpandEntry(e => e === entry.id ? null : entry.id)}
 className="w-full flex items-start gap-3 px-5 py-3 hover:bg-slate-50 transition-colors text-left">
 <div className={cn('text-[9px] font-bold rounded-full px-2 py-1 mt-0.5 shrink-0 uppercase tracking-wider', colorClass)}>
 {entry.action.split('_')[0]}
 </div>
 <div className="flex-1 min-w-0">
 <div className="flex items-center gap-2">
 <p className="text-xs text-slate-800 font-medium truncate">
 <span className="text-slate-500">{entry.userName}</span>{' '}
 {humanReadableAction(entry.action)}
 {entry.detail ? ` — ${entry.detail}` : ''}
 </p>
 </div>
 <p className="text-[10px] text-slate-400 mt-0.5">{exactTime(entry.timestamp)}</p>
 </div>
 <div className="shrink-0 text-slate-300 mt-1">
 {isExpanded ? <ChevronDown size={13}/> : <ChevronRight size={13}/>}
 </div>
 </button>
 );
 })}
 </div>
 )}
 </div>
 ) : (
 <div className="p-5">
 {canManage && (
 <button onClick={handleSaveVersion} disabled={saving}
 className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-dashed border-indigo-300 text-sm text-indigo-600 hover:bg-indigo-50 transition-colors mb-4 disabled:opacity-40">
 <GitBranch size={14}/> Save Current Version
 </button>
 )}

 {versions.length === 0 ? (
 <div className="text-center py-8">
 <GitBranch size={28} className="text-slate-200 mx-auto mb-2"/>
 <p className="text-sm text-slate-400">No saved versions yet</p>
 <p className="text-xs text-slate-300 mt-1">Save a version to create a restore point</p>
 </div>
 ) : (
 <div className="space-y-2">
 {versions.map((v, i) => (
 <div key={v.id} className="flex items-center justify-between p-3.5 rounded-xl border border-slate-200 bg-slate-50 hover:border-indigo-300 transition-colors">
 <div className="flex items-center gap-3">
 <div className="w-9 h-9 rounded-xl bg-indigo-100 flex items-center justify-center shrink-0">
 <span className="text-[11px] font-bold text-indigo-600">{v.versionLabel}</span>
 </div>
 <div>
 <p className="text-xs font-semibold text-slate-800">{v.versionLabel} {i === 0 && <span className="text-[9px] bg-emerald-100 text-emerald-700 rounded-full px-1.5 py-0.5 ml-1">Latest</span>}</p>
 <p className="text-[10px] text-slate-400">{exactTime(v.savedAt)} by {v.savedByName}</p>
 {v.description && <p className="text-[10px] text-slate-400 mt-0.5">{v.description}</p>}
 </div>
 </div>
 {canManage && onRestoreVersion && i > 0 && (
 <button onClick={() => setConfirmRestore(v)}
 className="flex items-center gap-1.5 text-xs text-indigo-600 hover:text-indigo-700 px-3 py-1.5 rounded-lg hover:bg-indigo-100 transition-colors">
 <RotateCcw size={12}/> Restore
 </button>
 )}
 </div>
 ))}
 </div>
 )}
 </div>
 )}
 </div>
 </motion.div>
 </motion.div>

 {/* Confirm restore dialog */}
 <AnimatePresence>
 {confirmRestore && (
 <Portal>
 <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
 className="fixed inset-0 z-[2150] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
 <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }}
 className="bg-white border border-slate-200 rounded-2xl p-6 w-full max-w-sm shadow-2xl">
 <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center mb-4">
 <AlertCircle size={20} className="text-amber-600"/>
 </div>
 <h3 className="font-bold text-slate-900 text-base mb-2">Restore to {confirmRestore.versionLabel}?</h3>
 <p className="text-sm text-slate-500 mb-6">
 This will replace the current table data with the version saved on {exactTime(confirmRestore.savedAt)}.
 A new version of the current state will be saved first so you can undo if needed.
 </p>
 <div className="flex gap-2 justify-end">
 <button onClick={() => setConfirmRestore(null)} className="px-4 py-2 text-sm text-slate-500 hover:bg-slate-100 rounded-xl">Cancel</button>
 <button onClick={() => {
 if (confirmRestore && onRestoreVersion && userId && userName) {
 saveVersion(table.id, table, userId, userName, 'Auto-save before restore');
 onRestoreVersion(confirmRestore.snapshot);
 }
 setConfirmRestore(null);
 onClose();
 }} className="px-4 py-2 text-sm bg-amber-600 text-white hover:bg-amber-700 rounded-xl">
 Restore
 </button>
 </div>
 </motion.div>
 </motion.div>
 </Portal>
 )}
 </AnimatePresence>
 </Portal>
 );
}

// ── Compact last-edited badge shown on table header ───────────────────────────
export function LastEditedBadge({ tableId, cell }: { tableId: string; cell: string }) {
 const [lastEntry, setLastEntry] = useState<ActivityEntry | null>(null);

 useEffect(() => {
 const entries = getTableActivity(cell, tableId);
 setLastEntry(entries[0] ?? null);
 }, [tableId, cell]);

 if (!lastEntry) return null;

 return (
 <div className="flex items-center gap-1.5 text-[10px] text-slate-400">
 <Clock size={9}/>
 <span>Last edit: <strong className="text-slate-500">{lastEntry.userName}</strong> · {timeAgo(lastEntry.timestamp)}</span>
 </div>
 );
}

// ── Row-level audit chip ───────────────────────────────────────────────────────
export function RowAuditChip({ meta }: { meta: { lastModifiedByName?: string; lastModifiedAt?: string; createdByName?: string; createdAt?: string } | null }) {
 if (!meta) return null;
 const by = meta.lastModifiedByName ?? meta.createdByName;
 const at = meta.lastModifiedAt ?? meta.createdAt;
 if (!by || !at) return null;
 return (
 <span className="text-[9px] text-slate-300 flex items-center gap-1">
 <User size={8}/>{by} · {timeAgo(at)}
 </span>
 );
}
