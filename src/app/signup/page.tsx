'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
 Train, UserPlus, Contact, User as UserIcon, Users as FamilyIcon,
 Briefcase, Building2, Mail, Phone, Lock, CheckCircle2,
 AlertCircle, ArrowLeft, Copy, Check, Loader2
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { registerEmployee } from '@/lib/staff/staffDB';
import { registerUserPassword, generateDefaultPassword } from '@/lib/auth/passwordStore';
import { getActiveCells } from '@/lib/cells/cellRegistry';

// Cells are loaded dynamically from the registry — includes any new cells admins create
const CELLS = typeof window !== 'undefined'
 ? getActiveCells().map(c => c.name)
 : [
 'Planning','Manpower Planning','Security D&AR','Legal','Marketing',
 'Ticket Checking','UTS PRS','JTBS/YTSK/STBA','Store','Sanitation',
 'Catering','Parking','Publicity','License Porter','Complaint/RailMadad',
 'Concession','PA','Commercial Control','Union/DRUCC','DAK',
 ];

const WORKING_AS_OPTIONS = [
 'CMI', 'COS', 'Incharge', 'OS', 'Dealer', 'Peon',
];

interface FormData {
 hrmsId: string;
 name: string;
 fatherHusbandName: string;
 designation: string;
 cell: string;
 workingAs: string;
 email: string;
 mobileNumber: string;
}

const EMPTY_FORM: FormData = {
 hrmsId: '', name: '', fatherHusbandName: '', designation: '',
 cell: '', workingAs: '', email: '', mobileNumber: '',
};

function genNumericPassword(): string {
 // 6-digit numeric auto-generated password
 return Math.floor(100000 + Math.random() * 900000).toString();
}

function Field({
 label, icon: Icon, children, required = true,
}: { label: string; icon: React.ElementType; children: React.ReactNode; required?: boolean }) {
 return (
 <div>
 <label className="text-white/50 text-xs font-medium mb-1.5 flex items-center gap-1.5">
 <Icon size={11} className="text-white/30"/> {label}{required && <span className="text-red-400">*</span>}
 </label>
 {children}
 </div>
 );
}

const inputCls ="w-full px-3.5 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white text-sm placeholder-white/25 focus:outline-none focus:border-rail-500/60 focus:bg-white/8 transition-all";

