'use client';
import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import { Sidebar, NAV_ITEMS } from '@/components/layout/Sidebar';
import { TopBar } from '@/components/layout/TopBar';
import { ChangePasswordGate } from '@/components/auth/ChangePasswordGate';
import { getCellBySlug } from '@/lib/cells/cellRegistry';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, isInitialized, initialize } = useAuthStore();
  const router = useRouter();
  const pathname = usePathname();
  const [gatePassed, setGatePassed] = useState(false);

  useEffect(() => {
    initialize();
  }, [initialize]);

  useEffect(() => {
    if (isInitialized && !user) {
      router.replace('/login');
    }
  }, [user, isInitialized, router]);

  if (!isInitialized || !user) {
    return (
      <div className="min-h-screen bg-surface-page flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-rail-200 border-t-rail-600 rounded-full animate-spin"/>
          <p className="text-slate-400 text-sm">Loading…</p>
        </div>
      </div>
    );
  }

  // ── Page title resolution ──────────────────────────────────────────────────
  const TITLE_OVERRIDES: Record<string, { title: string; subtitle: string }> = {
    '/dashboard':                  { title: 'Commercial Overview',    subtitle: 'Delhi Division · Northern Railway' },
    '/dashboard/users':            { title: 'User Management',        subtitle: 'Team members & access control' },
    '/dashboard/userrequests':     { title: 'User Requests',          subtitle: 'Pending additions, removals, and transfers' },
    '/dashboard/staff':            { title: 'DRM Office Staff',       subtitle: 'Master Employee Database' },
    '/dashboard/cellmanager':      { title: 'Cell Management',        subtitle: 'Create, edit, and manage department cells' },
    '/dashboard/datasources':      { title: 'Data Sources',           subtitle: 'Configure data connections' },
    '/dashboard/settings':         { title: 'System Settings',        subtitle: 'Dashboard configuration' },
    '/dashboard/confidential':     { title: 'Confidential Reports',   subtitle: 'Access-controlled report sharing' },
    '/dashboard/profile':          { title: 'My Profile',             subtitle: 'Employee profile & settings' },
    '/dashboard/reports':          { title: 'Reports',                subtitle: 'Generate & manage reports' },
    '/dashboard/debug':            { title: 'Debug Inspector',        subtitle: 'Developer tools' },
  };

  let info: { title: string; subtitle: string };
  if (pathname.startsWith('/dashboard/cell/')) {
    const slug = pathname.replace('/dashboard/cell/', '');
    const cellRec = getCellBySlug(slug);
    info = cellRec
      ? { title: cellRec.name, subtitle: `${cellRec.name} · Delhi Division Commercial Branch` }
      : { title: 'Cell', subtitle: 'Delhi Division · NR' };
  } else {
    const navMatch = NAV_ITEMS.find(item => item.href === pathname);
    info = TITLE_OVERRIDES[pathname]
      ?? (navMatch ? { title: navMatch.label, subtitle: 'Delhi Division · NR' }
        : { title: 'Dashboard', subtitle: 'Delhi Division · NR' });
  }

  return (
    <>
      {user.mustChangePassword && !gatePassed && (
        <ChangePasswordGate onComplete={() => setGatePassed(true)}/>
      )}
      <div className="flex h-screen overflow-hidden min-h-screen bg-surface-page">
        <Sidebar/>
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          <TopBar title={info.title} subtitle={info.subtitle}/>
          <main className="flex-1 overflow-y-auto p-6 custom-scroll">
            {children}
          </main>
        </div>
      </div>
    </>
  );
}
