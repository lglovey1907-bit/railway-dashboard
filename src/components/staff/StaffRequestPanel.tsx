'use client';
import { useState } from 'react';
import { useAuthStore } from '@/store/authStore';
import { canManageCellStructure } from '@/lib/cellData/useCellDataStructure';
import { createRequest } from '@/lib/staff/userRequests';
import { addAudit } from '@/lib/staff/staffDB';
import { getActiveCells } from '@/lib/cells/cellRegistry';
import {
 UserPlus, UserMinus, ArrowLeftRight, ClipboardList,
 ChevronDown, ChevronUp, Plus, Send,
} from 'lucide-react';
import { cn } from '@/lib/utils';

type RequestType = 'add' | 'remove' | 'transfer';

const TYPE_LABELS: Record<RequestType, string> = {
 add: 'Add Staff Request',
 remove: 'Remove Staff Request',
 transfer: 'Transfer Request',
};
const TYPE_ICONS: Record<RequestType, React.ElementType> = {
 add: UserPlus, remove: UserMinus, transfer: ArrowLeftRight,
};
const TYPE_COLORS: Record<RequestType, string> = {
 add: 'bg-emerald-100 text-emerald-700 border-emerald-200 ',
 remove: 'bg-red-100 text-red-700 border-red-200 ',
 transfer: 'bg-blue-100 text-blue-700 border-blue-200 ',
};

function RequestForm({
 type, cell, onClose, onSubmit,
}: {
 type: RequestType; cell: string; onClose: () => void; onSubmit: () => void;
}) {
 const { user } = useAuthStore();
 const allCells = getActiveCells().map(c => c.name).filter(c => c !== cell);

 const [form, setForm] = useState({
 targetName: '', targetEmail: '', targetDesignation: '', targetMobile: '',
 toCell: '', reason: '',
 });
 const set = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }));

 const handleSubmit = () => {
 if (!form.targetName.trim()) return;
 createRequest({
 type,
 requestedBy: user?.id ?? '',
 requestedByName: user?.name ?? '',
 targetName: form.targetName,
 targetEmail: form.targetEmail || undefined,
 targetMobile: form.targetMobile || undefined,
 targetDesignation: form.targetDesignation || undefined,
 fromCell: cell,
 toCell: type === 'transfer' ? form.toCell : type === 'add' ? cell : undefined,
 reason: form.reason || undefined,
 });
 if (user) addAudit('', `${TYPE_LABELS[type]} submitted for ${form.targetName}`, user.id, user.name, `Cell: ${cell}`);
 onSubmit();
 onClose();
 };

 const canSubmit = form.targetName.trim() && (type !== 'transfer' || form.toCell);

 return (
 <div className="p-5 border-t border-slate-100 bg-slate-50/30 space-y-3">
 <div className="grid grid-cols-2 gap-3">
 <div className="col-span-2">
 <label className="text-xs font-semibold text-slate-500 block mb-1.5">Employee Name *</label>
 <input value={form.targetName} onChange={e => set('targetName', e.target.value)} placeholder="Full name"
 className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-sm text-slate-800 focus:outline-none focus:border-blue-400"/>
 </div>
 <div>
 <label className="text-xs font-semibold text-slate-500 block mb-1.5">Designation</label>
 <input value={form.targetDesignation} onChange={e => set('targetDesignation', e.target.value)} placeholder="Designation"
 className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-sm text-slate-800 focus:outline-none focus:border-blue-400"/>
 </div>
 <div>
 <label className="text-xs font-semibold text-slate-500 block mb-1.5">Email</label>
 <input value={form.targetEmail} onChange={e => set('targetEmail', e.target.value)} placeholder="email@delhi.nr.in"
 className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-sm text-slate-800 focus:outline-none focus:border-blue-400"/>
 </div>
 {type === 'transfer' && (
 <div className="col-span-2">
 <label className="text-xs font-semibold text-slate-500 block mb-1.5">Transfer To *</label>
 <select value={form.toCell} onChange={e => set('toCell', e.target.value)}
 className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-sm text-slate-800 focus:outline-none focus:border-blue-400">
 <option value="">— Select Target Cell —</option>
 {allCells.map(c => <option key={c} value={c}>{c}</option>)}
 </select>
 </div>
 )}
 <div className="col-span-2">
 <label className="text-xs font-semibold text-slate-500 block mb-1.5">Reason / Notes</label>
 <textarea value={form.reason} onChange={e => set('reason', e.target.value)} rows={2} placeholder="Provide context for this request…"
 className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-sm text-slate-800 focus:outline-none focus:border-blue-400 resize-none"/>
 </div>
 </div>
 <div className="flex justify-end gap-2">
 <button onClick={onClose} className="px-4 py-2 text-sm text-slate-500 hover:bg-slate-100 rounded-xl">Cancel</button>
 <button onClick={handleSubmit} disabled={!canSubmit}
 className="flex items-center gap-1.5 px-4 py-2 text-sm bg-blue-600 text-white hover:bg-blue-700 rounded-xl disabled:opacity-40">
 <Send size={13}/> Submit Request
 </button>
 </div>
 <p className="text-[10px] text-slate-400">
 Request will be sent to Admin / Maintenance for final approval. Status: Pending until approved.
 </p>
 </div>
 );
}

export function StaffRequestPanel({ cell }: { cell: string }) {
 const { user } = useAuthStore();
 const canManage = canManageCellStructure(user, cell);
 const [expanded, setExpanded] = useState(false);
 const [activeForm, setActiveForm] = useState<RequestType | null>(null);
 const [submitted, setSubmitted] = useState(0);

 if (!canManage) return null;

 const requestTypes: RequestType[] = ['add', 'remove', 'transfer'];

 return (
 <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden mb-5 shadow-elevation-sm">
 <button onClick={() => setExpanded(e => !e)}
 className="w-full flex items-center justify-between px-5 py-4 hover:bg-slate-50 transition-colors">
 <div className="flex items-center gap-3">
 <div className="w-9 h-9 rounded-xl bg-blue-100 border border-blue-200 flex items-center justify-center">
 <ClipboardList size={16} className="text-blue-600"/>
 </div>
 <div className="text-left">
 <p className="font-bold text-slate-900 text-sm">Staff Requests</p>
 <p className="text-xs text-slate-400">
 Submit requests to Admin for staff changes · {submitted > 0 ? `${submitted} submitted this session` : 'No pending requests'}
 </p>
 </div>
 </div>
 {expanded ? <ChevronUp size={16} className="text-slate-400"/> : <ChevronDown size={16} className="text-slate-400"/>}
 </button>

 {expanded && (
 <div className="border-t border-slate-100">
 {activeForm ? (
 <RequestForm
 type={activeForm} cell={cell}
 onClose={() => setActiveForm(null)}
 onSubmit={() => { setSubmitted(s => s + 1); setActiveForm(null); }}
 />
 ) : (
 <div className="p-5">
 <p className="text-xs text-slate-500 mb-3">
 As Cell Head, you can submit requests to the Administration for approval. Select the type of request:
 </p>
 <div className="grid grid-cols-3 gap-3">
 {requestTypes.map(type => {
 const Icon = TYPE_ICONS[type];
 return (
 <button key={type} onClick={() => setActiveForm(type)}
 className={cn('flex flex-col items-center gap-2 p-4 rounded-xl border transition-all hover:shadow-elevation-sm', TYPE_COLORS[type])}>
 <Icon size={20}/>
 <span className="text-xs font-semibold text-center leading-snug">{TYPE_LABELS[type]}</span>
 </button>
 );
 })}
 </div>
 </div>
 )}
 </div>
 )}
 </div>
 );
}
