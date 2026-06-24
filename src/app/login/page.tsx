'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuthStore } from '@/store/authStore';
import {
 Train, Eye, EyeOff, Shield, Lock, AlertCircle,
 Users, Settings, Mail, KeyRound, CheckCircle2,
 RefreshCw, ArrowLeft, Loader2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
 generateOTP, verifyOTP, clearOTP, getOTP,
 isEmailVerified, markEmailVerified,
 mustChangePassword, clearMustChangePassword,
 setUserPassword, getUserPassword,
} from '@/lib/auth/passwordStore';
import { mockUsers } from '@/lib/data/mockData';

// ── Demo quick-fill accounts ──────────────────────────────────────────────────
const DEMO_ACCOUNTS = [
 { role: 'maintenance', email: 'lovey.gandhi@delhi.nr.in', password: 'CMI@Lovey2026', label: 'CMI/G — Lovey Gandhi', icon: Settings, color: 'from-purple-600 to-purple-800' },
 { role: 'admin', email: 'srdcm.ps@delhi.nr.in', password: 'SrDCM@2026', label: 'Sr.DCM/PS', icon: Shield, color: 'from-blue-600 to-blue-800' },
 { role: 'admin', email: 'dcm.ps@delhi.nr.in', password: 'DCM@PS2026', label: 'DCM/PS', icon: Shield, color: 'from-sky-600 to-sky-800' },
 { role: 'user', email: 'cmi.utsprs@delhi.nr.in', password: 'User@2026', label: 'CMI/UTS-PRS', icon: Users, color: 'from-slate-600 to-slate-800' },
];

function strength(pwd: string) {
 let s = 0;
 if (pwd.length >= 8) s++;
 if (/[A-Z]/.test(pwd)) s++;
 if (/[a-z]/.test(pwd)) s++;
 if (/[0-9]/.test(pwd)) s++;
 if (/[^A-Za-z0-9]/.test(pwd)) s++;
 const labels = ['Very Weak', 'Weak', 'Fair', 'Good', 'Strong', 'Very Strong'];
 const colors = ['bg-red-500', 'bg-red-400', 'bg-amber-400', 'bg-yellow-400', 'bg-emerald-400', 'bg-emerald-500'];
 return { score: s, label: labels[s], color: colors[s] };
}

type Step = 'login' | 'otp' | 'change_pwd';

