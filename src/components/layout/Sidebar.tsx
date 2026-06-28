'use client';
import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import { useSidebarStore } from '@/store/sidebarStore';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard, TrendingUp, Ticket, ShieldCheck, Scale,
  Megaphone, ClipboardList, Store, Package, Sparkles,
  UtensilsCrossed, ParkingSquare, Radio, Briefcase,
  MessageCircle, Tag, Phone, Monitor, Users2, FolderOpen,
  Settings, Database, FileText, LogOut, ChevronDown,
  BarChart3, Shield, UserCircle, Folder, Building2, Globe, Truck,
  Layers, Activity, Boxes, LayoutGrid, ChevronRight, Train,
  PanelLeftClose, PanelLeftOpen, X,
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
  { label: 'Overview',   href: '/dashboard',         icon: LayoutDashboard },
  { label: 'My Profile', href: '/dashboard/profile', icon: UserCircle },
];
const STATIC_ADMIN: NavItem[] = [
  { label: 'Users',          href: '/dashboard/users',        icon: Users2,        adminOnly: true },
  { label: 'User Requests',  href: '/dashboard/userrequests', icon: ClipboardList, adminOnly: true },
  { label: 'Cell Management',href: '/dashboard/cellmanager',  icon: LayoutGrid,    adminOnly: true },
  { label: 'DRM Office Staff',href: '/dashboard/staff',       icon: Database,      adminOnly: true },
  { label: 'Data Sources',   href: '/dashboard/datasources',  icon: Database,      adminOnly: true },
  { label: 'Reports',        href: '/dashboard/reports',      icon: FileText },
  { label: 'Confidential',   href: '/dashboard/confidential', icon: Shield },
  { label: 'Settings',       href: '/dashboard/settings',     icon: Settings },
];

export const NAV_ITEMS: NavItem[] = [
  ...STATIC_TOP,
  ...BUILTIN_CELLS.map(c => ({
    label: c.name, href: `/dashboard/cell/${c.slug}`,
    icon: ICON_MAP[c.iconKey] ?? Folder, cell: c.name,
  })),
  ...STATIC_ADMIN,
];

// ── Tooltip wrapper for collapsed-rail icons ──────────────────────────────────
function Tooltip({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="relative group/tip flex items-center">
      {children}
      <div className="pointer-events-none absolute left-full ml-2 z-[9999] px-2.5 py-1.5 bg-slate-900 text-white text-xs rounded-lg whitespace-nowrap
        opacity-0 group-hover/tip:opacity-100 translate-x-1 group-hover/tip:translate-x-0 transition-all duration-150 shadow-lg">
        {label}
        <div className="absolute top-1/2 -left-1 -translate-y-1/2 w-2 h-2 bg-slate-900 rotate-45"/>
      </div>
    </div>
  );
}

