'use client';
import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import {
 getAllRequests, resolveRequest, getUserStatus, setUserStatus,
 REQUEST_TYPE_LABELS, USER_STATUS_LABELS,
 type UserRequest, type RequestType, type RequestStatus,
} from '@/lib/staff/userRequests';
import { approveMembership, getAllMemberships, addAudit } from '@/lib/staff/staffDB';
import { getActiveCells } from '@/lib/cells/cellRegistry';
import {
 ClipboardList, Search, CheckCircle2, XCircle, MessageSquare,
 Clock, ArrowRight, UserPlus, UserMinus, ArrowLeftRight,
 ChevronDown, ChevronUp, AlertTriangle, Check, X, RefreshCw,
 Filter,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { AnimatePresence, motion } from 'framer-motion';

const REQ_TYPE_ICONS: Record<RequestType, React.ElementType> = {
 add: UserPlus, remove: UserMinus, transfer: ArrowLeftRight,
 role_change: ClipboardList, status_change: ClipboardList,
};
const REQ_TYPE_COLORS: Record<RequestType, string> = {
 add: 'bg-emerald-100 text-emerald-700 ',
 remove: 'bg-red-100 text-red-700 ',
 transfer: 'bg-blue-100 text-blue-700 ',
 role_change: 'bg-violet-100 text-violet-700 ',
 status_change: 'bg-amber-100 text-amber-700 ',
};
const REQ_STATUS_STYLE: Record<RequestStatus, { cls: string; icon: React.ElementType }> = {
 pending: { cls: 'bg-amber-100 text-amber-700 border-amber-300 ', icon: Clock },
 approved: { cls: 'bg-emerald-100 text-emerald-700 border-emerald-300 ', icon: CheckCircle2 },
 rejected: { cls: 'bg-red-100 text-red-700 border-red-300 ', icon: XCircle },
 clarification_needed: { cls: 'bg-violet-100 text-violet-700 border-violet-300 ', icon: MessageSquare },
};

function timeStr(iso: string) {
 return new Date(iso).toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit' });
}

function ClarifyDialog({ onClose, onSubmit }: { onClose: () => void; onSubmit: (msg: string) => void }) {
 const [msg, setMsg] = useState('');
 return (
 <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"onClick={onClose}>
 <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }}
 className="bg-white border border-slate-200 rounded-2xl p-6 w-full max-w-sm shadow-2xl"onClick={e => e.stopPropagation()}>
 <h3 className="font-bold text-slate-900 mb-1">Request Clarification</h3>
 <p className="text-xs text-slate-400 mb-3">Ask the cell head for more information before deciding.</p>
 <textarea value={msg} onChange={e => setMsg(e.target.value)} rows={3} placeholder="What additional information is needed?"
 className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-sm text-slate-800 focus:outline-none focus:border-violet-400 resize-none mb-4"/>
 <div className="flex gap-2 justify-end">
 <button onClick={onClose} className="px-4 py-2 text-sm text-slate-500 hover:bg-slate-100 rounded-xl">Cancel</button>
 <button onClick={() => { if (msg.trim()) { onSubmit(msg); onClose(); }}} disabled={!msg.trim()}
 className="px-4 py-2 text-sm bg-violet-600 text-white hover:bg-violet-700 rounded-xl disabled:opacity-40">Send</button>
 </div>
 </motion.div>
 </div>
 );
}

function RejectDialog({ onClose, onReject }: { onClose: () => void; onReject: (reason: string) => void }) {
 const [reason, setReason] = useState('');
 return (
 <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"onClick={onClose}>
 <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }}
 className="bg-white border border-slate-200 rounded-2xl p-6 w-full max-w-sm shadow-2xl"onClick={e => e.stopPropagation()}>
 <h3 className="font-bold text-slate-900 mb-1">Reject Request</h3>
 <textarea value={reason} onChange={e => setReason(e.target.value)} rows={3} placeholder="Reason for rejection…"
 className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-sm text-slate-800 focus:outline-none focus:border-red-400 resize-none mb-4"/>
 <div className="flex gap-2 justify-end">
 <button onClick={onClose} className="px-4 py-2 text-sm text-slate-500 hover:bg-slate-100 rounded-xl">Cancel</button>
 <button onClick={() => { if (reason.trim()) { onReject(reason); onClose(); }}} disabled={!reason.trim()}
 className="px-4 py-2 text-sm bg-red-600 text-white hover:bg-red-700 rounded-xl disabled:opacity-40">Reject</button>
 </div>
 </motion.div>
 </div>
 );
}