export default function LoginPage() {
 const router = useRouter();
 const { login, isLoading, error, user, clearError, initialize, isInitialized, updateUser } = useAuthStore();

 const [step, setStep] = useState<Step>('login');
 const [email, setEmail] = useState('');
 const [password, setPassword] = useState('');
 const [showPwd, setShowPwd] = useState(false);
 const [otpCode, setOtpCode] = useState('');
 const [otpRecord, setOtpRecord] = useState<{ code: string; expiresAt: string } | null>(null);
 const [otpError, setOtpError] = useState('');
 const [otpSending, setOtpSending] = useState(false);
 const [localError, setLocalError] = useState('');

 // Change-password fields
 const [newPwd, setNewPwd] = useState('');
 const [confirmPwd, setConfirmPwd] = useState('');
 const [showNewPwd, setShowNewPwd] = useState(false);
 const [cpError, setCpError] = useState('');
 const [cpLoading, setCpLoading] = useState(false);

 useEffect(() => { initialize(); }, [initialize]);
 useEffect(() => { if (isInitialized && user) router.replace('/dashboard'); }, [user, isInitialized, router]);

 // ── Step 1: Login ─────────────────────────────────────────────────────────
 const handleLogin = async (e: React.FormEvent) => {
 e.preventDefault();
 clearError(); setLocalError('');
 try {
 const ok = await login(email.trim(), password);
 if (!ok) return;

 // Check if first-time (must change password or email not verified)
 const userEmail = email.trim().toLowerCase();
 const needsVerify = !isEmailVerified(userEmail);
 const needsChange = mustChangePassword(userEmail);

 if (needsVerify || needsChange) {
 // Send OTP
 setOtpSending(true);
 const rec = generateOTP(userEmail);
 setOtpRecord(rec);
 setOtpSending(false);
 setStep('otp');
 } else {
 // Existing verified user — go straight to dashboard
 router.replace('/dashboard');
 }
 } catch (err: any) {
 setLocalError(err.message ?? 'Login failed');
 }
 };

 // ── Step 2: OTP Verification ──────────────────────────────────────────────
 const handleVerifyOTP = (e: React.FormEvent) => {
 e.preventDefault();
 setOtpError('');
 const userEmail = email.trim().toLowerCase();
 const ok = verifyOTP(userEmail, otpCode);
 if (!ok) { setOtpError('Incorrect OTP or code has expired. Click Resend.'); return; }
 markEmailVerified(userEmail);
 clearOTP(userEmail);

 if (mustChangePassword(userEmail)) {
 setStep('change_pwd');
 } else {
 router.replace('/dashboard');
 }
 };

 const handleResendOTP = () => {
 const rec = generateOTP(email.trim().toLowerCase());
 setOtpRecord(rec);
 setOtpCode('');
 setOtpError('');
 };

 // ── Step 3: Change Password ───────────────────────────────────────────────
 const handleChangePassword = async (e: React.FormEvent) => {
 e.preventDefault();
 setCpError('');
 if (newPwd.length < 8) { setCpError('Password must be at least 8 characters'); return; }
 const s = strength(newPwd);
 if (s.score < 2) { setCpError('Choose a stronger password'); return; }
 if (newPwd !== confirmPwd) { setCpError('Passwords do not match'); return; }
 setCpLoading(true);
 await new Promise(r => setTimeout(r, 800));
 const userEmail = email.trim().toLowerCase();
 setUserPassword(userEmail, newPwd);
 clearMustChangePassword(userEmail);
 updateUser({ mustChangePassword: false });
 setCpLoading(false);
 router.replace('/dashboard');
 };

 const s = strength(newPwd);

 // ── Render ────────────────────────────────────────────────────────────────
 return (
 <div className="min-h-screen bg-gradient-to-br from-slate-950 via-rail-950 to-slate-900 flex items-center justify-center p-4 relative overflow-hidden">
 <div className="absolute inset-0 overflow-hidden pointer-events-none">
 <div className="absolute -top-40 -right-40 w-80 h-80 rounded-full bg-rail-600/10 blur-3xl"/>
 <div className="absolute -bottom-40 -left-40 w-80 h-80 rounded-full bg-blue-600/10 blur-3xl"/>
 <div className="absolute inset-0 opacity-5"style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)', backgroundSize: '40px 40px' }}/>
 </div>

 <div className="w-full max-w-md relative z-10">
 <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-8">
 <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-rail-400 to-rail-600 flex items-center justify-center shadow-xl shadow-rail-500/30 mb-5 mx-auto">
 <Train className="w-8 h-8 text-white"/>
 </div>
 <h1 className="text-white text-2xl font-bold">Commercial Branch Delhi Division</h1>
 <p className="text-white/40 text-sm mt-2">Northern Railway — Integrated Operations Dashboard</p>
 </motion.div>

 <AnimatePresence mode="wait">
 {/* ── STEP 1: Login form ── */}
 {step === 'login' && (
 <motion.div key="login"initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
 className="bg-white/5 backdrop-blur-2xl border border-white/10 rounded-3xl p-8 shadow-2xl">
 <h2 className="text-white text-xl font-bold mb-1">Sign In</h2>
 <p className="text-white/40 text-xs mb-6">Use your Email or HRMS ID with your password</p>

 <form onSubmit={handleLogin} className="space-y-4">
 <div>
 <label className="text-white/50 text-xs font-medium mb-1.5 block">Email Address or HRMS ID</label>
 <input value={email} onChange={e => setEmail(e.target.value)} type="text"autoFocus required
 placeholder="email@delhi.nr.in or HRMS ID"
 className="w-full px-3.5 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white text-sm placeholder-white/25 focus:outline-none focus:border-rail-400/60 transition-all"/>
 </div>
 <div>
 <label className="text-white/50 text-xs font-medium mb-1.5 block">Password</label>
 <div className="relative">
 <input value={password} onChange={e => setPassword(e.target.value)} type={showPwd ? 'text' : 'password'} required
 placeholder="Enter your password"
 className="w-full px-3.5 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white text-sm placeholder-white/25 focus:outline-none focus:border-rail-400/60 transition-all pr-10"/>
 <button type="button"onClick={() => setShowPwd(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60">
 {showPwd ? <EyeOff size={14}/> : <Eye size={14}/>}
 </button>
 </div>
 </div>

 {(error || localError) && (
 <div className="flex items-center gap-2 px-3 py-2.5 bg-red-500/15 border border-red-500/30 rounded-xl">
 <AlertCircle size={14} className="text-red-400 shrink-0"/>
 <p className="text-red-300 text-xs">{localError || error}</p>
 </div>
 )}

 <button type="submit"disabled={isLoading || otpSending}
 className="w-full py-3 rounded-xl font-semibold text-sm bg-gradient-to-r from-rail-600 to-rail-500 text-white shadow-lg hover:from-rail-500 hover:to-rail-400 transition-all disabled:opacity-50 flex items-center justify-center gap-2">
 {(isLoading || otpSending) ? <><Loader2 size={15} className="animate-spin"/> Signing in…</> : <><Lock size={15}/> Sign In</>}
 </button>
 </form>

 {/* Demo accounts */}
 <div className="mt-6 pt-5 border-t border-white/8">
 <p className="text-white/30 text-[10px] uppercase tracking-widest mb-3 text-center">Quick Demo Access</p>
 <div className="grid grid-cols-2 gap-2">
 {DEMO_ACCOUNTS.map(acc => {
 const Icon = acc.icon;
 return (
 <button key={acc.email} onClick={() => { clearError(); setLocalError(''); setEmail(acc.email); setPassword(acc.password); }}
 className="flex items-center gap-2 px-3 py-2 bg-white/5 hover:bg-white/10 border border-white/8 hover:border-white/15 rounded-xl transition-all text-left">
 <div className={cn('w-6 h-6 rounded-lg bg-gradient-to-br flex items-center justify-center shrink-0', acc.color)}>
 <Icon size={11} className="text-white"/>
 </div>
 <span className="text-white/60 text-[10px] font-medium truncate">{acc.label}</span>
 </button>
 );
 })}
 </div>
 </div>
 </motion.div>
 )}

 {/* ── STEP 2: OTP Verification ── */}
 {step === 'otp' && (
 <motion.div key="otp"initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
 className="bg-white/5 backdrop-blur-2xl border border-white/10 rounded-3xl p-8 shadow-2xl">
 <button onClick={() => setStep('login')} className="flex items-center gap-1.5 text-white/40 hover:text-white/70 text-xs mb-5 transition-colors">
 <ArrowLeft size={13}/> Back to login
 </button>

 <div className="w-12 h-12 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center mb-4">
 <Mail size={22} className="text-amber-400"/>
 </div>
 <h2 className="text-white text-xl font-bold mb-1">Verify Your Email</h2>
 <p className="text-white/40 text-sm mb-2">
 An OTP has been sent to <span className="text-white/70 font-medium">{email}</span>
 </p>

 {/* In this demo/intranet build, OTP is shown on screen */}
 {otpRecord && (
 <div className="mb-5 bg-amber-500/10 border border-amber-500/25 rounded-xl px-4 py-3 text-center">
 <p className="text-amber-300/70 text-[10px] uppercase tracking-wider mb-1">Demo Mode — OTP (no email server)</p>
 <p className="text-amber-300 text-3xl font-bold tracking-[0.3em]">{otpRecord.code}</p>
 <p className="text-amber-300/50 text-[10px] mt-1">Valid for 10 minutes</p>
 </div>
 )}

 <form onSubmit={handleVerifyOTP} className="space-y-4">
 <div>
 <label className="text-white/50 text-xs font-medium mb-1.5 block">Enter OTP</label>
 <input value={otpCode} onChange={e => setOtpCode(e.target.value.replace(/\D/g,'').slice(0,6))}
 placeholder="6-digit code"maxLength={6} autoFocus
 className="w-full px-3.5 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white text-xl font-bold tracking-[0.3em] text-center placeholder-white/20 focus:outline-none focus:border-amber-400/60 transition-all"/>
 </div>
 {otpError && (
 <div className="flex items-center gap-2 px-3 py-2 bg-red-500/15 border border-red-500/30 rounded-xl">
 <AlertCircle size={13} className="text-red-400 shrink-0"/><p className="text-red-300 text-xs">{otpError}</p>
 </div>
 )}
 <button type="submit"disabled={otpCode.length !== 6}
 className="w-full py-3 rounded-xl font-semibold text-sm bg-gradient-to-r from-amber-600 to-amber-500 text-white disabled:opacity-40 flex items-center justify-center gap-2">
 <CheckCircle2 size={15}/> Verify OTP
 </button>
 <button type="button"onClick={handleResendOTP}
 className="w-full py-2 text-xs text-white/40 hover:text-white/70 flex items-center justify-center gap-1.5 transition-colors">
 <RefreshCw size={11}/> Resend OTP
 </button>
 </form>
 </motion.div>
 )}

 {/* ── STEP 3: Change Password ── */}
 {step === 'change_pwd' && (
 <motion.div key="change"initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
 className="bg-white/5 backdrop-blur-2xl border border-amber-500/20 rounded-3xl p-8 shadow-2xl">
 <div className="w-12 h-12 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center mb-4">
 <KeyRound size={22} className="text-amber-400"/>
 </div>
 <h2 className="text-white text-xl font-bold mb-1">Set Your Password</h2>
 <p className="text-white/40 text-sm mb-5">
 Your email is verified. Create a strong password to secure your account.
 </p>

 <form onSubmit={handleChangePassword} className="space-y-4">
 <div>
 <label className="text-white/50 text-xs font-medium mb-1.5 block">New Password</label>
 <div className="relative">
 <input value={newPwd} onChange={e => setNewPwd(e.target.value)} type={showNewPwd ? 'text' : 'password'} autoFocus
 placeholder="Minimum 8 characters"
 className="w-full px-3.5 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white text-sm placeholder-white/25 focus:outline-none focus:border-amber-400/60 transition-all pr-10"/>
 <button type="button"onClick={() => setShowNewPwd(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60">
 {showNewPwd ? <EyeOff size={14}/> : <Eye size={14}/>}
 </button>
 </div>
 {newPwd && (
 <div className="mt-1.5">
 <div className="flex gap-1 mb-1">{[0,1,2,3,4].map(i => <div key={i} className={cn('h-1 flex-1 rounded-full', i < s.score ? s.color : 'bg-white/10')}/>)}</div>
 <p className="text-white/30 text-[10px]">{s.label}</p>
 </div>
 )}
 </div>
 <div>
 <label className="text-white/50 text-xs font-medium mb-1.5 block">Confirm Password</label>
 <input value={confirmPwd} onChange={e => setConfirmPwd(e.target.value)} type={showNewPwd ? 'text' : 'password'}
 placeholder="Re-enter new password"
 className="w-full px-3.5 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white text-sm placeholder-white/25 focus:outline-none focus:border-amber-400/60 transition-all"/>
 {confirmPwd && newPwd === confirmPwd && <p className="text-emerald-400 text-[10px] mt-1 flex items-center gap-1"><CheckCircle2 size={10}/> Passwords match</p>}
 </div>
 {cpError && (
 <div className="flex items-center gap-2 px-3 py-2 bg-red-500/15 border border-red-500/30 rounded-xl">
 <AlertCircle size={13} className="text-red-400 shrink-0"/><p className="text-red-300 text-xs">{cpError}</p>
 </div>
 )}
 <button type="submit"disabled={cpLoading || newPwd.length < 8}
 className="w-full py-3 rounded-xl font-semibold text-sm bg-gradient-to-r from-amber-600 to-amber-500 text-white disabled:opacity-40 flex items-center justify-center gap-2">
 {cpLoading ? <><Loader2 size={15} className="animate-spin"/> Saving…</> : <><Lock size={15}/> Set Password & Enter Dashboard</>}
 </button>
 </form>
 </motion.div>
 )}
 </AnimatePresence>

 <p className="text-center text-white/20 text-xs mt-6">
 Northern Railway · Delhi Division · Commercial Branch
 </p>
 </div>
 </div>
 );
}
