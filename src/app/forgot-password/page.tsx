'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Train, Mail, ArrowLeft, CheckCircle2, Loader2, KeyRound } from 'lucide-react';
import { cn } from '@/lib/utils';
import { mockUsers } from '@/lib/data/mockData';

export default function ForgotPasswordPage() {
 const router = useRouter();
 const [email, setEmail] = useState('');
 const [error, setError] = useState('');
 const [submitting, setSubmitting] = useState(false);
 const [sent, setSent] = useState(false);

 const handleSubmit = async (e: React.FormEvent) => {
 e.preventDefault();
 setError('');
 if (!email.trim()) { setError('Please enter your registered email address'); return; }
 if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) { setError('Enter a valid email address'); return; }

 setSubmitting(true);
 await new Promise(r => setTimeout(r, 1000));
 setSubmitting(false);

 // For demo: don't reveal whether account exists (security best practice)
 setSent(true);
 };

 return (
 <div className="min-h-screen bg-gradient-to-br from-slate-950 via-rail-950 to-slate-900 flex items-center justify-center p-4 relative overflow-hidden">
 <div className="absolute inset-0 overflow-hidden pointer-events-none">
 <div className="absolute -top-40 -right-40 w-80 h-80 rounded-full bg-rail-600/10 blur-3xl"/>
 <div className="absolute -bottom-40 -left-40 w-80 h-80 rounded-full bg-blue-600/10 blur-3xl"/>
 </div>

 <div className="w-full max-w-md relative z-10">
 <AnimatePresence mode="wait">
 {!sent ? (
 <motion.div key="form"initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
 className="p-8 rounded-3xl bg-white/5 backdrop-blur-2xl border border-white/10 shadow-2xl">

 <div className="w-12 h-12 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center mb-5">
 <KeyRound size={22} className="text-amber-400"/>
 </div>
 <h1 className="text-white text-xl font-bold mb-1">Forgot Password</h1>
 <p className="text-white/40 text-sm mb-6">
 Enter your registered email address (User ID). We'll send you a link to reset your password.
 </p>

 <form onSubmit={handleSubmit} className="space-y-4">
 <div>
 <label className="text-white/50 text-xs font-medium mb-1.5 flex items-center gap-1.5">
 <Mail size={11} className="text-white/30"/> Email Address
 </label>
 <input type="email"value={email} onChange={e => { setEmail(e.target.value); setError(''); }}
 placeholder="yourname@delhi.nr.in"
 className="w-full px-3.5 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white text-sm placeholder-white/25 focus:outline-none focus:border-rail-500/60 focus:bg-white/8 transition-all"/>
 {error && <p className="text-red-400 text-[10px] mt-1">{error}</p>}
 </div>

 <button type="submit"disabled={submitting}
 className={cn(
 'w-full py-3 rounded-xl font-semibold text-sm transition-all flex items-center justify-center gap-2',
 'bg-gradient-to-r from-rail-600 to-rail-500 text-white shadow-lg shadow-rail-500/20',
 'hover:from-rail-500 hover:to-rail-400 hover:shadow-xl hover:shadow-rail-400/30',
 'disabled:opacity-50 disabled:cursor-not-allowed'
 )}>
 {submitting ? (
 <><Loader2 size={16} className="animate-spin"/> Sending…</>
 ) : 'Send Reset Link'}
 </button>
 </form>

 <button onClick={() => router.push('/login')}
 className="w-full mt-5 flex items-center justify-center gap-1.5 text-white/30 hover:text-white/60 text-xs transition-colors">
 <ArrowLeft size={12}/> Back to Sign In
 </button>
 </motion.div>
 ) : (
 <motion.div key="sent"initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
 className="p-8 rounded-3xl bg-white/5 backdrop-blur-2xl border border-emerald-500/20 shadow-2xl text-center">
 <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.1, type: 'spring' }}
 className="w-16 h-16 rounded-full bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center mx-auto mb-4">
 <CheckCircle2 size={32} className="text-emerald-400"/>
 </motion.div>
 <h2 className="text-white text-xl font-bold mb-2">Check Your Email</h2>
 <p className="text-white/40 text-sm mb-6 leading-relaxed">
 If an account exists for <strong className="text-white/70">{email}</strong>, a password reset link has been sent. Please check your inbox and spam folder.
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
