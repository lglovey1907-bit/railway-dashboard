'use client';
import { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard, UserCircle, Settings, Folder,
  Plus, X, LayoutGrid, Table2, FileText, AppWindow,
} from 'lucide-react';

// ── Mobile Bottom Navigation Bar + FAB ────────────────────────────────────────
export function MobileBottomNav() {
  const pathname = usePathname();
  const router   = useRouter();
  const { user } = useAuthStore();
  const [fabOpen, setFabOpen] = useState(false);

  const isAdmin = user?.role === 'admin' || user?.role === 'maintenance';

  const NAV = [
    { label: 'Home',     href: '/dashboard',         icon: LayoutDashboard },
    { label: 'Cells',    href: '/dashboard/cell',    icon: Folder },
    { label: 'Profile',  href: '/dashboard/profile', icon: UserCircle },
    { label: 'Settings', href: '/dashboard/settings',icon: Settings },
  ];

  const FAB_ACTIONS = [
    { label: 'Add Block',      icon: LayoutGrid, action: () => {} },
    { label: 'Create Window',  icon: AppWindow,  action: () => {} },
    { label: 'New Report',     icon: FileText,   action: () => router.push('/dashboard/reports') },
    { label: 'Add Table',      icon: Table2,     action: () => {} },
  ];

  return (
    <>
      {/* FAB action sheet */}
      {fabOpen && (
        <div className="fixed inset-0 z-[1400] md:hidden" onClick={() => setFabOpen(false)}>
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm"/>
          <div
            className="absolute bottom-20 right-4 w-52 bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden"
            onClick={e => e.stopPropagation()}>
            {FAB_ACTIONS.map(({ label, icon: Icon, action }) => (
              <button key={label}
                onClick={() => { action(); setFabOpen(false); }}
                className="flex items-center gap-3 w-full px-4 py-3.5 text-sm text-slate-700 hover:bg-rail-50 hover:text-rail-700 transition-colors border-b border-slate-100 last:border-0">
                <div className="w-8 h-8 rounded-xl bg-rail-50 flex items-center justify-center">
                  <Icon size={15} className="text-rail-600"/>
                </div>
                {label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Bottom bar */}
      <nav className="fixed bottom-0 left-0 right-0 z-[1300] md:hidden bg-white border-t border-slate-200"
        style={{ boxShadow: '0 -1px 8px rgba(15,23,42,0.08)', paddingBottom: 'env(safe-area-inset-bottom)' }}>
        <div className="flex items-center justify-around px-2 h-14">
          {NAV.map(({ label, href, icon: Icon }) => {
            const active = pathname === href || (href !== '/dashboard' && pathname.startsWith(href));
            return (
              <Link key={href} href={href}
                className={cn(
                  'flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl transition-colors min-w-0',
                  active ? 'text-rail-600' : 'text-slate-400 hover:text-slate-600'
                )}>
                <Icon size={20} strokeWidth={active ? 2.5 : 1.8}/>
                <span className={cn('text-[10px] font-medium truncate', active ? 'text-rail-600' : 'text-slate-400')}>
                  {label}
                </span>
              </Link>
            );
          })}

          {/* FAB */}
          <button
            onClick={() => setFabOpen(v => !v)}
            className={cn(
              'w-12 h-12 rounded-full flex items-center justify-center shadow-lg transition-all duration-200',
              fabOpen
                ? 'bg-slate-700 rotate-45 shadow-slate-400/40'
                : 'bg-rail-600 hover:bg-rail-700 shadow-rail-500/40'
            )}>
            {fabOpen ? <X size={20} className="text-white"/> : <Plus size={22} className="text-white"/>}
          </button>
        </div>
      </nav>
    </>
  );
}
