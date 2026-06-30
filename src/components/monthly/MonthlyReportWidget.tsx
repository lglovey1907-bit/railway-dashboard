'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  REPORT_HEADS,
  MONTH_NAMES,
  type YearlyReport,
  type MonthIndex,
  type MonthEntry,
  type ReportHeadId,
  type HeadValues,
  type AnnualTarget,
  getFyYear,
  getCurrentMonthIndex,
  fyLabel,
  monthShortLabel,
  computeVariation,
  computeCumulativeForHead,
} from '@/lib/monthly/types';

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
  annualTargets?: Partial<Record<ReportHeadId, AnnualTarget>>,
) {
  const res = await fetch('/api/monthly', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ division, fyYear, month, entry, annualTargets }),
  });
  return res.json();
}

// ─── Helpers ───────────────────────────────────────────────────────────────
function fmt(v: number | null, decimals = 2): string {
  if (v === null || v === undefined) return '—';
  return v.toFixed(decimals);
}

function fmtPct(v: number | null): string {
  if (v === null || v === undefined) return '—';
  return `${v > 0 ? '+' : ''}${v.toFixed(1)}%`;
}

function varColor(v: number | null, headId: ReportHeadId): string {
  // For passengers_booked higher is better, for others positive var = good
  if (v === null) return 'text-gray-400';
  return v >= 0 ? 'text-emerald-600' : 'text-red-600';
}

// ─── Data Entry Modal ──────────────────────────────────────────────────────
interface EntryModalProps {
  division: string;
  fyYear: number;
  month: MonthIndex;
  existing: MonthEntry | null;
  annualTargets: Partial<Record<ReportHeadId, AnnualTarget>>;
  onClose: () => void;
  onSaved: () => void;
}

