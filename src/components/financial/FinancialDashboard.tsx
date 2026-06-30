'use client';
// ─────────────────────────────────────────────────────────────────────────────
// Financial Performance Dashboard Widget
// Features: unit toggle (Cr/Lacs), add row, monthly stmt print, column vis
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  ChevronDown, Printer, PencilLine, Eye, EyeOff,
  Calendar, LayoutGrid, List, RefreshCw, Plus,
  Columns, X,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useFinancialStore, pullSharedFinancialData } from '@/lib/financial/financialStore';
import { sharedWrite } from '@/lib/config/sharedSync';
import type { FYMonth } from '@/lib/financial/types';
import { FY_MONTHS, getCurrentFYMonth } from '@/lib/financial/types';
import { buildCumulativeRows } from '@/lib/financial/calculations';

import { ExecutiveCards } from './ExecutiveCards';
import {
  RevenueTable,
  DEFAULT_COL_LABELS,
  ALL_COLS,
  type Unit,
  type ColKey,
} from './RevenueTable';
import { RevenueCharts }  from './RevenueCharts';
import { DataEntryModal } from './DataEntryModal';
import { DrillDownModal } from './DrillDownModal';
import { PrintView }      from './PrintView';

// ── localStorage helpers ──────────────────────────────────────────────────────

function lsGet<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback;
  try { return JSON.parse(localStorage.getItem(key) ?? 'null') ?? fallback; } catch { return fallback; }
}
function lsSet(key: string, val: unknown) {
  try { localStorage.setItem(key, JSON.stringify(val)); } catch { /**/ }
}

// ── Inline Add-Row Modal ──────────────────────────────────────────────────────

const COLORS = ['#3b82f6','#8b5cf6','#f59e0b','#06b6d4','#10b981','#f97316','#ec4899','#64748b'];

