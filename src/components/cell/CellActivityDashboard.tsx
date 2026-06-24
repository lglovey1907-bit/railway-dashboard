'use client';
import { useState, useEffect } from 'react';
import {
 LayoutGrid, Database, Share2, Users, Clock, TrendingUp,
 Activity, Globe, Lock, AlertCircle, RefreshCw,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { getActivityLog, getShares, getSharesForCell, humanReadableAction, getAllActiveCellNames } from '@/lib/cellData/collaboration';
import type { ActivityEntry } from '@/lib/cellData/collaboration';

function timeAgo(iso: string): string {
 const diff = Date.now() - new Date(iso).getTime();
 const m = Math.floor(diff / 60000);
 if (m < 1) return 'just now';
 if (m < 60) return `${m}m ago`;
 const h = Math.floor(m / 60);
 if (h < 24) return `${h}h ago`;
 return new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
}

function KpiCard({ icon: Icon, label, value, sub, color }: {
 icon: React.ElementType; label: string; value: string | number; sub?: string; color: string;
}) {
 return (
 <div className="rounded-2xl bg-white border border-slate-200 p-4 shadow-elevation-sm relative overflow-hidden">
 <div className={cn('absolute top-0 left-0 right-0 h-0.5', color)}/>
 <div className="flex items-start justify-between mb-2">
 <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center', color.replace('bg-', 'bg-').replace('-500', '-100') + ' ')}>
 <Icon size={16} className={color.replace('bg-', 'text-').replace('-500', '-600') + ' dark:' + color.replace('bg-', 'text-').replace('-500', '-400')}/>
 </div>
 </div>
 <p className="text-2xl font-bold text-slate-900 tracking-tight">{value}</p>
 <p className="text-xs font-medium text-slate-500 mt-0.5">{label}</p>
 {sub && <p className="text-[10px] text-slate-400 mt-1">{sub}</p>}
 </div>
 );
}

function ActivityFeedEntry({ entry }: { entry: ActivityEntry }) {
 const ACTION_DOT: Record<string, string> = {
 record_created: 'bg-emerald-500',
 record_edited: 'bg-blue-500',
 record_deleted: 'bg-red-500',
 column_added: 'bg-violet-500',
 table_created: 'bg-indigo-500',
 collaborator_added: 'bg-purple-500',
 sheet_synced: 'bg-emerald-500',
 };
 const dotColor = ACTION_DOT[entry.action] ?? 'bg-slate-400';

 return (
 <div className="flex items-start gap-3 py-2.5 border-b border-slate-50 last:border-0">
 <div className={cn('w-2 h-2 rounded-full mt-1.5 shrink-0', dotColor)}/>
 <div className="flex-1 min-w-0">
 <p className="text-xs text-slate-700">
 <span className="font-semibold text-slate-900">{entry.userName}</span>
 {' '}{humanReadableAction(entry.action)}
 {entry.tableName && <span className="text-slate-500"> in <em>{entry.tableName}</em></span>}
 {entry.detail && <span className="text-slate-400"> — {entry.detail}</span>}
 </p>
 <p className="text-[10px] text-slate-400 mt-0.5">{timeAgo(entry.timestamp)} · {entry.cell}</p>
 </div>
 </div>
 );
}

export function CellActivityDashboard({ cell }: { cell: string }) {
 const [activity, setActivity] = useState<ActivityEntry[]>([]);
 const [allActivity, setAllActivity] = useState<ActivityEntry[]>([]);
 const [sharedIn, setSharedIn] = useState(0);
 const [sharedOut, setSharedOut] = useState(0);
 const [refreshKey, setRefreshKey] = useState(0);

 useEffect(() => {
 const mine = getActivityLog(cell);
 setActivity(mine);
 const allShares = getShares();
 setSharedIn(allShares.filter(s => s.sharedWithCell === cell && !s.revokedAt).length);
 setSharedOut(allShares.filter(s => s.ownerCell === cell && !s.revokedAt).length);
 // Collect activity across all cells (for cross-cell monitoring)
 const crossCell: ActivityEntry[] = [];
 getAllActiveCellNames().forEach(c => {
 if (c === cell) return;
 const shared = getShares().filter(s => s.ownerCell === cell && s.sharedWithCell === c && !s.revokedAt);
 if (shared.length) {
 const cellActs = getActivityLog(c);
 crossCell.push(...cellActs.filter(a => shared.some(s => s.tableId === a.tableId)));
 }
 });
 setAllActivity([...mine, ...crossCell].sort((a, b) => b.timestamp.localeCompare(a.timestamp)).slice(0, 50));
 }, [cell, refreshKey]);

 const today = new Date().toDateString();
 const todayCount = allActivity.filter(e => new Date(e.timestamp).toDateString() === today).length;
 const activeUsers = new Set(allActivity.filter(e => Date.now() - new Date(e.timestamp).getTime() < 7 * 86400000).map(e => e.userId)).size;
 const recentTables = Array.from(new Set(activity.filter(e => e.tableId).map(e => e.tableId!))).slice(0, 5);

 return (
 <div className="space-y-6">
 {/* KPI strip */}
 <div className="flex items-center justify-between">
 <h2 className="text-base font-bold text-slate-900">Activity Dashboard</h2>
 <button onClick={() => setRefreshKey(k => k + 1)} className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-700 transition-colors">
 <RefreshCw size={12}/> Refresh
 </button>
 </div>

 <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
 <KpiCard icon={Database} label="Activity Entries"value={activity.length} sub={`${todayCount} today`} color="bg-indigo-500"/>
 <KpiCard icon={Globe} label="Tables Shared Out"value={sharedOut} sub="to other cells"color="bg-purple-500"/>
 <KpiCard icon={Share2} label="Tables Shared In"value={sharedIn} sub="from other cells"color="bg-blue-500"/>
 <KpiCard icon={Users} label="Active Users"value={activeUsers} sub="last 7 days"color="bg-emerald-500"/>
 </div>

 {/* Two-column layout: recent activity + shared tables */}
 <div className="grid lg:grid-cols-2 gap-4">
 {/* Activity feed */}
 <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-elevation-sm">
 <div className="flex items-center gap-2 px-4 py-3 border-b border-slate-100">
 <Activity size={14} className="text-indigo-500"/>
 <p className="font-semibold text-slate-800 text-sm">Recent Activity</p>
 <span className="text-[10px] bg-slate-100 text-slate-500 rounded-full px-2 py-0.5 ml-auto">{allActivity.length} entries</span>
 </div>
 <div className="px-4 py-2 max-h-80 overflow-y-auto">
 {allActivity.length === 0 ? (
 <p className="text-xs text-slate-400 text-center py-8">No activity recorded yet. Actions on tables will appear here.</p>
 ) : (
 allActivity.slice(0, 20).map(entry => <ActivityFeedEntry key={entry.id} entry={entry}/>)
 )}
 </div>
 </div>

 {/* Sharing overview */}
 <div className="space-y-4">
 {/* Tables shared out */}
 <div className="rounded-2xl border border-slate-200 bg-white shadow-elevation-sm">
 <div className="flex items-center gap-2 px-4 py-3 border-b border-slate-100">
 <Globe size={14} className="text-purple-500"/>
 <p className="font-semibold text-slate-800 text-sm">Tables You've Shared</p>
 </div>
 <div className="px-4 py-3">
 {(() => {
 const shared = getShares().filter(s => s.ownerCell === cell && !s.revokedAt);
 if (!shared.length) return <p className="text-xs text-slate-400 text-center py-4">No tables shared with other cells yet</p>;
 const byTable: Record<string, typeof shared> = {};
 shared.forEach(s => { if (!byTable[s.tableId]) byTable[s.tableId] = []; byTable[s.tableId].push(s); });
 return Object.entries(byTable).map(([tid, shares]) => (
 <div key={tid} className="flex items-center justify-between py-2 border-b border-slate-50 last:border-0">
 <div>
 <p className="text-xs font-medium text-slate-700">Table {tid.slice(1, 7)}…</p>
 <p className="text-[10px] text-slate-400">{shares.map(s => s.sharedWithCell).join(', ')}</p>
 </div>
 <span className="text-[10px] bg-purple-100 text-purple-700 rounded-full px-2 py-0.5">{shares.length} cell{shares.length!==1?'s':''}</span>
 </div>
 ));
 })()}
 </div>
 </div>

 {/* Tables shared with you */}
 <div className="rounded-2xl border border-slate-200 bg-white shadow-elevation-sm">
 <div className="flex items-center gap-2 px-4 py-3 border-b border-slate-100">
 <Share2 size={14} className="text-blue-500"/>
 <p className="font-semibold text-slate-800 text-sm">Shared With You</p>
 </div>
 <div className="px-4 py-3">
 {(() => {
 const shared = getShares().filter(s => s.sharedWithCell === cell && !s.revokedAt);
 if (!shared.length) return <p className="text-xs text-slate-400 text-center py-4">No tables shared with your cell yet</p>;
 return shared.map(s => (
 <div key={s.id} className="flex items-center justify-between py-2 border-b border-slate-50 last:border-0">
 <div>
 <p className="text-xs font-medium text-slate-700">From: {s.ownerCell}</p>
 <p className="text-[10px] text-slate-400">Since {new Date(s.grantedAt).toLocaleDateString()}</p>
 </div>
 <span className={cn('text-[10px] rounded-full px-2 py-0.5', {
 view: 'bg-slate-100 text-slate-500 ',
 comment: 'bg-blue-100 text-blue-700 ',
 edit: 'bg-emerald-100 text-emerald-700 ',
 manage: 'bg-purple-100 text-purple-700 ',
 }[s.permission])}>{s.permission}</span>
 </div>
 ));
 })()}
 </div>
 </div>
 </div>
 </div>
 </div>
 );
}
