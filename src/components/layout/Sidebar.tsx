'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import { cn } from '@/lib/utils';
import {
 LayoutDashboard, TrendingUp, Ticket, ShieldCheck, Scale,
 Megaphone, ClipboardList, Store, Package, Sparkles,
 UtensilsCrossed, ParkingSquare, Radio, Briefcase,
 MessageCircle, Tag, Phone, Monitor, Users2, FolderOpen,
 Settings, Database, FileText, LogOut, ChevronDown,
 BarChart3, Shield, UserCircle, Folder, Building2, Globe, Truck,
 Layers, Activity, Boxes, LayoutGrid, ChevronRight, Train,
} from 'lucide-react';
import { getAllCells, type CellRecord, BUILTIN_CELLS } from '@/lib/cells/cellRegistry';
import { useActiveCells } from '@/lib/cells/useCellList';

const ICON_MAP: Record<string, React.ElementType> = {
 ClipboardList, Users2, ShieldCheck, Scale, Megaphone, Ticket, BarChart3,
 Store, Package, Sparkles, UtensilsCrossed, ParkingSquare, Radio, Briefcase,
 MessageCircle, Tag, Phone, Monitor, FolderOpen, Building2, Globe, Truck,
 Layers, Activity, Database, FileText, Settings, Boxes, Folder, LayoutGrid,
};

export interface NavItem {
 label: string; href: string; icon: React.ElementType;
 cell?: string; adminOnly?: boolean; maintenanceOnly?: boolean;
}

const STATIC_TOP: NavItem[] = [
 { label: 'Overview', href: '/dashboard', icon: LayoutDashboard },
 { label: 'My Profile', href: '/dashboard/profile', icon: UserCircle },
];
const STATIC_ADMIN: NavItem[] = [
 { label: 'Users', href: '/dashboard/users', icon: Users2, adminOnly: true },
 { label: 'User Requests', href: '/dashboard/userrequests', icon: ClipboardList, adminOnly: true },
 { label: 'Cell Management',href: '/dashboard/cellmanager', icon: LayoutGrid, adminOnly: true },
 { label: 'DRM Office Staff',href: '/dashboard/staff', icon: Database, adminOnly: true },
 { label: 'Data Sources', href: '/dashboard/datasources', icon: Database, adminOnly: true },
 { label: 'Reports', href: '/dashboard/reports', icon: FileText },
 { label: 'Confidential', href: '/dashboard/confidential', icon: Shield },
 { label: 'Settings', href: '/dashboard/settings', icon: Settings },
];

export const NAV_ITEMS: NavItem[] = [
 ...STATIC_TOP,
 ...BUILTIN_CELLS.map(c => ({
 label: c.name, href: `/dashboard/cell/${c.slug}`,
 icon: ICON_MAP[c.iconKey] ?? Folder, cell: c.name,
 })),
 ...STATIC_ADMIN,
];