function RequestCard({ req, onApprove, onReject, onClarify, isAdmin }: {
 req: UserRequest;
 onApprove: () => void;
 onReject: (reason: string) => void;
 onClarify: (msg: string) => void;
 isAdmin: boolean;
}) {
 const [expanded, setExpanded] = useState(false);
 const [showReject, setShowReject] = useState(false);
 const [showClarify, setShowClarify] = useState(false);
 const TypeIcon = REQ_TYPE_ICONS[req.type];
 const typeColor = REQ_TYPE_COLORS[req.type];
 const ss = REQ_STATUS_STYLE[req.status];
 const StatusIcon = ss.icon;
 const isPending = req.status === 'pending';

 return (
 <div className={cn('rounded-2xl border bg-white shadow-elevation-sm overflow-hidden transition-all',
 isPending ? 'border-amber-200 ' : 'border-slate-200 ')}>
 <div className="flex items-start gap-3 px-5 py-4">
 <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5', typeColor)}>
 <TypeIcon size={16}/>
 </div>
 <div className="flex-1 min-w-0">
 <div className="flex items-center gap-2 flex-wrap mb-1">
 <p className="font-bold text-slate-900 text-sm">{REQUEST_TYPE_LABELS[req.type]}</p>
 <span className={cn('inline-flex items-center gap-1 text-[9px] font-bold border rounded-full px-2 py-0.5', ss.cls)}>
 <StatusIcon size={8}/>{req.status === 'clarification_needed' ? 'Needs Clarification' : req.status.charAt(0).toUpperCase() + req.status.slice(1)}
 </span>
 {isPending && <span className="text-[9px] text-amber-600 font-semibold">● Needs Action</span>}
 </div>
 <p className="text-sm text-slate-700">
 <span className="font-semibold">{req.targetName}</span>
 {req.fromCell && <> from <span className="font-medium text-slate-600">{req.fromCell}</span></>}
 {req.toCell && <> → <span className="font-medium text-blue-600">{req.toCell}</span></>}
 {!req.fromCell && req.toCell && <> → <span className="font-medium text-emerald-600">{req.toCell}</span></>}
 </p>
 <div className="flex flex-wrap gap-x-4 mt-1 text-[10px] text-slate-400">
 <span>Requested by <span className="text-slate-600 font-medium">{req.requestedByName}</span></span>
 <span>{timeStr(req.requestedAt)}</span>
 {req.targetDesignation && <span>Designation: {req.targetDesignation}</span>}
 {req.targetEmail && <span>{req.targetEmail}</span>}
 </div>
 {req.reason && <p className="text-[10px] text-slate-500 mt-1 italic">"{req.reason}"</p>}
 {req.rejectionReason && <p className="text-[10px] text-red-500 mt-1 flex items-center gap-1"><AlertTriangle size={9}/>{req.rejectionReason}</p>}
 {req.resolvedByName && <p className="text-[10px] text-slate-400 mt-1">Resolved by {req.resolvedByName} · {req.resolvedAt ? timeStr(req.resolvedAt) : ''}</p>}
 </div>

 {isPending && isAdmin && (
 <div className="flex items-center gap-1.5 shrink-0">
 <button onClick={onApprove}
 className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs bg-emerald-600 text-white hover:bg-emerald-700 transition-colors">
 <Check size={12}/> Approve
 </button>
 <button onClick={() => setShowReject(true)}
 className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs bg-red-600 text-white hover:bg-red-700 transition-colors">
 <X size={12}/> Reject
 </button>
 <button onClick={() => setShowClarify(true)}
 className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs border border-violet-300 text-violet-700 hover:bg-violet-50 transition-colors">
 <MessageSquare size={12}/> Clarify
 </button>
 </div>
 )}
 </div>

 <AnimatePresence>
 {showReject && <RejectDialog onClose={() => setShowReject(false)} onReject={onReject}/>}
 {showClarify && <ClarifyDialog onClose={() => setShowClarify(false)} onSubmit={onClarify}/>}
 </AnimatePresence>
 </div>
 );
}

