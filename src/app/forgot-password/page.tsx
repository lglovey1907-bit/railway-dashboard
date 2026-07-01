'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Mail, ArrowLeft, CheckCircle2, Loader2, KeyRound, Lock, Eye, EyeOff, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getStaffByEmail } from '@/lib/staff/staffDB';
import { generateOTP, verifyOTP, clearOTP, setUserPassword, clearMustChangePassword } from '@/lib/auth/passwordStore';
import { sendOtpEmail } from '@/lib/auth/emailOtp';

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

type Step = 'request' | 'otp' | 'reset' | 'done';

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>('request');
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [otpEmailed, setOtpEmailed] = useState(false);
  const [accountExists, setAccountExists] = useState(false);

  const [otp, setOtp] = useState('');
  const [otpError, setOtpError] = useState('');

  const [newPwd, setNewPwd] = useState('');
  const [confirmPwd, setConfirmPwd] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [resetError, setResetError] = useState('');

  const s = strength(newPwd);

  const handleRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const trimmed = email.trim();
    if (!trimmed) { setError('Please enter your registered email address'); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) { setError('Enter a valid email address'); return; }

    setSubmitting(true);

    // Check locally first, then fall back to the server (KV) — covers users
    // who registered on a different browser/device than this one.
    let exists = !!getStaffByEmail(trimmed);
    if (!exists) {
      try {
        const res = await fetch(`/api/users?email=${encodeURIComponent(trimmed.toLowerCase())}`);
        if (res.ok) {
          const remote = await res.json();
          exists = !!remote;
        }
      } catch { /* ignore — treat as not found */ }
    }
    setAccountExists(exists);

    if (exists) {
      const rec = generateOTP(trimmed.toLowerCase());
      const emailed = await sendOtpEmail(trimmed.toLowerCase(), rec.code, 'reset');
      setOtpEmailed(emailed);
    }

    setSubmitting(false);
    // Always advance to the OTP step regardless of whether the account exists —
    // this avoids revealing account existence to an attacker (security best practice).
    setStep('otp');
  };

  const handleResend = async () => {
    if (!accountExists) return;
    const rec = generateOTP(email.trim().toLowerCase());
    const emailed = await sendOtpEmail(email.trim().toLowerCase(), rec.code, 'reset');
    setOtpEmailed(emailed);
    setOtp('');
    setOtpError('');
  };

  const handleVerifyOtp = (e: React.FormEvent) => {
    e.preventDefault();
    setOtpError('');
    if (!accountExists) { setOtpError('Incorrect or expired code'); return; }
    const ok = verifyOTP(email.trim().toLowerCase(), otp);
    if (!ok) { setOtpError('Incorrect OTP or code has expired. Click Resend.'); return; }
    setStep('reset');
  };

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setResetError('');
    if (newPwd.length < 8) { setResetError('Password must be at least 8 characters'); return; }
    if (s.score < 3) { setResetError('Choose a stronger password (mix upper/lowercase, numbers, symbols)'); return; }
    if (newPwd !== confirmPwd) { setResetError('Passwords do not match'); return; }

    setSubmitting(true);
    const userEmail = email.trim().toLowerCase();
    setUserPassword(userEmail, newPwd);
    clearMustChangePassword(userEmail);
    clearOTP(userEmail);

    // Sync to server so the new password works from any device — retry to
    // survive transient network failures.
    (async () => {
      const body = JSON.stringify({ email: userEmail, password: newPwd, mustChange: false });
      for (let i = 0; i < 4; i++) {
        try {
          const r = await fetch('/api/users', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body });
          const d = await r.json();
          if (d?.ok) break;
        } catch { /* retry */ }
        if (i < 3) await new Promise(res => setTimeout(res, 1000 * (i + 1)));
      }
    })();

    setSubmitting(false);
    setStep('done');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-rail-950 to-slate-900 flex items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 rounded-full bg-rail-600/10 blur-3xl"/>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 rounded-full bg-blue-600/10 blur-3xl"/>
      </div>

      <div className="w-full max-w-md relative z-10">
        <AnimatePresence mode="wait">
          {step === 'request' && (
            <motion.div key="request" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
              className="p-8 rounded-3xl bg-white/5 backdrop-blur-2xl border border-white/10 shadow-2xl">

              <div className="w-12 h-12 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center mb-5">
                <KeyRound size={22} className="text-amber-400"/>
              </div>
              <h1 className="text-white text-xl font-bold mb-1">Forgot Password</h1>
              <p className="text-white/40 text-sm mb-6">
                Enter your registered email address. We&apos;ll send a verification code to reset your password.
              </p>

              <form onSubmit={handleRequest} className="space-y-4">
                <div>
                  <label className="text-white/50 text-xs font-medium mb-1.5 flex items-center gap-1.5">
                    <Mail size={11} className="text-white/30"/> Email Address
                  </label>
                  <input type="email" value={email} onChange={e => { setEmail(e.target.value); setError(''); }}
                    placeholder="yourname@delhi.nr.in"
                    className="w-full px-3.5 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white text-sm placeholder-white/25 focus:outline-none focus:border-rail-500/60 focus:bg-white/8 transition-all"/>
                  {error && <p className="text-red-400 text-[10px] mt-1">{error}</p>}
                </div>

                <button type="submit" disabled={submitting}
                  className={cn(
                    'w-full py-3 rounded-xl font-semibold text-sm transition-all flex items-center justify-center gap-2',
                    'bg-gradient-to-r from-rail-600 to-rail-500 text-white shadow-lg shadow-rail-500/20',
                    'hover:from-rail-500 hover:to-rail-400 hover:shadow-xl hover:shadow-rail-400/30',
                    'disabled:opacity-50 disabled:cursor-not-allowed'
                  )}>
                  {submitting ? (<><Loader2 size={16} className="animate-spin"/> Sending…</>) : 'Send Verification Code'}
                </button>
              </form>

              <button onClick={() => router.push('/login')}
                className="w-full mt-5 flex items-center justify-center gap-1.5 text-white/30 hover:text-white/60 text-xs transition-colors">
                <ArrowLeft size={12}/> Back to Sign In
              </button>
            </motion.div>
          )}

          {step === 'otp' && (
            <motion.div key="otp" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
              className="p-8 rounded-3xl bg-white/5 backdrop-blur-2xl border border-white/10 shadow-2xl text-center">
              <div className="w-14 h-14 rounded-2xl bg-rail-600/20 border border-rail-500/30 flex items-center justify-center mx-auto mb-5">
                <Mail size={24} className="text-rail-400"/>
              </div>
              <h2 className="text-white text-xl font-bold mb-2">Check Your Email</h2>
              <p className="text-white/40 text-sm mb-1">
                If an account exists for <strong className="text-white/70">{email}</strong>, a verification code has been sent.
              </p>

              {accountExists && !otpEmailed && (
                <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl px-4 py-2.5 my-4 text-left">
                  <p className="text-amber-400 text-[11px] font-bold uppercase tracking-wider mb-1">Email delivery not configured</p>
                  <p className="text-amber-300/80 text-xs">Verification codes are shown on-screen until SMTP is set up. Check the browser console / server logs, or contact support.</p>
                </div>
              )}

              <form onSubmit={handleVerifyOtp} className="mt-4 text-left">
                <label className="text-white/50 text-xs font-medium mb-1.5 block">Enter 6-digit code</label>
                <input value={otp} onChange={e => { setOtp(e.target.value.replace(/\D/g,'')); setOtpError(''); }}
                  maxLength={6} placeholder="000000"
                  className="w-full px-3.5 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white text-2xl tracking-[0.5em] font-mono text-center placeholder-white/25 focus:outline-none focus:border-rail-500/60 focus:bg-white/8 transition-all"/>
                {otpError && <p className="text-red-400 text-[11px] mt-1 flex items-center gap-1"><AlertCircle size={10}/> {otpError}</p>}

                <button type="submit" disabled={otp.length !== 6}
                  className="w-full mt-4 py-3 rounded-xl font-semibold text-sm bg-gradient-to-r from-rail-600 to-rail-500 text-white shadow-lg hover:from-rail-500 hover:to-rail-400 transition-all disabled:opacity-50">
                  Verify Code
                </button>
              </form>

              <button onClick={handleResend}
                className="mt-3 text-white/40 hover:text-white/70 text-xs transition-colors">
                Resend Code
              </button>
              <button onClick={() => router.push('/login')}
                className="w-full mt-4 flex items-center justify-center gap-1.5 text-white/30 hover:text-white/60 text-xs transition-colors">
                <ArrowLeft size={12}/> Back to Sign In
              </button>
            </motion.div>
          )}

          {step === 'reset' && (
            <motion.div key="reset" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
              className="p-8 rounded-3xl bg-white/5 backdrop-blur-2xl border border-white/10 shadow-2xl">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center mb-5">
                <Lock size={22} className="text-emerald-400"/>
              </div>
              <h1 className="text-white text-xl font-bold mb-1">Set a New Password</h1>
              <p className="text-white/40 text-sm mb-6">Choose a new password for {email}</p>

              <form onSubmit={handleReset} className="space-y-4">
                <div>
                  <label className="text-white/50 text-xs font-medium mb-1.5 block">New Password</label>
                  <div className="relative">
                    <input type={showPwd ? 'text' : 'password'} value={newPwd} onChange={e => setNewPwd(e.target.value)}
                      placeholder="Minimum 8 characters"
                      className="w-full px-3.5 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white text-sm placeholder-white/25 focus:outline-none focus:border-emerald-500/60 focus:bg-white/8 transition-all pr-10"/>
                    <button type="button" onClick={() => setShowPwd(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60">
                      {showPwd ? <EyeOff size={14}/> : <Eye size={14}/>}
                    </button>
                  </div>
                  {newPwd && (
                    <div className="mt-1.5">
                      <div className="flex gap-1 mb-1">
                        {[0,1,2,3,4].map(i => (
                          <div key={i} className={cn('h-1 flex-1 rounded-full', i < s.score ? s.color : 'bg-white/10')}/>
                        ))}
                      </div>
                      <p className="text-white/30 text-[10px]">{s.label}</p>
                    </div>
                  )}
                </div>

                <div>
                  <label className="text-white/50 text-xs font-medium mb-1.5 block">Confirm New Password</label>
                  <input type={showPwd ? 'text' : 'password'} value={confirmPwd} onChange={e => setConfirmPwd(e.target.value)}
                    placeholder="Re-enter new password"
                    className="w-full px-3.5 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white text-sm placeholder-white/25 focus:outline-none focus:border-emerald-500/60 focus:bg-white/8 transition-all"/>
                  {confirmPwd && newPwd === confirmPwd && (
                    <p className="text-emerald-400 text-[10px] mt-1 flex items-center gap-1"><CheckCircle2 size={10}/> Passwords match</p>
                  )}
                </div>

                {resetError && (
                  <div className="flex items-center gap-2 px-3 py-2.5 bg-red-500/15 border border-red-500/30 rounded-xl">
                    <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0"/>
                    <p className="text-red-300 text-xs">{resetError}</p>
                  </div>
                )}

                <button type="submit" disabled={submitting}
                  className="w-full py-3 rounded-xl font-semibold text-sm bg-gradient-to-r from-emerald-600 to-emerald-500 text-white shadow-lg hover:from-emerald-500 hover:to-emerald-400 transition-all disabled:opacity-50 flex items-center justify-center gap-2">
                  {submitting ? <><Loader2 size={16} className="animate-spin"/> Updating…</> : 'Reset Password'}
                </button>
              </form>
            </motion.div>
          )}

          {step === 'done' && (
            <motion.div key="done" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
              className="p-8 rounded-3xl bg-white/5 backdrop-blur-2xl border border-emerald-500/20 shadow-2xl text-center">
              <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.1, type: 'spring' }}
                className="w-16 h-16 rounded-full bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 size={32} className="text-emerald-400"/>
              </motion.div>
              <h2 className="text-white text-xl font-bold mb-2">Password Reset</h2>
              <p className="text-white/40 text-sm mb-6 leading-relaxed">
                Your password has been updated. You can now sign in with your new password.
              </p>
              <button onClick={() => router.push('/login')}
                className="w-full py-3 rounded-xl font-semibold text-sm bg-gradient-to-r from-rail-600 to-rail-500 text-white shadow-lg shadow-rail-500/20 hover:from-rail-500 hover:to-rail-400 transition-all">
                Back to Sign In
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

