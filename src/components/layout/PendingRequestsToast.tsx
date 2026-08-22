'use client';
import { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import { getPendingRequests } from '@/lib/staff/userRequests';
import { Bell, ArrowRight, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export function PendingRequestsToast() {
  const { user } = useAuthStore();
  const router = useRouter();
  const pathname = usePathname();
  const isAdmin = user?.role === 'admin' || user?.role === 'maintenance';
  const [pendingCount, setPendingCount] = useState(0);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (!isAdmin) return;
    const check = () => setPendingCount(getPendingRequests().length);
    check();
    const iv = setInterval(check, 5000); // Check every 5s for new requests
    return () => clearInterval(iv);
  }, [isAdmin]);

  // Hide toast if on the users page so it doesn't overlap the actual tab
  if (!isAdmin || pendingCount === 0 || dismissed || pathname === '/dashboard/users') return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 50, scale: 0.9 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 50, scale: 0.9 }}
        className="fixed bottom-6 right-6 z-[9999] bg-white border border-amber-200 shadow-2xl rounded-2xl p-4 w-72 flex items-start gap-3"
      >
        <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center shrink-0">
          <Bell size={20} className="text-amber-600 animate-pulse" />
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="font-bold text-slate-900 text-sm">Action Required</h4>
          <p className="text-xs text-slate-500 mt-0.5 mb-3 leading-relaxed">
            You have {pendingCount} pending {pendingCount === 1 ? 'request' : 'requests'} waiting for your approval.
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => { setDismissed(true); router.push('/dashboard/users'); }}
              className="flex-1 bg-amber-600 text-white text-xs font-semibold py-1.5 px-3 rounded-xl hover:bg-amber-700 transition-colors flex items-center justify-center gap-1"
            >
              Review Now <ArrowRight size={12} />
            </button>
            <button
              onClick={() => setDismissed(true)}
              className="px-3 py-1.5 text-xs font-medium text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
            >
              Dismiss
            </button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
