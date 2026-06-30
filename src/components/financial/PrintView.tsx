'use client';
// ─────────────────────────────────────────────────────────────────────────────
// Railway-Style Print / PDF Report
// Modes: Cumulative Revenue Statement  |  Monthly Statement (month-by-month matrix)
// ─────────────────────────────────────────────────────────────────────────────

import { useState } from 'react';
import { X, Printer, BarChart2, Calendar } from 'lucide-react';
import { createPortal } from 'react-dom';
import type { CumulativeRow, FinancialYear } from '@/lib/financial/types';
import { FY_MONTHS, type FYMonth } from '@/lib/financial/types';
import {
  formatPct, formatAchPct,
  getVariationColour, getArrow,
} from '@/lib/financial/calculations';
import { cn } from '@/lib/utils';
import type { Unit } from './RevenueTable';

interface Props {
  rows: CumulativeRow[];
  fy: FinancialYear;
  upToMonth: FYMonth;
  unit?: Unit;
  onClose: () => void;
}

// ── Unit-aware formatter ──────────────────────────────────────────────────────

function fmt(val: number | null | undefined, unit: Unit = 'cr', decimals = 2): string {
  if (val === null || val === undefined) return '—';
  const v = unit === 'lacs' ? val * 100 : val;
  return v.toLocaleString('en-IN', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

const TARGET_LABELS: Record<string, string> = {
  pending: 'Pending',
  na:      'N/A',
  revised: 'Revised',
};

type PrintMode = 'cumulative' | 'monthly';

export function PrintView({ rows, fy, upToMonth, unit = 'cr', onClose }: Props) {
  const [mode, setMode] = useState<PrintMode>('cumulative');

  const periodLabel = upToMonth < 12
    ? `April – ${FY_MONTHS[upToMonth - 1].label}`
    : 'April – March (Full Year)';

  const totalRow  = rows.find(r => r.isTotal);
  const nonTotals = rows.filter(r => !r.isTotal);
  const months    = FY_MONTHS.slice(0, upToMonth);
  const printDate = new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' });
  const unitLabel = unit === 'lacs' ? 'Lacs' : 'Cr';

  if (typeof window === 'undefined') return null;

  return createPortal(
    <div className="fixed inset-0 z-[4000] bg-white overflow-y-auto" id="print-modal">

      {/* ── Print controls bar — hidden @print ───────────────────────────── */}
      <div className="sticky top-0 z-10 flex items-center gap-3 px-6 py-3 bg-slate-800 text-white print:hidden flex-wrap">
        <span className="text-sm font-bold">
          Print Preview — {fy.label}
        </span>

        {/* Mode switcher */}
        <div className="flex items-center gap-0.5 bg-slate-700 rounded-lg p-0.5 ml-2">
          <button
            onClick={() => setMode('cumulative')}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all',
              mode === 'cumulative' ? 'bg-white text-slate-800' : 'text-slate-300 hover:text-white',
            )}
          >
            <BarChart2 size={12}/> Cumulative Stmt
          </button>
          <button
            onClick={() => setMode('monthly')}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all',
              mode === 'monthly' ? 'bg-white text-slate-800' : 'text-slate-300 hover:text-white',
            )}
          >
            <Calendar size={12}/> Monthly Stmt
          </button>
        </div>

        <div className="flex-1"/>

        {/* Unit badge */}
        <span className="px-2.5 py-1 bg-slate-600 rounded-lg text-xs font-semibold">
          Figures in ₹ {unitLabel}
        </span>

        <button
          onClick={() => window.print()}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-rail-600 hover:bg-rail-700 rounded-lg text-xs font-semibold"
        >
          <Printer size={13}/> Print / Save PDF
        </button>
        <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-600">
          <X size={15}/>
        </button>
      </div>

      {/* ── Page content ─────────────────────────────────────────────────── */}
      <div className="max-w-[1200px] mx-auto px-8 py-8 text-[11px] print:px-4 print:py-4">

        {/* Header block */}
        <div className="text-center mb-6 border-b-2 border-slate-800 pb-4">
          <p className="text-[10px] uppercase tracking-widest text-slate-500 mb-1">
            भारतीय रेलवे — Indian Railways
          </p>
          <h1 className="text-xl font-bold text-slate-900 uppercase tracking-wide">
            {mode === 'monthly' ? 'Monthly Revenue Statement' : 'Revenue Performance Statement'}
          </h1>
          <h2 className="text-sm font-semibold text-slate-700 mt-1">{fy.label}</h2>
          <p className="text-[10px] text-slate-500 mt-1">
            Period: {periodLabel} &nbsp;|&nbsp; Figures in ₹ {unitLabel} &nbsp;|&nbsp; Generated: {printDate}
          </p>
        </div>

        {/* ── CUMULATIVE MODE ─────────────────────────────────────────────── */}
        {mode === 'cumulative' && (
          <>
            {/* Executive summary cards */}
            {totalRow && (
              <div className="grid grid-cols-4 gap-4 mb-6">
                {[
                  { label: 'Cumulative Revenue',    value: `₹ ${fmt(totalRow.cumulativeCurrentYear, unit)} ${unitLabel}`, accent: 'bg-blue-50 border-blue-200' },
                  { label: 'Previous Year (Period)', value: `₹ ${fmt(totalRow.cumulativePreviousYear, unit)} ${unitLabel}`, accent: 'bg-slate-50 border-slate-200' },
                  {
                    label: 'Target Achievement',
                    value: totalRow.achievementPct !== null ? `${formatAchPct(totalRow.achievementPct)}` : 'N/A',
                    accent: (totalRow.achievementPct ?? 0) >= 100 ? 'bg-emerald-50 border-emerald-300' : 'bg-red-50 border-red-200',
                  },
                  {
                    label: 'Growth vs Prev. Year',
                    value: totalRow.variationPct !== null ? formatPct(totalRow.variationPct) : '—',
                    accent: (totalRow.variationPct ?? 0) >= 0 ? 'bg-emerald-50 border-emerald-200' : 'bg-red-50 border-red-200',
                  },
                ].map(c => (
                  <div key={c.label} className={cn('border rounded-lg p-3', c.accent)}>
                    <p className="text-[9px] uppercase tracking-wider text-slate-500 mb-1">{c.label}</p>
                    <p className="text-base font-bold text-slate-900">{c.value}</p>
                  </div>
                ))}
              </div>
            )}

            {/* Main cumulative table */}
            <table className="w-full border-collapse border border-slate-400 text-[10px]">
              <thead>
                <tr className="bg-slate-800 text-white">
                  <th className="border border-slate-600 px-2 py-2 text-left">Revenue Head</th>
                  <th className="border border-slate-600 px-2 py-2 text-right">Budget Est. ({unitLabel})</th>
                  <th className="border border-slate-600 px-2 py-2 text-right">Cum. Current Yr ({unitLabel})</th>
                  <th className="border border-slate-600 px-2 py-2 text-right">Cum. Prev. Yr ({unitLabel})</th>
                  <th className="border border-slate-600 px-2 py-2 text-right">Target ({unitLabel})</th>
                  <th className="border border-slate-600 px-2 py-2 text-right">Variation ({unitLabel})</th>
                  <th className="border border-slate-600 px-2 py-2 text-right">Var %</th>
                  <th className="border border-slate-600 px-2 py-2 text-right">Achiev. %</th>
                </tr>
              </thead>
              <tbody>
                {nonTotals.map((row, i) => (
                  <tr key={row.revenueHead.id} className={i % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                    <td className="border border-slate-300 px-2 py-1.5">{row.revenueHead.name}</td>
                    <td className="border border-slate-300 px-2 py-1.5 text-right">{fmt(row.budgetEstimate, unit)}</td>
                    <td className="border border-slate-300 px-2 py-1.5 text-right font-semibold">{fmt(row.cumulativeCurrentYear, unit)}</td>
                    <td className="border border-slate-300 px-2 py-1.5 text-right text-slate-500">{fmt(row.cumulativePreviousYear, unit)}</td>
                    <td className="border border-slate-300 px-2 py-1.5 text-right">
                      {row.targetStatus === 'available' || row.targetStatus === 'revised'
                        ? fmt(row.target, unit)
                        : TARGET_LABELS[row.targetStatus] ?? '—'}
                    </td>
                    <td className={cn('border border-slate-300 px-2 py-1.5 text-right font-semibold', getVariationColour(row.variation))}>
                      {row.variation !== null ? `${getArrow(row.variation)} ${fmt(Math.abs(row.variation), unit)}` : '—'}
                    </td>
                    <td className={cn('border border-slate-300 px-2 py-1.5 text-right', getVariationColour(row.variationPct))}>
                      {row.variationPct !== null ? formatPct(row.variationPct) : '—'}
                    </td>
                    <td className="border border-slate-300 px-2 py-1.5 text-right font-bold">
                      {row.achievementPct !== null ? formatAchPct(row.achievementPct) : '—'}
                    </td>
                  </tr>
                ))}
                {totalRow && (
                  <tr className="bg-slate-800 text-white font-bold">
                    <td className="border border-slate-600 px-2 py-2 uppercase tracking-wide text-[10px]">TOTAL REVENUE</td>
                    <td className="border border-slate-600 px-2 py-2 text-right">{fmt(totalRow.budgetEstimate, unit)}</td>
                    <td className="border border-slate-600 px-2 py-2 text-right">{fmt(totalRow.cumulativeCurrentYear, unit)}</td>
                    <td className="border border-slate-600 px-2 py-2 text-right text-slate-300">{fmt(totalRow.cumulativePreviousYear, unit)}</td>
                    <td className="border border-slate-600 px-2 py-2 text-right">{fmt(totalRow.target, unit)}</td>
                    <td className={cn('border border-slate-600 px-2 py-2 text-right', (totalRow.variation ?? 0) >= 0 ? 'text-emerald-300' : 'text-red-300')}>
                      {totalRow.variation !== null ? `${getArrow(totalRow.variation)} ${fmt(Math.abs(totalRow.variation), unit)}` : '—'}
                    </td>
                    <td className={cn('border border-slate-600 px-2 py-2 text-right', (totalRow.variationPct ?? 0) >= 0 ? 'text-emerald-300' : 'text-red-300')}>
                      {totalRow.variationPct !== null ? formatPct(totalRow.variationPct) : '—'}
                    </td>
                    <td className="border border-slate-600 px-2 py-2 text-right text-amber-300">
                      {totalRow.achievementPct !== null ? formatAchPct(totalRow.achievementPct) : '—'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </>
        )}

        {/* ── MONTHLY STATEMENT MODE ───────────────────────────────────────── */}
        {mode === 'monthly' && (
          <>
            <div className="mb-4 text-[10px] text-slate-500">
              Month-wise actual revenue for each head (April onwards). Figures in ₹ {unitLabel}.
            </div>

            {/* Month-wise actuals matrix */}
            <div className="overflow-x-auto">
              <table className="w-full border-collapse border border-slate-400 text-[10px] whitespace-nowrap">
                <thead>
                  <tr className="bg-slate-800 text-white">
                    <th className="border border-slate-600 px-2 py-2 text-left min-w-[140px]">Revenue Head</th>
                    {months.map(m => (
                      <th key={m.id} className="border border-slate-600 px-2 py-2 text-right min-w-[70px]">{m.short}</th>
                    ))}
                    <th className="border border-slate-500 px-2 py-2 text-right bg-blue-900 min-w-[90px]">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {nonTotals.map((row, i) => (
                    <tr key={row.revenueHead.id} className={i % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                      <td className="border border-slate-300 px-2 py-1.5 font-medium">{row.revenueHead.name}</td>
                      {months.map((_, mi) => (
                        <td key={mi} className="border border-slate-300 px-2 py-1.5 text-right">
                          {row.monthlyActuals[mi] !== null ? fmt(row.monthlyActuals[mi], unit, 2) : '—'}
                        </td>
                      ))}
                      <td className="border border-slate-400 px-2 py-1.5 text-right font-semibold text-blue-800 bg-blue-50">
                        {fmt(row.cumulativeCurrentYear, unit)}
                      </td>
                    </tr>
                  ))}
                  {/* Total row */}
                  {totalRow && (
                    <tr className="bg-slate-800 text-white font-bold">
                      <td className="border border-slate-600 px-2 py-2 uppercase tracking-wide">TOTAL</td>
                      {months.map((_, mi) => (
                        <td key={mi} className="border border-slate-600 px-2 py-2 text-right">
                          {totalRow.monthlyActuals[mi] !== null ? fmt(totalRow.monthlyActuals[mi], unit, 2) : '—'}
                        </td>
                      ))}
                      <td className="border border-slate-600 px-2 py-2 text-right text-amber-300">
                        {fmt(totalRow.cumulativeCurrentYear, unit)}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Previous year comparison section */}
            <div className="mt-6">
              <h3 className="text-xs font-bold text-slate-800 mb-2 uppercase tracking-wide border-b border-slate-300 pb-1">
                Previous Year Comparison (Same Period)
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse border border-slate-400 text-[10px] whitespace-nowrap">
                  <thead>
                    <tr className="bg-slate-600 text-white">
                      <th className="border border-slate-500 px-2 py-1.5 text-left min-w-[140px]">Revenue Head</th>
                      {months.map(m => (
                        <th key={m.id} className="border border-slate-500 px-2 py-1.5 text-right min-w-[70px]">{m.short}</th>
                      ))}
                      <th className="border border-slate-500 px-2 py-1.5 text-right min-w-[90px]">Total PY</th>
                    </tr>
                  </thead>
                  <tbody>
                    {nonTotals.map((row, i) => (
                      <tr key={row.revenueHead.id} className={i % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                        <td className="border border-slate-300 px-2 py-1.5 text-slate-600">{row.revenueHead.name}</td>
                        {months.map((m, mi) => {
                          const prev = row.monthlyActuals[mi]; // we store only actuals; PY is on cumulativePreviousYear
                          // Note: per-month PY not available in CumulativeRow, show PY total only
                          return (
                            <td key={mi} className="border border-slate-300 px-2 py-1.5 text-right text-slate-400">—</td>
                          );
                        })}
                        <td className="border border-slate-300 px-2 py-1.5 text-right text-slate-500 font-semibold">
                          {fmt(row.cumulativePreviousYear, unit)}
                        </td>
                      </tr>
                    ))}
                    {totalRow && (
                      <tr className="bg-slate-700 text-white font-bold">
                        <td className="border border-slate-600 px-2 py-2 uppercase tracking-wide">TOTAL</td>
                        {months.map((_, mi) => (
                          <td key={mi} className="border border-slate-600 px-2 py-2 text-right text-slate-300">—</td>
                        ))}
                        <td className="border border-slate-600 px-2 py-2 text-right text-amber-300">
                          {fmt(totalRow.cumulativePreviousYear, unit)}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
              <p className="text-[9px] text-slate-400 mt-1">* Month-wise Previous Year figures not captured — only cumulative PY total shown.</p>
            </div>
          </>
        )}

        {/* Signature block */}
        <div className="mt-10 grid grid-cols-3 gap-8 text-[10px]">
          {['Prepared By', 'Verified By', 'Approved By'].map(label => (
            <div key={label} className="text-center">
              <div className="border-t-2 border-slate-400 pt-2 mt-8">
                <p className="font-semibold text-slate-700">{label}</p>
                <p className="text-slate-400">(Signature & Date)</p>
              </div>
            </div>
          ))}
        </div>

        <p className="text-center text-[9px] text-slate-400 mt-6 border-t border-slate-200 pt-3">
          Computer-generated statement. | Railway Commercial Dashboard | {printDate}
        </p>
      </div>

      <style>{`
        @media print {
          body * { visibility: hidden; }
          #print-modal, #print-modal * { visibility: visible; }
          #print-modal { position: absolute; left: 0; top: 0; }
          .print\:hidden { display: none !important; }
          @page { size: A4 landscape; margin: 15mm; }
        }
      `}</style>
    </div>,
    document.body,
  );
}
