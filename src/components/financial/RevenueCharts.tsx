'use client';
// ─────────────────────────────────────────────────────────────────────────────
// Revenue Analytics Charts
// ─────────────────────────────────────────────────────────────────────────────

import { useState } from 'react';
import {
  ResponsiveContainer,
  BarChart, Bar, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  PieChart, Pie, Cell,
  ReferenceLine,
} from 'recharts';
import { cn } from '@/lib/utils';
import type { CumulativeRow, MonthlyTrendPoint, ContributionPoint } from '@/lib/financial/types';
import type { FYMonth } from '@/lib/financial/types';
import { FY_MONTHS } from '@/lib/financial/types';
import { buildMonthlyTrend, buildContributionData } from '@/lib/financial/calculations';
import type { MonthlyRecord } from '@/lib/financial/types';

type ChartTab = 'monthly' | 'cumulative' | 'target' | 'contribution' | 'heatmap';

const TABS: { id: ChartTab; label: string }[] = [
  { id: 'monthly',      label: 'Monthly Trend' },
  { id: 'cumulative',   label: 'Cumulative' },
  { id: 'target',       label: 'Target vs Actual' },
  { id: 'contribution', label: 'Contribution %' },
  { id: 'heatmap',      label: 'Heat Map' },
];

const fmtCr = (v: number) => `₹${v.toFixed(0)}Cr`;
const fmtTooltip = (v: number) => [`₹ ${v.toFixed(2)} Cr`, ''];

interface Props {
  rows: CumulativeRow[];
  records: MonthlyRecord[];
  fyId: string;
  upToMonth: FYMonth;
}

// ── Heat map cell colour ──────────────────────────────────────────────────────
function heatColour(actual: number | null, prevYr: number | null): string {
  if (actual === null) return '#f1f5f9';
  if (prevYr === null) return '#bfdbfe';
  const diff = ((actual - prevYr) / prevYr) * 100;
  if (diff >= 10)  return '#15803d';
  if (diff >= 5)   return '#22c55e';
  if (diff >= 0)   return '#86efac';
  if (diff >= -5)  return '#fca5a5';
  return '#dc2626';
}

