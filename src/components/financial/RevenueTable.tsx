'use client';
// ─────────────────────────────────────────────────────────────────────────────
// Railway-Style Cumulative Revenue Table
// ─────────────────────────────────────────────────────────────────────────────

import { cn } from '@/lib/utils';
import type { CumulativeRow } from '@/lib/financial/types';
import { FY_MONTHS, type FYMonth } from '@/lib/financial/types';
import {
  formatCr, formatPct, formatAchPct,
  getAchColour, getVariationColour, getArrow,
} from '@/lib/financial/calculations';

interface Props {
  rows: CumulativeRow[];
  upToMonth: FYMonth;
  showMonthCols?: boolean;
  onClickHead?: (rhId: string) => void;
}

const STATUS_LABELS: Record<string, string> = {
  pending: 'Target Pending',
  na:      'N/A',
  revised: 'Revised',
};

export function RevenueTable({ rows, upToMonth, showMonthCols = false, onClickHead }: Props) {
  const months = FY_MONTHS.slice(0, upToMonth);

  return (
    <div className="overflow-x-auto text-xs">
      <table className="min-w-full border-collapse">
        <thead>
          <tr className="bg-slate-800 text-white">
            <th className="sticky left-0 z-10 bg-slate-800 px-3 py-2.5 text-left font-bold whitespace-nowrap min-w-[180px]">
              Revenue Head
            </th>
            <th className="px-3 py-2.5 text-right font-semibold whitespace-nowrap">Budget Estimate (Cr)</th>

            {/* Monthly columns (toggle) */}
            {showMonthCols && months.map(m => (
              <th key={m.id} className="px-2.5 py-2.5 text-right font-semibold whitespace-nowrap text-slate-300">
                {m.short}
              </th>
            ))}

            <th className="px-3 py-2.5 text-right font-bold whitespace-nowrap bg-blue-900">
              Cumul. {upToMonth < 12 ? `Apr–${FY_MONTHS[upToMonth - 1].short}` : 'Apr–Mar'} (Cr)
            </th>
            <th className="px-3 py-2.5 text-right font-bold whitespace-nowrap bg-slate-700">
              Previous Year (Cr)
            </th>
            <th className="px-3 py-2.5 text-right font-bold whitespace-nowrap bg-indigo-900">
              Target (Cr)
            </th>
            <th className="px-3 py-2.5 text-right font-bold whitespace-nowrap bg-emerald-900">
              Variation (Cr)
            </th>
            <th className="px-3 py-2.5 text-right font-bold whitespace-nowrap bg-emerald-900">
              Var %
            </th>
            <th className="px-3 py-2.5 text-right font-bold whitespace-nowrap bg-amber-900">
              Achiev. %
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, idx) => {
            const isTotal = row.isTotal;
            const ach = row.achievementPct;
            const variation = row.variation;
            const varPct = row.variationPct;

            return (
              <tr
                key={row.revenueHead.id}
                className={cn(
                  'border-b transition-colors',
                  isTotal
                    ? 'bg-slate-100 font-bold border-slate-300'
                    : idx % 2 === 0 ? 'bg-white hover:bg-blue-50' : 'bg-slate-50 hover:bg-blue-50',
                  onClickHead && !isTotal && 'cursor-pointer',
                )}
                onClick={() => !isTotal && onClickHead?.(row.revenueHead.id)}
              >
                {/* Revenue head name */}
                <td className={cn(
                  'sticky left-0 z-10 px-3 py-2 whitespace-nowrap border-r border-slate-200',
                  isTotal ? 'bg-slate-100 font-bold text-slate-900' : 'bg-inherit text-slate-800',
                )}>
                  <div className="flex items-center gap-2">
                    {!isTotal && (
                      <span
                        className="inline-block w-2 h-2 rounded-full shrink-0"
                        style={{ backgroundColor: row.revenueHead.color }}
                      />
                    )}
                    <span className={cn(isTotal ? 'uppercase tracking-wide text-[11px]' : '')}>
                      {row.revenueHead.name}
                    </span>
                    {!isTotal && onClickHead && (
                      <span className="text-[9px] text-rail-500 opacity-0 group-hover:opacity-100 ml-1">↗</span>
                    )}
                  </div>
                </td>

                {/* Budget Estimate */}
                <td className="px-3 py-2 text-right text-slate-600 whitespace-nowrap">
                  {row.budgetEstimate !== null ? formatCr(row.budgetEstimate) : '—'}
                </td>

                {/* Monthly actuals */}
                {showMonthCols && months.map((m, i) => (
                  <td key={m.id} className="px-2.5 py-2 text-right text-slate-600 whitespace-nowrap text-[11px]">
                    {row.monthlyActuals[i] !== null ? formatCr(row.monthlyActuals[i]) : '—'}
                  </td>
                ))}

                {/* Cumulative current year */}
                <td className={cn(
                  'px-3 py-2 text-right font-semibold whitespace-nowrap',
                  isTotal ? 'text-blue-900 bg-blue-50' : 'text-blue-800 bg-blue-50/60',
                )}>
                  {formatCr(row.cumulativeCurrentYear)}
                </td>

                {/* Previous year */}
                <td className="px-3 py-2 text-right text-slate-500 whitespace-nowrap">
                  {formatCr(row.cumulativePreviousYear)}
                </td>

                {/* Target */}
                <td className="px-3 py-2 text-right whitespace-nowrap text-indigo-700">
                  {row.targetStatus === 'available' || row.targetStatus === 'revised'
                    ? formatCr(row.target)
                    : <span className="text-[10px] text-slate-400 italic">
                        {STATUS_LABELS[row.targetStatus] ?? 'N/A'}
                      </span>
                  }
                </td>

                {/* Variation */}
                <td className={cn(
                  'px-3 py-2 text-right font-semibold whitespace-nowrap',
                  getVariationColour(variation),
                )}>
                  {variation !== null ? (
                    <span className="flex items-center justify-end gap-1">
                      <span>{getArrow(variation)}</span>
                      <span>{formatCr(Math.abs(variation))}</span>
                    </span>
                  ) : '—'}
                </td>

                {/* Variation % */}
                <td className={cn(
                  'px-3 py-2 text-right font-semibold whitespace-nowrap',
                  getVariationColour(varPct),
                )}>
                  {varPct !== null ? formatPct(varPct) : '—'}
                </td>

                {/* Achievement % */}
                <td className={cn(
                  'px-3 py-2 text-right font-bold whitespace-nowrap rounded-r',
                  getAchColour(ach),
                )}>
                  {ach !== null ? (
                    <span className={cn(
                      'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px]',
                      ach >= 100 ? 'bg-emerald-100' : ach >= 95 ? 'bg-amber-100' : 'bg-red-100',
                    )}>
                      {formatAchPct(ach)}
                    </span>
                  ) : (
                    <span className="text-slate-400 text-[10px]">—</span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
