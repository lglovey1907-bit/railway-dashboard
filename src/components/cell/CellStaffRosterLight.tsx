'use client';
import { useState } from 'react';
import { mockUsers } from '@/lib/data/mockData';
import { Users, Calendar, ClipboardList, Mail, Phone, ChevronDown, ChevronUp } from 'lucide-react';
import { cn } from '@/lib/utils';

const ROLE_BADGE: Record<string, string> = {
 CMI: 'bg-indigo-100 text-indigo-700 border-indigo-300',
 COS: 'bg-violet-100 text-violet-700 border-violet-300',
 OS: 'bg-teal-100 text-teal-700 border-teal-300',
 Dealer: 'bg-amber-100 text-amber-700 border-amber-300',
 Peon: 'bg-gray-100 text-gray-600 border-gray-300',
};

function fmtDate(d?: string) {
 if (!d) return '—';
 return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

export function CellStaffRosterLight({ cell }: { cell: string }) {
 const staff = mockUsers.filter(u => u.cell === cell);
 const [expanded, setExpanded] = useState(true);
 if (staff.length === 0) return null;

 const counts = staff.reduce<Record<string, number>>((acc, u) => {
 const k = u.workingAs ?? 'Other';
 acc[k] = (acc[k] ?? 0) + 1;
 return acc;
 }, {});

 return (
 <div className="mx-6 mt-4 mb-2 bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
 <button onClick={() => setExpanded(e => !e)}
 className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors">
 <div className="flex items-center gap-3">
 <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center">
 <Users size={15} className="text-blue-700"/>
 </div>
 <div className="text-left">
 <p className="text-gray-800 font-bold text-sm">Cell Staff Information</p>
 <p className="text-gray-400 text-xs">{staff.length} staff member{staff.length !== 1 ? 's' : ''} in {cell}</p>
 </div>
 </div>
 <div className="flex items-center gap-2">
 {Object.entries(counts).map(([role, n]) => (
 <span key={role} className={cn('text-[9px] font-bold px-2 py-1 rounded-full border', ROLE_BADGE[role] ?? ROLE_BADGE.Peon)}>
 {role} · {n}
 </span>
 ))}
 {expanded ? <ChevronUp size={14} className="text-gray-400 ml-1"/> : <ChevronDown size={14} className="text-gray-400 ml-1"/>}
 </div>
 </button>

 {expanded && (
 <div className="px-4 pb-4 grid grid-cols-1 lg:grid-cols-2 gap-3 border-t border-gray-100 pt-3">
 {staff.map(u => {
 const initials = u.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
 const roleCls = ROLE_BADGE[u.workingAs ?? ''] ?? ROLE_BADGE.Peon;
 return (
 <div key={u.id} className="rounded-lg border border-gray-200 bg-gray-50/50 p-3 hover:bg-gray-50 transition-colors">
 <div className="flex items-start gap-3">
 <div className="w-9 h-9 rounded-lg bg-blue-100 flex items-center justify-center text-xs font-bold text-blue-700 shrink-0">
 {initials}
 </div>
 <div className="flex-1 min-w-0">
 <div className="flex items-center justify-between gap-2 flex-wrap mb-1">
 <p className="text-gray-800 text-sm font-semibold truncate">{u.name}</p>
 <span className={cn('text-[9px] font-bold px-1.5 py-0.5 rounded-full border shrink-0', roleCls)}>{u.workingAs ?? '—'}</span>
 </div>
 <div className="grid grid-cols-2 gap-x-3 gap-y-1 mt-1.5">
 <div>
 <p className="text-gray-400 text-[9px] uppercase tracking-wider">Father's/Husband's Name</p>
 <p className="text-gray-600 text-xs">{u.fatherHusbandName ?? '—'}</p>
 </div>
 <div>
 <p className="text-gray-400 text-[9px] uppercase tracking-wider">Designation</p>
 <p className="text-gray-600 text-xs">{u.designation}</p>
 </div>
 <div>
 <p className="text-gray-400 text-[9px] uppercase tracking-wider">Working Cell</p>
 <p className="text-gray-600 text-xs">{u.cell}</p>
 </div>
 <div>
 <p className="text-gray-400 text-[9px] uppercase tracking-wider flex items-center gap-1"><Calendar size={8}/> Posting Date</p>
 <p className="text-gray-600 text-xs">{fmtDate(u.datePostingInCell)}</p>
 </div>
 </div>
 {u.listOfWorkAssigned && (
 <div className="mt-1.5 pt-1.5 border-t border-gray-200">
 <p className="text-gray-400 text-[9px] uppercase tracking-wider flex items-center gap-1 mb-0.5"><ClipboardList size={8}/> List of Work Assigned</p>
 <p className="text-gray-600 text-[11px] leading-snug">{u.listOfWorkAssigned}</p>
 </div>
 )}
 <div className="flex items-center gap-3 mt-1.5 pt-1.5 border-t border-gray-200">
 <span className="text-gray-400 text-[10px] flex items-center gap-1 truncate"><Mail size={9}/> {u.email}</span>
 {u.mobileNumber && <span className="text-gray-400 text-[10px] flex items-center gap-1"><Phone size={9}/> {u.mobileNumber}</span>}
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