function AddRowModal({ onClose, onAdd }: {
  onClose: () => void;
  onAdd: (name: string, code: string, color: string) => void;
}) {
  const [name, setName]   = useState('');
  const [code, setCode]   = useState('');
  const [color, setColor] = useState(COLORS[0]);
  const nameRef = useRef<HTMLInputElement>(null);
  useEffect(() => { nameRef.current?.focus(); }, []);

  const handleSave = () => {
    if (!name.trim()) return;
    onAdd(name.trim(), code.trim().toUpperCase() || name.trim().slice(0, 4).toUpperCase(), color);
    onClose();
  };

  if (typeof window === 'undefined') return null;
  return createPortal(
    <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(3px)' }}
      onClick={onClose}>
      <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl p-5 space-y-4"
        onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <p className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <Plus size={15} className="text-rail-600"/> Add Revenue Row
          </p>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X size={16}/></button>
        </div>

        <div className="space-y-3">
          <div>
            <label className="text-[11px] font-semibold text-slate-600 mb-1 block">Row Name *</label>
            <input ref={nameRef} value={name} onChange={e => setName(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleSave(); if (e.key === 'Escape') onClose(); }}
              placeholder="e.g. Platform Revenue"
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-rail-400"/>
          </div>
          <div>
            <label className="text-[11px] font-semibold text-slate-600 mb-1 block">
              Short Code <span className="text-slate-400 font-normal">(max 6 chars)</span>
            </label>
            <input value={code} onChange={e => setCode(e.target.value)} maxLength={6}
              placeholder="e.g. PLAT (auto-filled if blank)"
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:border-rail-400"/>
          </div>
          <div>
            <label className="text-[11px] font-semibold text-slate-600 mb-1.5 block">Chart Colour</label>
            <div className="flex gap-2 flex-wrap">
              {COLORS.map(c => (
                <button key={c} onClick={() => setColor(c)}
                  className={cn('w-6 h-6 rounded-full border-2 transition-all',
                    color === c ? 'border-slate-800 scale-125' : 'border-transparent hover:scale-110')}
                  style={{ backgroundColor: c }}/>
              ))}
              <input type="color" value={color} onChange={e => setColor(e.target.value)}
                title="Custom colour"
                className="w-6 h-6 rounded-full cursor-pointer border border-slate-300 p-0 bg-transparent"/>
            </div>
            <div className="flex items-center gap-1.5 mt-1.5">
              <span className="inline-block w-2.5 h-2.5 rounded-full" style={{ backgroundColor: color }}/>
              <span className="text-[11px] text-slate-500">{name || 'New Revenue Head'}</span>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-1">
          <button onClick={onClose}
            className="px-4 py-2 text-xs text-slate-500 hover:bg-slate-100 rounded-lg">Cancel</button>
          <button onClick={handleSave} disabled={!name.trim()}
            className="px-4 py-2 text-xs bg-rail-600 text-white rounded-lg hover:bg-rail-700 disabled:opacity-40 font-semibold flex items-center gap-1.5">
            <Plus size={11}/> Add Row
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

// ── Column visibility panel ────────────────────────────────────────────────────

const COL_DISPLAY_NAMES: Record<ColKey, string> = {
  budget:    'Budget Estimate',
  monthly:   'Monthly Cols',
  cumul_cy:  'Cumulative CY',
  prev_yr:   'Previous Year',
  target:    'Target',
  variation: 'Variation',
  var_pct:   'Var %',
  ach_pct:   'Achievement %',
};

function ColVisPanel({ visible, onToggle, onClose, btnRef }: {
  visible: Set<ColKey>;
  onToggle: (k: ColKey) => void;
  onClose: () => void;
  btnRef: React.RefObject<HTMLButtonElement>;
}) {
  const [pos, setPos] = useState({ top: 0, right: 0 });
  useEffect(() => {
    if (btnRef.current) {
      const r = btnRef.current.getBoundingClientRect();
      setPos({ top: r.bottom + 6, right: window.innerWidth - r.right });
    }
  }, [btnRef]);

  if (typeof window === 'undefined') return null;
  return createPortal(
    <>
      <div className="fixed inset-0 z-[1500]" onClick={onClose}/>
      <div className="fixed z-[1600] bg-white rounded-xl border border-slate-200 shadow-xl w-52 overflow-hidden"
        style={{ top: pos.top, right: pos.right }}>
        <div className="px-3 py-2.5 border-b border-slate-100">
          <p className="text-[11px] font-bold text-slate-700">Toggle Columns</p>
        </div>
        {ALL_COLS.map(k => (
          <label key={k} className="flex items-center gap-2.5 px-3 py-2 hover:bg-slate-50 cursor-pointer">
            <input type="checkbox" checked={visible.has(k)} onChange={() => onToggle(k)}
              className="accent-rail-600 w-3 h-3"/>
            <span className="text-[11px] text-slate-700">{COL_DISPLAY_NAMES[k]}</span>
          </label>
        ))}
        <div className="px-3 py-2 border-t border-slate-100">
          <button onClick={() => ALL_COLS.forEach(k => { if (!visible.has(k)) onToggle(k); })}
            className="text-[10px] text-rail-600 hover:underline">Show all</button>
        </div>
      </div>
    </>,
    document.body,
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

interface Props {
  canManage?: boolean;
  canApprove?: boolean;
  currentUser?: string;
  mode?: 'embedded' | 'standalone';
}

export function FinancialDashboard({
  canManage = false,
  canApprove = false,
  currentUser = 'User',
  mode = 'embedded',
}: Props) {
  const store = useFinancialStore();

  // Pull shared financial data on mount
  useEffect(() => {
    pullSharedFinancialData();
    const handler = () => pullSharedFinancialData();
    window.addEventListener('rly_cloud_sync_complete', handler);
    return () => window.removeEventListener('rly_cloud_sync_complete', handler);
  }, []);

  // ── FY selection ──────────────────────────────────────────────────────────
  const currentFY = store.getCurrentFY();
  const allFYs    = [...store.financialYears].sort((a, b) => b.startYear - a.startYear);
  const [selectedFYId, setSelectedFYId] = useState<string>(
    currentFY?.id ?? allFYs[0]?.id ?? '',
  );
  const selectedFY = allFYs.find(fy => fy.id === selectedFYId) ?? allFYs[0];

  const defaultMonth = useMemo<FYMonth>(() => {
    if (selectedFY?.isCurrent) return getCurrentFYMonth();
    if (selectedFY?.status === 'closed') return 12;
    return 1;
  }, [selectedFY]);

  const [selectedMonth, setSelectedMonth] = useState<FYMonth>(defaultMonth);

  // ── Unit toggle (Cr / Lacs) ───────────────────────────────────────────────
  const [unit, setUnit] = useState<Unit>(() => lsGet<Unit>('rly_fin_unit', 'cr'));
  const toggleUnit = () => setUnit(u => {
    const next: Unit = u === 'cr' ? 'lacs' : 'cr';
    lsSet('rly_fin_unit', next);
    sharedWrite('fin_unit', next);
    return next;
  });

  // ── Column visibility ─────────────────────────────────────────────────────
  const [visibleColsArr, setVisibleColsArr] = useState<ColKey[]>(
    () => lsGet<ColKey[]>('rly_fin_vis_cols', ALL_COLS),
  );
  const visibleCols = useMemo(() => new Set(visibleColsArr), [visibleColsArr]);
  const toggleCol = (k: ColKey) => {
    setVisibleColsArr(prev => {
      const next = prev.includes(k) ? prev.filter(c => c !== k) : [...prev, k];
      lsSet('rly_fin_vis_cols', next);
      sharedWrite('fin_vis_cols', next);
      return next;
    });
  };
  const [showColPanel, setShowColPanel] = useState(false);
  const colBtnRef = useRef<HTMLButtonElement>(null);

  // ── Column label overrides ────────────────────────────────────────────────
  const [colLabels, setColLabels] = useState<Record<ColKey, string>>(
    () => lsGet('rly_fin_col_labels', DEFAULT_COL_LABELS),
  );
  const updateColLabel = (key: ColKey, label: string) => {
    setColLabels(prev => {
      const next = { ...prev, [key]: label };
      lsSet('rly_fin_col_labels', next);
      sharedWrite('fin_col_labels', next);
      return next;
    });
  };

  // ── UI toggles ────────────────────────────────────────────────────────────
  const showMonthCols = visibleCols.has('monthly');
  const [view,          setView]          = useState<'table' | 'charts'>('table');
  const [showDataEntry, setShowDataEntry] = useState(false);
  const [showPrint,     setShowPrint]     = useState(false);
  const [showAddRow,    setShowAddRow]    = useState(false);
  const [drillHeadId,   setDrillHeadId]  = useState<string | null>(null);

  // ── Computed rows ─────────────────────────────────────────────────────────
  const records = useMemo(
    () => store.getPublishedRecords(selectedFYId),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [selectedFYId, store.monthlyRecords],
  );
  const allRecords = useMemo(
    () => store.getAllRecords(selectedFYId),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [selectedFYId, store.monthlyRecords],
  );
  const rows = useMemo(
    () => buildCumulativeRows(records, store.revenueHeads, selectedFYId, selectedMonth),
    [records, store.revenueHeads, selectedFYId, selectedMonth],
  );

  // ── Drill-down ────────────────────────────────────────────────────────────
  const drillHead = drillHeadId
    ? store.revenueHeads.find(h => h.id === drillHeadId) ?? null
    : null;
  const handleClickHead = useCallback((rhId: string) => setDrillHeadId(rhId), []);

  // ── Add Row ───────────────────────────────────────────────────────────────
  const handleAddRow = (name: string, code: string, color: string) => {
    store.addRevenueHead({
      name, code, color,
      order:    store.revenueHeads.filter(h => !h.isTotal).length + 1,
      isTotal:  false,
      isActive: true,
    });
  };

  // ── Change FY ─────────────────────────────────────────────────────────────
  const handleChangeFY = (fyId: string) => {
    setSelectedFYId(fyId);
    const fy = allFYs.find(f => f.id === fyId);
    setSelectedMonth(fy?.isCurrent ? getCurrentFYMonth() : fy?.status === 'closed' ? 12 : 1);
  };

  const isCompact = mode === 'embedded';

  return (
    <div className={cn('flex flex-col gap-3', isCompact ? 'text-xs' : 'text-sm')}>

      {/* ── Top controls bar ───────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-2">

        {/* FY selector */}
        <div className="relative">
          <select value={selectedFYId} onChange={e => handleChangeFY(e.target.value)}
            className="pl-2.5 pr-7 py-1.5 text-xs bg-white border border-slate-200 rounded-lg shadow-sm focus:outline-none focus:border-rail-400 font-semibold appearance-none">
            {allFYs.map(fy => (
              <option key={fy.id} value={fy.id}>
                {fy.label}{fy.isCurrent ? ' (Current)' : ''}
              </option>
            ))}
          </select>
          <ChevronDown size={11} className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400"/>
        </div>

        {/* Month selector */}
        <div className="relative">
          <select value={selectedMonth} onChange={e => setSelectedMonth(Number(e.target.value) as FYMonth)}
            className="pl-2.5 pr-7 py-1.5 text-xs bg-white border border-slate-200 rounded-lg shadow-sm focus:outline-none focus:border-rail-400 appearance-none">
            {FY_MONTHS.map(m => (
              <option key={m.id} value={m.id}>Upto {m.label}</option>
            ))}
          </select>
          <Calendar size={11} className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400"/>
        </div>

        {selectedFY?.isCurrent && (
          <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded-full text-[10px] font-semibold">
            ● Live
          </span>
        )}

        <div className="flex-1"/>

        {/* ─── Unit toggle: Cr / Lacs ─── */}
        <button
          onClick={toggleUnit}
          title={unit === 'cr' ? 'Switch to Lakhs' : 'Switch to Crores'}
          className={cn(
            'flex items-center gap-1 px-2.5 py-1.5 rounded-lg border text-[10px] font-bold transition-all',
            unit === 'lacs'
              ? 'bg-amber-50 border-amber-300 text-amber-700'
              : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300',
          )}
        >
          ₹&nbsp;{unit === 'cr' ? 'Cr' : 'Lacs'}
          <span className="text-[9px] opacity-50 ml-0.5">{unit === 'cr' ? '→ Lacs' : '→ Cr'}</span>
        </button>

        {/* View toggle */}
        <div className="flex items-center gap-0.5 bg-slate-100 rounded-lg p-0.5">
          <button onClick={() => setView('table')}
            className={cn('p-1.5 rounded-md', view === 'table' ? 'bg-white shadow-sm text-slate-800' : 'text-slate-400 hover:text-slate-600')}
            title="Table view"><List size={13}/></button>
          <button onClick={() => setView('charts')}
            className={cn('p-1.5 rounded-md', view === 'charts' ? 'bg-white shadow-sm text-slate-800' : 'text-slate-400 hover:text-slate-600')}
            title="Charts view"><LayoutGrid size={13}/></button>
        </div>

        {/* Column visibility (table only) */}
        {view === 'table' && (
          <button ref={colBtnRef} onClick={() => setShowColPanel(v => !v)}
            className={cn(
              'flex items-center gap-1 px-2.5 py-1.5 text-[10px] rounded-lg border font-semibold transition-all',
              showColPanel
                ? 'bg-rail-50 border-rail-300 text-rail-700'
                : 'bg-white border-slate-200 text-slate-500 hover:border-slate-300',
            )}>
            <Columns size={11}/> Columns
          </button>
        )}

        {/* Print (opens PrintView with Cumulative/Monthly toggle inside) */}
        <button onClick={() => setShowPrint(true)}
          className="flex items-center gap-1 px-2.5 py-1.5 text-[10px] bg-white border border-slate-200 text-slate-600 rounded-lg hover:border-slate-300 font-semibold">
          <Printer size={11}/> Print
        </button>

        {/* Add Row — admin only */}
        {canManage && (
          <button onClick={() => setShowAddRow(true)}
            className="flex items-center gap-1 px-2.5 py-1.5 text-[10px] bg-white border border-slate-200 text-slate-600 rounded-lg hover:border-slate-300 font-semibold">
            <Plus size={11}/> Add Row
          </button>
        )}

        {/* Enter Data — admin only */}
        {canManage && (
          <button onClick={() => setShowDataEntry(true)}
            className="flex items-center gap-1 px-2.5 py-1.5 text-[10px] bg-rail-600 hover:bg-rail-700 text-white rounded-lg font-semibold shadow-sm">
            <PencilLine size={11}/> Enter Data
          </button>
        )}
      </div>

      {/* ── Title strip ─────────────────────────────────────────────────── */}
      <div className="flex items-center gap-2 px-1">
        <div>
          <h3 className="font-bold text-slate-900 text-sm leading-none">
            {selectedFY?.label} — Revenue Performance
          </h3>
          <p className="text-[10px] text-slate-500 mt-0.5">
            Cumulative: April – {FY_MONTHS[selectedMonth - 1].label}
            {' '}| Figures in ₹ {unit === 'lacs' ? 'Lacs' : 'Crore'}
          </p>
        </div>
        <div className="flex-1"/>
        {selectedFY?.isCurrent && (
          <button onClick={() => setSelectedMonth(getCurrentFYMonth())}
            className="flex items-center gap-1 text-[10px] text-slate-400 hover:text-rail-600">
            <RefreshCw size={10}/> Reset to current month
          </button>
        )}
      </div>

      {/* ── Executive KPI cards ─────────────────────────────────────────── */}
      <ExecutiveCards rows={rows} unit={unit}/>

      {/* ── Main content ────────────────────────────────────────────────── */}
      {view === 'table' ? (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
          <RevenueTable
            rows={rows}
            upToMonth={selectedMonth}
            showMonthCols={showMonthCols}
            unit={unit}
            visibleCols={visibleCols}
            colLabels={colLabels}
            onUpdateColLabel={canManage ? updateColLabel : undefined}
            onUpdateHead={canManage ? (rhId, name) => store.updateRevenueHead(rhId, { name }) : undefined}
            onClickHead={handleClickHead}
            canManage={canManage}
          />
          <div className="px-3 py-2 bg-slate-50 border-t border-slate-100 text-[9px] text-slate-400 flex items-center gap-2 flex-wrap">
            <span>Click any row to drill down ↗</span>
            {canManage && (
              <span className="text-rail-500">· Double-click headers or row names to rename</span>
            )}
            <span className="ml-auto">
              ▲ Green = Growth &nbsp;|&nbsp; ▼ Red = Decline &nbsp;|&nbsp;
              🟢 ≥100% &nbsp; 🟡 95–99% &nbsp; 🔴 &lt;95%
            </span>
          </div>
        </div>
      ) : (
        <RevenueCharts
          rows={rows}
          records={records}
          fyId={selectedFYId}
          upToMonth={selectedMonth}
        />
      )}

      {/* ── Panels & Modals ─────────────────────────────────────────────── */}

      {showColPanel && (
        <ColVisPanel
          visible={visibleCols}
          onToggle={toggleCol}
          onClose={() => setShowColPanel(false)}
          btnRef={colBtnRef}
        />
      )}

      {showAddRow && (
        <AddRowModal
          onClose={() => setShowAddRow(false)}
          onAdd={handleAddRow}
        />
      )}

      {showDataEntry && selectedFY && (
        <DataEntryModal
          fyId={selectedFYId}
          onClose={() => setShowDataEntry(false)}
          currentUser={currentUser}
          canApprove={canApprove}
        />
      )}

      {drillHead && (
        <DrillDownModal
          revenueHead={drillHead}
          records={allRecords}
          fyId={selectedFYId}
          fyLabel={selectedFY?.label ?? ''}
          upToMonth={selectedMonth}
          onClose={() => setDrillHeadId(null)}
        />
      )}

      {showPrint && selectedFY && (
        <PrintView
          rows={rows}
          fy={selectedFY}
          upToMonth={selectedMonth}
          unit={unit}
          onClose={() => setShowPrint(false)}
        />
      )}
    </div>
  );
}