export function RevenueCharts({ rows, records, fyId, upToMonth }: Props) {
  const [tab, setTab] = useState<ChartTab>('monthly');
  const [selectedHead, setSelectedHead] = useState<string>('rh-total-virtual');

  // Heads available for trend charts (non-total)
  const nonTotalRows = rows.filter(r => !r.isTotal);
  const totalRow     = rows.find(r => r.isTotal);
  const months       = FY_MONTHS.slice(0, upToMonth);

  // Monthly trend for selected head
  const headForTrend = selectedHead === 'rh-total-virtual'
    ? null
    : nonTotalRows.find(r => r.revenueHead.id === selectedHead);

  // Build trend data — either from store records or from row monthly actuals
  const trendData: MonthlyTrendPoint[] = headForTrend
    ? buildMonthlyTrend(records, fyId, headForTrend.revenueHead.id, upToMonth)
    : months.map((m, i) => {
        const actual = totalRow?.monthlyActuals[i] ?? null;
        const prevYr = nonTotalRows.reduce((sum, r) => {
          const rec = records.find(x => x.fyId === fyId && x.month === m.id && x.revenueHeadId === r.revenueHead.id);
          return sum + (rec?.previousYearActual ?? 0);
        }, 0);
        const tgt = nonTotalRows.reduce((sum, r) => {
          const rec = records.find(x => x.fyId === fyId && x.month === m.id && x.revenueHeadId === r.revenueHead.id);
          return sum + (rec?.target ?? 0);
        }, 0);
        let cumulative = 0;
        for (let j = 0; j <= i; j++) cumulative += totalRow?.monthlyActuals[j] ?? 0;
        return {
          month: m.short,
          actual,
          previousYear: prevYr || null,
          target: tgt || null,
          cumulative: actual !== null ? cumulative : null,
        };
      });

  // Contribution pie
  const pieData: ContributionPoint[] = buildContributionData(rows);

  // Head selector for trend charts
  const HeadSelector = () => (
    <select
      value={selectedHead}
      onChange={e => setSelectedHead(e.target.value)}
      className="text-[10px] bg-white border border-slate-200 rounded-lg px-2 py-1 focus:outline-none focus:border-rail-400"
    >
      <option value="rh-total-virtual">All Revenue (Total)</option>
      {nonTotalRows.map(r => (
        <option key={r.revenueHead.id} value={r.revenueHead.id}>
          {r.revenueHead.name}
        </option>
      ))}
    </select>
  );

  return (
    <div className="space-y-3">
      {/* Tabs */}
      <div className="flex items-center gap-0.5 bg-slate-100 rounded-xl p-1 overflow-x-auto">
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={cn(
              'flex-1 min-w-max px-3 py-1.5 rounded-lg text-[10px] font-semibold whitespace-nowrap transition-all',
              tab === t.id
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-500 hover:text-slate-700',
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Chart area */}
      <div className="bg-white rounded-xl border border-slate-100 p-4">

        {/* Monthly Trend */}
        {tab === 'monthly' && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold text-slate-700">Monthly Revenue Trend</span>
              <HeadSelector/>
            </div>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={trendData} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9"/>
                <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                <YAxis tickFormatter={fmtCr} tick={{ fontSize: 10 }} width={60}/>
                <Tooltip formatter={fmtTooltip} labelStyle={{ fontSize: 11 }} contentStyle={{ fontSize: 11 }}/>
                <Legend wrapperStyle={{ fontSize: 11 }}/>
                <Bar dataKey="actual"       name="Current Year"   fill="#3b82f6" radius={[3,3,0,0]}/>
                <Bar dataKey="previousYear" name="Previous Year"  fill="#94a3b8" radius={[3,3,0,0]}/>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Cumulative Trend */}
        {tab === 'cumulative' && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold text-slate-700">Cumulative Revenue (Apr onwards)</span>
              <HeadSelector/>
            </div>
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={trendData} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9"/>
                <XAxis dataKey="month" tick={{ fontSize: 10 }}/>
                <YAxis tickFormatter={fmtCr} tick={{ fontSize: 10 }} width={65}/>
                <Tooltip formatter={fmtTooltip} contentStyle={{ fontSize: 11 }}/>
                <Legend wrapperStyle={{ fontSize: 11 }}/>
                <Line dataKey="cumulative" name="Cumulative" stroke="#2563eb" strokeWidth={2.5} dot={{ r: 4 }} activeDot={{ r: 6 }}/>
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Target vs Actual */}
        {tab === 'target' && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold text-slate-700">Target vs Actual</span>
              <HeadSelector/>
            </div>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={trendData} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9"/>
                <XAxis dataKey="month" tick={{ fontSize: 10 }}/>
                <YAxis tickFormatter={fmtCr} tick={{ fontSize: 10 }} width={60}/>
                <Tooltip formatter={fmtTooltip} contentStyle={{ fontSize: 11 }}/>
                <Legend wrapperStyle={{ fontSize: 11 }}/>
                <Bar dataKey="target" name="Target" fill="#a5b4fc" radius={[3,3,0,0]}/>
                <Bar dataKey="actual" name="Actual" fill="#2563eb" radius={[3,3,0,0]}/>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Contribution Pie */}
        {tab === 'contribution' && (
          <div>
            <p className="text-xs font-bold text-slate-700 mb-3">
              Contribution % (Cumulative Apr–{FY_MONTHS[upToMonth - 1].short})
            </p>
            <div className="flex items-center gap-4">
              <ResponsiveContainer width={220} height={220}>
                <PieChart>
                  <Pie
                    data={pieData} cx="50%" cy="50%"
                    outerRadius={90} innerRadius={40}
                    dataKey="value" nameKey="name"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    labelLine={false}
                  >
                    {pieData.map((entry, i) => (
                      <Cell key={i} fill={entry.color}/>
                    ))}
                  </Pie>
                  <Tooltip formatter={(v: number) => [`₹ ${v.toFixed(2)} Cr`, '']} contentStyle={{ fontSize: 11 }}/>
                </PieChart>
              </ResponsiveContainer>
              {/* Legend */}
              <div className="space-y-2 flex-1">
                {pieData.map(p => {
                  const total = pieData.reduce((a, b) => a + b.value, 0);
                  const pct = total > 0 ? ((p.value / total) * 100).toFixed(1) : '0.0';
                  return (
                    <div key={p.name} className="flex items-center gap-2 text-xs">
                      <span className="w-3 h-3 rounded-sm shrink-0" style={{ backgroundColor: p.color }}/>
                      <span className="flex-1 text-slate-700">{p.name}</span>
                      <span className="font-semibold text-slate-900">{pct}%</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Heat Map */}
        {tab === 'heatmap' && (
          <div>
            <p className="text-xs font-bold text-slate-700 mb-3">
              Growth Heat Map vs Previous Year (Cr)
            </p>
            <div className="overflow-x-auto">
              <table className="text-[10px] border-collapse">
                <thead>
                  <tr>
                    <th className="text-left px-2 py-1.5 font-bold text-slate-600 min-w-[140px]">Revenue Head</th>
                    {months.map(m => (
                      <th key={m.id} className="px-2 py-1.5 font-semibold text-slate-500 min-w-[54px] text-center">{m.short}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {nonTotalRows.map(row => (
                    <tr key={row.revenueHead.id}>
                      <td className="px-2 py-1 font-medium text-slate-700 whitespace-nowrap">
                        {row.revenueHead.name.replace(' Revenue', '')}
                      </td>
                      {months.map((m, i) => {
                        const actual = row.monthlyActuals[i];
                        const rec = records.find(
                          x => x.fyId === fyId && x.month === m.id && x.revenueHeadId === row.revenueHead.id
                        );
                        const prevYr = rec?.previousYearActual ?? null;
                        const bg = heatColour(actual, prevYr);
                        const textCol = bg === '#15803d' || bg === '#dc2626' ? '#fff' : '#1e293b';
                        return (
                          <td
                            key={m.id}
                            className="px-2 py-1.5 text-center rounded font-medium"
                            style={{ backgroundColor: bg, color: textCol }}
                          >
                            {actual !== null ? actual.toFixed(0) : '—'}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                  {/* Total row */}
                  {totalRow && (
                    <tr className="border-t border-slate-300 font-bold">
                      <td className="px-2 py-1.5 text-slate-900 uppercase text-[9px] tracking-wide">Total</td>
                      {months.map((m, i) => {
                        const actual = totalRow.monthlyActuals[i];
                        const prevTot = nonTotalRows.reduce((sum, r) => {
                          const rr = records.find(x => x.fyId === fyId && x.month === m.id && x.revenueHeadId === r.revenueHead.id);
                          return sum + (rr?.previousYearActual ?? 0);
                        }, 0);
                        const bg = heatColour(actual, prevTot || null);
                        const textCol = bg === '#15803d' || bg === '#dc2626' ? '#fff' : '#1e293b';
                        return (
                          <td key={m.id} className="px-2 py-1.5 text-center rounded"
                            style={{ backgroundColor: bg, color: textCol }}>
                            {actual !== null ? actual.toFixed(0) : '—'}
                          </td>
                        );
                      })}
                    </tr>
                  )}
                </tbody>
              </table>
              {/* Legend */}
              <div className="flex items-center gap-3 mt-3 flex-wrap">
                {[
                  { bg: '#15803d', text: '#fff', label: '≥ +10%' },
                  { bg: '#22c55e', text: '#000', label: '+5% to +10%' },
                  { bg: '#86efac', text: '#000', label: '0% to +5%' },
                  { bg: '#fca5a5', text: '#000', label: '-5% to 0%' },
                  { bg: '#dc2626', text: '#fff', label: '< -5%' },
                  { bg: '#f1f5f9', text: '#000', label: 'No Data' },
                ].map(l => (
                  <div key={l.label} className="flex items-center gap-1 text-[10px]">
                    <span className="w-5 h-4 rounded" style={{ backgroundColor: l.bg }}/>
                    <span className="text-slate-600">{l.label}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
