'use client';
import { useState, useEffect } from 'react';
import {
 getMembershipsForCell, getStaffById, approveMembership, rejectMembership,
 type CellMembership, type StaffMember,
} from '@/lib/staff/staffDB';
import { useAuthStore } from '@/store/authStore';
import { canManageCellStructure } from '@/lib/cellData/useCellDataStructure';
import {
 UserCheck, UserX, Clock, CheckCircle2, XCircle, AlertTriangle,
 ChevronDown, ChevronUp, Mail, Phone, Briefcase,
} from 'lucide-react';
import { cn } from '@/lib/utils';

function timeAgo(iso: string) {
 const d = Date.now() - new Date(iso).getTime();
 const m = Math.floor(d / 60000);
 if (m < 60) return `${m}m ago`;
 const h = Math.floor(m / 60);
 if (h < 24) return `${h}h ago`;
 return new Date(iso).toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'numeric' });
}

const STATUS_STYLE: Record<string, { cls: string; icon: React.ElementType }> = {
 pending: { cls: 'bg-amber-100 text-amber-700 border-amber-300 ', icon: Clock },
 approved: { cls: 'bg-emerald-100 text-emerald-700 border-emerald-300 ', icon: CheckCircle2 },
 rejected: { cls: 'bg-red-100 text-red-700 border-red-300 ', icon: XCircle },
 suspended: { cls: 'bg-slate-100 text-slate-500 border-slate-300 ', icon: AlertTriangle },
};

function RejectDialog({ onClose, onReject }: { onClose: () => void; onReject: (reason: string) => void }) {
 const [reason, setReason] = useState('');
 return (
 <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"onClick={onClose}>
 <div className="bg-white border border-slate-200 rounded-2xl p-6 w-full max-w-sm shadow-2xl"onClick={e => e.stopPropagation()}>
 <h3 className="font-bold text-slate-900 mb-1">Reject Application</h3>
 <p className="text-xs text-slate-400 mb-3">Provide a reason so the employee can take corrective action.</p>
 <textarea value={reason} onChange={e => setReason(e.target.value)} rows={3}
 placeholder="e.g. Incomplete information, incorrect designation…"
 className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-sm text-slate-800 focus:outline-none focus:border-red-400 resize-none mb-4"/>
 <div className="flex gap-2 justify-end">
 <button onClick={onClose} className="px-4 py-2 text-sm text-slate-500 hover:bg-slate-100 rounded-xl">Cancel</button>
 <button onClick={() => { if (reason.trim()) { onReject(reason); onClose(); } }} disabled={!reason.trim()}
 className="px-4 py-2 text-sm bg-red-600 text-white hover:bg-red-700 rounded-xl disabled:opacity-40">Reject</button>
 </div>
 </div>
 </div>
 );
}