function NavBtn({ href, label, icon: Icon, active }: { href: string; label: string; icon: React.ElementType; active: boolean }) {
 return (
 <Link href={href}
 className={cn('flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] transition-all duration-150 relative',
 active
 ? 'bg-rail-50 text-rail-700 font-semibold'
 : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 font-medium'
 )}>
 {active && <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-rail-600 rounded-r-full"/>}
 <Icon size={15} className={active ? 'text-rail-600' : 'text-slate-400'}/>
 <span className="truncate">{label}</span>
 </Link>
 );
}

export function Sidebar() {
 const { user, logout } = useAuthStore();
 const pathname = usePathname();
 const router = useRouter();
 const cells = useActiveCells();
 const [cellsOpen, setCellsOpen] = useState(true);
 const [adminOpen, setAdminOpen] = useState(true);

 const isAdmin = user?.role === 'admin' || user?.role === 'maintenance';
 const isIncharge = user?.role === 'incharge';
 const isUser = user?.role === 'user';

 const handleLogout = () => { logout(); router.push('/login'); };

 const initials = user?.name?.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() ?? '??';

 return (
 <aside className="w-[260px] flex-shrink-0 flex flex-col h-screen bg-white border-r border-slate-200 overflow-hidden">
 {/* Brand header */}
 <div className="flex items-center gap-3 px-4 py-4 border-b border-slate-100">
 <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-navy-800 to-rail-600 flex items-center justify-center shadow-sm flex-shrink-0">
 <Train size={18} className="text-white"/>
 </div>
 <div className="min-w-0">
 <p className="text-[13px] font-bold text-slate-900 leading-tight">Commercial Branch</p>
 <p className="text-[10px] text-slate-400 truncate">Delhi Division · NR</p>
 </div>
 </div>

 {/* Scrollable nav */}
 <nav className="flex-1 overflow-y-auto custom-scroll py-3 px-2 space-y-0.5">
 {/* Workspace */}
 <div className="mb-3">
 <p className="section-label px-2 mb-1">Workspace</p>
 {STATIC_TOP.map(item => (
 <NavBtn key={item.href} href={item.href} label={item.label} icon={item.icon} active={pathname === item.href}/>
 ))}
 </div>

 {/* Cells */}
 <div className="mb-3">
 <button onClick={() => setCellsOpen(o => !o)}
 className="section-label px-2 mb-1 flex items-center gap-1 w-full hover:text-slate-600 transition-colors">
 Cells
 <ChevronDown size={10} className={cn('transition-transform ml-auto', cellsOpen ? '' : '-rotate-90')}/>
 </button>
 {cellsOpen && (
 <div className="space-y-0.5">
 {cells.length === 0
 ? <p className="text-[11px] text-slate-300 px-3 py-1">No active cells</p>
 : cells.map(c => {
 const href = `/dashboard/cell/${c.slug}`;
 const Icon = ICON_MAP[c.iconKey] ?? Folder;
 const active = pathname === href;
 if ((isUser || isIncharge) && user?.cell !== c.name) return null;
 return <NavBtn key={c.id} href={href} label={c.name} icon={Icon} active={active}/>;
 })
 }
 </div>
 )}
 </div>

 {/* Administration */}
 {(isAdmin || !isUser) && (
 <div>
 <button onClick={() => setAdminOpen(o => !o)}
 className="section-label px-2 mb-1 flex items-center gap-1 w-full hover:text-slate-600 transition-colors">
 Administration
 <ChevronDown size={10} className={cn('transition-transform ml-auto', adminOpen ? '' : '-rotate-90')}/>
 </button>
 {adminOpen && (
 <div className="space-y-0.5">
 {STATIC_ADMIN.map(item => {
 if (item.adminOnly && (isUser || isIncharge)) return null;
 if (item.maintenanceOnly && user?.role !== 'maintenance') return null;
 return <NavBtn key={item.href} href={item.href} label={item.label} icon={item.icon} active={pathname === item.href}/>;
 })}
 </div>
 )}
 </div>
 )}
 </nav>

 {/* User footer */}
 <div className="border-t border-slate-100 p-3">
 <div className="flex items-center gap-2.5 px-2 py-2 rounded-lg hover:bg-slate-50 transition-colors group">
 <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-rail-500 to-rail-700 flex items-center justify-center text-[11px] font-bold text-white flex-shrink-0">
 {initials}
 </div>
 <div className="flex-1 min-w-0">
 <p className="text-[12px] font-semibold text-slate-800 truncate">{user?.name}</p>
 <p className="text-[10px] text-slate-400 truncate">{user?.designation ?? user?.role}</p>
 </div>
 <button onClick={handleLogout} title="Sign out"
 className="p-1.5 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-red-50 text-slate-300 hover:text-red-500 transition-all">
 <LogOut size={13}/>
 </button>
 </div>
 </div>
 </aside>
 );
}
