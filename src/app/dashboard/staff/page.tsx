'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import {
 getAllStaff, getAllMemberships, getAudit, updateStaffRecord,
 type StaffMember, type CellMembership, type StaffAuditEntry,
} from '@/lib/staff/staffDB';
import {
 Users2, Search, Filter, ChevronDown, ChevronRight, Clock,
 CheckCircle2, XCircle, AlertTriangle, Mail, Phone, Briefcase,
 Calendar, Activity, RefreshCw, Database,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const STATUS_STYLE: Record<string, { cls: string; label: string }> = {
 pending: { cls: 'bg-amber-100 text-amber-700 border-amber-300 ', label: 'Pending' },
 approved: { cls: 'bg-emerald-100 text-emerald-700 border-emerald-300 ', label: 'Active' },
 rejected: { cls: 'bg-red-100 text-red-700 border-red-300 ', label: 'Rejected' },
 suspended: { cls: 'bg-slate-100 text-slate-500 border-slate-300 ', label: 'Suspended' },
};

function timeStr(iso?: string) {
 if (!iso) return '—';
 return new Date(iso).toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit' });
}

export default function StaffMasterPage() {
 const { user } = useAuthStore();
 const router = useRouter();
 const isAdmin = user?.role === 'admin' || user?.role === 'maintenance';
 useEffect(() => { if (!isAdmin) router.push('/dashboard'); }, [isAdmin, router]);

 const [staff, setStaff] = useState<StaffMember[]>([]);
 const [memberships, setMemberships] = useState<CellMembership[]>([]);
 const [search, setSearch] = useState('');
 const [filterStatus, setFilterStatus] = useState('all');
 const [expandedId, setExpandedId] = useState<string | null>(null);

 const refresh = () => { setStaff(getAllStaff()); setMemberships(getAllMemberships()); };
 useEffect(() => { refresh(); }, []);

 const filtered = staff
 .filter(s => filterStatus === 'all' || s.status === filterStatus)
 .filter(s => !search || s.name.toLowerCase().includes(search.toLowerCase()) || s.email.toLowerCase().includes(search.toLowerCase()) || s.designation.toLowerCase().includes(search.toLowerCase()));

 const stats = {
 total: staff.length,
 active: staff.filter(s => s.status === 'approved').length,
 pending: staff.filter(s => s.status === 'pending').length,
 rejected: staff.filter(s => s.status === 'rejected').length,
 };

 if (!isAdmin) return null;

 return (
 <div className="space-y-6 pb-8">
 {/* Header */}
 <div className="flex items-center gap-3">
 <div className="w-10 h-10 rounded-xl bg-blue-100 border border-blue-200 flex items-center justify-center">
 <Database size={18} className="text-blue-600"/>
 </div>
 <div>
 <h1 className="text-xl font-bold text-slate-900">DRM Office Staff</h1>
 <p className="text-sm text-slate-400">Master Employee Database — Single Source of Truth · Delhi Division</p>
 </div>
 <button onClick={refresh} className="ml-auto p-2 rounded-lg hover:bg-slate-100 text-slate-400">
 <RefreshCw size={14}/>
 </button>
 </div>

 {/* KPI Strip */}
 <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
 {[
 { label: 'Total Employees', value: stats.total, color: 'bg-indigo-500' },
 { label: 'Active', value: stats.active, color: 'bg-emerald-500' },
 { label: 'Pending Approval', value: stats.pending, color: 'bg-amber-500' },
 { label: 'Rejected', value: stats.rejected, color: 'bg-red-500' },
 ].map(s => (
 <div key={s.label} className="rounded-2xl bg-white border border-slate-200 p-4 shadow-elevation-sm relative overflow-hidden">
 <div className={cn('absolute top-0 left-0 right-0 h-0.5', s.color)}/>
 <p className="text-2xl font-bold text-slate-900">{s.value}</p>
 <p className="text-xs text-slate-400 mt-0.5">{s.label}</p>
 </div>
 ))}
 </div>

 {/* Table */}
 <div className="rounded-2xl bg-white border border-slate-200 shadow-elevation-sm overflow-hidden">
 {/* Toolbar */}
 <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-100 flex-wrap">
 <div className="relative flex-1 min-w-48">
 <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"/>
 <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name, email, designation…"
 className="w-full pl-8 pr-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-blue-400 text-slate-800"/>
 </div>
 <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
 className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-700 focus:outline-none">
 <option value="all">All Status</option>
 <option value="approved">Active</option>
 <option value="pending">Pending</option>
 <option value="rejected">Rejected</option>
 </select>
 </div>

 {filtered.length === 0 ? (
 <div className="py-12 text-center">
 <Users2 size={28} className="text-slate-200 mx-auto mb-2"/>
 <p className="text-sm text-slate-400">No employees found. They appear here after signing up.</p>
 </div>
 ) : (
 <div className="divide-y divide-slate-50">
 {filtered.map(s => {
 const ss = STATUS_STYLE[s.status] ?? STATUS_STYLE.pending;
 const cellMemberships = memberships.filter(m => m.employeeId === s.id);
 const isExpanded = expandedId === s.id;

 return (
 <div key={s.id}>
 <button onClick={() => setExpandedId(e => e === s.id ? null : s.id)}
 className="w-full flex items-start gap-3 px-5 py-3.5 hover:bg-slate-50/50 transition-colors text-left">
 <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center text-sm font-bold text-blue-700 shrink-0 mt-0.5">
 {s.name[0]}
 </div>
 <div className="flex-1 min-w-0">
 <div className="flex items-center gap-2 flex-wrap">
 <p className="font-semibold text-slate-900 text-sm">{s.name}</p>
 <span className={cn('inline-flex items-center text-[9px] font-bold border rounded-full px-2 py-0.5', ss.cls)}>{ss.label}</span>
 {s.hrmsId && <code className="text-[9px] bg-slate-100 text-slate-500 px-1.5 rounded">{s.hrmsId}</code>}
 </div>
 <div className="flex flex-wrap gap-x-4 gap-y-0.5 mt-1 text-[10px] text-slate-400">
 <span className="flex items-center gap-1"><Briefcase size={9}/>{s.designation}</span>
 <span className="flex items-center gap-1"><Mail size={9}/>{s.email}</span>
 {s.mobile && <span className="flex items-center gap-1"><Phone size={9}/>{s.mobile}</span>}
 <span className="flex items-center gap-1"><Calendar size={9}/>Registered {timeStr(s.registeredAt)}</span>
 </div>
 {cellMemberships.length > 0 && (
 <div className="flex flex-wrap gap-1 mt-1.5">
 {cellMemberships.map(m => (
 <span key={m.id} className={cn('text-[9px] border rounded-full px-1.5 py-0.5', STATUS_STYLE[m.approvalStatus]?.cls ?? '')}>
 {m.cellName} ({m.approvalStatus})
 </span>
 ))}
 </div>
 )}
 </div>
 <div className="shrink-0 mt-1 text-slate-300">
 {isExpanded ? <ChevronDown size={14}/> : <ChevronRight size={14}/>}
 </div>
 </button>

 {isExpanded && (
 <div className="px-5 pb-4 bg-slate-50/30 border-t border-slate-50">
 <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 py-3">Audit Trail</p>
 <AuditTimeline employeeId={s.id}/>
 </div>
 )}
 </div>
 );
 })}
 </div>
 )}
 </div>
 </div>
 );
}

function AuditTimeline({ employeeId }: { employeeId: string }) {
 const [entries, setEntries] = useState<StaffAuditEntry[]>([]);
 useEffect(() => { setEntries(getAudit(employeeId)); }, [employeeId]);
 if (!entries.length) return <p className="text-xs text-slate-300 pb-2">No audit entries yet</p>;
 return (
 <div className="space-y-2">
 {entries.slice(0, 10).map((e, i) => (
 <div key={e.id} className="flex items-start gap-2.5">
 <div className="flex flex-col items-center">
 <div className="w-2 h-2 rounded-full bg-blue-400 mt-0.5 shrink-0"/>
 {i < entries.length - 1 && <div className="w-px flex-1 bg-slate-200 mt-1 mb-0"/>}
 </div>
 <div className="pb-2">
 <p className="text-xs text-slate-700 font-medium">{e.action}</p>
 {e.detail && <p className="text-[10px] text-slate-400">{e.detail}</p>}
 <p className="text-[10px] text-slate-400 mt-0.5">
 {new Date(e.timestamp).toLocaleString('en-IN')}
 {e.performedByName && ` · by ${e.performedByName}`}
 </p>
 </div>
 </div>
 ))}
 </div>
 );
}