function EntryModal({ division, fyYear, month, existing, annualTargets, onClose, onSaved }: EntryModalProps) {
  // Build initial state from existing or empty
  const initHeads = () => {
    const h: Record<string, { cy: string; py: string }> = {};
    for (const head of REPORT_HEADS) {
      if (head.isTotal) continue; // auto-computed
      h[head.id] = {
        cy: existing?.heads[head.id as ReportHeadId]?.cy?.toString() ?? '',
        py: existing?.heads[head.id as ReportHeadId]?.py?.toString() ?? '',
      };
    }
    return h;
  };
  const initTargets = () => {
    const t: Record<string, string> = {};
    for (const head of REPORT_HEADS) {
      if (head.isTotal) continue;
      t[head.id] = annualTargets[head.id as ReportHeadId]?.target?.toString() ?? '';
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
      // Build entry
      const entryHeads: Record<ReportHeadId, HeadValues> = {} as Record<ReportHeadId, HeadValues>;
      for (const head of REPORT_HEADS) {
        if (head.isTotal) {
          entryHeads[head.id as ReportHeadId] = { cy: null, py: null }; // computed server-side
          continue;
        }
        entryHeads[head.id as ReportHeadId] = {
          cy: parseNum(heads[head.id]?.cy ?? ''),
          py: parseNum(heads[head.id]?.py ?? ''),
        };
      }

      const entry: MonthEntry = {
        month,
        heads: entryHeads,
        enteredAt: new Date().toISOString(),
      };

      // Build annual targets
      const newTargets: Partial<Record<ReportHeadId, AnnualTarget>> = {};
      for (const head of REPORT_HEADS) {
        if (head.isTotal) continue;
        const t = parseNum(targets[head.id] ?? '');
        if (t !== null) newTargets[head.id as ReportHeadId] = { target: t };
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
  const editableHeads = REPORT_HEADS.filter(h => !h.isTotal);

  return (
    <div className="fixed inset-0 z-[3000] flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl mx-4 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b flex items-center justify-between flex-shrink-0">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Enter Data — {monthLabel}</h2>
            <p className="text-xs text-gray-500 mt-0.5">{division} Division · FY {fyLabel(fyYear)}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">×</button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto flex-1 px-6 py-4">
          {/* Column headers */}
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
                </div>
                <input
                  type="number"
                  step="0.01"
                  placeholder="—"
                  value={heads[head.id]?.cy ?? ''}
                  onChange={e => setHead(head.id, 'cy', e.target.value)}
                  className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm text-right focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <input
                  type="number"
                  step="0.01"
                  placeholder="—"
                  value={heads[head.id]?.py ?? ''}
                  onChange={e => setHead(head.id, 'py', e.target.value)}
                  className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm text-right focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            ))}
          </div>

          {/* Annual targets (collapsible) */}
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
                    type="number"
                    step="0.01"
                    placeholder="Annual target"
                    value={targets[head.id] ?? ''}
                    onChange={e => setTargets(prev => ({ ...prev, [head.id]: e.target.value }))}
                    className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm text-right focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t flex items-center justify-between flex-shrink-0">
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="flex gap-3 ml-auto">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm rounded-lg border border-gray-300 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-5 py-2 text-sm rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-60"
            >
              {saving ? 'Saving…' : 'Save'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Main comparative table ────────────────────────────────────────────────
interface ComparativeTableProps {
  report: YearlyReport;
  selectedMonth: MonthIndex;
  fyYear: number;
}

function ComparativeTable({ report, selectedMonth, fyYear }: ComparativeTableProps) {
  const months = report.months;
  const entry = months[selectedMonth];
  const targets = report.annualTargets ?? {};

  // Column group widths
  const thCls = 'px-3 py-2 text-center text-xs font-semibold text-gray-700 border-b border-gray-200 bg-gray-50';
  const numCls = 'px-3 py-2 text-right text-sm tabular-nums';
  const labelCls = 'px-3 py-2 text-sm font-medium text-gray-800';
  const rowAlt = (i: number, isTotal: boolean) =>
    isTotal ? 'bg-blue-50 font-semibold' : i % 2 === 0 ? 'bg-white' : 'bg-gray-50/60';

  const pyMonthLabel = monthShortLabel(fyYear - 1, selectedMonth);
  const cyMonthLabel = monthShortLabel(fyYear, selectedMonth);
  const cyFyLabel = fyLabel(fyYear);
  const pyFyLabel = fyLabel(fyYear - 1);

  return (
    <div className="overflow-x-auto rounded-xl border border-gray-200 shadow-sm">
      <table className="min-w-full border-collapse text-xs">
        <thead>
          <tr>
            <th rowSpan={2} className={`${thCls} text-left min-w-[220px] border-r`}>Head</th>
            {/* Monthly */}
            <th colSpan={4} className={`${thCls} border-r border-blue-200 bg-blue-50`}>
              Monthly ({cyMonthLabel} vs {pyMonthLabel})
            </th>
            {/* Cumulative */}
            <th colSpan={4} className={`${thCls} border-r border-purple-200 bg-purple-50`}>
              Cumulative upto {MONTH_NAMES[selectedMonth - 1]} ({cyFyLabel} vs {pyFyLabel})
            </th>
            {/* Target */}
            <th colSpan={3} className={`${thCls} bg-amber-50`}>
              Annual Target {cyFyLabel}
            </th>
          </tr>
          <tr>
            {/* Monthly sub-headers */}
            <th className={`${thCls} border-r bg-blue-50 min-w-[90px]`}>{cyMonthLabel}</th>
            <th className={`${thCls} border-r bg-blue-50 min-w-[90px]`}>{pyMonthLabel}</th>
            <th className={`${thCls} border-r bg-blue-50 min-w-[80px]`}>Var.</th>
            <th className={`${thCls} border-r bg-blue-50 min-w-[70px]`}>%</th>
            {/* Cumulative sub-headers */}
            <th className={`${thCls} border-r bg-purple-50 min-w-[90px]`}>{cyFyLabel}</th>
            <th className={`${thCls} border-r bg-purple-50 min-w-[90px]`}>{pyFyLabel}</th>
            <th className={`${thCls} border-r bg-purple-50 min-w-[80px]`}>Var.</th>
            <th className={`${thCls} border-r bg-purple-50 min-w-[70px]`}>%</th>
            {/* Target sub-headers */}
            <th className={`${thCls} bg-amber-50 min-w-[90px]`}>Target</th>
            <th className={`${thCls} bg-amber-50 min-w-[80px]`}>Var.</th>
            <th className={`${thCls} bg-amber-50 min-w-[70px]`}>%</th>
          </tr>
        </thead>
        <tbody>
          {REPORT_HEADS.map((head, i) => {
            const hid = head.id as ReportHeadId;

            // Monthly values
            const mCy = entry?.heads[hid]?.cy ?? null;
            const mPy = entry?.heads[hid]?.py ?? null;
            const { variation: mVar, pctAge: mPct } = computeVariation(mCy, mPy);

            // Cumulative values
            const cumCy = computeCumulativeForHead(months, hid, selectedMonth, 'cy');
            const cumPy = computeCumulativeForHead(months, hid, selectedMonth, 'py');
            const { variation: cumVar, pctAge: cumPct } = computeVariation(cumCy, cumPy);

            // Target (annual)
            const tgt = targets[hid]?.target ?? null;
            const { variation: tVar, pctAge: tPct } = computeVariation(cumCy, tgt);

            const rowClass = rowAlt(i, !!head.isTotal);

            return (
              <tr key={hid} className={`${rowClass} border-b border-gray-100`}>
                <td className={`${labelCls} border-r ${head.isTotal ? 'font-bold' : ''}`}>
                  {head.label}
                  <span className="ml-1 text-gray-400 font-normal text-xs">({head.unit})</span>
                </td>
                {/* Monthly */}
                <td className={`${numCls} border-r text-gray-800`}>{fmt(mCy)}</td>
                <td className={`${numCls} border-r text-gray-600`}>{fmt(mPy)}</td>
                <td className={`${numCls} border-r ${varColor(mVar, hid)}`}>{fmt(mVar)}</td>
                <td className={`${numCls} border-r ${varColor(mPct, hid)}`}>{fmtPct(mPct)}</td>
                {/* Cumulative */}
                <td className={`${numCls} border-r text-gray-800`}>{fmt(cumCy)}</td>
                <td className={`${numCls} border-r text-gray-600`}>{fmt(cumPy)}</td>
                <td className={`${numCls} border-r ${varColor(cumVar, hid)}`}>{fmt(cumVar)}</td>
                <td className={`${numCls} border-r ${varColor(cumPct, hid)}`}>{fmtPct(cumPct)}</td>
                {/* Target */}
                <td className={`${numCls} text-gray-700`}>{fmt(tgt)}</td>
                <td className={`${numCls} ${varColor(tVar, hid)}`}>{fmt(tVar)}</td>
                <td className={`${numCls} ${varColor(tPct, hid)}`}>{fmtPct(tPct)}</td>
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

  const { report, loading, refresh } = useYearlyReport(division, fyYear);

  // Build list of available FY years: current and 2 previous
  const fyOptions = [todayFy, todayFy - 1, todayFy - 2];

  // Months that have data
  const monthsWithData = report
    ? (Object.keys(report.months).map(Number) as MonthIndex[])
    : [];

  return (
    <div className="flex flex-col gap-4 w-full h-full min-h-0">
      {/* ── Top bar ── */}
      <div className="flex flex-wrap items-center gap-3">
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

        {/* Admin – Enter Data button */}
        {isAdmin && (
          <button
            onClick={() => setShowEntry(true)}
            className="ml-auto flex items-center gap-1.5 px-4 py-1.5 bg-emerald-600 text-white text-sm rounded-lg hover:bg-emerald-700"
          >
            <span className="text-base">＋</span>
            Enter Data
          </button>
        )}
      </div>

      {/* ── Title ── */}
      <div className="text-center">
        <h3 className="text-sm font-semibold text-gray-800 uppercase tracking-wide">
          Statement Showing Originating Revenue over {division} Division
        </h3>
        <p className="text-xs text-gray-500 mt-0.5">
          During {MONTH_NAMES[selectedMonth - 1]} {fyYear} as Compared with{' '}
          {MONTH_NAMES[selectedMonth - 1]} {fyYear - 1}
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
          />
          {report.months[selectedMonth]?.enteredAt && (
            <p className="text-xs text-gray-400 mt-2 text-right">
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
          onClose={() => setShowEntry(false)}
          onSaved={refresh}
        />
      )}
    </div>
  );
}
