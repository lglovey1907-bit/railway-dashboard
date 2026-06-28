'use client';
// ─────────────────────────────────────────────────────────────────────────────
// Drill-Down Modal — click a revenue head → monthly breakdown
// ─────────────────────────────────────────────────────────────────────────────

import { createPortal } from 'react-dom';
import { X, TrendingUp, TrendingDown } from 'lucide-react';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, Legend,
} from 'recharts';
import { cn } from '@/lib/utils';
import type { RevenueHead, FYMonth, MonthlyRecord } from '@/lib/financial/types';
import { FY_MONTHS } from '@/lib/financial/types';
import { formatCr, formatPct, getVariationColour, getArrow } from '@/lib/financial/calculations';

interface Props {
  revenueHead: RevenueHead;
  records: MonthlyRecord[];
  fyId: string;
  fyLabel: string;
  upToMonth: FYMonth;
  onClose: () => void;
}

export function DrillDownModal({ revenueHead, records, fyId, fyLabel, upToMonth, onClose }: Props) {
  const monthRows = FY_MONTHS.slice(0, upToMonth).map(m => {
    const rec = records.find(
      r => r.fyId === fyId && r.month === m.id && r.revenueHeadId === revenueHead.id,
    );
    const actual  = rec?.actual ?? null;
    const prevYr  = rec?.previousYearActual ?? null;
    const target  = rec?.target ?? null;
    const var_    = actual !== null && prevYr !== null ? actual - prevYr : null;
    const varPct  = var_ !== null && prevYr !== null && prevYr !== 0 ? (var_ / prevYr) * 100 : null;
    const achPct  = actual !== null && target !== null && target !== 0 ? (actual / target) * 100 : null;
    return { month: m, actual, prevYr, target, variation: var_, variationPct: varPct, achievementPct: achPct };
  });

  const chartData = monthRows.map(r => ({
    month: r.month.short,
    Actual:       r.actual      ?? 0,
    'Prev. Year': r.prevYr      ?? 0,
    Target:       r.target      ?? 0,
  }));

  const cumulActual = monthRows.reduce((a, r) => a + (r.actual ?? 0), 0);
  const cumulPrev   = monthRows.reduce((a, r) => a + (r.prevYr ?? 0), 0);
  const cumulVar    = cumulActual - cumulPrev;
  const cumulVarPct = cumulPrev > 0 ? (cumulVar / cumulPrev) * 100 : null;

  if (typeof window === 'undefined') return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[3500] flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)' }}
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center gap-3 px-5 py-3.5 border-b border-slate-100 bg-slate-50 shrink-0">
          <span className="inline-block w-3 h-3 rounded-full" style={{ backgroundColor: revenueHead.color }}/>
          <div className="flex-1">
            <h2 className="text-sm font-bold text-slate-900">{revenueHead.name}</h2>
            <p className="text-[10px] text-slate-500">
              {fyLabel} — Monthly Breakup (Apr–{FY_MONTHS[upToMonth - 1].short})
            </p>
          </div>
          {/* Cumulative summary */}
          <div className="text-right mr-4">
            <p className="text-[10px] text-slate-500">Cumulative Actual</p>
            <p className="text-base font-bold text-blue-800">₹ {formatCr(cumulActual)} Cr</p>
            <p className={cn('text-[11px] font-semibold', getVariationColour(cumulVar))}>
              {getArrow(cumulVar)} {formatCr(Math.abs(cumulVar))} Cr
              {cumulVarPct !== null ? ` (${formatPct(cumulVarPct)})` : ''}
            </p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-200 text-slate-400">
            <X size={15}/>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Chart */}
          <div className="bg-white rounded-xl border border-slate-100 p-3">
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={chartData} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9"/>
                <XAxis dataKey="month" tick={{ fontSize: 10 }}/>
                <YAxis tick={{ fontSize: 10 }} tickFormatter={v => `${v}`} width={55}/>
                <Tooltip contentStyle={{ fontSize: 11 }} formatter={(v: number) => [`₹ ${v.toFixed(2)} Cr`, '']}/>
                <Legend wrapperStyle={{ fontSize: 11 }}/>
                <Bar dataKey="Target"      fill="#a5b4fc" radius={[3,3,0,0]}/>
                <Bar dataKey="Actual"      fill={revenueHead.color} radius={[3,3,0,0]}/>
                <Bar dataKey="Prev. Year"  fill="#94a3b8" radius={[3,3,0,0]}/>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Monthly table */}
          <div className="overflow-x-auto">
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="bg-slate-800 text-white">
                  <th className="px-3 py-2 text-left">Month</th>
                  <th className="px-3 py-2 text-right">Target (Cr)</th>
                  <th className="px-3 py-2 text-right">Actual (Cr)</th>
                  <th className="px-3 py-2 text-right">Prev. Year (Cr)</th>
                  <th className="px-3 py-2 text-right">Variation (Cr)</th>
                  <th className="px-3 py-2 text-right">Var %</th>
                  <th className="px-3 py-2 text-right">Achiev. %</th>
                </tr>
              </thead>
              <tbody>
                {monthRows.map((r, i) => (
                  <tr key={r.month.id} className={cn(
                    'border-b border-slate-100',
                    i % 2 === 0 ? 'bg-white' : 'bg-slate-50',
                  )}>
                    <td className="px-3 py-2 font-semibold text-slate-700">{r.month.label}</td>
                    <td className="px-3 py-2 text-right text-indigo-700">{formatCr(r.target)}</td>
                    <td className="px-3 py-2 text-right font-semibold text-blue-800">{formatCr(r.actual)}</td>
                    <td className="px-3 py-2 text-right text-slate-500">{formatCr(r.prevYr)}</td>
                    <td className={cn('px-3 py-2 text-right font-semibold', getVariationColour(r.variation))}>
                      {r.variation !== null ? (
                        <>{getArrow(r.variation)} {formatCr(Math.abs(r.variation))}</>
                      ) : '—'}
                    </td>
                    <td className={cn('px-3 py-2 text-right', getVariationColour(r.variationPct))}>
                      {r.variationPct !== null ? formatPct(r.variationPct) : '—'}
                    </td>
                    <td className="px-3 py-2 text-right">
                      {r.achievementPct !== null ? (
                        <span className={cn(
                          'px-2 py-0.5 rounded-full text-[10px] font-semibold',
                          r.achievementPct >= 100 ? 'bg-emerald-100 text-emerald-700'
                            : r.achievementPct >= 95 ? 'bg-amber-100 text-amber-700'
                            : 'bg-red-100 text-red-700',
                        )}>
                          {r.achievementPct.toFixed(1)}%
                        </span>
                      ) : '—'}
                    </td>
                  </tr>
                ))}
                {/* Cumulative total */}
                <tr className="bg-slate-800 text-white font-bold">
                  <td className="px-3 py-2.5">TOTAL (Apr–{FY_MONTHS[upToMonth - 1].short})</td>
                  <td className="px-3 py-2.5 text-right text-indigo-200">
                    {formatCr(monthRows.reduce((a, r) => a + (r.target ?? 0), 0))}
                  </td>
                  <td className="px-3 py-2.5 text-right text-blue-200">{formatCr(cumulActual)}</td>
                  <td className="px-3 py-2.5 text-right text-slate-300">{formatCr(cumulPrev)}</td>
                  <td className={cn('px-3 py-2.5 text-right', cumulVar >= 0 ? 'text-emerald-300' : 'text-red-300')}>
                    {getArrow(cumulVar)} {formatCr(Math.abs(cumulVar))}
                  </td>
                  <td className={cn('px-3 py-2.5 text-right', cumulVarPct !== null && cumulVarPct >= 0 ? 'text-emerald-300' : 'text-red-300')}>
                    {cumulVarPct !== null ? formatPct(cumulVarPct) : '—'}
                  </td>
                  <td className="px-3 py-2.5 text-right text-amber-300">
                    {cumulActual > 0 && monthRows.reduce((a, r) => a + (r.target ?? 0), 0) > 0
                      ? `${((cumulActual / monthRows.reduce((a, r) => a + (r.target ?? 0), 0)) * 100).toFixed(1)}%`
                      : '—'}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
