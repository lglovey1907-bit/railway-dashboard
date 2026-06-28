'use client';
// ─────────────────────────────────────────────────────────────────────────────
// Railway-Style Print / PDF Report
// ─────────────────────────────────────────────────────────────────────────────

import { X, Printer } from 'lucide-react';
import { createPortal } from 'react-dom';
import type { CumulativeRow, FinancialYear } from '@/lib/financial/types';
import { FY_MONTHS, type FYMonth } from '@/lib/financial/types';
import {
  formatCr, formatPct, formatAchPct,
  getVariationColour, getArrow,
} from '@/lib/financial/calculations';
import { cn } from '@/lib/utils';

interface Props {
  rows: CumulativeRow[];
  fy: FinancialYear;
  upToMonth: FYMonth;
  onClose: () => void;
}

const TARGET_LABELS: Record<string, string> = {
  pending: 'Target Pending',
  na:      'N/A',
  revised: 'Revised',
};

export function PrintView({ rows, fy, upToMonth, onClose }: Props) {
  const periodLabel = upToMonth < 12
    ? `April – ${FY_MONTHS[upToMonth - 1].label}`
    : 'April – March (Full Year)';

  const totalRow    = rows.find(r => r.isTotal);
  const nonTotals   = rows.filter(r => !r.isTotal);
  const printDate   = new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' });

  if (typeof window === 'undefined') return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[4000] bg-white overflow-y-auto"
      id="print-modal"
    >
      {/* Print controls — hidden in @print */}
      <div className="sticky top-0 z-10 flex items-center gap-3 px-6 py-3 bg-slate-800 text-white print:hidden">
        <span className="text-sm font-bold flex-1">Print Preview — {fy.label} Financial Performance</span>
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

      {/* Page content */}
      <div className="max-w-[1100px] mx-auto px-8 py-8 text-[11px] print:px-4 print:py-4">
        {/* Header block */}
        <div className="text-center mb-6 border-b-2 border-slate-800 pb-4">
          <p className="text-[10px] uppercase tracking-widest text-slate-500 mb-1">
            भारतीय रेलवे — Indian Railways
          </p>
          <h1 className="text-xl font-bold text-slate-900 uppercase tracking-wide">
            Revenue Performance Statement
          </h1>
          <h2 className="text-sm font-semibold text-slate-700 mt-1">{fy.label}</h2>
          <p className="text-[10px] text-slate-500 mt-1">
            Cumulative Period: {periodLabel} &nbsp;|&nbsp; Generated: {printDate}
          </p>
        </div>

        {/* Executive summary row */}
        {totalRow && (
          <div className="grid grid-cols-4 gap-4 mb-6">
            {[
              { label: 'Cumulative Revenue',      value: `₹ ${formatCr(totalRow.cumulativeCurrentYear)} Cr`, accent: 'bg-blue-50 border-blue-200' },
              { label: 'Previous Year (Period)',   value: `₹ ${formatCr(totalRow.cumulativePreviousYear)} Cr`, accent: 'bg-slate-50 border-slate-200' },
              { label: 'Target Achievement',
                value: totalRow.achievementPct !== null ? `${formatAchPct(totalRow.achievementPct)}` : 'N/A',
                accent: (totalRow.achievementPct ?? 0) >= 100 ? 'bg-emerald-50 border-emerald-300' : 'bg-red-50 border-red-200' },
              { label: 'Growth vs Prev. Year',
                value: totalRow.variationPct !== null ? formatPct(totalRow.variationPct) : '—',
                accent: (totalRow.variationPct ?? 0) >= 0 ? 'bg-emerald-50 border-emerald-200' : 'bg-red-50 border-red-200' },
            ].map(c => (
              <div key={c.label} className={cn('border rounded-lg p-3', c.accent)}>
                <p className="text-[9px] uppercase tracking-wider text-slate-500 mb-1">{c.label}</p>
                <p className="text-base font-bold text-slate-900">{c.value}</p>
              </div>
            ))}
          </div>
        )}

        {/* Main table */}
        <table className="w-full border-collapse border border-slate-400 text-[10px]">
          <thead>
            <tr className="bg-slate-800 text-white">
              <th className="border border-slate-600 px-2 py-2 text-left">Revenue Head</th>
              <th className="border border-slate-600 px-2 py-2 text-right">Budget Est. (Cr)</th>
              <th className="border border-slate-600 px-2 py-2 text-right">Cum. Current Yr (Cr)</th>
              <th className="border border-slate-600 px-2 py-2 text-right">Cum. Prev. Yr (Cr)</th>
              <th className="border border-slate-600 px-2 py-2 text-right">Target (Cr)</th>
              <th className="border border-slate-600 px-2 py-2 text-right">Variation (Cr)</th>
              <th className="border border-slate-600 px-2 py-2 text-right">Var %</th>
              <th className="border border-slate-600 px-2 py-2 text-right">Achiev. %</th>
            </tr>
          </thead>
          <tbody>
            {nonTotals.map((row, i) => (
              <tr key={row.revenueHead.id} className={i % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                <td className="border border-slate-300 px-2 py-1.5">{row.revenueHead.name}</td>
                <td className="border border-slate-300 px-2 py-1.5 text-right">{formatCr(row.budgetEstimate)}</td>
                <td className="border border-slate-300 px-2 py-1.5 text-right font-semibold">{formatCr(row.cumulativeCurrentYear)}</td>
                <td className="border border-slate-300 px-2 py-1.5 text-right text-slate-500">{formatCr(row.cumulativePreviousYear)}</td>
                <td className="border border-slate-300 px-2 py-1.5 text-right">
                  {row.targetStatus === 'available' || row.targetStatus === 'revised'
                    ? formatCr(row.target)
                    : TARGET_LABELS[row.targetStatus] ?? '—'}
                </td>
                <td className={cn('border border-slate-300 px-2 py-1.5 text-right font-semibold', getVariationColour(row.variation))}>
                  {row.variation !== null ? `${getArrow(row.variation)} ${formatCr(Math.abs(row.variation))}` : '—'}
                </td>
                <td className={cn('border border-slate-300 px-2 py-1.5 text-right', getVariationColour(row.variationPct))}>
                  {row.variationPct !== null ? formatPct(row.variationPct) : '—'}
                </td>
                <td className="border border-slate-300 px-2 py-1.5 text-right font-bold">
                  {row.achievementPct !== null ? formatAchPct(row.achievementPct) : '—'}
                </td>
              </tr>
            ))}
            {/* Total row */}
            {totalRow && (
              <tr className="bg-slate-800 text-white font-bold">
                <td className="border border-slate-600 px-2 py-2 uppercase tracking-wide text-[10px]">TOTAL REVENUE</td>
                <td className="border border-slate-600 px-2 py-2 text-right">{formatCr(totalRow.budgetEstimate)}</td>
                <td className="border border-slate-600 px-2 py-2 text-right">{formatCr(totalRow.cumulativeCurrentYear)}</td>
                <td className="border border-slate-600 px-2 py-2 text-right text-slate-300">{formatCr(totalRow.cumulativePreviousYear)}</td>
                <td className="border border-slate-600 px-2 py-2 text-right">{formatCr(totalRow.target)}</td>
                <td className={cn('border border-slate-600 px-2 py-2 text-right', (totalRow.variation ?? 0) >= 0 ? 'text-emerald-300' : 'text-red-300')}>
                  {totalRow.variation !== null ? `${getArrow(totalRow.variation)} ${formatCr(Math.abs(totalRow.variation))}` : '—'}
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

        {/* Month-wise summary */}
        <div className="mt-6">
          <h3 className="text-xs font-bold text-slate-800 mb-2 uppercase tracking-wide border-b border-slate-300 pb-1">
            Month-wise Total Revenue Summary
          </h3>
          <table className="w-full border-collapse border border-slate-400 text-[10px]">
            <thead>
              <tr className="bg-slate-700 text-white">
                {FY_MONTHS.slice(0, upToMonth).map(m => (
                  <th key={m.id} className="border border-slate-500 px-2 py-1.5 text-center">{m.short}</th>
                ))}
                <th className="border border-slate-500 px-2 py-1.5 text-center font-bold">Cumulative</th>
              </tr>
            </thead>
            <tbody>
              {totalRow && (
                <tr className="bg-white">
                  {FY_MONTHS.slice(0, upToMonth).map((m, i) => (
                    <td key={m.id} className="border border-slate-300 px-2 py-1.5 text-center font-semibold">
                      {totalRow.monthlyActuals[i] !== null ? formatCr(totalRow.monthlyActuals[i], 0) : '—'}
                    </td>
                  ))}
                  <td className="border border-slate-400 px-2 py-1.5 text-center font-bold text-blue-800">
                    {formatCr(totalRow.cumulativeCurrentYear)}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

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
          This is a computer-generated statement. | Railway Commercial Dashboard | {printDate}
        </p>
      </div>

      <style>{`
        @media print {
          body * { visibility: hidden; }
          #print-modal, #print-modal * { visibility: visible; }
          #print-modal { position: absolute; left: 0; top: 0; }
          .print\\:hidden { display: none !important; }
        }
      `}</style>
    </div>,
    document.body,
  );
}