export default function UserRequestsPage() {
 const { user: currentUser } = useAuthStore();
 const router = useRouter();
 const isAdmin = currentUser?.role === 'admin' || currentUser?.role === 'maintenance';
 useEffect(() => { if (!isAdmin) router.push('/dashboard'); }, [isAdmin, router]);

 const [requests, setRequests] = useState<UserRequest[]>([]);
 const [search, setSearch] = useState('');
 const [filterType, setFilterType] = useState<RequestType | 'all'>('all');
 const [filterStatus, setFilterStatus] = useState<RequestStatus | 'all'>('pending');
 const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

 const refresh = () => setRequests(getAllRequests());
 useEffect(() => { refresh(); }, []);

 const filtered = useMemo(() => {
 return requests
 .filter(r => filterType === 'all' || r.type === filterType)
 .filter(r => filterStatus === 'all' || r.status === filterStatus)
 .filter(r => !search ||
 r.targetName.toLowerCase().includes(search.toLowerCase()) ||
 r.requestedByName.toLowerCase().includes(search.toLowerCase()) ||
 (r.toCell ?? '').toLowerCase().includes(search.toLowerCase()) ||
 (r.fromCell ?? '').toLowerCase().includes(search.toLowerCase()))
 .sort((a, b) => b.requestedAt.localeCompare(a.requestedAt));
 }, [requests, filterType, filterStatus, search]);

 const stats = useMemo(() => ({
 pending: requests.filter(r => r.status === 'pending').length,
 add: requests.filter(r => r.type === 'add' && r.status === 'pending').length,
 remove: requests.filter(r => r.type === 'remove' && r.status === 'pending').length,
 transfer: requests.filter(r => r.type === 'transfer' && r.status === 'pending').length,
 total: requests.length,
 }), [requests]);

 const handleApprove = (req: UserRequest) => {
 if (!currentUser) return;
 resolveRequest(req.id, 'approved', currentUser.id, currentUser.name);
 // Apply the effect based on request type
 if (req.type === 'add' && req.targetEmployeeId) {
 setUserStatus(req.targetEmployeeId, 'active');
 const membership = getAllMemberships().find(m => m.employeeId === req.targetEmployeeId && m.approvalStatus === 'pending');
 if (membership) approveMembership(membership.id, currentUser.id, currentUser.name);
 addAudit(req.targetEmployeeId, 'Add request approved', currentUser.id, currentUser.name);
 }
 if (req.type === 'remove' && req.targetEmployeeId) {
 setUserStatus(req.targetEmployeeId, 'inactive');
 addAudit(req.targetEmployeeId, 'Remove request approved — user deactivated', currentUser.id, currentUser.name);
 }
 if (req.type === 'transfer' && req.targetEmployeeId) {
 addAudit(req.targetEmployeeId, `Transfer approved: ${req.fromCell} → ${req.toCell}`, currentUser.id, currentUser.name);
 }
 refresh();
 };

 const handleReject = (req: UserRequest, reason: string) => {
 if (!currentUser) return;
 resolveRequest(req.id, 'rejected', currentUser.id, currentUser.name, reason);
 if (req.targetEmployeeId) addAudit(req.targetEmployeeId, `Request rejected: ${reason}`, currentUser.id, currentUser.name);
 refresh();
 };

 const handleClarify = (req: UserRequest, msg: string) => {
 if (!currentUser) return;
 resolveRequest(req.id, 'clarification_needed', currentUser.id, currentUser.name, msg);
 refresh();
 };

 const handleBulkApprove = () => {
 requests.filter(r => selectedIds.has(r.id) && r.status === 'pending').forEach(r => handleApprove(r));
 setSelectedIds(new Set());
 };

 if (!isAdmin) return null;

 return (
 <div className="space-y-5 pb-8">
 {/* Header */}
 <div className="flex items-center justify-between flex-wrap gap-3">
 <div>
 <h1 className="text-xl font-bold text-slate-900">User Requests</h1>
 <p className="text-sm text-slate-400 mt-0.5">
 Review and act on staff addition, removal, and transfer requests from Cell Heads
 </p>
 </div>
 <button onClick={refresh} className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 text-slate-500 hover:bg-slate-100 text-xs">
 <RefreshCw size={13}/> Refresh
 </button>
 </div>

 {/* KPI Strip */}
 <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
 {[
 { label: 'Pending Action', value: stats.pending, color: 'bg-amber-500', urgent: true },
 { label: 'Add Requests', value: stats.add, color: 'bg-emerald-500' },
 { label: 'Remove Requests', value: stats.remove, color: 'bg-red-500' },
 { label: 'Transfers', value: stats.transfer, color: 'bg-blue-500' },
 ].map(s => (
 <div key={s.label} className={cn('rounded-2xl bg-white border p-4 shadow-elevation-sm relative overflow-hidden',
 s.urgent && s.value > 0 ? 'border-amber-300 ' : 'border-slate-200 ')}>
 <div className={cn('absolute top-0 left-0 right-0 h-0.5', s.color)}/>
 <p className={cn('text-2xl font-bold', s.urgent && s.value > 0 ? 'text-amber-600 ' : 'text-slate-900 ')}>{s.value}</p>
 <p className="text-xs text-slate-400 mt-0.5">{s.label}</p>
 </div>
 ))}
 </div>

 {/* Filters */}
 <div className="flex items-center gap-2 flex-wrap">
 <div className="relative flex-1 min-w-48">
 <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"/>
 <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name, cell…"
 className="w-full pl-8 pr-3 py-2 text-sm bg-white border border-slate-200 rounded-xl focus:outline-none focus:border-blue-400 text-slate-800 shadow-elevation-xs"/>
 </div>
 <select value={filterStatus} onChange={e => setFilterStatus(e.target.value as any)}
 className="bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-600 focus:outline-none shadow-elevation-xs">
 <option value="all">All Status</option>
 <option value="pending">Pending</option>
 <option value="approved">Approved</option>
 <option value="rejected">Rejected</option>
 <option value="clarification_needed">Needs Clarification</option>
 </select>
 <select value={filterType} onChange={e => setFilterType(e.target.value as any)}
 className="bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-600 focus:outline-none shadow-elevation-xs">
 <option value="all">All Types</option>
 {(Object.keys(REQUEST_TYPE_LABELS) as RequestType[]).map(t => <option key={t} value={t}>{REQUEST_TYPE_LABELS[t]}</option>)}
 </select>
 {selectedIds.size > 0 && (
 <button onClick={handleBulkApprove}
 className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-600 text-white text-sm hover:bg-emerald-700 transition-colors">
 <Check size={13}/> Approve Selected ({selectedIds.size})
 </button>
 )}
 </div>

 {/* Request cards grouped by type */}
 {filtered.length === 0 ? (
 <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50/50 flex flex-col items-center justify-center py-14 gap-3">
 <ClipboardList size={28} className="text-slate-200"/>
 <p className="text-sm text-slate-400">
 {filterStatus === 'pending' ? 'No pending requests — all caught up!' : 'No requests match your filters'}
 </p>
 </div>
 ) : (
 <div className="space-y-3">
 {filtered.map(req => (
 <div key={req.id} className="flex items-start gap-3">
 {isAdmin && req.status === 'pending' && (
 <button onClick={() => setSelectedIds(s => { const n = new Set(s); n.has(req.id) ? n.delete(req.id) : n.add(req.id); return n; })}
 className="mt-4 shrink-0">
 {selectedIds.has(req.id)
 ? <CheckCircle2 size={16} className="text-blue-500"/>
 : <div className="w-4 h-4 rounded-full border-2 border-slate-300"/>
 }
 </button>
 )}
 <div className="flex-1">
 <RequestCard req={req} isAdmin={isAdmin}
 onApprove={() => handleApprove(req)}
 onReject={(reason) => handleReject(req, reason)}
 onClarify={(msg) => handleClarify(req, msg)}
 />
 </div>
 </div>
 ))}
 </div>
 )}

 <p className="text-[10px] text-slate-400 text-center">
 Showing {filtered.length} of {requests.length} requests
 </p>
 </div>
 );
}
