'use client';
import { useState, useEffect, useCallback } from 'react';
import { getStaffForCell, getCellStaffStats, STAFF_CHANGED_EVENT, type MasterStaffRecord } from '@/lib/staff/masterStaff';
import {
 Users, Mail, Phone, Calendar, ClipboardList,
 ChevronDown, ChevronUp, CheckCircle2, Clock, UserMinus,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const ROLE_BADGE: Record<string, string> = {
 CMI: 'bg-indigo-500/15 text-indigo-700 border-indigo-500/25',
 COS: 'bg-violet-500/15 text-violet-700 border-violet-500/25',
 OS: 'bg-teal-500/15 text-teal-700 border-teal-500/25',
 Dealer: 'bg-amber-500/15 text-amber-700 border-amber-500/25',
 Peon: 'bg-slate-500/15 text-slate-600 border-slate-500/25',
};

function fmtDate(d?: string) {
 if (!d) return '—';
 return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

function StatPill({ icon: Icon, label, value, cls }: {
 icon: React.ElementType; label: string; value: number; cls: string;
}) {
 return (
 <div className={cn('flex items-center gap-1.5 rounded-xl px-3 py-1.5 border text-xs font-semibold', cls)}>
 <Icon size={11}/>
 <span>{value}</span>
 <span className="font-normal opacity-70">{label}</span>
 </div>
 );
}

export function CellStaffRoster({ cell }: { cell: string }) {
 const [staff, setStaff] = useState<MasterStaffRecord[]>([]);
 const [stats, setStats] = useState({ total: 0, active: 0, pending: 0, inactive: 0 });
 const [expanded, setExpanded] = useState(true);

 const reload = useCallback(() => {
 setStaff(getStaffForCell(cell));
 setStats(getCellStaffStats(cell));
 }, [cell]);

 useEffect(() => {
 reload();
 // React to deactivate/restore actions anywhere in the app
 window.addEventListener(STAFF_CHANGED_EVENT, reload);
 const onStorage = (e: StorageEvent) => {
 if (e.key === 'rly_user_status_overrides' || e.key === 'rly_staff_master') reload();
 };
 window.addEventListener('storage', onStorage);
 return () => {
 window.removeEventListener(STAFF_CHANGED_EVENT, reload);
 window.removeEventListener('storage', onStorage);
 };
 }, [reload]);

 if (staff.length === 0 && stats.total === 0) return null;

 const roleCounts = staff.reduce<Record<string, number>>((acc, u) => {
 const k = u.workingAs ?? 'Other';
 acc[k] = (acc[k] ?? 0) + 1;
 return acc;
 }, {});

 return (
 <div className="rounded-2xl border border-slate-900/8 bg-white overflow-hidden mb-5 shadow-elevation-sm">
 {/* Header */}
 <button onClick={() => setExpanded(e => !e)}
 className="w-full flex items-center justify-between px-5 py-4 hover:bg-slate-50 transition-colors">
 <div className="flex items-center gap-3">
 <div className="w-9 h-9 rounded-xl bg-blue-500/15 border border-blue-500/30 flex items-center justify-center">
 <Users size={16} className="text-blue-600"/>
 </div>
 <div className="text-left">
 <p className="text-slate-900 font-bold text-sm">Cell Staff</p>
 <p className="text-slate-400 text-xs">
 {stats.active} active · {stats.pending > 0 ? `${stats.pending} pending · ` : ''}{cell}
 </p>
 </div>
 </div>

 <div className="flex items-center gap-2 flex-wrap">
 {/* Req 68 — Staff summary stats */}
 <StatPill icon={CheckCircle2} label="Active"value={stats.active}
 cls="bg-emerald-50 text-emerald-700 border-emerald-200"/>
 {stats.pending > 0 && (
 <StatPill icon={Clock} label="Pending"value={stats.pending}
 cls="bg-amber-50 text-amber-700 border-amber-200"/>
 )}
 {Object.entries(roleCounts).map(([role, n]) => (
 <span key={role} className={cn('text-[9px] font-bold px-2 py-1 rounded-full border hidden sm:inline-flex', ROLE_BADGE[role] ?? ROLE_BADGE.Peon)}>
 {role} · {n}
 </span>
 ))}
 {expanded ? <ChevronUp size={15} className="text-slate-400 ml-1"/> : <ChevronDown size={15} className="text-slate-400 ml-1"/>}
 </div>
 </button>

 {/* Staff cards */}
 {expanded && (
 <div className="px-5 pb-5 grid grid-cols-1 lg:grid-cols-2 gap-3 border-t border-slate-100 pt-4">
 {staff.length === 0 ? (
 <div className="col-span-2 text-center py-8">
 <UserMinus size={24} className="text-slate-200 mx-auto mb-2"/>
 <p className="text-sm text-slate-400">No active staff in {cell}</p>
 <p className="text-xs text-slate-300 mt-1">
 Staff will appear here automatically when they are assigned to this cell.
 </p>
 </div>
 ) : staff.map(u => {
 const initials = u.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
 const roleCls = ROLE_BADGE[u.workingAs ?? ''] ?? ROLE_BADGE.Peon;
 const isPending = u.status === 'pending';
 return (
 <div key={u.id}
 className={cn('rounded-xl border p-3.5 hover:bg-slate-50/50 transition-colors',
 isPending
 ? 'border-amber-200 bg-amber-50/30 '
 : 'border-slate-100 bg-slate-50/30 ')}>
 <div className="flex items-start gap-3">
 <div className="w-10 h-10 rounded-xl bg-blue-600/15 border border-blue-500/25 flex items-center justify-center text-xs font-bold text-blue-700 shrink-0">
 {initials}
 </div>
 <div className="flex-1 min-w-0">
 <div className="flex items-center justify-between gap-2 flex-wrap mb-1">
 <p className="text-slate-900 text-sm font-semibold truncate">{u.name}</p>
 <div className="flex items-center gap-1 shrink-0">
 {isPending && <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full border bg-amber-100 text-amber-700 border-amber-300">Pending</span>}
 <span className={cn('text-[9px] font-bold px-1.5 py-0.5 rounded-full border', roleCls)}>
 {u.workingAs ?? '—'}
 </span>
 </div>
 </div>

 <div className="grid grid-cols-2 gap-x-3 gap-y-1 mt-2">
 {u.fatherHusbandName && (
 <div>
 <p className="text-[9px] uppercase tracking-wider text-slate-400">Father's/Husband's Name</p>
 <p className="text-xs text-slate-600">{u.fatherHusbandName}</p>
 </div>
 )}
 <div>
 <p className="text-[9px] uppercase tracking-wider text-slate-400">Designation</p>
 <p className="text-xs text-slate-600">{u.designation}</p>
 </div>
 {u.hrmsId && (
 <div>
 <p className="text-[9px] uppercase tracking-wider text-slate-400">HRMS ID</p>
 <p className="text-xs text-slate-600 font-mono">{u.hrmsId}</p>
 </div>
 )}
 {u.datePostingInCell && (
 <div>
 <p className="text-[9px] uppercase tracking-wider text-slate-400 flex items-center gap-1">
 <Calendar size={8}/> Posting Date
 </p>
 <p className="text-xs text-slate-600">{fmtDate(u.datePostingInCell)}</p>
 </div>
 )}
 </div>

 {u.listOfWorkAssigned && (
 <div className="mt-2 pt-2 border-t border-slate-100">
 <p className="text-[9px] uppercase tracking-wider text-slate-400 flex items-center gap-1 mb-0.5">
 <ClipboardList size={8}/> Work Assigned
 </p>
 <p className="text-[11px] text-slate-500 leading-snug">{u.listOfWorkAssigned}</p>
 </div>
 )}

 <div className="flex items-center gap-3 mt-2 pt-2 border-t border-slate-100">
 <span className="text-[10px] text-slate-400 flex items-center gap-1 truncate">
 <Mail size={9}/> {u.email}
 </span>
 {u.mobile && (
 <span className="text-[10px] text-slate-400 flex items-center gap-1 shrink-0">
 <Phone size={9}/> {u.mobile}
 </span>
 )}
 </div>
 </div>
 </div>
 </div>
 );
 })}
 </div>
 )}
 </div>
 );
}
