'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import { Bell, Search, Plus, ChevronDown, Table2, Users, FileText, FolderPlus } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TopBarProps {
 title: string;
 subtitle?: string;
 isDark?: boolean;
 toggleTheme?: () => void;
}

export function TopBar({ title, subtitle }: TopBarProps) {
 const { user } = useAuthStore();
 const router = useRouter();
 const [showCreate, setShowCreate] = useState(false);

 const today = new Date().toLocaleDateString('en-IN', {
 weekday: 'short', day: 'numeric', month: 'short', year: 'numeric',
 });

 const CREATE_OPTIONS = [
 { label: 'New Table', icon: Table2, href: null },
 { label: 'Add Staff', icon: Users, href: '/dashboard/users' },
 { label: 'New Report', icon: FileText, href: '/dashboard/reports' },
 { label: 'New Document', icon: FolderPlus, href: null },
 ];

 return (
 <header className="h-[60px] flex-shrink-0 flex items-center justify-between px-6 bg-white border-b border-slate-200"style={{ boxShadow: '0 1px 3px rgba(15,23,42,0.06)' }}>
 {/* Left: breadcrumb title */}
 <div className="flex items-center gap-2 min-w-0">
 <div>
 <h1 className="text-[15px] font-bold text-slate-900 leading-tight">{title}</h1>
 {subtitle && <p className="text-[11px] text-slate-400">{subtitle}</p>}
 </div>
 </div>

 {/* Right: search + actions */}
 <div className="flex items-center gap-2">
 {/* Global search */}
 <div className="relative hidden md:flex items-center">
 <Search size={13} className="absolute left-3 text-slate-400"/>
 <input placeholder="Search…"readOnly onClick={() => {}}
 className="w-48 pl-8 pr-3 py-1.5 text-[12px] bg-slate-50 border border-slate-200 rounded-lg text-slate-600 placeholder-slate-400 focus:outline-none focus:border-rail-400 focus:bg-white transition-all focus:w-64 cursor-pointer"
 />
 <kbd className="absolute right-2.5 text-[10px] text-slate-300 font-mono hidden lg:block">⌘K</kbd>
 </div>

 {/* Date */}
 <span className="text-[11px] text-slate-400 hidden lg:block">{today}</span>

 {/* Notifications */}
 <button className="relative p-2 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-slate-700 transition-colors">
 <Bell size={15}/>
 <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-rail-600"/>
 </button>

 {/* Quick Create */}
 <div className="relative">
 <button onClick={() => setShowCreate(v => !v)}
 className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rail-600 hover:bg-rail-700 text-white text-[12px] font-semibold transition-all shadow-sm hover:shadow-md">
 <Plus size={13}/> Create <ChevronDown size={11} className={cn('transition-transform', showCreate && 'rotate-180')}/>
 </button>
 {showCreate && (
 <div className="absolute right-0 top-full mt-1.5 w-44 dropdown z-50"onClick={() => setShowCreate(false)}>
 {CREATE_OPTIONS.map(opt => (
 <button key={opt.label}
 onClick={() => opt.href && router.push(opt.href)}
 className="dropdown-item flex items-center gap-2.5 w-full">
 <opt.icon size={13} className="text-slate-400"/>
 {opt.label}
 </button>
 ))}
 </div>
 )}
 </div>
 </div>
 </header>
 );
}
