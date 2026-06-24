'use client';
import { useParams } from 'next/navigation';
import { useState, useEffect, useCallback } from 'react';
import { getCellBySlug, type CellRecord } from '@/lib/cells/cellRegistry';
import { WorkspaceBuilder } from '@/components/workspace/WorkspaceBuilder';
import { SharedTablesView } from '@/components/cell/SharedTablesView';
import { ApprovalQueue } from '@/components/staff/ApprovalQueue';
import { StaffRequestPanel } from '@/components/staff/StaffRequestPanel';
import { GoogleLinksRepo } from '@/components/cell/GoogleLinksRepo';
import { getStaffForCell, getCellStaffStats, STAFF_CHANGED_EVENT, type MasterStaffRecord } from '@/lib/staff/masterStaff';
import { useAuthStore } from '@/store/authStore';
import { canManageCellStructure } from '@/lib/cellData/useCellDataStructure';
import { Construction, Folder, Mail, Phone, Calendar, Briefcase, Users2, ChevronDown, ChevronUp } from 'lucide-react';
import { cn } from '@/lib/utils';

// ── Employee Card ──────────────────────────────────────────────────────────────
function EmployeeCard({ staff }: { staff: MasterStaffRecord }) {
  const initials = staff.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
  const isPending = staff.status === 'pending';

  const ROLE_COLORS: Record<string, string> = {
    CMI: 'from-indigo-500 to-indigo-700',
    COS: 'from-violet-500 to-violet-700',
    OS:  'from-teal-500 to-teal-700',
    Dealer: 'from-amber-500 to-amber-700',
    Incharge: 'from-emerald-500 to-emerald-700',
    default: 'from-slate-400 to-slate-600',
  };
  const grad = ROLE_COLORS[staff.workingAs ?? ''] ?? ROLE_COLORS.default;

  return (
    <div className={cn(
      'flex-shrink-0 w-52 bg-white border border-slate-200 rounded-xl p-4 transition-all hover:shadow-md hover:-translate-y-0.5',
      isPending && 'border-amber-200 bg-amber-50/30',
    )} style={{ boxShadow: '0 1px 3px rgba(15,23,42,0.06)' }}>
      <div className="flex items-center gap-3 mb-3">
        <div className={cn('w-10 h-10 rounded-xl bg-gradient-to-br flex items-center justify-center text-sm font-bold text-white shrink-0', grad)}>
          {initials}
        </div>
        <div className="min-w-0">
          <p className="text-sm font-bold text-slate-900 truncate">{staff.name}</p>
          <p className="text-[10px] text-slate-400 truncate">{staff.designation}</p>
        </div>
      </div>

      <div className="space-y-1.5 mb-3">
        {staff.workingAs && (
          <div className="flex items-center gap-1.5">
            <Briefcase size={10} className="text-slate-300 shrink-0"/>
            <span className="text-[10px] text-slate-500 font-medium">{staff.workingAs}</span>
            {isPending && <span className="text-[8px] bg-amber-100 text-amber-700 border border-amber-200 rounded-full px-1.5 py-0.5 font-bold ml-auto">Pending</span>}
          </div>
        )}
        {staff.hrmsId && (
          <div className="flex items-center gap-1.5">
            <span className="text-[9px] font-mono text-slate-400 bg-slate-100 rounded px-1.5 py-0.5">{staff.hrmsId}</span>
          </div>
        )}
        {staff.listOfWorkAssigned && (
          <p className="text-[10px] text-slate-400 leading-snug line-clamp-2">{staff.listOfWorkAssigned}</p>
        )}
      </div>

      {staff.email && (
        <a href={`mailto:${staff.email}`} className="flex items-center gap-1.5 text-[10px] text-slate-400 hover:text-rail-600 transition-colors truncate">
          <Mail size={9}/>{staff.email}
        </a>
      )}
    </div>
  );
}