export function ApprovalQueue({ cell }: { cell: string }) {
 const { user } = useAuthStore();
 const canManage = canManageCellStructure(user, cell);
 const [memberships, setMemberships] = useState<CellMembership[]>([]);
 const [staffMap, setStaffMap] = useState<Record<string, StaffMember>>({});
 const [tab, setTab] = useState<'pending' | 'all'>('pending');
 const [expanded, setExpanded] = useState(true);
 const [rejectTarget, setRejectTarget] = useState<string | null>(null);

 const refresh = () => {
 const all = getMembershipsForCell(cell);
 setMemberships(all);
 const map: Record<string, StaffMember> = {};
 all.forEach(m => { const s = getStaffById(m.employeeId); if (s) map[m.employeeId] = s; });
 setStaffMap(map);
 };

 useEffect(() => { refresh(); }, [cell]); // eslint-disable-line

 const pending = memberships.filter(m => m.approvalStatus === 'pending');
 const shown = tab === 'pending' ? pending : memberships;

 if (!canManage) return null; // only cell heads / admin see this

 return (
 <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden mb-5 shadow-elevation-sm">
 <button onClick={() => setExpanded(e => !e)}
 className="w-full flex items-center justify-between px-5 py-4 border-b border-slate-100 hover:bg-slate-50 transition-colors">
 <div className="flex items-center gap-3">
 <div className="w-9 h-9 rounded-xl bg-amber-100 border border-amber-200 flex items-center justify-center">
 <UserCheck size={16} className="text-amber-600"/>
 </div>
 <div className="text-left">
 <p className="font-bold text-slate-900 text-sm">Staff Approval Queue</p>
 <p className="text-xs text-slate-400">
 {pending.length > 0
 ? <span className="text-amber-600 font-semibold">{pending.length} pending approval{pending.length !== 1 ? 's' : ''}</span>
 : 'No pending approvals'}
 {' · '}{memberships.length} total for {cell}
 </p>
 </div>
 </div>
 {expanded ? <ChevronUp size={16} className="text-slate-400"/> : <ChevronDown size={16} className="text-slate-400"/>}
 </button>

 {expanded && (
 <div>
 <div className="flex border-b border-slate-100">
 {(['pending', 'all'] as const).map(t => (
 <button key={t} onClick={() => setTab(t)}
 className={cn('flex-1 py-2.5 text-xs font-medium capitalize transition-colors',
 tab === t ? 'text-blue-600 border-b-2 border-blue-500' : 'text-slate-400 hover:text-slate-600')}>
 {t === 'pending' ? `Pending (${pending.length})` : `All Members (${memberships.length})`}
 </button>
 ))}
 </div>

 {shown.length === 0 ? (
 <div className="px-5 py-8 text-center">
 <CheckCircle2 size={24} className="text-emerald-400 mx-auto mb-2"/>
 <p className="text-sm text-slate-400">
 {tab === 'pending' ? 'No pending approvals' : 'No members yet. They appear here after employees sign up and select this cell.'}
 </p>
 </div>
 ) : (
 <div className="divide-y divide-slate-50">
 {shown.map(m => {
 const staff = staffMap[m.employeeId];
 const ss = STATUS_STYLE[m.approvalStatus] ?? STATUS_STYLE.pending;
 const StatusIcon = ss.icon;
 return (
 <div key={m.id} className="px-5 py-3.5 flex items-start gap-3 hover:bg-slate-50/50 transition-colors">
 <div className="w-9 h-9 rounded-xl bg-blue-100 flex items-center justify-center text-sm font-bold text-blue-700 shrink-0">
 {staff?.name[0] ?? '?'}
 </div>
 <div className="flex-1 min-w-0">
 <div className="flex items-center gap-2 flex-wrap mb-1">
 <p className="text-sm font-semibold text-slate-900">{staff?.name ?? m.employeeId}</p>
 <span className={cn('inline-flex items-center gap-1 text-[9px] font-bold border rounded-full px-2 py-0.5', ss.cls)}>
 <StatusIcon size={8}/> {m.approvalStatus}
 </span>
 </div>
 <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-[10px] text-slate-400">
 {staff?.designation && <span className="flex items-center gap-1"><Briefcase size={9}/>{staff.designation}</span>}
 {staff?.email && <span className="flex items-center gap-1"><Mail size={9}/>{staff.email}</span>}
 {staff?.mobile && <span className="flex items-center gap-1"><Phone size={9}/>{staff.mobile}</span>}
 <span>Applied {timeAgo(m.appliedAt)}</span>
 {m.approvedByName && <span>· {m.approvalStatus === 'approved' ? 'Approved' : 'Reviewed'} by {m.approvedByName}</span>}
 </div>
 {m.rejectedReason && <p className="text-[10px] text-red-500 mt-1 flex items-center gap-1"><AlertTriangle size={9}/>{m.rejectedReason}</p>}
 </div>
 {m.approvalStatus === 'pending' && canManage && (
 <div className="flex items-center gap-1.5 shrink-0 mt-0.5">
 <button onClick={() => {
 if (user) { approveMembership(m.id, user.id, user.name); refresh(); }
 }} className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs bg-emerald-600 text-white hover:bg-emerald-700 transition-colors">
 <UserCheck size={12}/> Approve
 </button>
 <button onClick={() => setRejectTarget(m.id)}
 className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs bg-red-600 text-white hover:bg-red-700 transition-colors">
 <UserX size={12}/> Reject
 </button>
 </div>
 )}
 </div>
 );
 })}
 </div>
 )}
 </div>
 )}

 {rejectTarget && (
 <RejectDialog
 onClose={() => setRejectTarget(null)}
 onReject={(reason) => {
 if (user && rejectTarget) { rejectMembership(rejectTarget, user.id, user.name, reason); refresh(); }
 }}
 />
 )}
 </div>
 );
}
