'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import {
  REPORT_HEADS,
  MONTH_NAMES,
  type YearlyReport,
  type MonthIndex,
  type MonthEntry,
  type AnnualTarget,
  type CustomHead,
  getFyYear,
  getCurrentMonthIndex,
  fyLabel,
  monthShortLabel,
  computeVariation,
  computeCumulativeForHead,
} from '@/lib/monthly/types';

// ─── Types ──────────────────────────────────────────────────────────────────
type DisplayUnit = 'cr' | 'lacs';

/** All heads merged (fixed + custom) */
interface AnyHead {
  id: string;
  label: string;
  unit: 'Cr' | 'Lakh';
  isTotal: boolean;
  isCustom: boolean;
}

// ─── Tiny hook: fetch yearly report ────────────────────────────────────────
function useYearlyReport(division: string, fyYear: number) {
  const [report, setReport] = useState<YearlyReport | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/monthly?division=${division}&fyYear=${fyYear}`);
      if (res.ok) setReport(await res.json());
    } finally {
      setLoading(false);
    }
  }, [division, fyYear]);

  useEffect(() => { refresh(); }, [refresh]);
  return { report, loading, refresh };
}

async function saveMonth(
  division: string,
  fyYear: number,
  month: MonthIndex,
  entry: MonthEntry,
  annualTargets?: Record<string, AnnualTarget>,
) {
  const res = await fetch('/api/monthly', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ division, fyYear, month, entry, annualTargets }),
  });
  return res.json();
}

async function saveCustomHead(division: string, fyYear: number, customHead: CustomHead) {
  const res = await fetch('/api/monthly', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ division, fyYear, customHead }),
  });
  return res.json();
}

// ─── Format helpers ─────────────────────────────────────────────────────────
function fmtVal(v: number | null, unit: 'Cr' | 'Lakh', displayUnit: DisplayUnit, decimals = 2): string {
  if (v === null || v === undefined) return '—';
  // Convert Cr → Lacs (multiply by 100) only when toggled; Lakh rows stay as-is
  const val = (displayUnit === 'lacs' && unit === 'Cr') ? v * 100 : v;
  return val.toFixed(decimals);
}

function fmtPct(v: number | null): string {
  if (v === null || v === undefined) return '—';
  return `${v > 0 ? '+' : ''}${v.toFixed(1)}%`;
}

function varColor(v: number | null): string {
  if (v === null) return 'text-gray-400';
  return v >= 0 ? 'text-emerald-600' : 'text-red-600';
}

/** Display unit label e.g. 'Cr' → 'Lacs' when toggled */
function headUnitLabel(unit: 'Cr' | 'Lakh', displayUnit: DisplayUnit): string {
  if (unit === 'Lakh') return 'Lakh';
  return displayUnit === 'lacs' ? 'Lacs' : 'Cr';
}

// ─── Print CSS injector ──────────────────────────────────────────────────────
function PrintStyles() {
  return (
    <style dangerouslySetInnerHTML={{ __html: `
      @media print {
        body > *:not(#monthly-print-root) { display: none !important; }
        #monthly-print-root { display: block !important; }
        @page { size: A4 landscape; margin: 10mm; }
        .no-print { display: none !important; }
        table { font-size: 8pt !important; }
        th, td { padding: 3px 5px !important; }
      }
    `}} />
  );
}

// ─── Add Custom Head Modal ──────────────────────────────────────────────────
interface AddHeadModalProps {
  division: string;
  fyYear: number;
  existingCustom: CustomHead[];
  onClose: () => void;
  onSaved: () => void;
}

function AddHeadModal({ division, fyYear, existingCustom, onClose, onSaved }: AddHeadModalProps) {
  const [label, setLabel] = useState('');
  const [unit, setUnit] = useState<'Cr' | 'Lakh'>('Cr');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSave = async () => {
    if (!label.trim()) { setError('Label is required'); return; }
    setSaving(true);
    setError('');
    try {
      const id = `custom_${label.trim().toLowerCase().replace(/[^a-z0-9]/g, '_')}_${Date.now()}`;
      const customHead: CustomHead = {
        id,
        label: label.trim(),
        unit,
        order: (existingCustom.length + 1) * 10 + 100,
      };
      const result = await saveCustomHead(division, fyYear, customHead);
      if (result.error) { setError(result.error); return; }
      onSaved();
      onClose();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[4000] flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm mx-4">
        <div className="px-6 py-4 border-b flex items-center justify-between">
          <h2 className="text-base font-semibold text-gray-900">Add Revenue Head</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">×</button>
        </div>
        <div className="px-6 py-5 space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Head Name</label>
            <input
              type="text"
              value={label}
              onChange={e => setLabel(e.target.value)}
              placeholder="e.g., Parcel Revenue"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Unit</label>
            <select
              value={unit}
              onChange={e => setUnit(e.target.value as 'Cr' | 'Lakh')}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="Cr">Crore (Cr)</option>
              <option value="Lakh">Lakh</option>
            </select>
          </div>
          {error && <p className="text-xs text-red-600">{error}</p>}
        </div>
        <div className="px-6 py-4 border-t flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 text-sm rounded-lg border border-gray-300 hover:bg-gray-50">
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-5 py-2 text-sm rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-60"
          >
            {saving ? 'Adding…' : 'Add Head'}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

// ─── Data Entry Modal ──────────────────────────────────────────────────────
interface EntryModalProps {
  division: string;
  fyYear: number;
  month: MonthIndex;
  existing: MonthEntry | null;
  annualTargets: Record<string, AnnualTarget>;
  allHeads: AnyHead[];
  onClose: () => void;
  onSaved: () => void;
}

function EntryModal({ division, fyYear, month, existing, annualTargets, allHeads, onClose, onSaved }: EntryModalProps) {
  const editableHeads = allHeads.filter(h => !h.isTotal);

  const initHeads = () => {
    const h: Record<string, { cy: string; py: string }> = {};
    for (const head of editableHeads) {
      h[head.id] = {
        cy: existing?.heads[head.id]?.cy?.toString() ?? '',
        py: existing?.heads[head.id]?.py?.toString() ?? '',
      };
    }
    return h;
  };
  const initTargets = () => {
    const t: Record<string, string> = {};
    for (const head of editableHeads) {
      t[head.id] = annualTargets[head.id]?.target?.toString() ?? '';
    }
    return t;
  };

  const [heads, setHeads] = useState(initHeads);
  const [targets, setTargets] = useState(initTargets);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [showTargets, setShowTargets] = useState(false);

  const setHead = (id: string, field: 'cy' | 'py', val: string) => {
    setHeads(prev => ({ ...prev, [id]: { ...prev[id], [field]: val } }));
  };

  const parseNum = (s: string): number | null => {
    if (!s.trim()) return null;
    const n = parseFloat(s);
    return isNaN(n) ? null : n;
  };

  const handleSave = async () => {
    setSaving(true);
    setError('');
    try {
      const entryHeads: Record<string, { cy: number | null; py: number | null }> = {};
      for (const head of allHeads) {
        if (head.isTotal) {
          entryHeads[head.id] = { cy: null, py: null };
          continue;
        }
        entryHeads[head.id] = {
          cy: parseNum(heads[head.id]?.cy ?? ''),
          py: parseNum(heads[head.id]?.py ?? ''),
        };
      }

      const entry: MonthEntry = {
        month,
        heads: entryHeads,
        enteredAt: new Date().toISOString(),
      };

      const newTargets: Record<string, AnnualTarget> = {};
      for (const head of editableHeads) {
        const t = parseNum(targets[head.id] ?? '');
        if (t !== null) newTargets[head.id] = { target: t };
      }

      const result = await saveMonth(division, fyYear, month, entry, newTargets);
      if (result.error) { setError(result.error); return; }
      onSaved();
      onClose();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const monthLabel = monthShortLabel(fyYear, month);

  return (
    <div className="fixed inset-0 z-[3000] flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl mx-4 flex flex-col max-h-[90vh]">
        <div className="px-6 py-4 border-b flex items-center justify-between flex-shrink-0">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Enter Data — {monthLabel}</h2>
            <p className="text-xs text-gray-500 mt-0.5">{division} Division · FY {fyLabel(fyYear)}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">×</button>
        </div>

        <div className="overflow-y-auto flex-1 px-6 py-4">
          <div className="grid grid-cols-[1fr_130px_130px] gap-2 mb-3">
            <div className="text-xs font-semibold text-gray-500 uppercase">Head</div>
            <div className="text-xs font-semibold text-gray-500 uppercase text-center">{monthLabel} (CY)</div>
            <div className="text-xs font-semibold text-gray-500 uppercase text-center">
              {monthShortLabel(fyYear - 1, month)} (PY)
            </div>
          </div>

          <div className="space-y-2">
            {editableHeads.map(head => (
              <div key={head.id} className="grid grid-cols-[1fr_130px_130px] gap-2 items-center">
                <div className="text-sm text-gray-700">
                  {head.label}
                  <span className="ml-1 text-xs text-gray-400">({head.unit})</span>
                  {head.isCustom && <span className="ml-1 text-xs text-purple-500">custom</span>}
                </div>
                <input
                  type="number" step="0.01" placeholder="—"
                  value={heads[head.id]?.cy ?? ''}
                  onChange={e => setHead(head.id, 'cy', e.target.value)}
                  className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm text-right focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <input
                  type="number" step="0.01" placeholder="—"
                  value={heads[head.id]?.py ?? ''}
                  onChange={e => setHead(head.id, 'py', e.target.value)}
                  className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm text-right focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            ))}
          </div>

          <button
            onClick={() => setShowTargets(t => !t)}
            className="mt-5 flex items-center gap-1.5 text-xs font-medium text-blue-600 hover:text-blue-800"
          >
            <span>{showTargets ? '▾' : '▸'}</span>
            Annual Targets for FY {fyLabel(fyYear)} (optional)
          </button>

          {showTargets && (
            <div className="mt-3 space-y-2 border-t pt-3">
              <p className="text-xs text-gray-400 mb-2">
                Enter annual targets once — they apply to all months in this FY.
              </p>
              {editableHeads.map(head => (
                <div key={head.id} className="grid grid-cols-[1fr_130px] gap-2 items-center">
                  <div className="text-sm text-gray-700">
                    {head.label}
                    <span className="ml-1 text-xs text-gray-400">({head.unit})</span>
                  </div>
                  <input
                    type="number" step="0.01" placeholder="Annual target"
                    value={targets[head.id] ?? ''}
                    onChange={e => setTargets(prev => ({ ...prev, [head.id]: e.target.value }))}
                    className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm text-right focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="px-6 py-4 border-t flex items-center justify-between flex-shrink-0">
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="flex gap-3 ml-auto">
            <button onClick={onClose} className="px-4 py-2 text-sm rounded-lg border border-gray-300 hover:bg-gray-50">
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-5 py-2 text-sm rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-60"
            >
              {saving ? 'Saving…' : 'Save'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Comparative Table ─────────────────────────────────────────────────────
interface ComparativeTableProps {
  report: YearlyReport;
  selectedMonth: MonthIndex;
  fyYear: number;
  displayUnit: DisplayUnit;
  allHeads: AnyHead[];
}

function ComparativeTable({ report, selectedMonth, fyYear, displayUnit, allHeads }: ComparativeTableProps) {
  const months = report.months;
  const entry = months[selectedMonth];
  const targets = report.annualTargets ?? {};

  const thCls = 'px-3 py-2 text-center text-xs font-semibold text-gray-700 border-b border-gray-200 bg-gray-50';
  const numCls = 'px-3 py-2 text-right text-sm tabular-nums';
  const labelCls = 'px-3 py-2 text-sm font-medium text-gray-800';
  const rowAlt = (i: number, isTotal: boolean) =>
    isTotal ? 'bg-blue-50 font-semibold' : i % 2 === 0 ? 'bg-white' : 'bg-gray-50/60';

  const pyMonthLabel = monthShortLabel(fyYear - 1, selectedMonth);
  const cyMonthLabel = monthShortLabel(fyYear, selectedMonth);
  const cyFyLabel = fyLabel(fyYear);
  const pyFyLabel = fyLabel(fyYear - 1);

  const unitSuffix = displayUnit === 'lacs' ? ' (Lacs)' : ' (Cr)';

  return (
    <div className="overflow-x-auto rounded-xl border border-gray-200 shadow-sm">
      <table className="min-w-full border-collapse text-xs">
        <thead>
          <tr>
            <th rowSpan={2} className={`${thCls} text-left min-w-[220px] border-r`}>Head</th>
            <th colSpan={4} className={`${thCls} border-r border-blue-200 bg-blue-50`}>
              Monthly ({cyMonthLabel} vs {pyMonthLabel})
            </th>
            <th colSpan={4} className={`${thCls} border-r border-purple-200 bg-purple-50`}>
              Cumulative upto {MONTH_NAMES[selectedMonth - 1]} ({cyFyLabel} vs {pyFyLabel})
            </th>
            <th colSpan={3} className={`${thCls} bg-amber-50`}>
              Annual Target {cyFyLabel}
            </th>
          </tr>
          <tr>
            <th className={`${thCls} border-r bg-blue-50 min-w-[90px]`}>{cyMonthLabel}</th>
            <th className={`${thCls} border-r bg-blue-50 min-w-[90px]`}>{pyMonthLabel}</th>
            <th className={`${thCls} border-r bg-blue-50 min-w-[80px]`}>Var.</th>
            <th className={`${thCls} border-r bg-blue-50 min-w-[70px]`}>%</th>
            <th className={`${thCls} border-r bg-purple-50 min-w-[90px]`}>{cyFyLabel}</th>
            <th className={`${thCls} border-r bg-purple-50 min-w-[90px]`}>{pyFyLabel}</th>
            <th className={`${thCls} border-r bg-purple-50 min-w-[80px]`}>Var.</th>
            <th className={`${thCls} border-r bg-purple-50 min-w-[70px]`}>%</th>
            <th className={`${thCls} bg-amber-50 min-w-[90px]`}>Target</th>
            <th className={`${thCls} bg-amber-50 min-w-[80px]`}>Var.</th>
            <th className={`${thCls} bg-amber-50 min-w-[70px]`}>%</th>
          </tr>
        </thead>
        <tbody>
          {allHeads.map((head, i) => {
            const hid = head.id;
            const unitLabel = headUnitLabel(head.unit, displayUnit);
            const du = displayUnit;

            const mCy = entry?.heads[hid]?.cy ?? null;
            const mPy = entry?.heads[hid]?.py ?? null;
            const { variation: mVar, pctAge: mPct } = computeVariation(mCy, mPy);

            const cumCy = computeCumulativeForHead(months, hid, selectedMonth, 'cy');
            const cumPy = computeCumulativeForHead(months, hid, selectedMonth, 'py');
            const { variation: cumVar, pctAge: cumPct } = computeVariation(cumCy, cumPy);

            const tgt = targets[hid]?.target ?? null;
            const { variation: tVar, pctAge: tPct } = computeVariation(cumCy, tgt);

            // For variation rows, also apply the same multiplier
            const varMult = (du === 'lacs' && head.unit === 'Cr') ? 100 : 1;
            const fv = (v: number | null) => v === null ? '—' : (v * varMult).toFixed(2);

            const rowClass = rowAlt(i, head.isTotal);

            return (
              <tr key={hid} className={`${rowClass} border-b border-gray-100`}>
                <td className={`${labelCls} border-r ${head.isTotal ? 'font-bold' : ''}`}>
                  {head.label}
                  <span className="ml-1 text-gray-400 font-normal text-xs">({unitLabel})</span>
                </td>
                <td className={`${numCls} border-r text-gray-800`}>{fmtVal(mCy, head.unit, du)}</td>
                <td className={`${numCls} border-r text-gray-600`}>{fmtVal(mPy, head.unit, du)}</td>
                <td className={`${numCls} border-r ${varColor(mVar)}`}>{fv(mVar)}</td>
                <td className={`${numCls} border-r ${varColor(mPct)}`}>{fmtPct(mPct)}</td>
                <td className={`${numCls} border-r text-gray-800`}>{fmtVal(cumCy, head.unit, du)}</td>
                <td className={`${numCls} border-r text-gray-600`}>{fmtVal(cumPy, head.unit, du)}</td>
                <td className={`${numCls} border-r ${varColor(cumVar)}`}>{fv(cumVar)}</td>
                <td className={`${numCls} border-r ${varColor(cumPct)}`}>{fmtPct(cumPct)}</td>
                <td className={`${numCls} text-gray-700`}>{fmtVal(tgt, head.unit, du)}</td>
                <td className={`${numCls} ${varColor(tVar)}`}>{fv(tVar)}</td>
                <td className={`${numCls} ${varColor(tPct)}`}>{fmtPct(tPct)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ─── Main Widget ───────────────────────────────────────────────────────────
interface MonthlyReportWidgetProps {
  division?: string;
  isAdmin?: boolean;
}

export function MonthlyReportWidget({ division = 'DELHI', isAdmin = false }: MonthlyReportWidgetProps) {
  const todayFy = getFyYear();
  const todayMonth = getCurrentMonthIndex();

  const [fyYear, setFyYear] = useState(todayFy);
  const [selectedMonth, setSelectedMonth] = useState<MonthIndex>(todayMonth);
  const [showEntry, setShowEntry] = useState(false);
  const [showAddHead, setShowAddHead] = useState(false);
  const [displayUnit, setDisplayUnit] = useState<DisplayUnit>('cr');

  const { report, loading, refresh } = useYearlyReport(division, fyYear);
  const fyOptions = [todayFy, todayFy - 1, todayFy - 2];

  const monthsWithData = report
    ? (Object.keys(report.months).map(Number) as MonthIndex[])
    : [];

  // Merge fixed + custom heads
  const allHeads: AnyHead[] = [
    ...REPORT_HEADS.map(h => ({
      id: h.id,
      label: h.label,
      unit: h.unit as 'Cr' | 'Lakh',
      isTotal: h.isTotal,
      isCustom: false,
    })),
    ...(report?.customHeads ?? []).map(h => ({
      id: h.id,
      label: h.label,
      unit: h.unit as 'Cr' | 'Lakh',
      isTotal: false,
      isCustom: true,
    })),
  ];

  const handlePrint = () => {
    // Set a root id so print CSS can hide everything else
    const widget = document.getElementById('monthly-report-widget');
    if (widget) widget.id = 'monthly-print-root';
    window.print();
    if (widget) widget.id = 'monthly-report-widget';
  };

  return (
    <div id="monthly-report-widget" className="flex flex-col gap-4 w-full h-full min-h-0">
      <PrintStyles />

      {/* ── Top bar ── */}
      <div className="flex flex-wrap items-center gap-2 no-print">
        {/* Division badge */}
        <span className="text-xs font-semibold bg-indigo-100 text-indigo-700 px-2.5 py-1 rounded-full">
          {division} Division
        </span>

        {/* FY selector */}
        <select
          value={fyYear}
          onChange={e => { setFyYear(Number(e.target.value)); setSelectedMonth(1); }}
          className="border border-gray-300 rounded-lg px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          {fyOptions.map(y => (
            <option key={y} value={y}>FY {fyLabel(y)}</option>
          ))}
        </select>

        {/* Month tabs */}
        <div className="flex flex-wrap gap-1 flex-1">
          {(Array.from({ length: 12 }, (_, i) => (i + 1) as MonthIndex)).map(m => {
            const hasData = monthsWithData.includes(m);
            const isSelected = m === selectedMonth;
            return (
              <button
                key={m}
                onClick={() => setSelectedMonth(m)}
                className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                  isSelected
                    ? 'bg-blue-600 text-white'
                    : hasData
                    ? 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                    : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                }`}
              >
                {MONTH_NAMES[m - 1].slice(0, 3)}
              </button>
            );
          })}
        </div>

        {/* Controls */}
        <div className="flex items-center gap-2 ml-auto">
          {/* Cr / Lacs toggle */}
          <button
            onClick={() => setDisplayUnit(u => u === 'cr' ? 'lacs' : 'cr')}
            title={displayUnit === 'cr' ? 'Switch to Lacs view' : 'Switch to Cr view'}
            className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg border text-xs font-bold transition-colors ${
              displayUnit === 'lacs'
                ? 'bg-amber-50 border-amber-300 text-amber-700'
                : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            ₹&nbsp;{displayUnit === 'cr' ? 'Cr' : 'Lacs'}
            <span className="text-[9px] opacity-60 ml-0.5">{displayUnit === 'cr' ? '→ Lacs' : '→ Cr'}</span>
          </button>

          {/* Print button */}
          <button
            onClick={handlePrint}
            title="Print / Save as PDF"
            className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-300 text-gray-600 text-xs rounded-lg hover:bg-gray-50 transition-colors"
          >
            🖨️ Print
          </button>

          {/* Admin: Add row */}
          {isAdmin && (
            <button
              onClick={() => setShowAddHead(true)}
              className="flex items-center gap-1 px-3 py-1.5 bg-purple-600 text-white text-xs rounded-lg hover:bg-purple-700"
            >
              ＋ Add Row
            </button>
          )}

          {/* Admin: Enter data */}
          {isAdmin && (
            <button
              onClick={() => setShowEntry(true)}
              className="flex items-center gap-1.5 px-4 py-1.5 bg-emerald-600 text-white text-sm rounded-lg hover:bg-emerald-700"
            >
              <span className="text-base">＋</span>
              Enter Data
            </button>
          )}
        </div>
      </div>

      {/* ── Title (shows in print too) ── */}
      <div className="text-center">
        <h3 className="text-sm font-semibold text-gray-800 uppercase tracking-wide">
          Statement Showing Originating Revenue over {division} Division
        </h3>
        <p className="text-xs text-gray-500 mt-0.5">
          During {MONTH_NAMES[selectedMonth - 1]} {fyYear} as Compared with{' '}
          {MONTH_NAMES[selectedMonth - 1]} {fyYear - 1}
          {displayUnit === 'lacs' && (
            <span className="ml-2 text-amber-600 font-medium">(Values in Lacs)</span>
          )}
        </p>
      </div>

      {/* ── Table / loading / empty ── */}
      {loading ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-gray-400 text-sm animate-pulse">Loading data…</div>
        </div>
      ) : !report ? (
        <div className="flex-1 flex items-center justify-center text-gray-400 text-sm">
          No data available.
        </div>
      ) : !report.months[selectedMonth] ? (
        <div className="flex-1 flex flex-col items-center justify-center gap-3 text-gray-400">
          <div className="text-4xl">📊</div>
          <p className="text-sm">No data entered for {MONTH_NAMES[selectedMonth - 1]} {fyYear} yet.</p>
          {isAdmin && (
            <button
              onClick={() => setShowEntry(true)}
              className="mt-1 px-4 py-2 bg-emerald-600 text-white text-sm rounded-lg hover:bg-emerald-700"
            >
              Enter Data Now
            </button>
          )}
        </div>
      ) : (
        <div className="flex-1 overflow-auto">
          <ComparativeTable
            report={report}
            selectedMonth={selectedMonth}
            fyYear={fyYear}
            displayUnit={displayUnit}
            allHeads={allHeads}
          />
          {report.months[selectedMonth]?.enteredAt && (
            <p className="text-xs text-gray-400 mt-2 text-right no-print">
              Last updated: {new Date(report.months[selectedMonth]!.enteredAt!).toLocaleString()}
            </p>
          )}
        </div>
      )}

      {/* ── Data Entry Modal ── */}
      {showEntry && report && (
        <EntryModal
          division={division}
          fyYear={fyYear}
          month={selectedMonth}
          existing={report.months[selectedMonth] ?? null}
          annualTargets={report.annualTargets ?? {}}
          allHeads={allHeads}
          onClose={() => setShowEntry(false)}
          onSaved={refresh}
        />
      )}

      {/* ── Add Head Modal ── */}
      {showAddHead && report && (
        <AddHeadModal
          division={division}
          fyYear={fyYear}
          existingCustom={report.customHeads ?? []}
          onClose={() => setShowAddHead(false)}
          onSaved={refresh}
        />
      )}
    </div>
  );
}
