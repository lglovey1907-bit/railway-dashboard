'use client';
import { useState } from 'react';
import { motion } from 'framer-motion';
import { useAuthStore } from '@/store/authStore';
import { KeyRound, Lock, Eye, EyeOff, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

function strength(pwd: string): { score: number; label: string; color: string } {
 let score = 0;
 if (pwd.length >= 8) score++;
 if (/[A-Z]/.test(pwd)) score++;
 if (/[a-z]/.test(pwd)) score++;
 if (/[0-9]/.test(pwd)) score++;
 if (/[^A-Za-z0-9]/.test(pwd)) score++;
 const labels = ['Very Weak', 'Weak', 'Fair', 'Good', 'Strong', 'Very Strong'];
 const colors = ['bg-red-500', 'bg-red-400', 'bg-amber-400', 'bg-yellow-400', 'bg-emerald-400', 'bg-emerald-500'];
 return { score, label: labels[score], color: colors[score] };
}

export function ChangePasswordGate({ onComplete }: { onComplete: () => void }) {
 const { user, updateUser } = useAuthStore();
 const [current, setCurrent] = useState('');
 const [next, setNext] = useState('');
 const [confirm, setConfirm] = useState('');
 const [showCurrent, setShowCurrent] = useState(false);
 const [showNext, setShowNext] = useState(false);
 const [error, setError] = useState('');
 const [submitting, setSubmitting] = useState(false);

 const s = strength(next);

 const handleSubmit = async (e: React.FormEvent) => {
 e.preventDefault();
 setError('');
 if (!current.trim()) { setError('Enter your current (temporary) password'); return; }
 if (next.length < 8) { setError('New password must be at least 8 characters'); return; }
 if (s.score < 3) { setError('Choose a stronger password (mix upper/lowercase, numbers, symbols)'); return; }
 if (next !== confirm) { setError('Passwords do not match'); return; }
 if (next === current) { setError('New password must be different from the temporary password'); return; }

 setSubmitting(true);
 await new Promise(r => setTimeout(r, 900));
 updateUser({ mustChangePassword: false });
 setSubmitting(false);
 onComplete();
 };

 return (
 <div className="fixed inset-0 z-[100] bg-slate-950/95 backdrop-blur-md flex items-center justify-center p-4">
 <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
 className="w-full max-w-md p-8 rounded-3xl bg-white/5 backdrop-blur-2xl border border-amber-500/20 shadow-2xl">

 <div className="w-12 h-12 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center mb-5">
 <KeyRound size={22} className="text-amber-400"/>
 </div>
 <h2 className="text-white text-xl font-bold mb-1">Set a New Password</h2>
 <p className="text-white/40 text-sm mb-6">
 Welcome, {user?.name}. For security, you must change your temporary password before continuing.
 </p>

 <form onSubmit={handleSubmit} className="space-y-4">
 <div>
 <label className="text-white/50 text-xs font-medium mb-1.5 block">Temporary Password</label>
 <div className="relative">
 <input type={showCurrent ? 'text' : 'password'} value={current}
 onChange={e => setCurrent(e.target.value)}
 placeholder="Password received via email"
 className="w-full px-3.5 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white text-sm placeholder-white/25 focus:outline-none focus:border-amber-500/60 focus:bg-white/8 transition-all pr-10"/>
 <button type="button"onClick={() => setShowCurrent(s => !s)}
 className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60">
 {showCurrent ? <EyeOff size={14}/> : <Eye size={14}/>}
 </button>
 </div>
 </div>

 <div>
 <label className="text-white/50 text-xs font-medium mb-1.5 block">New Password</label>
 <div className="relative">
 <input type={showNext ? 'text' : 'password'} value={next}
 onChange={e => setNext(e.target.value)}
 placeholder="Minimum 8 characters"
 className="w-full px-3.5 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white text-sm placeholder-white/25 focus:outline-none focus:border-amber-500/60 focus:bg-white/8 transition-all pr-10"/>
 <button type="button"onClick={() => setShowNext(s => !s)}
 className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60">
 {showNext ? <EyeOff size={14}/> : <Eye size={14}/>}
 </button>
 </div>
 {next && (
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
 <input type={showNext ? 'text' : 'password'} value={confirm}
 onChange={e => setConfirm(e.target.value)}
 placeholder="Re-enter new password"
 className="w-full px-3.5 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white text-sm placeholder-white/25 focus:outline-none focus:border-amber-500/60 focus:bg-white/8 transition-all"/>
 {confirm && next === confirm && (
 <p className="text-emerald-400 text-[10px] mt-1 flex items-center gap-1"><CheckCircle2 size={10}/> Passwords match</p>
 )}
 </div>

 {error && (
 <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
 className="flex items-center gap-2 px-3 py-2.5 bg-red-500/15 border border-red-500/30 rounded-xl">
 <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0"/>
 <p className="text-red-300 text-xs">{error}</p>
 </motion.div>
 )}

 <button type="submit"disabled={submitting}
 className={cn(
 'w-full py-3 rounded-xl font-semibold text-sm transition-all flex items-center justify-center gap-2',
 'bg-gradient-to-r from-amber-600 to-amber-500 text-white shadow-lg shadow-amber-500/20',
 'hover:from-amber-500 hover:to-amber-400 transition-all',
 'disabled:opacity-50 disabled:cursor-not-allowed'
 )}>
 {submitting ? <><Loader2 size={16} className="animate-spin"/> Updating…</> : <><Lock size={16}/> Update Password & Continue</>}
 </button>
 </form>
 </motion.div>
 </div>
 );
}
