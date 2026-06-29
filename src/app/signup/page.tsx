'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Train, UserPlus, User as UserIcon, Briefcase, Building2, Mail,
  Phone, Lock, CheckCircle2, AlertCircle, ArrowLeft, Copy, Check,
  Loader2, Shield, Key, RefreshCw, Clock, FileSpreadsheet, Upload,
  ChevronRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { registerEmployee } from '@/lib/staff/staffDB';
import { registerUserPassword, generateDefaultPassword } from '@/lib/auth/passwordStore';
import { getActiveCells } from '@/lib/cells/cellRegistry';

// Cells loaded dynamically from registry
function getCells() {
  if (typeof window === 'undefined') return ['Planning','Manpower Planning','Commercial Control','Ticket Checking','UTS PRS'];
  try { return getActiveCells().map(c => c.name); } catch { return ['Planning','Manpower Planning','Commercial Control','Ticket Checking','UTS PRS']; }
}

const WORKING_AS_OPTIONS = [
  'CMI','COS','OS','Dealer',
];

type Step = 'form' | 'otp' | 'pending' | 'success';

interface FormData {
  hrmsId: string; name: string; fatherHusbandName: string; designation: string;
  cell: string; workingAs: string; email: string; mobileNumber: string;
}
const EMPTY: FormData = { hrmsId:'', name:'', fatherHusbandName:'', designation:'', cell:'', workingAs:'', email:'', mobileNumber:'' };

const inputCls = "w-full px-3.5 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white text-sm placeholder-white/25 focus:outline-none focus:border-rail-500/60 focus:bg-white/8 transition-all";
const labelCls = "text-white/50 text-xs font-medium mb-1.5 block";

function Field({ label, icon: Icon, children, error }: { label: string; icon: React.ElementType; children: React.ReactNode; error?: string }) {
  return (
    <div>
      <label className={labelCls}><span className="inline-flex items-center gap-1"><Icon size={11} className="text-white/30"/> {label} <span className="text-red-400">*</span></span></label>
      {children}
      {error && <p className="text-red-400 text-[11px] mt-1 flex items-center gap-1"><AlertCircle size={10}/> {error}</p>}
    </div>
  );
}

