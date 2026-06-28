'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import { useSidebarStore } from '@/store/sidebarStore';
import {
  Bell, Search, Plus, ChevronDown, Table2, Users, FileText,
  FolderPlus, Menu, PanelLeftOpen, PanelLeftClose,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface TopBarProps {
  title: string;
  subtitle?: string;
}

export function TopBar({ title, subtitle }: TopBarProps) {
  const { user } = useAuthStore();
  const router   = useRouter();
  const { isCollapsed, toggle, toggleMobile } = useSidebarStore();
  const [showCreate, setShowCreate] = useState(false);

  const today = new Date().toLocaleDateString('en-IN', {
    weekday: 'short', day: 'numeric', month: 'short', year: 'numeric',
  });

  const CREATE_OPTIONS = [
    { label: 'New Table',    icon: Table2,     href: null },
    { label: 'Add Staff',    icon: Users,      href: '/dashboard/users' },
    { label: 'New Report',   icon: FileText,   href: '/dashboard/reports' },
    { label: 'New Document', icon: FolderPlus, href: null },
  ];

  return (
    <header
      className="h-[60px] flex-shrink-0 flex items-center justify-between px-3 md:px-5 bg-white border-b border-slate-200 z-50"
      style={{ boxShadow: '0 1px 3px rgba(15,23,42,0.06)' }}>

      {/* ── Left: toggle + breadcrumb ─────────────────────────────────── */}
      <div className="flex items-center gap-2 min-w-0">
        {/* Desktop: sidebar collapse toggle */}
        <button
          onClick={toggle}
          className="hidden md:flex items-center justify-center w-8 h-8 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors flex-shrink-0"
          title={isCollapsed ? 'Expand sidebar (⌘B)' : 'Collapse sidebar (⌘B)'}>
          {isCollapsed
            ? <PanelLeftOpen size={16}/>
            : <PanelLeftClose size={16}/>
          }
        </button>

        {/* Mobile: hamburger → open drawer */}
        <button
          onClick={toggleMobile}
          className="flex md:hidden items-center justify-center w-8 h-8 rounded-lg hover:bg-slate-100 text-slate-500 transition-colors flex-shrink-0">
          <Menu size={18}/>
        </button>

        {/* Title */}
        <div className="min-w-0">
          <h1 className="text-[14px] md:text-[15px] font-bold text-slate-900 leading-tight truncate">{title}</h1>
          {subtitle && (
            <p className="text-[10px] text-slate-400 hidden sm:block truncate">{subtitle}</p>
          )}
        </div>
      </div>

      {/* ── Right: search + actions ───────────────────────────────────── */}
      <div className="flex items-center gap-1.5 md:gap-2">
        {/* Global search — hidden on small mobile */}
        <div className="relative hidden sm:flex items-center">
          <Search size={13} className="absolute left-3 text-slate-400"/>
          <input
            placeholder="Search…"
            readOnly
            onClick={() => {}}
            className="w-36 md:w-48 pl-8 pr-3 py-1.5 text-[12px] bg-slate-50 border border-slate-200 rounded-lg text-slate-600 placeholder-slate-400 focus:outline-none focus:border-rail-400 focus:bg-white transition-all focus:w-56 md:focus:w-64 cursor-pointer"
          />
          <kbd className="absolute right-2.5 text-[10px] text-slate-300 font-mono hidden lg:block">⌘K</kbd>
        </div>

        {/* Date — large screens only */}
        <span className="text-[11px] text-slate-400 hidden xl:block">{today}</span>

        {/* Notifications */}
        <button className="relative p-2 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-slate-700 transition-colors">
          <Bell size={15}/>
          <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-rail-600"/>
        </button>

        {/* Quick Create */}
        <div className="relative">
          <button
            onClick={() => setShowCreate(v => !v)}
            className="flex items-center gap-1.5 px-2.5 md:px-3 py-1.5 rounded-lg bg-rail-600 hover:bg-rail-700 text-white text-[12px] font-semibold transition-all shadow-sm hover:shadow-md">
            <Plus size={13}/>
            <span className="hidden sm:inline">Create</span>
            <ChevronDown size={11} className={cn('transition-transform hidden sm:block', showCreate && 'rotate-180')}/>
          </button>
          {showCreate && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setShowCreate(false)}/>
              <div className="absolute right-0 top-full mt-1.5 w-44 dropdown z-50" onClick={() => setShowCreate(false)}>
                {CREATE_OPTIONS.map(opt => (
                  <button key={opt.label}
                    onClick={() => opt.href && router.push(opt.href)}
                    className="dropdown-item flex items-center gap-2.5 w-full">
                    <opt.icon size={13} className="text-slate-400"/>
                    {opt.label}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