export default function SignupPage() {
 const router = useRouter();
 const [form, setForm] = useState<FormData>(EMPTY_FORM);
 const [errors, setErrors] = useState<Partial<Record<keyof FormData, string>>>({});
 const [submitting, setSubmitting] = useState(false);
 const [submitted, setSubmitted] = useState(false);
 const [generatedPassword, setGeneratedPassword] = useState('');
 const [copied, setCopied] = useState(false);

 const set = (k: keyof FormData, v: string) => {
 setForm(p => ({ ...p, [k]: v }));
 setErrors(p => ({ ...p, [k]: undefined }));
 };

 const validate = (): boolean => {
 const e: Partial<Record<keyof FormData, string>> = {};
 if (!form.hrmsId.trim()) e.hrmsId = 'HRMS ID is required';
 else if (!/^[A-Za-z0-9]{4,15}$/.test(form.hrmsId.trim())) e.hrmsId = 'Enter a valid HRMS ID';
 if (!form.name.trim()) e.name = 'Name is required';
 if (!form.fatherHusbandName.trim()) e.fatherHusbandName ="Father's/Husband's name is required";
 if (!form.designation.trim()) e.designation = 'Designation is required';
 if (!form.cell) e.cell = 'Please select your working cell';
 if (!form.workingAs) e.workingAs = 'Please select what you work as';
 if (!form.email.trim()) e.email = 'Email is required';
 else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) e.email = 'Enter a valid email address';
 if (!form.mobileNumber.trim()) e.mobileNumber = 'Mobile number is required';
 else if (!/^[6-9]\d{9}$/.test(form.mobileNumber.trim())) e.mobileNumber = 'Enter a valid 10-digit mobile number';
 setErrors(e);
 return Object.keys(e).length === 0;
 };

 const handleSubmit = async (ev: React.FormEvent) => {
 ev.preventDefault();
 if (!validate()) return;
 setSubmitting(true);
 await new Promise(r => setTimeout(r, 1200));
 const userId = `u_${Date.now()}_${Math.floor(Math.random()*10000)}`;
 const pwd = generateDefaultPassword(form.cell, form.designation.trim());
 // Register in master staff DB + create pending cell membership
 registerEmployee({
 id: userId, name: form.name.trim(), email: form.email.trim(),
 mobile: form.mobileNumber.trim(), designation: form.designation.trim(),
 cell: form.cell, division: 'Delhi', hrmsId: form.hrmsId.trim(),
 workingAs: form.workingAs, fatherHusbandName: form.fatherHusbandName.trim(),
 });
 // Store default password and flag email verification required
 registerUserPassword(form.email.trim(), form.cell, form.designation.trim());
 setGeneratedPassword(pwd);
 setSubmitting(false);
 setSubmitted(true);
 };

 const copyPassword = () => {
 navigator.clipboard.writeText(generatedPassword);
 setCopied(true);
 setTimeout(() => setCopied(false), 2000);
 };

 return (
 <div className="min-h-screen bg-gradient-to-br from-slate-950 via-rail-950 to-slate-900 flex items-center justify-center p-4 relative overflow-hidden">
 {/* Ambient background */}
 <div className="absolute inset-0 overflow-hidden pointer-events-none">
 <div className="absolute -top-40 -right-40 w-80 h-80 rounded-full bg-rail-600/10 blur-3xl"/>
 <div className="absolute -bottom-40 -left-40 w-80 h-80 rounded-full bg-blue-600/10 blur-3xl"/>
 <div className="absolute inset-0 opacity-5"
 style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)', backgroundSize: '40px 40px' }} />
 </div>

 <div className="w-full max-w-2xl relative z-10">
 <AnimatePresence mode="wait">
 {!submitted ? (
 <motion.div key="form"initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
 className="p-8 rounded-3xl bg-white/5 backdrop-blur-2xl border border-white/10 shadow-2xl">

 {/* Header */}
 <div className="flex items-center gap-3 mb-2">
 <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-rail-400 to-rail-600 flex items-center justify-center shadow-lg">
 <Train className="w-5 h-5 text-white"/>
 </div>
 <div>
 <h1 className="text-white text-xl font-bold">Employee Sign Up</h1>
 <p className="text-white/40 text-xs">Commercial Branch · Delhi Division · Northern Railway</p>
 </div>
 </div>
 <p className="text-white/30 text-xs mb-6 flex items-start gap-1.5 mt-3">
 <AlertCircle size={12} className="mt-0.5 shrink-0 text-amber-400/70"/>
 Fields marked <span className="text-red-400">*</span> are required to create your account. You can complete the rest of your profile after first login.
 </p>

 <form onSubmit={handleSubmit} className="space-y-4">
 <div className="grid sm:grid-cols-2 gap-4">
 <Field label="HRMS ID"icon={Contact}>
 <input value={form.hrmsId} onChange={e => set('hrmsId', e.target.value)}
 placeholder="e.g. NR123456"className={inputCls} />
 {errors.hrmsId && <p className="text-red-400 text-[10px] mt-1">{errors.hrmsId}</p>}
 </Field>
 <Field label="Full Name"icon={UserIcon}>
 <input value={form.name} onChange={e => set('name', e.target.value)}
 placeholder="As per service record"className={inputCls} />
 {errors.name && <p className="text-red-400 text-[10px] mt-1">{errors.name}</p>}
 </Field>
 </div>

 <Field label="Father's / Husband's Name"icon={FamilyIcon}>
 <input value={form.fatherHusbandName} onChange={e => set('fatherHusbandName', e.target.value)}
 placeholder="Full name"className={inputCls} />
 {errors.fatherHusbandName && <p className="text-red-400 text-[10px] mt-1">{errors.fatherHusbandName}</p>}
 </Field>

 <div className="grid sm:grid-cols-2 gap-4">
 <Field label="Designation"icon={Briefcase}>
 <input value={form.designation} onChange={e => set('designation', e.target.value)}
 placeholder="e.g. CMI/Security, OS/Store"className={inputCls} />
 {errors.designation && <p className="text-red-400 text-[10px] mt-1">{errors.designation}</p>}
 </Field>
 <Field label="Working Cell"icon={Building2}>
 <select value={form.cell} onChange={e => set('cell', e.target.value)}
 className={cn(inputCls, !form.cell && 'text-white/25')}>
 <option value=""className="bg-slate-900 text-white/40">Select your cell…</option>
 {CELLS.map(c => <option key={c} value={c} className="bg-slate-900 text-white">{c}</option>)}
 </select>
 {errors.cell && <p className="text-red-400 text-[10px] mt-1">{errors.cell}</p>}
 </Field>
 </div>

 <Field label="Working As"icon={UserPlus}>
 <select value={form.workingAs} onChange={e => set('workingAs', e.target.value)}
 className={cn(inputCls, !form.workingAs && 'text-white/25')}>
 <option value=""className="bg-slate-900 text-white/40">Select role type…</option>
 {WORKING_AS_OPTIONS.map(w => <option key={w} value={w} className="bg-slate-900 text-white">{w}</option>)}
 </select>
 {errors.workingAs && <p className="text-red-400 text-[10px] mt-1">{errors.workingAs}</p>}
 </Field>

 <div className="grid sm:grid-cols-2 gap-4">
 <Field label="Email Address"icon={Mail}>
 <input type="email"value={form.email} onChange={e => set('email', e.target.value)}
 placeholder="yourname@delhi.nr.in"className={inputCls} />
 {errors.email && <p className="text-red-400 text-[10px] mt-1">{errors.email}</p>}
 <p className="text-white/20 text-[10px] mt-1">This will be your permanent User ID</p>
 </Field>
 <Field label="Mobile Number"icon={Phone}>
 <input value={form.mobileNumber} onChange={e => set('mobileNumber', e.target.value.replace(/\D/g, '').slice(0, 10))}
 placeholder="10-digit mobile number"className={inputCls} />
 {errors.mobileNumber && <p className="text-red-400 text-[10px] mt-1">{errors.mobileNumber}</p>}
 </Field>
 </div>

 <div className="rounded-xl border border-blue-500/20 bg-blue-500/8 p-3 flex items-start gap-2">
 <Lock size={13} className="text-blue-400 shrink-0 mt-0.5"/>
 <p className="text-blue-300/70 text-[11px] leading-snug">
 A 6-digit numeric password will be auto-generated and sent to your email address. You'll be required to change it on first login.
 </p>
 </div>

 <button type="submit"disabled={submitting}
 className={cn(
 'w-full py-3 rounded-xl font-semibold text-sm transition-all flex items-center justify-center gap-2',
 'bg-gradient-to-r from-rail-600 to-rail-500 text-white shadow-lg shadow-rail-500/20',
 'hover:from-rail-500 hover:to-rail-400 hover:shadow-xl hover:shadow-rail-400/30',
 'disabled:opacity-50 disabled:cursor-not-allowed'
 )}>
 {submitting ? (
 <><Loader2 size={16} className="animate-spin"/> Creating account…</>
 ) : (
 <><UserPlus size={16}/> Create Account</>
 )}
 </button>
 </form>

 <button onClick={() => router.push('/login')}
 className="w-full mt-4 flex items-center justify-center gap-1.5 text-white/30 hover:text-white/60 text-xs transition-colors">
 <ArrowLeft size={12}/> Back to Sign In
 </button>
 </motion.div>
 ) : (
 <motion.div key="success"initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
 className="p-8 rounded-3xl bg-white/5 backdrop-blur-2xl border border-emerald-500/20 shadow-2xl text-center">
 <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.1, type: 'spring' }}
 className="w-16 h-16 rounded-full bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center mx-auto mb-4">
 <CheckCircle2 size={32} className="text-emerald-400"/>
 </motion.div>
 <h2 className="text-white text-xl font-bold mb-1">Account Created</h2>
 <p className="text-white/40 text-sm mb-6">Your account has been registered with the following User ID</p>

 <div className="rounded-xl border border-white/10 bg-white/3 p-4 mb-4 text-left space-y-3">
 <div>
 <p className="text-white/30 text-[10px] uppercase tracking-wider mb-1">User ID (Email)</p>
 <p className="text-white text-sm font-mono">{form.email}</p>
 </div>
 <div>
 <p className="text-white/30 text-[10px] uppercase tracking-wider mb-1">Auto-generated Password</p>
 <div className="flex items-center gap-2">
 <p className="text-emerald-400 text-lg font-mono font-bold tracking-widest">{generatedPassword}</p>
 <button onClick={copyPassword}
 className="p-1.5 rounded-lg hover:bg-white/10 text-white/30 hover:text-white/60 transition-colors">
 {copied ? <Check size={13} className="text-emerald-400"/> : <Copy size={13}/>}
 </button>
 </div>
 </div>
 </div>

 <div className="rounded-xl border border-blue-500/20 bg-blue-500/8 p-3 mb-6 flex items-start gap-2 text-left">
 <Mail size={13} className="text-blue-400 shrink-0 mt-0.5"/>
 <p className="text-blue-300/70 text-[11px] leading-snug">
 This password has also been sent to <strong className="text-blue-300">{form.email}</strong>. You will be asked to set a new password the first time you log in.
 </p>
 </div>

 <button onClick={() => router.push('/login')}
 className="w-full py-3 rounded-xl font-semibold text-sm bg-gradient-to-r from-rail-600 to-rail-500 text-white shadow-lg shadow-rail-500/20 hover:from-rail-500 hover:to-rail-400 transition-all">
 Proceed to Sign In
 </button>
 </motion.div>
 )}
 </AnimatePresence>
 </div>
 </div>
 );
}