// ── Full nav button (expanded) ────────────────────────────────────────────────
function NavBtn({ href, label, icon: Icon, active, onClick }: {
  href: string; label: string; icon: React.ElementType; active: boolean; onClick?: () => void;
}) {
  return (
    <Link href={href} onClick={onClick}
      className={cn(
        'flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] transition-all duration-150 relative',
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

// ── Collapsed icon-rail button ────────────────────────────────────────────────
function RailBtn({ href, label, icon: Icon, active, onClick }: {
  href: string; label: string; icon: React.ElementType; active: boolean; onClick?: () => void;
}) {
  return (
    <Tooltip label={label}>
      <Link href={href} onClick={onClick}
        className={cn(
          'w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-150 relative',
          active
            ? 'bg-rail-50 text-rail-600'
            : 'text-slate-400 hover:bg-slate-100 hover:text-slate-700'
        )}>
        {active && <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-rail-600 rounded-r-full"/>}
        <Icon size={17}/>
      </Link>
    </Tooltip>
  );
}

// ── Main Sidebar component ────────────────────────────────────────────────────
export function Sidebar() {
  const { user, logout } = useAuthStore();
  const pathname = usePathname();
  const router   = useRouter();
  const cells    = useActiveCells();

  const { isCollapsed, isMobileOpen, toggle, setMobileOpen } = useSidebarStore();

  const [cellsOpen, setCellsOpen] = useState(true);
  const [adminOpen, setAdminOpen] = useState(true);

  const isAdmin    = user?.role === 'admin' || user?.role === 'maintenance';
  const isIncharge = user?.role === 'incharge';
  const isUser     = user?.role === 'user';

  const handleLogout = () => { logout(); router.push('/login'); };

  const initials = user?.name?.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() ?? '??';

  // Close mobile drawer on route change
  useEffect(() => { setMobileOpen(false); }, [pathname, setMobileOpen]);

  // Close mobile drawer on outside click
  const handleBackdropClick = () => setMobileOpen(false);

  // ── Filtered cell list ──────────────────────────────────────────────────────
  const visibleCells = cells.filter(c => {
    if (!isUser && !isIncharge) return true;
    const userCells: string[] = (user as any)?.cells ?? (user?.cell ? [user.cell] : []);
    if (userCells.length > 0) return userCells.includes(c.name);
    try {
      const mems: any[] = JSON.parse(localStorage.getItem('rly_cell_memberships') ?? '[]');
      const approved = mems.filter((m: any) => m.employeeId === user?.id && m.approvalStatus === 'approved').map((m: any) => m.cellName);
      if (approved.length > 0) return approved.includes(c.name);
      return user?.cell === c.name;
    } catch { return user?.cell === c.name; }
  });

  // ── Shared nav content (used in both expanded & mobile drawer) ──────────────
  const NavContent = ({ onLinkClick }: { onLinkClick?: () => void }) => (
    <nav className="flex-1 overflow-y-auto custom-scroll py-3 px-2 space-y-0.5">
      {/* Workspace */}
      <div className="mb-3">
        <p className="section-label px-2 mb-1">Workspace</p>
        {STATIC_TOP.map(item => (
          <NavBtn key={item.href} href={item.href} label={item.label} icon={item.icon}
            active={pathname === item.href} onClick={onLinkClick}/>
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
            {visibleCells.length === 0
              ? <p className="text-[11px] text-slate-300 px-3 py-1">No active cells</p>
              : visibleCells.map(c => {
                  const href = `/dashboard/cell/${c.slug}`;
                  const Icon = ICON_MAP[c.iconKey] ?? Folder;
                  return <NavBtn key={c.id} href={href} label={c.name} icon={Icon}
                    active={pathname === href} onClick={onLinkClick}/>;
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
                return <NavBtn key={item.href} href={item.href} label={item.label} icon={item.icon}
                  active={pathname === item.href} onClick={onLinkClick}/>;
              })}
            </div>
          )}
        </div>
      )}
    </nav>
  );

  // ── Collapsed icon rail ─────────────────────────────────────────────────────
  const RailContent = () => (
    <nav className="flex-1 overflow-y-auto custom-scroll py-3 flex flex-col items-center gap-1 px-1">
      {/* Workspace items */}
      <div className="w-full flex flex-col items-center gap-1 mb-2">
        {STATIC_TOP.map(item => (
          <RailBtn key={item.href} href={item.href} label={item.label} icon={item.icon} active={pathname === item.href}/>
        ))}
      </div>

      {/* Divider */}
      <div className="w-6 h-px bg-slate-200 my-1"/>

      {/* Cell icons */}
      <div className="w-full flex flex-col items-center gap-1">
        {visibleCells.map(c => {
          const href  = `/dashboard/cell/${c.slug}`;
          const Icon  = ICON_MAP[c.iconKey] ?? Folder;
          return <RailBtn key={c.id} href={href} label={c.name} icon={Icon} active={pathname === href}/>;
        })}
      </div>

      {/* Divider */}
      <div className="w-6 h-px bg-slate-200 my-1"/>

      {/* Admin quick links */}
      {(isAdmin || !isUser) && STATIC_ADMIN.filter(item => {
        if (item.adminOnly && (isUser || isIncharge)) return false;
        return true;
      }).slice(0, 4).map(item => (
        <RailBtn key={item.href} href={item.href} label={item.label} icon={item.icon} active={pathname === item.href}/>
      ))}
    </nav>
  );

  // ── User footer (expanded) ──────────────────────────────────────────────────
  const UserFooterExpanded = () => (
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
  );

  // ── User footer (collapsed rail) ────────────────────────────────────────────
  const UserFooterRail = () => (
    <div className="border-t border-slate-100 py-3 flex flex-col items-center gap-2">
      <Tooltip label={`${user?.name} · Sign out`}>
        <button onClick={handleLogout}
          className="w-9 h-9 rounded-lg bg-gradient-to-br from-rail-500 to-rail-700 flex items-center justify-center text-[11px] font-bold text-white hover:opacity-80 transition-opacity">
          {initials}
        </button>
      </Tooltip>
    </div>
  );

  return (
    <>
      {/* ── DESKTOP SIDEBAR ──────────────────────────────────────────────── */}
      <aside className={cn(
        'hidden md:flex flex-col flex-shrink-0 h-screen bg-white border-r border-slate-200 overflow-hidden transition-[width] duration-200 ease-in-out',
        isCollapsed ? 'w-[64px]' : 'w-[260px]'
      )}>
        {/* Brand header */}
        <div className={cn(
          'flex items-center border-b border-slate-100 flex-shrink-0 transition-all duration-200',
          isCollapsed ? 'px-2.5 py-3.5 justify-center' : 'gap-3 px-4 py-4'
        )}>
          {isCollapsed ? (
            /* Collapsed: just the train logo */
            <Tooltip label="Commercial Branch · Delhi Division">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-navy-800 to-rail-600 flex items-center justify-center shadow-sm flex-shrink-0">
                <Train size={18} className="text-white"/>
              </div>
            </Tooltip>
          ) : (
            /* Expanded: logo + text */
            <>
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-navy-800 to-rail-600 flex items-center justify-center shadow-sm flex-shrink-0">
                <Train size={18} className="text-white"/>
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[13px] font-bold text-slate-900 leading-tight">Commercial Branch</p>
                <p className="text-[10px] text-slate-400 truncate">Delhi Division · NR</p>
              </div>
            </>
          )}
        </div>

        {/* Nav content */}
        {isCollapsed ? <RailContent/> : <NavContent/>}

        {/* User footer */}
        {isCollapsed ? <UserFooterRail/> : <UserFooterExpanded/>}
      </aside>

      {/* ── MOBILE: Backdrop + Drawer ─────────────────────────────────────── */}
      {/* Backdrop */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 z-[1100] bg-black/40 backdrop-blur-sm md:hidden"
          onClick={handleBackdropClick}
        />
      )}

      {/* Slide-in drawer */}
      <div className={cn(
        'fixed inset-y-0 left-0 z-[1200] flex flex-col w-[280px] bg-white border-r border-slate-200 shadow-2xl md:hidden',
        'transition-transform duration-250 ease-in-out',
        isMobileOpen ? 'translate-x-0' : '-translate-x-full'
      )}>
        {/* Drawer header */}
        <div className="flex items-center justify-between px-4 py-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-navy-800 to-rail-600 flex items-center justify-center shadow-sm">
              <Train size={18} className="text-white"/>
            </div>
            <div>
              <p className="text-[13px] font-bold text-slate-900 leading-tight">Commercial Branch</p>
              <p className="text-[10px] text-slate-400">Delhi Division · NR</p>
            </div>
          </div>
          <button onClick={() => setMobileOpen(false)}
            className="p-2 rounded-lg hover:bg-slate-100 text-slate-400">
            <X size={16}/>
          </button>
        </div>

        {/* Drawer nav */}
        <NavContent onLinkClick={() => setMobileOpen(false)}/>

        {/* Drawer footer */}
        <div className="border-t border-slate-100 p-3">
          <div className="flex items-center gap-2.5 px-2 py-2 rounded-lg">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-rail-500 to-rail-700 flex items-center justify-center text-[11px] font-bold text-white flex-shrink-0">
              {initials}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[12px] font-semibold text-slate-800 truncate">{user?.name}</p>
              <p className="text-[10px] text-slate-400 truncate">{user?.designation ?? user?.role}</p>
            </div>
            <button onClick={handleLogout} title="Sign out"
              className="p-1.5 rounded-lg hover:bg-red-50 text-slate-300 hover:text-red-500 transition-all">
              <LogOut size={13}/>
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
