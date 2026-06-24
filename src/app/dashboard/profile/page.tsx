'use client';
import { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { useAuthStore } from '@/store/authStore';
import { GlassCard } from '@/components/ui/GlassCard';
import type { PreviousPosting } from '@/types';
import {
 Camera, Calendar, Clock, History, Plus, Trash2, Save,
 CheckCircle2, User as UserIcon, Briefcase, Mail, Phone,
 Contact, Building2, ShieldCheck, Upload, X
} from 'lucide-react';
import { cn } from '@/lib/utils';

const EMPTY_POSTING: PreviousPosting = { designation: '', cell: '', station: '', from: '', to: '' };

export default function ProfilePage() {
 const { user, updateUser } = useAuthStore();
 const fileRef = useRef<HTMLInputElement>(null);

 const [appointmentDate, setAppointmentDate] = useState(user?.appointmentDate ?? '');
 const [workingSince, setWorkingSince] = useState(user?.workingSinceInCell ?? '');
 const [photoUrl, setPhotoUrl] = useState(user?.photoUrl ?? '');
 const [postings, setPostings] = useState<PreviousPosting[]>(
 user?.previousPostings && user.previousPostings.length > 0
 ? user.previousPostings
 : [{ ...EMPTY_POSTING }]
 );
 const [saved, setSaved] = useState(false);

 if (!user) return null;

 const completionItems = [
 { label: 'Appointment Date', done: !!appointmentDate },
 { label: 'Working Since (Cell)', done: !!workingSince },
 { label: 'Photograph', done: !!photoUrl },
 { label: 'Previous Postings', done: postings.some(p => p.designation && p.cell) },
 ];
 const completionPct = Math.round((completionItems.filter(i => i.done).length / completionItems.length) * 100);

 const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
 const file = e.target.files?.[0];
 if (!file) return;
 const reader = new FileReader();
 reader.onload = () => setPhotoUrl(reader.result as string);
 reader.readAsDataURL(file);
 };

 const updatePosting = (idx: number, field: keyof PreviousPosting, val: string) =>
 setPostings(p => p.map((row, i) => i === idx ? { ...row, [field]: val } : row));

 const addPosting = () => {
 if (postings.length >= 3) return;
 setPostings(p => [...p, { ...EMPTY_POSTING }]);
 };
 const removePosting = (idx: number) => setPostings(p => p.filter((_, i) => i !== idx));

 const handleSave = () => {
 updateUser({
 appointmentDate,
 workingSinceInCell: workingSince,
 photoUrl,
 previousPostings: postings.filter(p => p.designation || p.cell || p.station),
 profileCompleted: completionPct === 100,
 });
 setSaved(true);
 setTimeout(() => setSaved(false), 2500);
 };

 return (
 <div className="space-y-5 pb-8 max-w-4xl">
 {/* Header card with mandatory info (read-only, from signup) */}
 <GlassCard className="p-5">
 <div className="flex items-start gap-4 flex-wrap">
 {/* Photo */}
 <div className="relative shrink-0">
 <div className="w-20 h-20 rounded-2xl bg-blue-600/15 border-2 border-blue-500/30 overflow-hidden flex items-center justify-center">
 {photoUrl ? (
 <img src={photoUrl} alt={user.name} className="w-full h-full object-cover"/>
 ) : (
 <UserIcon size={28} className="text-blue-600"/>
 )}
 </div>
 <button onClick={() => fileRef.current?.click()}
 className="absolute -bottom-1.5 -right-1.5 w-7 h-7 rounded-full bg-blue-600 border-2 border-slate-950 flex items-center justify-center hover:bg-blue-500 transition-colors">
 <Camera size={12} className="text-slate-900"/>
 </button>
 <input ref={fileRef} type="file"accept="image/*"className="hidden"onChange={handlePhotoSelect}/>
 </div>

 <div className="flex-1 min-w-0">
 <h1 className="text-slate-900 text-xl font-bold">{user.name}</h1>
 <p className="text-slate-800/40 text-sm">{user.designation} · {user.cell}</p>
 <div className="flex items-center gap-4 mt-2 flex-wrap text-xs text-slate-800/30">
 <span className="flex items-center gap-1"><Mail size={11}/> {user.email}</span>
 {user.mobileNumber && <span className="flex items-center gap-1"><Phone size={11}/> {user.mobileNumber}</span>}
 {user.hrmsId && <span className="flex items-center gap-1"><Contact size={11}/> {user.hrmsId}</span>}
 </div>
 </div>

 {/* Completion ring */}
 <div className="text-center shrink-0">
 <div className="relative w-16 h-16">
 <svg className="w-16 h-16 -rotate-90"viewBox="0 0 36 36">
 <path className="text-slate-800/10"stroke="currentColor"strokeWidth="3"fill="none"
 d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"/>
 <path className="text-emerald-600"stroke="currentColor"strokeWidth="3"fill="none"
 strokeDasharray={`${completionPct}, 100`} strokeLinecap="round"
 d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"/>
 </svg>
 <span className="absolute inset-0 flex items-center justify-center text-slate-900 text-sm font-bold">{completionPct}%</span>
 </div>
 <p className="text-slate-800/30 text-[10px] mt-1">Profile</p>
 </div>
 </div>
 </GlassCard>

 {/* Mandatory info (read-only) */}
 <GlassCard className="p-5">
 <h3 className="text-slate-800/60 text-sm font-semibold mb-3 flex items-center gap-2">
 <ShieldCheck size={14} className="text-blue-600"/> Registered Information
 <span className="text-[9px] text-slate-800/20 font-normal">(from signup · contact Admin to change)</span>
 </h3>
 <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
 {[
 { label: 'HRMS ID', val: user.hrmsId ?? '—', icon: Contact },
 { label:"Father's/Husband's Name", val: user.fatherHusbandName ?? '—', icon: UserIcon },
 { label: 'Designation', val: user.designation, icon: Briefcase },
 { label: 'Working Cell', val: user.cell, icon: Building2 },
 { label: 'Working As', val: user.workingAs ?? '—', icon: Briefcase },
 { label: 'Mobile', val: user.mobileNumber ?? '—', icon: Phone },
 ].map(({ label, val, icon: Icon }) => (
 <div key={label}>
 <p className="text-slate-800/25 text-[9px] uppercase tracking-wider flex items-center gap-1 mb-0.5">
 <Icon size={9}/> {label}
 </p>
 <p className="text-slate-800/70 text-xs font-medium">{val}</p>
 </div>
 ))}
 </div>
 </GlassCard>

 {/* Complete profile fields */}
 <GlassCard className="p-5">
 <h3 className="text-slate-800/60 text-sm font-semibold mb-4 flex items-center gap-2">
 <UserIcon size={14} className="text-emerald-600"/> Complete Your Profile
 </h3>

 <div className="grid sm:grid-cols-2 gap-4 mb-5">
 <div>
 <label className="text-slate-800/40 text-xs font-medium mb-1.5 flex items-center gap-1.5">
 <Calendar size={11} className="text-slate-800/30"/> Appointment Date
 </label>
 <input type="date"value={appointmentDate} onChange={e => setAppointmentDate(e.target.value)}
 className="w-full px-3.5 py-2.5 bg-slate-900/5 border border-slate-900/10 rounded-xl text-slate-900 text-sm focus:outline-none focus:border-blue-400/50"/>
 </div>
 <div>
 <label className="text-slate-800/40 text-xs font-medium mb-1.5 flex items-center gap-1.5">
 <Clock size={11} className="text-slate-800/30"/> Working Since in This Cell
 </label>
 <input type="date"value={workingSince} onChange={e => setWorkingSince(e.target.value)}
 className="w-full px-3.5 py-2.5 bg-slate-900/5 border border-slate-900/10 rounded-xl text-slate-900 text-sm focus:outline-none focus:border-blue-400/50"/>
 </div>
 </div>

 {/* Previous postings */}
 <div>
 <div className="flex items-center justify-between mb-3">
 <label className="text-slate-800/40 text-xs font-medium flex items-center gap-1.5">
 <History size={11} className="text-slate-800/30"/> Previous Three Postings
 </label>
 {postings.length < 3 && (
 <button onClick={addPosting}
 className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 transition-colors">
 <Plus size={11}/> Add Posting
 </button>
 )}
 </div>

 <div className="space-y-3">
 {postings.map((p, idx) => (
 <div key={idx} className="rounded-xl border border-slate-900/8 bg-slate-900/3 p-3 relative">
 <div className="flex items-center justify-between mb-2">
 <span className="text-slate-800/30 text-[10px] font-semibold uppercase tracking-wider">Posting {idx + 1}</span>
 {postings.length > 1 && (
 <button onClick={() => removePosting(idx)} className="text-slate-800/20 hover:text-red-600 transition-colors">
 <Trash2 size={11}/>
 </button>
 )}
 </div>
 <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
 <input value={p.designation} onChange={e => updatePosting(idx, 'designation', e.target.value)}
 placeholder="Designation"className="bg-slate-900/5 border border-slate-900/10 rounded-lg px-2.5 py-1.5 text-xs text-slate-800/80 focus:outline-none focus:border-blue-400/50 col-span-2 sm:col-span-1"/>
 <input value={p.cell} onChange={e => updatePosting(idx, 'cell', e.target.value)}
 placeholder="Cell/Department"className="bg-slate-900/5 border border-slate-900/10 rounded-lg px-2.5 py-1.5 text-xs text-slate-800/80 focus:outline-none focus:border-blue-400/50"/>
 <input value={p.station} onChange={e => updatePosting(idx, 'station', e.target.value)}
 placeholder="Station/Location"className="bg-slate-900/5 border border-slate-900/10 rounded-lg px-2.5 py-1.5 text-xs text-slate-800/80 focus:outline-none focus:border-blue-400/50"/>
 <input type="date"value={p.from} onChange={e => updatePosting(idx, 'from', e.target.value)}
 className="bg-slate-900/5 border border-slate-900/10 rounded-lg px-2.5 py-1.5 text-xs text-slate-800/80 focus:outline-none focus:border-blue-400/50"/>
 <input type="date"value={p.to} onChange={e => updatePosting(idx, 'to', e.target.value)}
 className="bg-slate-900/5 border border-slate-900/10 rounded-lg px-2.5 py-1.5 text-xs text-slate-800/80 focus:outline-none focus:border-blue-400/50"/>
 </div>
 </div>
 ))}
 </div>
 </div>

 {/* Save bar */}
 <div className="flex items-center justify-between pt-5 mt-5 border-t border-slate-900/8">
 <p className="text-slate-800/25 text-xs">
 {completionItems.filter(i => i.done).length} of {completionItems.length} sections complete
 </p>
 <button onClick={handleSave}
 className={cn('flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium transition-all',
 saved ? 'bg-emerald-600/30 border border-emerald-500/40 text-emerald-700 '
 : 'bg-blue-600/25 border border-blue-500/40 text-blue-700 hover:bg-blue-600/40')}>
 {saved ? <><CheckCircle2 size={14}/> Saved</> : <><Save size={14}/> Save Profile</>}
 </button>
 </div>
 </GlassCard>
 </div>
 );
}
