'use client';
// ─────────────────────────────────────────────────────────────────────────────
// Financial Performance Dashboard Widget
// Auto-loads Current FY, auto-selects current month, fully data-driven
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useMemo, useCallback } from 'react';
import {
  ChevronDown, Printer, PencilLine, Eye, EyeOff,
  Calendar, LayoutGrid, List, RefreshCw,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useFinancialStore } from '@/lib/financial/financialStore';
import type { FYMonth } from '@/lib/financial/types';
import { FY_MONTHS, getCurrentFYMonth } from '@/lib/financial/types';
import { buildCumulativeRows } from '@/lib/financial/calculations';

import { ExecutiveCards } from './ExecutiveCards';
import { RevenueTable }   from './RevenueTable';
import { RevenueCharts }  from './RevenueCharts';
import { DataEntryModal } from './DataEntryModal';
import { DrillDownModal } from './DrillDownModal';
import { PrintView }      from './PrintView';

interface Props {
  canManage?: boolean;
  canApprove?: boolean;
  currentUser?: string;
  /** embedded = compact card mode; standalone = full-page mode */
  mode?: 'embedded' | 'standalone';
}

export function FinancialDashboard({
  canManage = false,
  canApprove = false,
  currentUser = 'User',
  mode = 'embedded',
}: Props) {
  const store = useFinancialStore();

  // ── Financial year selection ─────────────────────────────────────────────────
  const currentFY = store.getCurrentFY();
  const allFYs    = [...store.financialYears].sort((a, b) => b.startYear - a.startYear);
  const [selectedFYId, setSelectedFYId] = useState<string>(
    currentFY?.id ?? allFYs[0]?.id ?? '',
  );
  const selectedFY = allFYs.find(fy => fy.id === selectedFYId) ?? allFYs[0];

  // ── Month selection — default to current FY month ────────────────────────────
  const defaultMonth = useMemo<FYMonth>(() => {
    if (selectedFY?.isCurrent) return getCurrentFYMonth();
    if (selectedFY?.status === 'closed') return 12;
    return 1;
  }, [selectedFY]);

  const [selectedMonth, setSelectedMonth] = useState<FYMonth>(defaultMonth);

  // ── UI toggles ───────────────────────────────────────────────────────────────
  const [showMonthCols, setShowMonthCols] = useState(false);
  const [view, setView]                   = useState<'table' | 'charts'>('table');
  const [showDataEntry, setShowDataEntry] = useState(false);
  const [showPrint,     setShowPrint]     = useState(false);
  const [drillHeadId,   setDrillHeadId]   = useState<string | null>(null);

  // ── Compute cumulative rows ──────────────────────────────────────────────────
  const records  = useMemo(
    () => store.getPublishedRecords(selectedFYId),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [selectedFYId, store.monthlyRecords],
  );

  const allRecords = useMemo(
    () => store.getAllRecords(selectedFYId),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [selectedFYId, store.monthlyRecords],
  );

  const rows = useMemo(
    () => buildCumulativeRows(records, store.revenueHeads, selectedFYId, selectedMonth),
    [records, store.revenueHeads, selectedFYId, selectedMonth],
  );

  // ── Drill-down ───────────────────────────────────────────────────────────────
  const drillHead = drillHeadId
    ? store.revenueHeads.find(h => h.id === drillHeadId) ?? null
    : null;

  const handleClickHead = useCallback((rhId: string) => {
    setDrillHeadId(rhId);
  }, []);

  // ── Change FY → reset month ──────────────────────────────────────────────────
  const handleChangeFY = (fyId: string) => {
    setSelectedFYId(fyId);
    const fy = allFYs.find(f => f.id === fyId);
    setSelectedMonth(fy?.isCurrent ? getCurrentFYMonth() : fy?.status === 'closed' ? 12 : 1);
  };

  const isCompact = mode === 'embedded';

  return (
    <div className={cn('flex flex-col gap-3', isCompact ? 'text-xs' : 'text-sm')}>
      {/* ── Top controls bar ──────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-2">
        {/* FY selector */}
        <div className="relative">
          <select
            value={selectedFYId}
            onChange={e => handleChangeFY(e.target.value)}
            className="pl-2.5 pr-7 py-1.5 text-xs bg-white border border-slate-200 rounded-lg shadow-sm focus:outline-none focus:border-rail-400 font-semibold appearance-none"
          >
            {allFYs.map(fy => (
              <option key={fy.id} value={fy.id}>
                {fy.label}{fy.isCurrent ? ' (Current)' : ''}
              </option>
            ))}
          </select>
          <ChevronDown size={11} className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400"/>
        </div>

        {/* Month selector */}
        <div className="relative">
          <select
            value={selectedMonth}
            onChange={e => setSelectedMonth(Number(e.target.value) as FYMonth)}
            className="pl-2.5 pr-7 py-1.5 text-xs bg-white border border-slate-200 rounded-lg shadow-sm focus:outline-none focus:border-rail-400 appearance-none"
          >
            {FY_MONTHS.map(m => (
              <option key={m.id} value={m.id}>Upto {m.label}</option>
            ))}
          </select>
          <Calendar size={11} className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400"/>
        </div>

        {/* Current FY badge */}
        {selectedFY?.isCurrent && (
          <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded-full text-[10px] font-semibold">
            ● Live
          </span>
        )}

        <div className="flex-1"/>

        {/* View toggle */}
        <div className="flex items-center gap-0.5 bg-slate-100 rounded-lg p-0.5">
          <button
            onClick={() => setView('table')}
            className={cn('p-1.5 rounded-md', view === 'table' ? 'bg-white shadow-sm text-slate-800' : 'text-slate-400 hover:text-slate-600')}
            title="Table view"
          >
            <List size={13}/>
          </button>
          <button
            onClick={() => setView('charts')}
            className={cn('p-1.5 rounded-md', view === 'charts' ? 'bg-white shadow-sm text-slate-800' : 'text-slate-400 hover:text-slate-600')}
            title="Charts view"
          >
            <LayoutGrid size={13}/>
          </button>
        </div>

        {/* Monthly columns toggle (table only) */}
        {view === 'table' && (
          <button
            onClick={() => setShowMonthCols(v => !v)}
            className={cn(
              'flex items-center gap-1 px-2.5 py-1.5 text-[10px] rounded-lg border font-semibold transition-all',
              showMonthCols
                ? 'bg-rail-50 border-rail-300 text-rail-700'
                : 'bg-white border-slate-200 text-slate-500 hover:border-slate-300',
            )}
          >
            {showMonthCols ? <EyeOff size={11}/> : <Eye size={11}/>}
            Monthly Cols
          </button>
        )}

        {/* Print */}
        <button
          onClick={() => setShowPrint(true)}
          className="flex items-center gap-1 px-2.5 py-1.5 text-[10px] bg-white border border-slate-200 text-slate-600 rounded-lg hover:border-slate-300 font-semibold"
        >
          <Printer size={11}/> Print
        </button>

        {/* Data entry (admin only) */}
        {canManage && (
          <button
            onClick={() => setShowDataEntry(true)}
            className="flex items-center gap-1 px-2.5 py-1.5 text-[10px] bg-rail-600 hover:bg-rail-700 text-white rounded-lg font-semibold shadow-sm"
          >
            <PencilLine size={11}/> Enter Data
          </button>
        )}
      </div>

      {/* ── Title strip ───────────────────────────────────────────────────── */}
      <div className="flex items-center gap-2 px-1">
        <div>
          <h3 className="font-bold text-slate-900 text-sm leading-none">
            {selectedFY?.label} — Revenue Performance
          </h3>
          <p className="text-[10px] text-slate-500 mt-0.5">
            Cumulative: April –{' '}
            {FY_MONTHS[selectedMonth - 1].label} | Figures in ₹ Crore
          </p>
        </div>
        <div className="flex-1"/>
        {selectedFY?.isCurrent && (
          <button
            onClick={() => setSelectedMonth(getCurrentFYMonth())}
            className="flex items-center gap-1 text-[10px] text-slate-400 hover:text-rail-600"
          >
            <RefreshCw size={10}/> Reset to current month
          </button>
        )}
      </div>

      {/* ── Executive KPI cards ──────────────────────────────────────────── */}
      <ExecutiveCards rows={rows}/>

      {/* ── Main content ─────────────────────────────────────────────────── */}
      {view === 'table' ? (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
          <RevenueTable
            rows={rows}
            upToMonth={selectedMonth}
            showMonthCols={showMonthCols}
            onClickHead={handleClickHead}
          />
          {/* Footer hint */}
          <div className="px-3 py-2 bg-slate-50 border-t border-slate-100 text-[9px] text-slate-400 flex items-center gap-2">
            <span>Click any row to drill down ↗</span>
            <span className="ml-auto">
              ▲ Green = Growth &nbsp;|&nbsp; ▼ Red = Decline &nbsp;|&nbsp;
              Achievement: 🟢 ≥100% &nbsp; 🟡 95-99% &nbsp; 🔴 &lt;95%
            </span>
          </div>
        </div>
      ) : (
        <RevenueCharts
          rows={rows}
          records={records}
          fyId={selectedFYId}
          upToMonth={selectedMonth}
        />
      )}

      {/* ── Modals ────────────────────────────────────────────────────────── */}
      {showDataEntry && selectedFY && (
        <DataEntryModal
          fyId={selectedFYId}
          onClose={() => setShowDataEntry(false)}
          currentUser={currentUser}
          canApprove={canApprove}
        />
      )}

      {drillHead && (
        <DrillDownModal
          revenueHead={drillHead}
          records={allRecords}
          fyId={selectedFYId}
          fyLabel={selectedFY?.label ?? ''}
          upToMonth={selectedMonth}
          onClose={() => setDrillHeadId(null)}
        />
      )}

      {showPrint && selectedFY && (
        <PrintView
          rows={rows}
          fy={selectedFY}
          upToMonth={selectedMonth}
          onClose={() => setShowPrint(false)}
        />
      )}
    </div>
  );
}