// ── Staff Section ──────────────────────────────────────────────────────────────
function CellStaffSection({ cell }: { cell: string }) {
  const [staff, setStaff] = useState<MasterStaffRecord[]>([]);
  const [stats, setStats] = useState({ total: 0, active: 0, pending: 0, inactive: 0 });
  const [collapsed, setCollapsed] = useState(false);

  const reload = useCallback(() => {
    setStaff(getStaffForCell(cell));
    setStats(getCellStaffStats(cell));
  }, [cell]);

  useEffect(() => {
    reload();
    window.addEventListener(STAFF_CHANGED_EVENT, reload);
    const onStorage = (e: StorageEvent) => {
      if (e.key === 'rly_user_status_overrides' || e.key === 'rly_staff_master') reload();
    };
    window.addEventListener('storage', onStorage);
    return () => {
      window.removeEventListener(STAFF_CHANGED_EVENT, reload);
      window.removeEventListener('storage', onStorage);
    };
  }, [reload]);

  if (stats.total === 0 && staff.length === 0) return null;

  return (
    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden" style={{ boxShadow: '0 1px 3px rgba(15,23,42,0.06)' }}>
      {/* Header */}
      <button onClick={() => setCollapsed(c => !c)}
        className="w-full flex items-center justify-between px-5 py-3.5 hover:bg-slate-50 transition-colors border-b border-slate-100">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-rail-50 border border-rail-100 flex items-center justify-center">
            <Users2 size={14} className="text-rail-600"/>
          </div>
          <div className="text-left">
            <p className="text-sm font-bold text-slate-900">Staff Working in {cell}</p>
            <p className="text-[10px] text-slate-400">
              {stats.active} active{stats.pending > 0 ? ` · ${stats.pending} pending` : ''}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="text-[10px] bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full px-2 py-0.5 font-semibold">
              {stats.active} Active
            </span>
            {stats.pending > 0 && (
              <span className="text-[10px] bg-amber-50 text-amber-700 border border-amber-200 rounded-full px-2 py-0.5 font-semibold">
                {stats.pending} Pending
              </span>
            )}
          </div>
          {collapsed ? <ChevronDown size={14} className="text-slate-400"/> : <ChevronUp size={14} className="text-slate-400"/>}
        </div>
      </button>

      {/* Staff cards — horizontal scroll */}
      {!collapsed && (
        <div className="px-5 py-4 overflow-x-auto">
          {staff.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-8 text-center">
              <Users2 size={24} className="text-slate-200"/>
              <p className="text-sm text-slate-400">No active staff in {cell}</p>
              <p className="text-xs text-slate-300">Staff assigned to this cell will appear here automatically.</p>
            </div>
          ) : (
            <div className="flex gap-3 pb-1" style={{ minWidth: 'max-content' }}>
              {staff.map(s => <EmployeeCard key={s.id} staff={s}/>)}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function DynamicCellPage() {
  const { cellSlug } = useParams<{ cellSlug: string }>();
  const { user } = useAuthStore();
  const [cell, setCell] = useState<CellRecord | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const found = getCellBySlug(cellSlug ?? '');
    setCell(found);
    setLoaded(true);
  }, [cellSlug]);

  if (!loaded) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-2 border-rail-400/30 border-t-rail-600 rounded-full animate-spin"/>
      </div>
    );
  }

  if (!cell) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center">
          <Folder size={28} className="text-slate-300"/>
        </div>
        <p className="text-slate-500 text-sm font-medium">
          Cell not found: <code className="bg-slate-100 px-1.5 py-0.5 rounded text-xs">{cellSlug}</code>
        </p>
      </div>
    );
  }

  if (cell.status !== 'active') {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <div className="w-16 h-16 rounded-2xl bg-amber-100 flex items-center justify-center">
          <Construction size={28} className="text-amber-500"/>
        </div>
        <p className="text-slate-700 text-sm font-semibold">{cell.name} — {cell.status}</p>
        <p className="text-slate-400 text-xs">Contact an administrator to reactivate this cell.</p>
      </div>
    );
  }

  const canManage = canManageCellStructure(user, cell.name);

  return (
    <div className="space-y-4 pb-10">

      {/* ── Section 1: Employee cards ── */}
      <CellStaffSection cell={cell.name}/>

      {/* ── Section 2: Three-column operational area ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Col 1: Approval Queue */}
        <ApprovalQueue cell={cell.name}/>

        {/* Col 2: Staff Requests */}
        <StaffRequestPanel cell={cell.name}/>

        {/* Col 3: Google Links Repository */}
        <GoogleLinksRepo cell={cell.name}/>
      </div>

      {/* ── Section 3: Shared tables ── */}
      <SharedTablesView cell={cell.name}/>

      {/* ── Section 4: Flexible workspace (tables, widgets, layouts) ── */}
      <WorkspaceBuilder cell={cell.name}/>
    </div>
  );
}
