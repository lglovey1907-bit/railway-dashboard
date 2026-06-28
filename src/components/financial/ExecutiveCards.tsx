'use client';
// ─────────────────────────────────────────────────────────────────────────────
// Executive Summary KPI Cards
// ─────────────────────────────────────────────────────────────────────────────

import { TrendingUp, TrendingDown, Target, BarChart2, IndianRupee, Percent } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { CumulativeRow } from '@/lib/financial/types';
import { formatCr, getAchColour, getVariationColour } from '@/lib/financial/calculations';

interface Props { rows: CumulativeRow[]; }

export function ExecutiveCards({ rows }: Props) {
  const totalRow = rows.find(r => r.isTotal);
  if (!totalRow) return null;

  const current  = totalRow.cumulativeCurrentYear;
  const previous = totalRow.cumulativePreviousYear;
  const target   = totalRow.target;
  const ach      = totalRow.achievementPct;
  const variation = totalRow.variation;
  const varPct    = totalRow.variationPct;

  const cards = [
    {
      label: 'Total Revenue (Cumulative)',
      value: current !== null ? `₹ ${formatCr(current)} Cr` : '—',
      sub: 'Current Financial Year',
      icon: <IndianRupee size={18}/>,
      bg: 'from-blue-600 to-blue-800',
      text: 'text-white',
    },
    {
      label: 'Target Achievement',
      value: ach !== null ? `${ach.toFixed(1)}%` : 'N/A',
      sub: target !== null ? `Target: ₹ ${formatCr(target)} Cr` : 'Target Not Received',
      icon: <Target size={18}/>,
      bg: ach === null ? 'from-slate-500 to-slate-700'
        : ach >= 100  ? 'from-emerald-600 to-emerald-800'
        : ach >= 95   ? 'from-amber-500 to-amber-700'
        :               'from-red-600 to-red-800',
      text: 'text-white',
    },
    {
      label: 'Growth vs Previous Year',
      value: varPct !== null ? `${varPct > 0 ? '+' : ''}${varPct.toFixed(2)}%` : '—',
      sub: variation !== null
        ? `${variation > 0 ? '▲' : '▼'} ₹ ${formatCr(Math.abs(variation))} Cr`
        : 'Previous year data N/A',
      icon: varPct !== null && varPct >= 0 ? <TrendingUp size={18}/> : <TrendingDown size={18}/>,
      bg: varPct === null ? 'from-slate-500 to-slate-700'
        : varPct >= 0 ? 'from-emerald-600 to-teal-700'
        :               'from-red-600 to-rose-800',
      text: 'text-white',
    },
    {
      label: 'Previous Year (Same Period)',
      value: previous !== null ? `₹ ${formatCr(previous)} Cr` : '—',
      sub: 'Cumulative comparison',
      icon: <BarChart2 size={18}/>,
      bg: 'from-slate-600 to-slate-800',
      text: 'text-white',
    },
  ];

  return (
    <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
      {cards.map(card => (
        <div
          key={card.label}
          className={cn('rounded-xl p-4 bg-gradient-to-br shadow-sm', card.bg)}
        >
          <div className={cn('flex items-start justify-between', card.text)}>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-semibold uppercase tracking-wider opacity-80 mb-1">
                {card.label}
              </p>
              <p className="text-xl font-bold leading-tight truncate">{card.value}</p>
              <p className="text-[11px] opacity-70 mt-1">{card.sub}</p>
            </div>
            <div className="opacity-70 shrink-0 ml-2">{card.icon}</div>
          </div>
        </div>
      ))}
    </div>
  );
}
