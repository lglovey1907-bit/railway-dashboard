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
  fyLabel?: string;
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
  fyLabel = "FY 2026-27",
}: Props) {
  const months = FY_MONTHS.slice(0, upToMonth);
  const match = (fyLabel || '').match(/20(\d{2})-(\d{2})/);
  let cyFull = '2026-27';
  let pyFull = '2025-26';
  let ppyFull = '2024-25';
  
  if (match) {
    const startYr = parseInt(match[1], 10);
    const endYr = parseInt(match[2], 10);
    cyFull = `20${startYr}-${endYr}`;
    pyFull = `20${startYr - 1}-${endYr - 1}`;
    ppyFull = `20${startYr - 2}-${endYr - 2}`;
  }
  
  const curMonthShort = FY_MONTHS[upToMonth - 1].short.toUpperCase();
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
            <table className="w-full text-left border-collapse border border-slate-800">
        <thead className="bg-slate-50 text-slate-600 text-[11px] font-semibold sticky top-0 z-20 shadow-sm">
          <tr>
            <th className="px-2 py-2 text-center sticky left-0 bg-slate-50 border-r border-slate-800 border-b border-b-slate-800 w-12 z-30" rowSpan={2}>
              S.No.
            </th>
            <th className="px-3 py-2 text-left sticky left-[48px] bg-slate-50 border-r border-slate-800 border-b border-b-slate-800 min-w-[200px] z-30" rowSpan={2}>
              ITEMS
            </th>
            {showMonthCols && (
              <th className="px-2.5 py-2 text-center border-r border-slate-800 border-b border-b-slate-800" colSpan={12}>
                Monthly Actuals
              </th>
            )}
            <th className="px-3 py-1.5 text-center border-r border-slate-800 border-b border-b-slate-800" colSpan={2}>
              Achieved in year
            </th>
            <th className="px-3 py-1.5 text-center border-r border-slate-800 border-b border-b-slate-800" colSpan={3}>
              Target {cyFull}
            </th>
            <th className="px-3 py-1.5 text-center border-r border-slate-800 border-b border-b-slate-800" colSpan={3}>
              Current Month
            </th>
            <th className="px-3 py-1.5 text-center border-b border-b-slate-800" colSpan={3}>
              Cummulative Upto {curMonthShort} {cyFull.split('-')[1]}
            </th>
          </tr>
          <tr>
            {showMonthCols && months.map(m => (
              <th key={m.id} className="px-2.5 py-1.5 text-right border-r border-slate-800 border-b border-b-slate-800 font-medium">
                {m.short}
              </th>
            ))}
            <th className="px-3 py-1.5 text-right border-r border-slate-800 border-b border-b-slate-800 font-medium">
              {ppyFull}
            </th>
            <th className="px-3 py-1.5 text-right border-r border-slate-800 border-b border-b-slate-800 font-medium">{pyFull}</th>
            <th className="px-3 py-1.5 text-right border-r border-slate-800 border-b border-b-slate-800 font-medium">
              Month
            </th>
            <th className="px-3 py-1.5 text-right border-r border-slate-800 border-b border-b-slate-800 font-medium">{`Upto ${curMonthShort}`}</th>
            <th className="px-3 py-1.5 text-right border-r border-slate-800 border-b border-b-slate-800 font-medium">
              Yearly
            </th>
            <th className="px-3 py-1.5 text-right border-r border-slate-800 border-b border-b-slate-800 font-medium">
              {curMonthShort}'{pyFull.split('-')[1]}
            </th>
            <th className="px-3 py-1.5 text-right border-r border-slate-800 border-b border-b-slate-800 font-medium">
              {curMonthShort}'{cyFull.split('-')[1]}
            </th>
            <th className="px-3 py-1.5 text-right border-r border-slate-800 border-b border-b-slate-800 font-medium">%Variation</th>
            <th className="px-3 py-1.5 text-right border-r border-slate-800 border-b border-b-slate-800 font-medium">
              {pyFull}
            </th>
            <th className="px-3 py-1.5 text-right border-r border-slate-800 border-b border-b-slate-800 font-medium">
              {cyFull}
            </th>
            <th className="px-3 py-1.5 text-right border-b border-b-slate-800 font-medium">%Variation</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 bg-white">
          {rows.map(row => {
            const isTotal = row.isTotal;
            const isHdr = row.revenueHead.isHeader;
            const hBg = isTotal ? 'bg-slate-100 font-bold' : isHdr ? 'bg-slate-50 font-bold' : 'bg-inherit';
            
            return (
              <tr key={row.revenueHead.id} className={cn("group hover:bg-slate-50/50 transition-colors", hBg)}>
                <td className={cn(
                  'sticky left-0 z-10 px-2 py-2 text-center text-[11px] whitespace-nowrap border-r border-slate-800 font-medium',
                  hBg, 'text-slate-700'
                )}>
                  {row.revenueHead.sNo || ''}
                </td>
                <td className={cn(
                  'sticky left-[48px] z-10 px-3 py-2 whitespace-nowrap border-r border-slate-800',
                  hBg,
                  isHdr ? 'uppercase text-[11px] text-slate-700' : 'text-slate-800',
                  row.revenueHead.parentId ? 'pl-8 text-slate-600' : ''
                )} onClick={e => { e.stopPropagation(); if(onClickHead) onClickHead(row.revenueHead.id); }}>
                  <div className="flex items-center gap-2">
                    {!isTotal && !isHdr && (
                      <span className="inline-block w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: row.revenueHead.color }} />
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

                {showMonthCols && months.map((m, i) => (
                  <td key={m.id} className="px-2.5 py-2 text-right text-slate-600 whitespace-nowrap text-[11px] border-r border-slate-800">
                    {isHdr ? '' : row.monthlyActuals[i] !== null ? fmt(row.monthlyActuals[i], unit) : '—'}
                  </td>
                ))}

                {/* Actuals */}
                <td className="px-3 py-2 text-right text-slate-600 whitespace-nowrap border-r border-slate-800">
                  {isHdr ? '' : row.actualsPrevPrevYear !== null ? fmt(row.actualsPrevPrevYear, unit) : '—'}
                </td>
                <td className="px-3 py-2 text-right text-slate-600 whitespace-nowrap border-r border-slate-800">
                  {isHdr ? '' : row.actualsPrevYear !== null ? fmt(row.actualsPrevYear, unit) : '—'}
                </td>

                {/* Target */}
                <td className="px-3 py-2 text-right text-indigo-700 whitespace-nowrap border-r border-slate-800">
                  {isHdr ? '' : row.targetMonth !== null ? fmt(row.targetMonth, unit) : '—'}
                </td>
                <td className="px-3 py-2 text-right text-indigo-700 whitespace-nowrap border-r border-slate-800">
                  {isHdr ? '' : row.targetUpto !== null ? fmt(row.targetUpto, unit) : '—'}
                </td>
                <td className="px-3 py-2 text-right text-indigo-700 whitespace-nowrap border-r border-slate-800">
                  {isHdr ? '' : row.targetYearly !== null ? fmt(row.targetYearly, unit) : '—'}
                </td>

                {/* Current Month */}
                <td className="px-3 py-2 text-right text-slate-600 whitespace-nowrap border-r border-slate-800">
                  {isHdr ? '' : row.currentMonthPY !== null ? fmt(row.currentMonthPY, unit) : '—'}
                </td>
                <td className="px-3 py-2 text-right text-slate-900 font-medium whitespace-nowrap border-r border-slate-800">
                  {isHdr ? '' : row.currentMonthCY !== null ? fmt(row.currentMonthCY, unit) : '—'}
                </td>
                <td className={cn("px-3 py-2 text-right font-semibold whitespace-nowrap border-r border-slate-800", getVariationColour(row.currentMonthVarPct ?? null))}>
                  {isHdr ? '' : row.currentMonthVarPct !== null ? formatPct(row.currentMonthVarPct ?? null) : '—'}
                </td>

                {/* Cumulative */}
                <td className="px-3 py-2 text-right text-slate-600 whitespace-nowrap border-r border-slate-800">
                  {isHdr ? '' : row.cumulativePreviousYear !== null ? fmt(row.cumulativePreviousYear, unit) : '—'}
                </td>
                <td className="px-3 py-2 text-right text-blue-900 font-semibold whitespace-nowrap bg-blue-50/30 border-r border-slate-800">
                  {isHdr ? '' : row.cumulativeCurrentYear !== null ? fmt(row.cumulativeCurrentYear, unit) : '—'}
                </td>
                <td className={cn("px-3 py-2 text-right font-bold whitespace-nowrap", getVariationColour(row.variationPct))}>
                  {isHdr ? '' : row.variationPct !== null ? formatPct(row.variationPct) : '—'}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
