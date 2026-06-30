'use client';
// ─────────────────────────────────────────────────────────────────────────────
// Railway-Style Cumulative Revenue Table
// Features: editable col/row headers, unit toggle (Cr/Lacs), col visibility
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useRef, useEffect } from 'react';
import { Pencil, Check, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { CumulativeRow } from '@/lib/financial/types';
import { FY_MONTHS, type FYMonth } from '@/lib/financial/types';
import {
  formatPct, formatAchPct,
  getAchColour, getVariationColour, getArrow,
} from '@/lib/financial/calculations';

// ── Types ─────────────────────────────────────────────────────────────────────

export type Unit = 'cr' | 'lacs';
export type ColKey = 'budget' | 'monthly' | 'cumul_cy' | 'prev_yr' | 'target' | 'variation' | 'var_pct' | 'ach_pct';

export const DEFAULT_COL_LABELS: Record<ColKey, string> = {
  budget:    'Budget Estimate',
  monthly:   'Monthly',
  cumul_cy:  'Cumulative CY',
  prev_yr:   'Previous Year',
  target:    'Target',
  variation: 'Variation',
  var_pct:   'Var %',
  ach_pct:   'Achiev. %',
};

export const ALL_COLS: ColKey[] = ['budget', 'monthly', 'cumul_cy', 'prev_yr', 'target', 'variation', 'var_pct', 'ach_pct'];

interface Props {
  rows: CumulativeRow[];
  upToMonth: FYMonth;
  showMonthCols?: boolean;
  unit?: Unit;
  visibleCols?: Set<ColKey>;
  colLabels?: Record<ColKey, string>;
  onUpdateColLabel?: (key: ColKey, label: string) => void;
  onUpdateHead?: (rhId: string, name: string) => void;
  onClickHead?: (rhId: string) => void;
  canManage?: boolean;
}

// ── Formatters ────────────────────────────────────────────────────────────────

function fmt(val: number | null | undefined, unit: Unit, decimals = 2): string {
  if (val === null || val === undefined) return '—';
  const v = unit === 'lacs' ? val * 100 : val;
  return v.toLocaleString('en-IN', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

// ── Inline editable cell ───────────────────────────────────────────────────────

function EditableLabel({
  value, onSave, className, inputClass,
}: {
  value: string;
  onSave: (v: string) => void;
  className?: string;
  inputClass?: string;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { if (editing) inputRef.current?.select(); }, [editing]);

  const commit = () => { if (draft.trim()) onSave(draft.trim()); setEditing(false); };
  const cancel = () => { setDraft(value); setEditing(false); };

  if (editing) {
    return (
      <span className="inline-flex items-center gap-1">
        <input
          ref={inputRef}
          value={draft}
          onChange={e => setDraft(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') commit(); if (e.key === 'Escape') cancel(); }}
          className={cn('border border-rail-400 rounded px-1.5 py-0.5 text-xs outline-none focus:ring-1 focus:ring-rail-400 bg-white text-slate-900', inputClass)}
        />
        <button onClick={commit} className="text-emerald-600 hover:text-emerald-700"><Check size={11}/></button>
        <button onClick={cancel} className="text-red-400 hover:text-red-600"><X size={11}/></button>
      </span>
    );
  }
  return (
    <span
      className={cn('group/lbl inline-flex items-center gap-1 cursor-default', className)}
      onDoubleClick={() => { setDraft(value); setEditing(true); }}
    >
      {value}
      <Pencil
        size={9}
        className="opacity-0 group-hover/lbl:opacity-60 hover:!opacity-100 cursor-pointer shrink-0 text-slate-400"
        onClick={e => { e.stopPropagation(); setDraft(value); setEditing(true); }}
      />
    </span>
  );
}

// ── Status label map ───────────────────────────────────────────────────────────

const STATUS_LABELS: Record<string, string> = {
  pending: 'Target Pending',
  na:      'N/A',
  revised: 'Revised',
};

// ── Main component ─────────────────────────────────────────────────────────────

export function RevenueTable({
  rows, upToMonth,
  showMonthCols = false,
  unit = 'cr',
  visibleCols,
  colLabels,
  onUpdateColLabel,
  onUpdateHead,
  onClickHead,
  canManage = false,
}: Props) {
  const months = FY_MONTHS.slice(0, upToMonth);
  const unitSuffix = unit === 'lacs' ? 'Lacs' : 'Cr';
  const labels = { ...DEFAULT_COL_LABELS, ...colLabels };
  const vis = visibleCols ?? new Set<ColKey>(ALL_COLS);

  // Helper: render editable or static header
  const hdr = (key: ColKey, fallback: string) => {
    const lbl = labels[key] ?? fallback;
    if (!canManage || !onUpdateColLabel) return lbl;
    return (
      <EditableLabel
        value={lbl}
        onSave={v => onUpdateColLabel(key, v)}
        inputClass="w-28"
      />
    );
  };

  return (
    <div className="overflow-x-auto text-xs">
      <table className="min-w-full border-collapse">
        <thead>
          <tr className="bg-slate-800 text-white">
            {/* Sticky first header */}
            <th className="sticky left-0 z-10 bg-slate-800 px-3 py-2.5 text-left font-bold whitespace-nowrap min-w-[200px]">
              Revenue Head
            </th>

            {vis.has('budget') && (
              <th className="px-3 py-2.5 text-right font-semibold whitespace-nowrap">
                {hdr('budget', 'Budget Estimate')} ({unitSuffix})
              </th>
            )}

            {vis.has('monthly') && showMonthCols && months.map(m => (
              <th key={m.id} className="px-2.5 py-2.5 text-right font-semibold whitespace-nowrap text-slate-300">
                {m.short}
              </th>
            ))}

            {vis.has('cumul_cy') && (
              <th className="px-3 py-2.5 text-right font-bold whitespace-nowrap bg-blue-900">
                {hdr('cumul_cy', `Cumul. ${upToMonth < 12 ? `Apr–${FY_MONTHS[upToMonth - 1].short}` : 'Apr–Mar'}`)} ({unitSuffix})
              </th>
            )}
            {vis.has('prev_yr') && (
              <th className="px-3 py-2.5 text-right font-bold whitespace-nowrap bg-slate-700">
                {hdr('prev_yr', 'Previous Year')} ({unitSuffix})
              </th>
            )}
            {vis.has('target') && (
              <th className="px-3 py-2.5 text-right font-bold whitespace-nowrap bg-indigo-900">
                {hdr('target', 'Target')} ({unitSuffix})
              </th>
            )}
            {vis.has('variation') && (
              <th className="px-3 py-2.5 text-right font-bold whitespace-nowrap bg-emerald-900">
                {hdr('variation', 'Variation')} ({unitSuffix})
              </th>
            )}
            {vis.has('var_pct') && (
              <th className="px-3 py-2.5 text-right font-bold whitespace-nowrap bg-emerald-900">
                {hdr('var_pct', 'Var %')}
              </th>
            )}
            {vis.has('ach_pct') && (
              <th className="px-3 py-2.5 text-right font-bold whitespace-nowrap bg-amber-900">
                {hdr('ach_pct', 'Achiev. %')}
              </th>
            )}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, idx) => {
            const isTotal   = row.isTotal;
            const ach       = row.achievementPct;
            const variation = row.variation;
            const varPct    = row.variationPct;

            return (
              <tr
                key={row.revenueHead.id}
                className={cn(
                  'border-b transition-colors group/row',
                  isTotal
                    ? 'bg-slate-100 font-bold border-slate-300'
                    : idx % 2 === 0 ? 'bg-white hover:bg-blue-50' : 'bg-slate-50 hover:bg-blue-50',
                  onClickHead && !isTotal && 'cursor-pointer',
                )}
                onClick={() => !isTotal && onClickHead?.(row.revenueHead.id)}
              >
                {/* Revenue head name — editable */}
                <td className={cn(
                  'sticky left-0 z-10 px-3 py-2 whitespace-nowrap border-r border-slate-200',
                  isTotal ? 'bg-slate-100 font-bold text-slate-900' : 'bg-inherit text-slate-800',
                )} onClick={e => e.stopPropagation()}>
                  <div className="flex items-center gap-2">
                    {!isTotal && (
                      <span
                        className="inline-block w-2 h-2 rounded-full shrink-0"
                        style={{ backgroundColor: row.revenueHead.color }}
                      />
                    )}
                    {canManage && !isTotal && onUpdateHead ? (
                      <EditableLabel
                        value={row.revenueHead.name}
                        onSave={v => onUpdateHead(row.revenueHead.id, v)}
                        className={isTotal ? 'uppercase tracking-wide text-[11px]' : ''}
                        inputClass="w-40"
                      />
                    ) : (
                      <span className={cn(isTotal ? 'uppercase tracking-wide text-[11px]' : '')}>
                        {row.revenueHead.name}
                      </span>
                    )}
                  </div>
                </td>

                {/* Budget Estimate */}
                {vis.has('budget') && (
                  <td className="px-3 py-2 text-right text-slate-600 whitespace-nowrap">
                    {row.budgetEstimate !== null ? fmt(row.budgetEstimate, unit) : '—'}
                  </td>
                )}

                {/* Monthly actuals */}
                {vis.has('monthly') && showMonthCols && months.map((m, i) => (
                  <td key={m.id} className="px-2.5 py-2 text-right text-slate-600 whitespace-nowrap text-[11px]">
                    {row.monthlyActuals[i] !== null ? fmt(row.monthlyActuals[i], unit) : '—'}
                  </td>
                ))}

                {/* Cumulative current year */}
                {vis.has('cumul_cy') && (
                  <td className={cn(
                    'px-3 py-2 text-right font-semibold whitespace-nowrap',
                    isTotal ? 'text-blue-900 bg-blue-50' : 'text-blue-800 bg-blue-50/60',
                  )}>
                    {fmt(row.cumulativeCurrentYear, unit)}
                  </td>
                )}

                {/* Previous year */}
                {vis.has('prev_yr') && (
                  <td className="px-3 py-2 text-right text-slate-500 whitespace-nowrap">
                    {fmt(row.cumulativePreviousYear, unit)}
                  </td>
                )}

                {/* Target */}
                {vis.has('target') && (
                  <td className="px-3 py-2 text-right whitespace-nowrap text-indigo-700">
                    {row.targetStatus === 'available' || row.targetStatus === 'revised'
                      ? fmt(row.target, unit)
                      : <span className="text-[10px] text-slate-400 italic">
                          {STATUS_LABELS[row.targetStatus] ?? 'N/A'}
                        </span>
                    }
                  </td>
                )}

                {/* Variation */}
                {vis.has('variation') && (
                  <td className={cn(
                    'px-3 py-2 text-right font-semibold whitespace-nowrap',
                    getVariationColour(variation),
                  )}>
                    {variation !== null ? (
                      <span className="flex items-center justify-end gap-1">
                        <span>{getArrow(variation)}</span>
                        <span>{fmt(Math.abs(variation), unit)}</span>
                      </span>
                    ) : '—'}
                  </td>
                )}

                {/* Variation % */}
                {vis.has('var_pct') && (
                  <td className={cn(
                    'px-3 py-2 text-right font-semibold whitespace-nowrap',
                    getVariationColour(varPct),
                  )}>
                    {varPct !== null ? formatPct(varPct) : '—'}
                  </td>
                )}

                {/* Achievement % */}
                {vis.has('ach_pct') && (
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
                )}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