export default function SignupPage() {
  const router = useRouter();
  const [step, setStep]           = useState<Step>('form');
  const [form, setForm]           = useState<FormData>(EMPTY);
  const [errors, setErrors]       = useState<Partial<Record<keyof FormData, string>>>({});
  const [submitting, setSubmitting] = useState(false);
  const [otp, setOtp]             = useState('');
  const [otpSent, setOtpSent]     = useState('');  // simulated OTP
  const [otpError, setOtpError]   = useState('');
  const [otpTimer, setOtpTimer]   = useState(0);
  const [generatedPwd, setGenPwd] = useState('');
  const [userId, setUserId]       = useState('');
  const [copied, setCopied]       = useState(false);
  const [cells, setCells]         = useState<string[]>([]);
  const [approvalStatus, setApprovalStatus] = useState<'pending' | 'approved'>('pending');

  useEffect(() => { setCells(getCells()); }, []);

  // Poll for admin approval every 5 seconds while on the pending step
  useEffect(() => {
    if (step !== 'pending' || !userId) return;
    const check = () => {
      try {
        const staffList: any[] = JSON.parse(localStorage.getItem('rly_staff_master') ?? '[]');
        const overrides: Record<string, string> = JSON.parse(localStorage.getItem('rly_user_status_overrides') ?? '{}');
        const member = staffList.find((s: any) => s.id === userId);
        const status = overrides[userId] ?? member?.status ?? 'pending';
        if (status === 'active' || status === 'approved') {
          setApprovalStatus('approved');
        }
      } catch { /* ignore */ }
    };
    check(); // immediate check on mount
    const interval = setInterval(check, 5000);
    return () => clearInterval(interval);
  }, [step, userId]);

  // OTP countdown timer
  useEffect(() => {
    if (otpTimer <= 0) return;
    const t = setInterval(() => setOtpTimer(s => s - 1), 1000);
    return () => clearInterval(t);
  }, [otpTimer]);

  const set = (k: keyof FormData, v: string) => {
    setForm(p => ({ ...p, [k]: v }));
    setErrors(p => ({ ...p, [k]: undefined }));
  };

  const validate = (): boolean => {
    const e: Partial<Record<keyof FormData, string>> = {};
    if (!form.hrmsId.trim()) e.hrmsId = 'HRMS ID is required';
    else if (!/^[A-Za-z0-9]{4,15}$/.test(form.hrmsId.trim())) e.hrmsId = 'Invalid HRMS ID (4-15 alphanumeric)';
    if (!form.name.trim()) e.name = 'Name is required';
    if (!form.fatherHusbandName.trim()) e.fatherHusbandName = "Father's name is required";
    if (!form.designation.trim()) e.designation = 'Designation is required';
    if (!form.cell) e.cell = 'Please select your working cell';
    if (!form.workingAs) e.workingAs = 'Please select your role';
    if (!form.email.trim()) e.email = 'Email is required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) e.email = 'Invalid email address';
    if (!form.mobileNumber.trim()) e.mobileNumber = 'Mobile number is required';
    else if (!/^[6-9]\d{9}$/.test(form.mobileNumber.trim())) e.mobileNumber = 'Invalid 10-digit mobile number';
    setErrors(e); return Object.keys(e).length === 0;
  };

  const handleSubmit = async (ev: React.FormEvent) => {
    ev.preventDefault();
    if (!validate()) return;
    setSubmitting(true);
    await new Promise(r => setTimeout(r, 800));
    // Generate OTP (6 digits) — in production this would be emailed
    const generatedOtp = Math.floor(100000 + Math.random() * 900000).toString();
    setOtpSent(generatedOtp);
    setOtpTimer(300); // 5 minute expiry
    setSubmitting(false);
    setStep('otp');
  };

  const handleVerifyOtp = async () => {
    if (otp.trim() !== otpSent) {
      setOtpError('Incorrect OTP. Please check and try again.'); return;
    }
    setOtpError('');
    setSubmitting(true);
    await new Promise(r => setTimeout(r, 800));
    // Create account in pending state
    const uid = `u_${Date.now()}_${Math.floor(Math.random() * 10000)}`;
    const pwd = generateDefaultPassword(form.cell, form.designation.trim());
    const staffRecord = {
      id: uid, name: form.name.trim(), email: form.email.trim(),
      mobile: form.mobileNumber.trim(), designation: form.designation.trim(),
      cell: form.cell, division: 'Delhi Division', hrmsId: form.hrmsId.trim(),
      workingAs: form.workingAs, fatherHusbandName: form.fatherHusbandName.trim(),
      status: 'pending', registeredAt: new Date().toISOString(), lastUpdatedAt: new Date().toISOString(),
      role: 'user',
    };
    registerEmployee({
      id: uid, name: staffRecord.name, email: staffRecord.email,
      mobile: staffRecord.mobile, designation: staffRecord.designation,
      cell: staffRecord.cell, division: staffRecord.division, hrmsId: staffRecord.hrmsId,
      workingAs: staffRecord.workingAs, fatherHusbandName: staffRecord.fatherHusbandName,
    });
    registerUserPassword(form.email.trim(), form.cell, form.designation.trim());

    // ── Sync to server so user can log in from any device ──────────────────
    // Uses retry-with-backoff so a transient network hiccup doesn't
    // permanently break cross-device login. Runs in the background (IIFE).
    (async () => {
      const body = JSON.stringify({
        email: form.email.trim(),
        staffRecord,
        password: pwd,
        mustChange: true,
        status: 'pending',
      });
      for (let attempt = 0; attempt < 4; attempt++) {
        try {
          const res = await fetch('/api/users', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body,
          });
          const data = await res.json();
          if (data?.ok) break; // KV confirmed write — done
        } catch { /* ignore, will retry */ }
        if (attempt < 3) await new Promise(r => setTimeout(r, 1000 * (attempt + 1))); // 1s 2s 3s
      }
    })(); // non-blocking IIFE — localStorage remains the primary store

    setUserId(uid); setGenPwd(pwd);
    setSubmitting(false);
    setStep('pending');
  };

  const resendOtp = () => {
    const newOtp = Math.floor(100000 + Math.random() * 900000).toString();
    setOtpSent(newOtp); setOtpTimer(300); setOtpError('');
    // In production: re-send email
  };

  const copyPwd = () => { navigator.clipboard.writeText(generatedPwd); setCopied(true); setTimeout(() => setCopied(false), 2000); };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-rail-950 to-slate-900 flex flex-col items-center justify-center p-4">
      {/* Header */}
      <div className="flex items-center gap-3 mb-8">
        <div className="w-10 h-10 rounded-xl bg-rail-600 flex items-center justify-center shadow-lg">
          <Train size={20} className="text-white"/>
        </div>
        <div>
          <p className="text-white font-bold text-lg leading-tight">Commercial Branch</p>
          <p className="text-white/40 text-xs">Delhi Division · Northern Railway</p>
        </div>
      </div>

      <div className="w-full max-w-lg">

        {/* ── STEP 1: Registration form ──────────────────────────────── */}
        {step === 'form' && (
          <div className="bg-white/5 border border-white/10 rounded-2xl p-8 backdrop-blur-sm">
            <div className="mb-7">
              <div className="flex items-center gap-2 mb-1">
                <UserPlus size={18} className="text-rail-400"/>
                <h2 className="text-white text-xl font-bold">Create Account</h2>
              </div>
              <p className="text-white/40 text-sm">Register to access the Commercial Dashboard</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <Field label="HRMS ID" icon={Shield} error={errors.hrmsId}>
                  <input value={form.hrmsId} onChange={e => set('hrmsId', e.target.value)} className={cn(inputCls, errors.hrmsId && 'border-red-500/50')} placeholder="e.g. 12345678"/>
                </Field>
                <Field label="Mobile Number" icon={Phone} error={errors.mobileNumber}>
                  <input value={form.mobileNumber} onChange={e => set('mobileNumber', e.target.value)} className={cn(inputCls, errors.mobileNumber && 'border-red-500/50')} placeholder="10-digit number"/>
                </Field>
              </div>

              <Field label="Full Name" icon={UserIcon} error={errors.name}>
                <input value={form.name} onChange={e => set('name', e.target.value)} className={cn(inputCls, errors.name && 'border-red-500/50')} placeholder="As per service records"/>
              </Field>

              <Field label="Father's / Husband's Name" icon={UserIcon} error={errors.fatherHusbandName}>
                <input value={form.fatherHusbandName} onChange={e => set('fatherHusbandName', e.target.value)} className={cn(inputCls, errors.fatherHusbandName && 'border-red-500/50')} placeholder="Father's or husband's name"/>
              </Field>

              <Field label="Designation" icon={Briefcase} error={errors.designation}>
                <input value={form.designation} onChange={e => set('designation', e.target.value)} className={cn(inputCls, errors.designation && 'border-red-500/50')} placeholder="e.g. Commercial Clerk"/>
              </Field>

              <div className="grid grid-cols-2 gap-4">
                <Field label="Working As" icon={Briefcase} error={errors.workingAs}>
                  <select value={form.workingAs} onChange={e => set('workingAs', e.target.value)} className={cn(inputCls, errors.workingAs && 'border-red-500/50')}>
                    <option value="">Select role</option>
                    {WORKING_AS_OPTIONS.map(o => <option key={o} value={o} className="bg-slate-800">{o}</option>)}
                  </select>
                </Field>
                <Field label="Working Cell" icon={Building2} error={errors.cell}>
                  <select value={form.cell} onChange={e => set('cell', e.target.value)} className={cn(inputCls, errors.cell && 'border-red-500/50')}>
                    <option value="">Select cell</option>
                    {cells.map(c => <option key={c} value={c} className="bg-slate-800">{c}</option>)}
                  </select>
                </Field>
              </div>

              <Field label="Email Address" icon={Mail} error={errors.email}>
                <input type="email" value={form.email} onChange={e => set('email', e.target.value)} className={cn(inputCls, errors.email && 'border-red-500/50')} placeholder="official@email.com"/>
              </Field>

              <button type="submit" disabled={submitting}
                className="w-full bg-rail-600 hover:bg-rail-700 text-white font-semibold py-3 px-4 rounded-xl transition-all text-sm flex items-center justify-center gap-2 mt-2 disabled:opacity-60">
                {submitting ? <><Loader2 size={15} className="animate-spin"/> Processing…</> : <><Mail size={15}/> Send OTP & Verify Email</>}
              </button>
            </form>

            <div className="mt-5 text-center">
              <a href="/login" className="text-white/40 hover:text-white/70 text-xs transition-colors flex items-center justify-center gap-1">
                <ArrowLeft size={11}/> Already have an account? Sign In
              </a>
            </div>
          </div>
        )}

        {/* ── STEP 2: OTP Verification ──────────────────────────────── */}
        {step === 'otp' && (
          <div className="bg-white/5 border border-white/10 rounded-2xl p-8 backdrop-blur-sm text-center">
            <div className="w-14 h-14 rounded-2xl bg-rail-600/20 border border-rail-500/30 flex items-center justify-center mx-auto mb-5">
              <Mail size={24} className="text-rail-400"/>
            </div>
            <h2 className="text-white text-xl font-bold mb-2">Verify Your Email</h2>
            <p className="text-white/40 text-sm mb-1">OTP sent to <span className="text-white/70 font-medium">{form.email}</span></p>

            {/* Development helper — show OTP on screen since we have no email service */}
            <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl px-4 py-2.5 mb-6 text-left">
              <p className="text-amber-400 text-[11px] font-bold uppercase tracking-wider mb-1">Development Mode</p>
              <p className="text-amber-300/80 text-xs">OTP (would be emailed in production): <span className="font-mono font-bold text-amber-300">{otpSent}</span></p>
              <p className="text-amber-300/50 text-[10px] mt-0.5">Expires in {Math.floor(otpTimer/60)}:{String(otpTimer%60).padStart(2,'0')}</p>
            </div>

            <div className="mb-4 text-left">
              <label className={labelCls}>Enter 6-digit OTP</label>
              <input value={otp} onChange={e => { setOtp(e.target.value.replace(/\D/g,'')); setOtpError(''); }}
                maxLength={6} placeholder="000000"
                className={cn(inputCls, 'text-center text-2xl tracking-[0.5em] font-mono', otpError && 'border-red-500/50')}/>
              {otpError && <p className="text-red-400 text-[11px] mt-1 flex items-center gap-1"><AlertCircle size={10}/> {otpError}</p>}
            </div>

            <button onClick={handleVerifyOtp} disabled={otp.length !== 6 || submitting}
              className="w-full bg-rail-600 hover:bg-rail-700 text-white font-semibold py-3 px-4 rounded-xl transition-all text-sm flex items-center justify-center gap-2 disabled:opacity-50 mb-3">
              {submitting ? <><Loader2 size={15} className="animate-spin"/> Verifying…</> : <><CheckCircle2 size={15}/> Verify & Create Account</>}
            </button>

            <button onClick={resendOtp} disabled={otpTimer > 270}
              className="text-white/40 hover:text-white/70 text-xs transition-colors flex items-center justify-center gap-1 mx-auto disabled:opacity-30">
              <RefreshCw size={11}/> Resend OTP {otpTimer > 270 ? `(${otpTimer - 270}s)` : ''}
            </button>
            <button onClick={() => setStep('form')} className="mt-3 text-white/30 hover:text-white/50 text-xs transition-colors flex items-center justify-center gap-1 mx-auto">
              <ArrowLeft size={11}/> Back to form
            </button>
          </div>
        )}

        {/* ── STEP 3: Pending Approval ──────────────────────────────── */}
        {step === 'pending' && (
          <div className="bg-white/5 border border-white/10 rounded-2xl p-8 backdrop-blur-sm text-center space-y-6">

            {approvalStatus === 'approved' ? (
              /* ── APPROVED state ── */
              <>
                <div className="w-14 h-14 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center mx-auto">
                  <CheckCircle2 size={24} className="text-emerald-400"/>
                </div>
                <div>
                  <h2 className="text-white text-xl font-bold mb-2">Account Activated!</h2>
                  <p className="text-white/50 text-sm leading-relaxed">
                    Your account has been approved. You can now sign in with your credentials.
                  </p>
                </div>

                {/* All steps done */}
                <div className="text-left space-y-3">
                  {[
                    'Form submitted',
                    'Email verified',
                    'Approved by In-Charge / Maintenance',
                    'Account activated',
                  ].map((label, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <div className="w-5 h-5 rounded-full bg-emerald-500 border-emerald-500 border flex items-center justify-center shrink-0">
                        <Check size={11} className="text-white"/>
                      </div>
                      <span className="text-sm text-emerald-400">{label}</span>
                    </div>
                  ))}
                </div>

                {/* Credentials box */}
                {generatedPwd && (
                  <div className="bg-white/5 border border-white/10 rounded-xl p-4 text-left space-y-2">
                    <p className="text-white/50 text-[11px] font-bold uppercase tracking-wider">Your login credentials</p>
                    <div><p className="text-white/30 text-[10px]">Login ID</p><p className="text-white font-mono text-sm">{form.email}</p></div>
                    <div className="flex items-center justify-between">
                      <div><p className="text-white/30 text-[10px]">Temporary Password</p><p className="text-white font-mono text-sm">{generatedPwd}</p></div>
                      <button onClick={copyPwd} className="p-2 rounded-lg hover:bg-white/10 text-white/40 hover:text-white transition-colors">
                        {copied ? <Check size={14} className="text-emerald-400"/> : <Copy size={14}/>}
                      </button>
                    </div>
                    <p className="text-amber-400/80 text-[10px] flex items-center gap-1"><AlertCircle size={10}/> Change this password on first login</p>
                  </div>
                )}

                <a href="/login" className="inline-flex items-center justify-center gap-2 w-full py-3 bg-rail-600 hover:bg-rail-500 text-white text-sm font-semibold rounded-xl transition-colors">
                  <ChevronRight size={15}/> Sign In Now
                </a>
              </>
            ) : (
              /* ── PENDING state ── */
              <>
                <div className="w-14 h-14 rounded-2xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center mx-auto">
                  <Clock size={24} className="text-amber-400"/>
                </div>
                <div>
                  <h2 className="text-white text-xl font-bold mb-2">Registration Submitted</h2>
                  <p className="text-white/50 text-sm leading-relaxed">
                    Your account is pending approval by your Cell In-Charge or Maintenance team.
                    This page checks automatically — you&apos;ll see a confirmation here once approved.
                  </p>
                </div>

                {/* Status timeline */}
                <div className="text-left space-y-3">
                  {[
                    { label: 'Form submitted', done: true },
                    { label: 'Email verified', done: true },
                    { label: 'Pending In-Charge / Maintenance approval', done: false, active: true },
                    { label: 'Account activation', done: false },
                    { label: 'First login & password setup', done: false },
                  ].map((item, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <div className={cn('w-5 h-5 rounded-full border flex items-center justify-center shrink-0',
                        item.done ? 'bg-emerald-500 border-emerald-500' : item.active ? 'border-amber-400 bg-amber-400/10' : 'border-white/20')}>
                        {item.done ? <Check size={11} className="text-white"/> : item.active ? <Clock size={10} className="text-amber-400"/> : null}
                      </div>
                      <span className={cn('text-sm', item.done ? 'text-emerald-400' : item.active ? 'text-amber-300 font-semibold' : 'text-white/30')}>{item.label}</span>
                    </div>
                  ))}
                </div>

                {/* Generated credentials */}
                {generatedPwd && (
                  <div className="bg-white/5 border border-white/10 rounded-xl p-4 text-left space-y-2">
                    <p className="text-white/50 text-[11px] font-bold uppercase tracking-wider">Your temporary credentials</p>
                    <div><p className="text-white/30 text-[10px]">Login ID</p><p className="text-white font-mono text-sm">{form.email}</p></div>
                    <div className="flex items-center justify-between">
                      <div><p className="text-white/30 text-[10px]">Temporary Password</p><p className="text-white font-mono text-sm">{generatedPwd}</p></div>
                      <button onClick={copyPwd} className="p-2 rounded-lg hover:bg-white/10 text-white/40 hover:text-white transition-colors">
                        {copied ? <Check size={14} className="text-emerald-400"/> : <Copy size={14}/>}
                      </button>
                    </div>
                    <p className="text-amber-400/80 text-[10px] flex items-center gap-1"><AlertCircle size={10}/> Change this password on first login</p>
                  </div>
                )}

                <a href="/login" className="flex items-center justify-center gap-1.5 text-white/50 hover:text-white text-sm transition-colors">
                  <ArrowLeft size={13}/> Return to Sign In
                </a>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
