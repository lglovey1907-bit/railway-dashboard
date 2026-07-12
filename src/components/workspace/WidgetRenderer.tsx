'use client';
import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import {
  Table2, BarChart3, FileText, Users2, Activity, UserCheck,
  ClipboardList, Share2, Megaphone, Link2, FileSpreadsheet,
  Globe, TrendingUp, ExternalLink, Edit3, Check, X, ChevronRight,
  Database, Bot, BookOpen, CheckSquare, Plus, Trash2, Settings2,
  ChevronDown, TrendingDown, Target, Layers, Filter,
  FolderOpen, Settings, Printer, Download, FileDown,
} from 'lucide-react';
import type { KpiSource, KpiAggregation, KpiCombineMode } from '@/lib/workspace/layoutEngine';
import type { TableDef } from '@/lib/cellData/types';
import dynamic from 'next/dynamic';
const DatabaseBlock = dynamic(() => import('@/components/database/DatabaseBlock').then(m => ({ default: m.DatabaseBlock })), { ssr: false });
const AIAssistantBlock = dynamic(() => import('@/components/ai/AIAssistantBlock').then(m => ({ default: m.AIAssistantBlock })), { ssr: false });
const KnowledgeBaseBlock = dynamic(() => import('@/components/knowledge/KnowledgeBaseBlock').then(m => ({ default: m.KnowledgeBaseBlock })), { ssr: false });
const TaskManagerBlock = dynamic(() => import('@/components/tasks/TaskManagerBlock').then(m => ({ default: m.TaskManagerBlock })), { ssr: false });
const FinancialDashboard = dynamic(() => import('@/components/financial/FinancialDashboard').then(m => ({ default: m.FinancialDashboard })), { ssr: false });
const MonthlyReportWidget = dynamic(() => import('@/components/monthly/MonthlyReportWidget').then(m => ({ default: m.MonthlyReportWidget })), { ssr: false });
import { SanitationStatusWidget } from '@/components/dashboard/SanitationStatusWidget';
import { QRPatrolWidget } from '@/components/dashboard/QRPatrolWidget';
import type { LayoutWidget, LayoutColumn } from '@/lib/workspace/layoutEngine';
import type { useWorkspace } from '@/lib/cellData/useWorkspace';
import { TableEngine } from '@/components/cell/TableEngine';
import { CellStaffRoster } from '@/components/cell/CellStaffRoster';
import { ApprovalQueue } from '@/components/staff/ApprovalQueue';
import { StaffRequestPanel } from '@/components/staff/StaffRequestPanel';
import { SharedTablesView } from '@/components/cell/SharedTablesView';
import { CellActivityDashboard } from '@/components/cell/CellActivityDashboard';
import { cn } from '@/lib/utils';

const ICON_MAP: Record<string, React.ElementType> = {
 Table2, BarChart3, FileText, Users2, Activity, UserCheck,
 ClipboardList, Share2, Megaphone, Link2, FileSpreadsheet,
 Globe, TrendingUp,
};

// ── Aggregation engine ────────────────────────────────────────────────────────
function computeAgg(table: TableDef, source: KpiSource): number {
  const activeRows = table.rows.filter((r: any) => !r.deletedAt);
  const filtered = source.filters && Object.keys(source.filters).length > 0
    ? activeRows.filter((r: any) => Object.entries(source.filters!).every(([fid, fval]) =>
        (table.values[`${r.id}:${fid}`] ?? '') === fval))
    : activeRows;

  if (source.aggregation === 'count') return filtered.length;
  if (source.aggregation === 'unique') {
    if (!source.field) return new Set(filtered.map((r: any) => r.id)).size;
    const vals = new Set(filtered.map((r: any) => table.values[`${r.id}:${source.field}`] ?? '').filter(Boolean));
    return vals.size;
  }
  if (!source.field) return filtered.length;
  const nums = filtered.map((r: any) => parseFloat(table.values[`${r.id}:${source.field}`] ?? '0')).filter(n => !isNaN(n));
  switch (source.aggregation) {
    case 'sum': return nums.reduce((a, b) => a + b, 0);
    case 'avg': return nums.length ? nums.reduce((a, b) => a + b, 0) / nums.length : 0;
    case 'min': return nums.length ? Math.min(...nums) : 0;
    case 'max': return nums.length ? Math.max(...nums) : 0;
    default: return 0;
  }
}

function formatKpiValue(n: number, fmt?: string): string {
  if (fmt === 'currency') return `₹${n.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
  if (fmt === 'percent') return `${n.toFixed(1)}%`;
  return n % 1 === 0 ? n.toLocaleString('en-IN') : n.toLocaleString('en-IN', { maximumFractionDigits: 2 });
}

const KPI_COLORS: Record<string, { text: string; bg: string; border: string; accent: string }> = {
  blue:   { text: 'text-blue-700',   bg: 'bg-blue-50',   border: 'border-blue-100',  accent: 'bg-blue-500'   },
  green:  { text: 'text-emerald-700',bg: 'bg-emerald-50',border: 'border-emerald-100',accent: 'bg-emerald-500'},
  red:    { text: 'text-red-700',    bg: 'bg-red-50',    border: 'border-red-100',   accent: 'bg-red-500'    },
  amber:  { text: 'text-amber-700',  bg: 'bg-amber-50',  border: 'border-amber-100', accent: 'bg-amber-500'  },
  violet: { text: 'text-violet-700', bg: 'bg-violet-50', border: 'border-violet-100',accent: 'bg-violet-500' },
  slate:  { text: 'text-slate-700',  bg: 'bg-slate-50',  border: 'border-slate-100', accent: 'bg-slate-500'  },
};

const AGG_OPTS: { id: KpiAggregation; label: string }[] = [
  { id: 'count',  label: 'Count rows'  },
  { id: 'sum',    label: 'Sum'         },
  { id: 'avg',    label: 'Average'     },
  { id: 'min',    label: 'Minimum'     },
  { id: 'max',    label: 'Maximum'     },
  { id: 'unique', label: 'Unique vals' },
];

// ── Drill-down modal ──────────────────────────────────────────────────────────
function DrillDownModal({ table, source, onClose }: {
  table: TableDef; source: KpiSource; onClose: () => void;
}) {
  const rows = table.rows.filter((r: any) => !r.deletedAt);
  const filtered = source.filters && Object.keys(source.filters).length > 0
    ? rows.filter((r: any) => Object.entries(source.filters!).every(([fid, fval]) =>
        (table.values[`${r.id}:${fid}`] ?? '') === fval))
    : rows;
  const fields = table.fields.slice(0, 6);

  if (typeof window === 'undefined') return null;
  return createPortal(
    <div className="fixed inset-0 z-[2100] flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(3px)' }}
      onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl flex flex-col overflow-hidden"
        style={{ maxHeight: '80vh' }}
        onClick={e => e.stopPropagation()}>
        <div className="flex items-center gap-2 px-4 py-3 border-b border-slate-200 bg-slate-50">
          <Filter size={13} className="text-rail-600"/>
          <p className="text-sm font-bold text-slate-900 flex-1">
            {table.name} · {filtered.length} records
          </p>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-200 text-slate-400"><X size={14}/></button>
        </div>
        <div className="overflow-auto flex-1">
          <table className="w-full text-xs">
            <thead className="sticky top-0 bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="text-left px-3 py-2 font-semibold text-slate-600 w-8">#</th>
                <th className="text-left px-3 py-2 font-semibold text-slate-600">{table.firstColLabel}</th>
                {fields.map(f => (
                  <th key={f.id} className="text-left px-3 py-2 font-semibold text-slate-600">{f.label}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((row: any, i: number) => (
                <tr key={row.id} className="hover:bg-slate-50">
                  <td className="px-3 py-2 text-slate-400">{i + 1}</td>
                  <td className="px-3 py-2 font-medium text-slate-800 max-w-[160px] truncate">
                    {table.values[`${row.id}:__label__`] ?? `Row ${i + 1}`}
                  </td>
                  {fields.map(f => (
                    <td key={f.id} className="px-3 py-2 text-slate-600 max-w-[120px] truncate">
                      {table.values[`${row.id}:${f.id}`] ?? '—'}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length === 0 && (
            <div className="text-center py-10 text-slate-400 text-xs">No records match the filter</div>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}

// ── KPI static value editor (extracted to avoid conditional hooks) ────────────
function KpiStaticEdit({ widget, onUpdate, onCancel }: {
  widget: LayoutWidget;
  onUpdate: (patch: Partial<LayoutWidget>) => void;
  onCancel: () => void;
}) {
  const [label, setLabel] = useState(widget.kpiLabel ?? widget.title);
  const [val, setVal]     = useState(widget.kpiValue ?? '');
  const [suf, setSuf]     = useState(widget.kpiSuffix ?? '');
  return (
    <div className="space-y-2 p-1">
      <input value={label} onChange={e => setLabel(e.target.value)} placeholder="Label"
        className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:border-rail-400"/>
      <div className="flex gap-2">
        <input value={val} onChange={e => setVal(e.target.value)} placeholder="Value"
          className="flex-1 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:border-rail-400"/>
        <input value={suf} onChange={e => setSuf(e.target.value)} placeholder="Unit"
          className="w-16 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:border-rail-400"/>
      </div>
      <div className="flex gap-1.5 justify-end">
        <button onClick={onCancel} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400"><X size={12}/></button>
        <button
          onClick={() => { onUpdate({ kpiLabel: label, kpiValue: val, kpiSuffix: suf, title: label }); onCancel(); }}
          className="p-1.5 rounded-lg bg-rail-600 text-white hover:bg-rail-700">
          <Check size={12}/>
        </button>
      </div>
    </div>
  );
}

// ── KPI config builder (extracted to avoid conditional hooks) ─────────────────
function KpiConfigBuilder({ widget, tables, onUpdate, onCancel }: {
  widget: LayoutWidget;
  tables: TableDef[];
  onUpdate: (patch: Partial<LayoutWidget>) => void;
  onCancel: () => void;
}) {
  const [sources, setSources] = useState<KpiSource[]>(widget.kpiSources ?? []);
  const [label, setLabel]     = useState(widget.kpiLabel ?? widget.title);
  const [suffix, setSuffix]   = useState(widget.kpiSuffix ?? '');
  const [target, setTarget]   = useState(widget.kpiTarget ?? '');
  const [combine, setCombine] = useState<KpiCombineMode>(widget.kpiCombine ?? 'first');
  const [fmt, setFmt]         = useState<'number' | 'currency' | 'percent'>(widget.kpiFormat ?? 'number');
  const [color, setColor]     = useState<'blue'|'green'|'red'|'amber'|'violet'|'slate'>(widget.kpiColor ?? 'blue');

  const addSource = () => {
    if (!tables.length) return;
    setSources(s => [...s, { id: `ks${Date.now()}`, tableId: tables[0].id, aggregation: 'count' }]);
  };
  const removeSource = (id: string) => setSources(s => s.filter(x => x.id !== id));
  const updateSource = (id: string, patch: Partial<KpiSource>) =>
    setSources(s => s.map(x => x.id === id ? { ...x, ...patch } : x));

  const save = () => {
    onUpdate({
      kpiSources: sources.length > 0 ? sources : undefined,
      kpiLabel: label, kpiSuffix: suffix, title: label,
      kpiTarget: target || undefined, kpiCombine: combine,
      kpiFormat: fmt, kpiColor: color,
    });
    onCancel();
  };

  return (
    <div className="space-y-3 text-xs">
      {/* Label + suffix */}
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="block text-[10px] font-semibold text-slate-500 mb-1">Label</label>
          <input value={label} onChange={e => setLabel(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-rail-400"/>
        </div>
        <div>
          <label className="block text-[10px] font-semibold text-slate-500 mb-1">Unit / Suffix</label>
          <input value={suffix} onChange={e => setSuffix(e.target.value)} placeholder="e.g. Cr, %, km"
            className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-rail-400"/>
        </div>
      </div>

      {/* Format + color + target */}
      <div className="grid grid-cols-3 gap-2">
        <div>
          <label className="block text-[10px] font-semibold text-slate-500 mb-1">Format</label>
          <select value={fmt} onChange={e => setFmt(e.target.value as typeof fmt)}
            className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2 py-1.5 focus:outline-none focus:border-rail-400">
            <option value="number">Number</option>
            <option value="currency">Currency (₹)</option>
            <option value="percent">Percent (%)</option>
          </select>
        </div>
        <div>
          <label className="block text-[10px] font-semibold text-slate-500 mb-1">Color</label>
          <select value={color} onChange={e => setColor(e.target.value as typeof color)}
            className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2 py-1.5 focus:outline-none focus:border-rail-400">
            {Object.keys(KPI_COLORS).map(c => (
              <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-[10px] font-semibold text-slate-500 mb-1">Target</label>
          <input value={target} onChange={e => setTarget(e.target.value)} type="number" placeholder="optional"
            className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-rail-400"/>
        </div>
      </div>

      {/* Data sources */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <label className="text-[10px] font-semibold text-slate-500">Data Sources</label>
          {sources.length > 1 && (
            <select value={combine} onChange={e => setCombine(e.target.value as KpiCombineMode)}
              className="text-[10px] bg-slate-50 border border-slate-200 rounded px-1.5 py-0.5 focus:outline-none">
              <option value="first">Use First</option>
              <option value="sum">Sum All</option>
              <option value="difference">Difference (A−B)</option>
              <option value="ratio">Ratio (A÷B)</option>
            </select>
          )}
        </div>
        <div className="space-y-2">
          {sources.map((src, i) => {
            const tbl = tables.find(t => t.id === src.tableId);
            const numFields = (tbl?.fields ?? []).filter((f: any) =>
              ['number', 'currency', 'formula'].includes(f.type));
            return (
              <div key={src.id} className="flex items-center gap-1.5 bg-slate-50 rounded-lg p-2 border border-slate-200">
                <span className="text-[10px] font-bold text-slate-400 w-4 shrink-0">
                  {String.fromCharCode(65 + i)}
                </span>
                <select value={src.tableId}
                  onChange={e => updateSource(src.id, { tableId: e.target.value, field: undefined })}
                  className="flex-1 min-w-0 bg-white border border-slate-200 rounded px-1.5 py-1 text-[10px] focus:outline-none">
                  {tables.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
                <select value={src.aggregation}
                  onChange={e => updateSource(src.id, { aggregation: e.target.value as KpiAggregation })}
                  className="bg-white border border-slate-200 rounded px-1.5 py-1 text-[10px] focus:outline-none">
                  {AGG_OPTS.map(a => <option key={a.id} value={a.id}>{a.label}</option>)}
                </select>
                {src.aggregation !== 'count' && (
                  <select value={src.field ?? ''}
                    onChange={e => updateSource(src.id, { field: e.target.value || undefined })}
                    className="bg-white border border-slate-200 rounded px-1.5 py-1 text-[10px] focus:outline-none">
                    <option value="">— field —</option>
                    {numFields.map((f: any) => <option key={f.id} value={f.id}>{f.label}</option>)}
                  </select>
                )}
                <button onClick={() => removeSource(src.id)}
                  className="p-1 rounded hover:bg-red-50 text-slate-300 hover:text-red-500 shrink-0">
                  <Trash2 size={10}/>
                </button>
              </div>
            );
          })}
        </div>
        {tables.length > 0 ? (
          <button onClick={addSource}
            className="mt-1.5 flex items-center gap-1 text-[10px] text-rail-600 hover:text-rail-700 font-medium">
            <Plus size={10}/> Add source
          </button>
        ) : (
          <p className="text-[10px] text-slate-400 italic mt-1">
            No tables in this workspace yet. Add a Database block first.
          </p>
        )}
      </div>

      <div className="flex gap-1.5 justify-end pt-1 border-t border-slate-100">
        <button onClick={onCancel}
          className="px-2.5 py-1.5 text-[10px] text-slate-500 hover:bg-slate-100 rounded-lg">
          Cancel
        </button>
        <button onClick={save}
          className="px-3 py-1.5 text-[10px] bg-rail-600 text-white rounded-lg hover:bg-rail-700">
          Save
        </button>
      </div>
    </div>
  );
}

// ── Smart KPI card ────────────────────────────────────────────────────────────
function SmartKPI({ widget, onUpdate, canManage, workspaceHook }: {
  widget: LayoutWidget;
  onUpdate: (patch: Partial<LayoutWidget>) => void;
  canManage: boolean;
  workspaceHook?: ReturnType<typeof useWorkspace>;
}) {
  const [mode, setMode] = useState<'view' | 'config' | 'static_edit'>('view');
  const [drillSource, setDrillSource] = useState<KpiSource | null>(null);

  const tables: TableDef[] = workspaceHook?.ws?.tables ?? [];
  const hasLiveSources = (widget.kpiSources?.length ?? 0) > 0;

  // ── Compute value from live sources ─────────────────────────────────────────
  const computedValue = useMemo(() => {
    if (!hasLiveSources || !tables.length) return null;
    const vals = (widget.kpiSources ?? []).map(src => {
      const tbl = tables.find(t => t.id === src.tableId);
      return tbl ? computeAgg(tbl, src) : 0;
    });
    if (!vals.length) return null;
    switch (widget.kpiCombine) {
      case 'sum':        return vals.reduce((a, b) => a + b, 0);
      case 'difference': return vals.length >= 2 ? vals[0] - vals[1] : vals[0];
      case 'ratio':      return vals.length >= 2 && vals[1] !== 0 ? vals[0] / vals[1] : 0;
      default:           return vals[0];
    }
  }, [widget.kpiSources, widget.kpiCombine, tables, hasLiveSources]);

  const displayValue = computedValue !== null
    ? formatKpiValue(computedValue, widget.kpiFormat)
    : (widget.kpiValue ?? '—');

  const targetNum = widget.kpiTarget ? parseFloat(widget.kpiTarget) : null;
  const progress = targetNum && computedValue !== null
    ? Math.min(100, Math.round((computedValue / targetNum) * 100))
    : null;

  const col = KPI_COLORS[widget.kpiColor ?? 'blue'] ?? KPI_COLORS.blue;

  // ── Static edit mode ────────────────────────────────────────────────────────
  if (mode === 'static_edit' && canManage) {
    return (
      <KpiStaticEdit
        widget={widget}
        onUpdate={onUpdate}
        onCancel={() => setMode('view')}
      />
    );
  }

  // ── Config builder mode ─────────────────────────────────────────────────────
  if (mode === 'config' && canManage) {
    return (
      <KpiConfigBuilder
        widget={widget}
        tables={tables}
        onUpdate={onUpdate}
        onCancel={() => setMode('view')}
      />
    );
  }

  // ── View mode (default) ───────────────────────────────────────────────────────
  const primarySrc = (widget.kpiSources ?? [])[0];
  const primaryTable = primarySrc ? tables.find((t: TableDef) => t.id === primarySrc.tableId) : null;

  return (
    <div className={cn('rounded-xl border p-3 flex flex-col gap-2', col.bg, col.border)}>
      {/* Top row: label + actions */}
      <div className="flex items-start justify-between gap-1">
        <p className="text-[11px] font-semibold text-slate-500 leading-tight">{widget.kpiLabel ?? widget.title}</p>
        <div className="flex items-center gap-0.5 shrink-0">
          {hasLiveSources && primaryTable && (
            <button
              onClick={() => setDrillSource(primarySrc)}
              title="View records"
              className={cn('p-1 rounded hover:bg-white/70 transition-colors', col.text, 'opacity-50 hover:opacity-100')}>
              <Layers size={11}/>
            </button>
          )}
          {canManage && (
            <button
              onClick={() => setMode('config')}
              title="Configure KPI"
              className="p-1 rounded hover:bg-white/70 text-slate-400 hover:text-slate-600 transition-colors">
              <Settings2 size={11}/>
            </button>
          )}
        </div>
      </div>

      {/* Main value */}
      <div
        className={cn('cursor-default select-none', hasLiveSources && primaryTable && 'cursor-pointer')}
        onClick={() => hasLiveSources && primaryTable && setDrillSource(primarySrc)}>
        <p className={cn('text-2xl font-bold leading-none', col.text)}>
          {displayValue}
          {widget.kpiSuffix && (
            <span className="text-sm ml-1 font-normal text-slate-400">{widget.kpiSuffix}</span>
          )}
        </p>
        {hasLiveSources && (
          <p className="text-[9px] text-slate-400 mt-0.5">
            {(widget.kpiSources ?? []).map(s => {
              const t = tables.find((x: TableDef) => x.id === s.tableId);
              return t ? `${s.aggregation.toUpperCase()} · ${t.name}` : '';
            }).filter(Boolean).join(' + ')}
          </p>
        )}
        {!hasLiveSources && <p className="text-[9px] text-slate-400 mt-0.5">Manual value · click ⚙ to connect data</p>}
      </div>

      {/* Progress bar toward target */}
      {progress !== null && (
        <div>
          <div className="flex items-center justify-between mb-1">
            <span className="text-[9px] text-slate-400">Target: {widget.kpiTarget}</span>
            <span className={cn('text-[9px] font-bold', col.text)}>{progress}%</span>
          </div>
          <div className="h-1.5 bg-white/60 rounded-full overflow-hidden">
            <div className={cn('h-full rounded-full transition-all', col.accent)} style={{ width: `${progress}%` }}/>
          </div>
        </div>
      )}

      {/* Drill-down modal */}
      {drillSource && primaryTable && (
        <DrillDownModal table={primaryTable} source={drillSource} onClose={() => setDrillSource(null)}/>
      )}
    </div>
  );
}

function EditableText({ widget, onUpdate, canManage }: {
 widget: LayoutWidget; onUpdate: (p: Partial<LayoutWidget>) => void; canManage: boolean;
}) {
 const [editing, setEditing] = useState(false);
 const [draft, setDraft] = useState(widget.content ?? '');
 if (editing && canManage) {
 return (
 <div className="space-y-2">
 <textarea value={draft} onChange={e => setDraft(e.target.value)} rows={5} autoFocus
 className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-800 focus:outline-none focus:border-blue-400 resize-none"/>
 <div className="flex gap-1.5 justify-end">
 <button onClick={() => setEditing(false)} className="px-3 py-1.5 text-xs text-slate-500 hover:bg-slate-100 rounded-lg">Cancel</button>
 <button onClick={() => { onUpdate({ content: draft }); setEditing(false); }} className="px-3 py-1.5 text-xs bg-blue-600 text-white rounded-lg hover:bg-blue-700">Save</button>
 </div>
 </div>
 );
 }
 return (
 <div className="group relative">
 <div className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed min-h-[40px]">
 {widget.content || <span className="text-slate-300 italic">Click edit to add content…</span>}
 </div>
 {canManage && (
 <button onClick={() => setEditing(true)} className="absolute top-0 right-0 opacity-0 group-hover:opacity-100 p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 transition-opacity">
 <Edit3 size={12}/>
 </button>
 )}
 </div>
 );
}

function AnnouncementsWidget({ widget, onUpdate, canManage }: {
 widget: LayoutWidget; onUpdate: (p: Partial<LayoutWidget>) => void; canManage: boolean;
}) {
 const [editing, setEditing] = useState(false);
 const [draft, setDraft] = useState(widget.content ?? '');
 const items = (widget.content ?? '').split('\n').filter(Boolean);
 return editing && canManage ? (
 <div className="space-y-2">
 <textarea value={draft} onChange={e => setDraft(e.target.value)} rows={6} autoFocus placeholder="One announcement per line…"
 className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-800 focus:outline-none focus:border-blue-400 resize-none"/>
 <div className="flex gap-1.5 justify-end">
 <button onClick={() => setEditing(false)} className="px-3 py-1.5 text-xs text-slate-500 hover:bg-slate-100 rounded-lg">Cancel</button>
 <button onClick={() => { onUpdate({ content: draft }); setEditing(false); }} className="px-3 py-1.5 text-xs bg-blue-600 text-white rounded-lg hover:bg-blue-700">Save</button>
 </div>
 </div>
 ) : (
 <div className="space-y-1.5 group relative">
 {items.length === 0
 ? <p className="text-xs text-slate-300 italic">No announcements yet</p>
 : items.map((item, i) => (
 <div key={i} className="flex items-start gap-2 py-1.5 border-b border-slate-50 last:border-0">
 <div className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-1.5 shrink-0"/>
 <p className="text-xs text-slate-700">{item}</p>
 </div>
 ))
 }
 {canManage && (
 <button onClick={() => setEditing(true)} className="absolute top-0 right-0 opacity-0 group-hover:opacity-100 p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 transition-opacity">
 <Edit3 size={12}/>
 </button>
 )}
 </div>
 );
}

function QuickLinksWidget({ widget, onUpdate, canManage }: {
 widget: LayoutWidget; onUpdate: (p: Partial<LayoutWidget>) => void; canManage: boolean;
}) {
 const links = widget.links ?? [];
 const [editing, setEditing] = useState(false);
 const [draft, setDraft] = useState(links.map(l => `${l.label}|${l.url}`).join('\n'));
 return editing && canManage ? (
 <div className="space-y-2">
 <p className="text-[10px] text-slate-400">One link per line: Label|URL</p>
 <textarea value={draft} onChange={e => setDraft(e.target.value)} rows={5} autoFocus placeholder="IRCTC|https://irctc.co.in"
 className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-800 focus:outline-none focus:border-blue-400 resize-none font-mono"/>
 <div className="flex gap-1.5 justify-end">
 <button onClick={() => setEditing(false)} className="px-3 py-1.5 text-xs text-slate-500 hover:bg-slate-100 rounded-lg">Cancel</button>
 <button onClick={() => {
 const parsed = draft.split('\n').filter(Boolean).map(line => {
 const [label, ...rest] = line.split('|');
 return { label: label.trim(), url: rest.join('|').trim() };
 }).filter(l => l.label && l.url);
 onUpdate({ links: parsed });
 setEditing(false);
 }} className="px-3 py-1.5 text-xs bg-blue-600 text-white rounded-lg hover:bg-blue-700">Save</button>
 </div>
 </div>
 ) : (
 <div className="space-y-1 group relative">
 {links.length === 0
 ? <p className="text-xs text-slate-300 italic">No links added</p>
 : links.map((l, i) => (
 <a key={i} href={l.url} target="_blank"rel="noreferrer"
 className="flex items-center gap-2 py-1.5 px-2 rounded-lg hover:bg-slate-100 transition-colors group/link">
 <ExternalLink size={11} className="text-blue-500 shrink-0"/>
 <span className="text-xs text-blue-600 hover:underline truncate">{l.label}</span>
 </a>
 ))
 }
 {canManage && (
 <button onClick={() => setEditing(true)} className="absolute top-0 right-0 opacity-0 group-hover:opacity-100 p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 transition-opacity">
 <Edit3 size={12}/>
 </button>
 )}
 </div>
 );
}


// ── Heading Widget ─────────────────────────────────────────────────────────────
function HeadingWidget({ widget, onUpdate, canManage }: {
 widget: LayoutWidget; onUpdate: (p: Partial<LayoutWidget>) => void; canManage: boolean;
}) {
 const [editing, setEditing] = useState(false);
 const [text, setText] = useState((widget as any).richText ?? widget.title);
 const [level, setLevel] = useState<1|2|3>((widget as any).headingLevel ?? 2);

 const save = () => {
 onUpdate({ richText: text, headingLevel: level, title: text } as any);
 setEditing(false);
 };

 if (editing && canManage) {
 return (
 <div className="space-y-2 py-1">
 <div className="flex items-center gap-1.5 mb-2">
 {([1, 2, 3] as const).map(l => (
 <button key={l} onClick={() => setLevel(l)}
 className={`px-2.5 py-1 rounded-lg text-xs font-bold border transition-all ${level === l ? 'bg-slate-800 text-white border-slate-800' : 'border-slate-200 text-slate-500 hover:bg-slate-50'}`}>
 H{l}
 </button>
 ))}
 <span className="text-[10px] text-slate-400 ml-1">· {level === 1 ? 'Large' : level === 2 ? 'Medium' : 'Small'} heading</span>
 </div>
 <input value={text} onChange={e => setText(e.target.value)} autoFocus
 onKeyDown={e => { if (e.key === 'Enter') save(); if (e.key === 'Escape') setEditing(false); }}
 className="w-full bg-transparent border-b-2 border-rail-400 outline-none text-slate-900 font-bold py-1"
 style={{ fontSize: level === 1 ? '1.6rem' : level === 2 ? '1.25rem' : '1.05rem' }}
 />
 <div className="flex gap-1.5 justify-end">
 <button onClick={() => setEditing(false)} className="px-3 py-1.5 text-xs text-slate-500 hover:bg-slate-100 rounded-lg">Cancel</button>
 <button onClick={save} className="px-3 py-1.5 text-xs bg-rail-600 text-white rounded-lg hover:bg-rail-700">Save</button>
 </div>
 </div>
 );
 }

 const displayText = (widget as any).richText ?? widget.title;
 const lv = (widget as any).headingLevel ?? 2;
 return (
 <div className="group relative py-1">
 {lv === 1 && <h1 className="text-2xl font-black text-slate-900 border-b border-slate-100 pb-2">{displayText}</h1>}
 {lv === 2 && <h2 className="text-xl font-bold text-slate-900">{displayText}</h2>}
 {lv === 3 && <h3 className="text-base font-semibold text-slate-600">{displayText}</h3>}
 {canManage && (
 <button
 onClick={() => { setText((widget as any).richText ?? widget.title); setLevel((widget as any).headingLevel ?? 2); setEditing(true); }}
 className="absolute top-0 right-0 opacity-0 group-hover:opacity-100 p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 transition-opacity">
 <Edit3 size={12}/>
 </button>
 )}
 </div>
 );
}

// ── Callout Widget ─────────────────────────────────────────────────────────────
const CALLOUT_COLORS_MAP = {
 amber:   { bg: 'bg-amber-50',   border: 'border-amber-200',   text: 'text-amber-900',   dot: 'bg-amber-400'   },
 blue:    { bg: 'bg-blue-50',    border: 'border-blue-200',    text: 'text-blue-900',    dot: 'bg-blue-400'    },
 emerald: { bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-900', dot: 'bg-emerald-400' },
 red:     { bg: 'bg-red-50',     border: 'border-red-200',     text: 'text-red-900',     dot: 'bg-red-400'     },
 violet:  { bg: 'bg-violet-50',  border: 'border-violet-200',  text: 'text-violet-900',  dot: 'bg-violet-400'  },
 slate:   { bg: 'bg-slate-50',   border: 'border-slate-200',   text: 'text-slate-800',   dot: 'bg-slate-400'   },
};
const CALLOUT_EMOJI_SET = ['💡','ℹ️','⚠️','🚨','✅','📌','🔥','💬','🎯','📢','🔔','❗','🌟','🛑','👀','📝'];

function CalloutWidget({ widget, onUpdate, canManage }: {
 widget: LayoutWidget; onUpdate: (p: Partial<LayoutWidget>) => void; canManage: boolean;
}) {
 const [editing, setEditing] = useState(false);
 const [icon, setIcon] = useState<string>((widget as any).calloutIcon ?? '💡');
 const [color, setColor] = useState<keyof typeof CALLOUT_COLORS_MAP>((widget as any).calloutColor ?? 'amber');
 const [text, setText] = useState<string>((widget as any).richText ?? widget.title ?? '');

 const save = () => {
 onUpdate({ calloutIcon: icon, calloutColor: color, richText: text, title: text.slice(0, 60) || 'Callout' } as any);
 setEditing(false);
 };

 const cs = CALLOUT_COLORS_MAP[color] ?? CALLOUT_COLORS_MAP.amber;

 if (editing && canManage) {
 return (
 <div className="space-y-3 p-3 bg-slate-50 rounded-xl border border-slate-200">
 <div>
 <p className="text-[10px] font-bold text-slate-500 uppercase mb-1.5">Icon</p>
 <div className="flex flex-wrap gap-1">
 {CALLOUT_EMOJI_SET.map(em => (
 <button key={em} onClick={() => setIcon(em)}
 className={`w-8 h-8 rounded-lg text-lg flex items-center justify-center transition-all ${icon === em ? 'bg-rail-100 ring-2 ring-rail-400' : 'hover:bg-white'}`}>
 {em}
 </button>
 ))}
 </div>
 </div>
 <div>
 <p className="text-[10px] font-bold text-slate-500 uppercase mb-1.5">Color</p>
 <div className="flex gap-2">
 {(Object.entries(CALLOUT_COLORS_MAP) as [keyof typeof CALLOUT_COLORS_MAP, any][]).map(([c, s]) => (
 <button key={c} onClick={() => setColor(c)} title={c}
 className={`w-6 h-6 rounded-full ${s.dot} transition-all ${color === c ? 'ring-2 ring-offset-1 ring-slate-600 scale-110' : 'opacity-60 hover:opacity-100'}`}/>
 ))}
 </div>
 </div>
 <textarea value={text} onChange={e => setText(e.target.value)} rows={3} autoFocus
 placeholder="Write your callout content…"
 className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-800 focus:outline-none focus:border-rail-400 resize-none"/>
 <div className="flex gap-1.5 justify-end">
 <button onClick={() => setEditing(false)} className="px-3 py-1.5 text-xs text-slate-500 hover:bg-white rounded-lg border border-slate-200">Cancel</button>
 <button onClick={save} className="px-3 py-1.5 text-xs bg-rail-600 text-white rounded-lg hover:bg-rail-700">Save</button>
 </div>
 </div>
 );
 }

 const viewCs = CALLOUT_COLORS_MAP[((widget as any).calloutColor ?? 'amber') as keyof typeof CALLOUT_COLORS_MAP] ?? CALLOUT_COLORS_MAP.amber;
 return (
 <div className={`flex gap-3 p-3.5 rounded-xl border group relative ${viewCs.bg} ${viewCs.border}`}>
 <span className="text-xl shrink-0 select-none leading-snug">{(widget as any).calloutIcon ?? '💡'}</span>
 <p className={`text-sm leading-relaxed flex-1 ${viewCs.text}`}>
 {(widget as any).richText || widget.title || <span className="opacity-40 italic">Empty callout — click edit to add content</span>}
 </p>
 {canManage && (
 <button
 onClick={() => { setIcon((widget as any).calloutIcon ?? '💡'); setColor((widget as any).calloutColor ?? 'amber'); setText((widget as any).richText ?? widget.title ?? ''); setEditing(true); }}
 className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 p-1.5 rounded-lg bg-white/80 hover:bg-white text-slate-400 hover:text-slate-600 transition-opacity shadow-sm">
 <Edit3 size={11}/>
 </button>
 )}
 </div>
 );
}

// ── Checklist Widget ───────────────────────────────────────────────────────────
// Defined outside WidgetRenderer to keep a stable component reference → no unmount on parent re-render
function ChecklistWidget({ widget, onUpdate, canManage }: {
 widget: LayoutWidget; onUpdate: (p: Partial<LayoutWidget>) => void; canManage: boolean;
}) {
 const [items, setItems] = useState<Array<{id:string;text:string;done:boolean}>>(() => (widget as any).checklistItems ?? []);
 const [newText, setNewText] = useState('');
 const prevJsonRef = useRef('');

 // Sync from parent when widget.checklistItems changes externally
 useEffect(() => {
 const incoming = JSON.stringify((widget as any).checklistItems ?? []);
 if (incoming !== prevJsonRef.current) {
 prevJsonRef.current = incoming;
 setItems((widget as any).checklistItems ?? []);
 }
 }, [(widget as any).checklistItems]); // eslint-disable-line

 const save = (next: typeof items) => {
 prevJsonRef.current = JSON.stringify(next);
 setItems(next);
 onUpdate({ checklistItems: next } as any);
 };

 const done = items.filter(i => i.done).length;
 const total = items.length;

 return (
 <div className="space-y-1.5">
 {total > 0 && (
 <div className="flex items-center gap-2 mb-2.5">
 <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
 <div className="h-full bg-emerald-400 rounded-full transition-all duration-300"
 style={{ width: `${total > 0 ? Math.round(done/total*100) : 0}%` }}/>
 </div>
 <span className="text-[10px] text-slate-400 shrink-0">{done}/{total} done</span>
 </div>
 )}
 {items.map(item => (
 <div key={item.id} className="flex items-start gap-2.5 group/item py-0.5">
 <button
 onClick={() => save(items.map(i => i.id === item.id ? { ...i, done: !i.done } : i))}
 className={`w-4 h-4 mt-0.5 rounded border-2 flex items-center justify-center shrink-0 transition-all ${item.done ? 'bg-emerald-500 border-emerald-500' : 'border-slate-300 hover:border-emerald-400'}`}>
 {item.done && <Check size={9} className="text-white"/>}
 </button>
 <span className={`flex-1 text-sm leading-snug transition-all ${item.done ? 'line-through text-slate-400' : 'text-slate-700'}`}>
 {item.text}
 </span>
 {canManage && (
 <button onClick={() => save(items.filter(i => i.id !== item.id))}
 className="opacity-0 group-hover/item:opacity-100 p-1 text-slate-300 hover:text-red-400 transition-opacity shrink-0">
 <X size={11}/>
 </button>
 )}
 </div>
 ))}
 {items.length === 0 && !canManage && (
 <p className="text-xs text-slate-300 italic py-2 text-center">No checklist items</p>
 )}
 {canManage && (
 <div className="flex gap-2 pt-1.5">
 <input value={newText} onChange={e => setNewText(e.target.value)}
 onKeyDown={e => {
 if (e.key === 'Enter' && newText.trim()) {
 save([...items, { id: `c${Date.now()}`, text: newText.trim(), done: false }]);
 setNewText('');
 }
 }}
 placeholder="Add item… (Enter to add)"
 className="flex-1 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:border-rail-400"/>
 <button
 onClick={() => { if (newText.trim()) { save([...items, { id: `c${Date.now()}`, text: newText.trim(), done: false }]); setNewText(''); }}}
 disabled={!newText.trim()}
 className="px-3 py-1.5 text-xs bg-rail-600 text-white rounded-lg disabled:opacity-40 hover:bg-rail-700">
 Add
 </button>
 </div>
 )}
 </div>
 );
}

// ── Embed / Google + Microsoft Service Widget ─────────────────────────────────
const EMBED_SERVICE_TYPES = [
 // Generic
 { id: 'url',      label: 'URL',          icon: '🌐', hint: 'Any embeddable page URL' },
 // Google
 { id: 'gsheet',   label: 'Google Sheet', icon: '📊', hint: 'Paste Google Sheets share URL' },
 { id: 'gdoc',     label: 'Google Doc',   icon: '📄', hint: 'Paste Google Docs share URL' },
 { id: 'gform',    label: 'Google Form',  icon: '📝', hint: 'Paste Google Forms URL' },
 { id: 'gdrive',   label: 'Drive Folder', icon: '📁', hint: 'Paste Google Drive folder URL' },
 // Microsoft
 { id: 'excel',    label: 'Excel Online', icon: '📗', hint: 'Paste OneDrive/SharePoint Excel URL — or from Share → Embed, copy the iframe src' },
 { id: 'word',     label: 'Word Online',  icon: '📘', hint: 'Paste OneDrive/SharePoint Word URL — or from Share → Embed, copy the iframe src' },
 { id: 'ppt',      label: 'PowerPoint',   icon: '📙', hint: 'Paste OneDrive/SharePoint PPT URL — or from Share → Embed, copy the iframe src' },
 { id: 'onedrive', label: 'OneDrive',     icon: '☁️',  hint: 'In OneDrive, open the folder → Share → Embed → copy the iframe src URL' },
] as const;
type EmbedServiceType = typeof EMBED_SERVICE_TYPES[number]['id'];

function toEmbedSrc(url: string, type: EmbedServiceType): string {
 if (!url) return '';
 try {
 // ── Google ───────────────────────────────────────────────────────────────
 if (type === 'gsheet') {
 const m = url.match(/\/spreadsheets\/d\/([^/]+)/);
 if (m) return `https://docs.google.com/spreadsheets/d/${m[1]}/htmlview?widget=true&headers=false`;
 }
 if (type === 'gdoc') {
 const m = url.match(/\/document\/d\/([^/]+)/);
 if (m) return `https://docs.google.com/document/d/${m[1]}/preview`;
 }
 if (type === 'gform') {
 const m = url.match(/\/forms\/d\/([^/]+)/);
 if (m) return `https://docs.google.com/forms/d/${m[1]}/viewform?embedded=true`;
 }
 if (type === 'gdrive') {
 const m = url.match(/\/drive\/folders\/([^/?]+)/);
 if (m) return `https://drive.google.com/embeddedfolderview?id=${m[1]}#grid`;
 }
 // ── Microsoft ─────────────────────────────────────────────────────────────
 if (type === 'excel' || type === 'word' || type === 'ppt') {
 // Already an embed/viewer URL — use as-is
 if (url.includes('officeapps.live.com') || url.includes('onedrive.live.com/embed') || url.includes('action=embedview')) return url;
 // SharePoint URL: append embedview action
 if (url.includes('sharepoint.com')) {
 const base = url.split('?')[0];
 return `${base}?action=embedview`;
 }
 // OneDrive personal sharing link (1drv.ms or onedrive.live.com)
 // Wrap in Office Online viewer — works for publicly shared files
 if (url.includes('1drv.ms') || url.includes('onedrive.live.com')) {
 return `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(url)}`;
 }
 // Direct .xlsx / .docx / .pptx URL
 if (/\.(xlsx|xls|docx|doc|pptx|ppt)$/i.test(url)) {
 return `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(url)}`;
 }
 return url;
 }
 if (type === 'onedrive') {
 // User should paste the embed src from OneDrive's Share → Embed dialog
 return url;
 }
 } catch {}
 return url;
}

// ── Toggle Widget ─────────────────────────────────────────────────────────────
// Defined OUTSIDE WidgetRenderer so React sees a stable component reference.
// (Defining it inside the switch case creates a new type on every render → state reset.)
function ToggleWidget({ widget, onUpdate, canManage }: {
  widget: LayoutWidget; onUpdate: (p: Partial<LayoutWidget>) => void; canManage: boolean;
}) {
  const [open, setOpen] = useState<boolean>((widget as any).toggleOpen ?? true);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<string>((widget as any).richText ?? '');

  const handleToggle = () => {
    const next = !open;
    setOpen(next);
    onUpdate({ toggleOpen: next } as any);
  };

  const save = () => {
    onUpdate({ richText: draft } as any);
    setEditing(false);
  };

  return (
    <div>
      <button
        onClick={handleToggle}
        className="flex items-center gap-2 text-sm font-semibold text-slate-800 w-full text-left hover:bg-slate-50 rounded-lg px-2 py-1.5 -mx-2"
      >
        <ChevronRight
          size={14}
          className={`text-slate-400 transition-transform ${open ? 'rotate-90' : ''}`}
        />
        {widget.title}
      </button>

      {open && (
        <div className="pl-5 mt-1.5">
          {editing ? (
            <div className="space-y-2">
              <textarea
                autoFocus
                value={draft}
                onChange={e => setDraft(e.target.value)}
                rows={4}
                className="w-full text-sm text-slate-700 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:border-rail-400 resize-y"
                placeholder="Add toggle content…"
              />
              <div className="flex gap-1.5">
                <button onClick={save}
                  className="flex items-center gap-1 px-3 py-1 text-xs bg-rail-600 text-white rounded-lg hover:bg-rail-700">
                  <Check size={10}/> Save
                </button>
                <button onClick={() => { setDraft((widget as any).richText ?? ''); setEditing(false); }}
                  className="px-3 py-1 text-xs text-slate-500 hover:bg-slate-100 rounded-lg">
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div className="group/toggle relative">
              {(widget as any).richText ? (
                <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-wrap pr-6">
                  {(widget as any).richText}
                </p>
              ) : canManage ? (
                <p className="text-sm text-slate-300 italic">Click the pencil to add content</p>
              ) : (
                <p className="text-sm text-slate-400 italic">No content added yet</p>
              )}
              {canManage && (
                <button
                  onClick={() => { setDraft((widget as any).richText ?? ''); setEditing(true); }}
                  className="absolute top-0 right-0 opacity-0 group-hover/toggle:opacity-100 transition-opacity p-1 rounded hover:bg-slate-100 text-slate-300 hover:text-slate-600"
                >
                  <Edit3 size={11} />
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Handout Widget ────────────────────────────────────────────────────────────
// Railway Station Information Handout Card — MDNR format

/** Per-section audit trail: who filled + who checked */
type SectionMeta = { updatedBy: string; updatedAt: string; checkedBy: string; checkedAt: string };
const mkMeta = (): SectionMeta => ({ updatedBy: '', updatedAt: '', checkedBy: '', checkedAt: '' });

type CounterSide = { label: string; M: string; E: string; N: string; count?: string };
type CounterHead = {
  name: string; total: string;
  M: string; E: string; N: string;
  mpSanctioned: string; mpOnRoll: string; mpActual: string;
  /** Optional per-side (e.g. AG Side / PG Side) breakdown. When present and
   *  non-empty, the distribution is shown as side columns instead of the single
   *  M/E/N. Purely optional — most counters won't use it. */
  sides?: CounterSide[];
  /** How side columns display: 'shifts' shows M/E/N rows; 'count' shows a
   *  single per-side count row (e.g. AG ATVM / PG ATVM with no shift split).
   *  Defaults to 'shifts' when omitted. */
  sideMode?: 'shifts' | 'count';
  extraFields: { key: string; value: string }[];
  meta: SectionMeta;
};
type CommercialItem = { name: string; earning: string; status: string };
/** Maps each section key → assigned cell name (global, not per-handout) */
type HandoutCellConfig = Record<string, string>;
const CELL_CFG_KEY = 'rly_handout_cell_config';

/** All fixed section keys (counter heads use dynamic 'ch:{i}' keys) */
const SEC_LABELS: Record<string, string> = {
  ff: 'Footfall / Day',
  infra: 'Infrastructure',
  trains: 'Trains / Day',
  'ch:0': 'UTS Counter',
  'ch:1': 'STBA Counter',
  'ch:2': 'ATVM Counter',
  'ch:3': 'PRS Counter',
  'ch:4': 'Enquiry Counter',
  'ch:5': 'Announcement Counter',
  sanitation: 'Sanitation',
  commercial: 'Commercial Earnings',
  parking: 'Parking',
  catering: 'Catering',
  primes: 'PRIMES',
  earning: 'Station Earning',
  ebif: 'Earning Bifurcation',
};

// ── Divisional CMI role options for Cell Assignment Configuration ─────────────
// (Sectional CMIs are read dynamically from the Overview sheet cache instead)
const DIVISIONAL_CMI_OPTIONS = [
  'CMI/UTS-PRS','CMI/Sanitation','CMI/Planning','CMI/Marketing',
  'CMI/Traffic','CMI/Engineering','CMI/Security','CMI/Catering',
  'CMI/Parking','CMI/Coaching','CMI/Goods','CMI/Passenger',
] as const;

// ── Data source attached to a handout ─────────────────────────────────────────
type DataSource = {
  id: string;
  type: 'sheets' | 'docs' | 'pdf' | 'other';
  url: string;
  label: string;
};

/** Convert a Google Docs share/edit URL to an HTML export URL */
function toDocHtmlUrl(url: string): string | null {
  const m = url.match(/\/document\/d\/([a-zA-Z0-9-_]+)/);
  if (!m) return null;
  return `https://docs.google.com/document/d/${m[1]}/export?format=html`;
}

/**
 * All fields that can be extracted from a Google Doc and filled into a handout.
 * Covers every HD field including arrays (ff, trains, primes, stationEarning,
 * counterHeads, commercial) and earningBifurcation.
 */
type DocFields = {
  stationCode?: string; stationName?: string; category?: string;
  state?: string; section?: string; cmi?: string; division?: string;
  platforms?: string; fob?: string; waitingRooms?: string; sanitation?: string;
  ff?: string[][];              // 3×4 : UTS/PRS/Total × Outward/Inward/PF/Total
  trains?: string[][];          // 3×4 : Mail/Pass/Total × Orig/Term/Pass/Total
  counterHeads?: CounterHead[]; // counter name, total, M/E/N shifts, manpower
  commercial?: CommercialItem[]; // Pay&Use, Parking, Catering, Publicity, ATM
  primes?: string[][];          // 3×3 : UTS/PRS/Total × Tickets/Passengers/Earning
  stationEarning?: string[][];  // 3×3 : same structure (Counter/Station Earning)
  earningBifurcation?: string;
};

/* ─── Helpers used inside parseDocForHandout ─────────────────────────── */

/**
 * Parse a PRIMES or Counter/Station Earning table from Google Docs HTML.
 *
 * Table structure (Google Docs export):
 *   Row 0 (header): [label_col | UTS | PRS | Total]
 *   Row 1:          [Tickets/day | uts_val | prs_val | tot_val]
 *   Row 2:          [Passengers/day | uts_val | prs_val | tot_val]
 *   Row 3:          [Earning/day | uts_val | prs_val | tot_val]
 *   Row 4 (opt):    [Earning Bifurcation: ... (merged cell)]
 *
 * Output: primes[rowIdx][colIdx]
 *   rowIdx 0=UTS, 1=PRS, 2=Total
 *   colIdx 0=Tickets/day, 1=Passengers/day, 2=Earning/day
 */
function _parsePrimesTable(tbl: Element): string[][] | null {
  // Data rows in the table: first cell label → output column index
  const labelToColIdx: Record<string, number> = {
    'tickets': 0, 'ticketsday': 0,
    'passengers': 1, 'passengersday': 1,
    'earning': 2, 'earningday': 2,
  };
  // output[rowIdx=UTS/PRS/Total][colIdx=Tickets/Pax/Earn]
  const pr: string[][] = [['','',''],['','',''],['','','']];
  let hit = false;
  tbl.querySelectorAll('tr').forEach(row => {
    const cells = [...row.querySelectorAll('td,th')].map(c => c.textContent?.trim() ?? '');
    if (cells.length < 2) return;
    // Normalise first-cell label: lowercase, remove spaces and slashes, strip trailing 'day'
    const lbl = cells[0].toLowerCase().replace(/[/\s]/g, '').replace(/day$/, '');
    const colIdx = labelToColIdx[lbl];
    if (colIdx === undefined) return; // header row or bifurcation row → skip
    // cells[1]=UTS value, cells[2]=PRS value, cells[3]=Total value
    const vals = cells.slice(1).filter(c => c !== '');
    for (let r = 0; r < 3 && r < vals.length; r++) {
      pr[r][colIdx] = vals[r].replace(/,/g, '').replace(/₹\s*/g, '').trim();
    }
    hit = true;
  });
  return hit ? pr : null;
}

/**
 * Strip HTML tags to plain text, inserting newlines at block-level elements.
 * More reliable than innerText on DOMParser output (which may not be rendered).
 */
function _htmlToText(html: string): string {
  // DOMParser is available in browser context (parseDocForHandout already guards for SSR).
  // Using it instead of regex is required because Google Docs' <style> block is a
  // multi-kilobyte minified CSS blob that defeats lazy [\s\S]*? matching in practice.
  if (typeof document !== 'undefined') {
    try {
      // Parse as a full document so the browser correctly places <style>/<head> elements.
      // For fragments we wrap; for full docs (already has <html>) we parse directly.
      const src = /<html[\s>]/i.test(html)
        ? html
        : `<!DOCTYPE html><html><head></head><body>${html}</body></html>`;
      const dom = new DOMParser().parseFromString(src, 'text/html');
      // Remove style, script, head, and meta/link nodes — we only want readable text.
      dom.querySelectorAll('style, script, head, meta, link, noscript').forEach(el => el.remove());
      html = dom.body ? dom.body.innerHTML : dom.documentElement.innerHTML;
    } catch {
      // DOMParser failed (should never happen in a browser) — fall through to regex below.
    }
  } else {
    // SSR / Node.js fallback — regex-based strip (good enough for non-browser contexts
    // since this function is only really used in parseDocForHandout which guards SSR).
    html = html
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '');
  }
  return html
    // Block-level closing tags → newline (so sections end up on their own lines).
    // NOTE: td/th are included because CMI handout sections are authored as a
    // TABLE — each value lives in its own cell, so cells must break to lines.
    .replace(/<\/(?:p|li|div|ul|ol|h[1-6]|tr|td|th|blockquote|section)[^>]*>/gi, '\n')
    .replace(/<br\s*\/?>/gi, '\n')
    // Strip all remaining tags
    .replace(/<[^>]+>/g, '')
    // Decode common HTML entities
    .replace(/&nbsp;/gi, ' ').replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<').replace(/&gt;/gi, '>')
    .replace(/&#39;/gi, "'").replace(/&quot;/gi, '"')
    .replace(/&#8377;/gi, '₹').replace(/&#x20b9;/gi, '₹')
    .replace(/&mdash;/gi, '—').replace(/&ndash;/gi, '–')
    // Collapse excess blank lines
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/**
 * Split the plain-text of one station block into its numbered sections (1–14).
 *
 * CRITICAL: CMI handouts are authored as an ORDERED list (<ol> with
 * list-style-type:none) whose "1..14" markers are CSS-generated counters
 * (`li:before { content: counter(...) }`). Those numbers are NOT part of the
 * DOM textContent, so after _htmlToText the lines read "Category NSG-1",
 * "Footfall/day ...", etc. — with NO leading digit. Therefore section
 * detection is anchored on the section KEYWORD at the start of each line, and
 * any leading bullet/number is merely tolerated (for docs that DO type it).
 *
 * Returns a map of {sectionNumber → trimmed content text after the keyword}.
 */
function _splitNumberedSections(workText: string): Record<number, string> {
  // Ordered keyword patterns → canonical CMI section number.
  const SECTION_PATTERNS: [number, RegExp][] = [
    [1,  /Category/i],
    [2,  /Footfall/i],
    [3,  /Platforms?\b/i],
    [4,  /FOB\b/i],
    [5,  /Waiting\s*Rooms?/i],
    [6,  /Trains?\b/i],
    [7,  /Counters?\b/i],
    [8,  /Manpower/i],
    [9,  /Sanitation/i],
    [10, /Pay\s*&\s*Use|Pay\s+and\s+Use|Pay\s*&/i],
    [11, /Parking/i],
    [12, /Catering/i],
    [13, /Publicity|NFR\b/i],
    [14, /ATM\b/i],
  ];
  const matchAtLineStart = (line: string): { num: number; contentOffset: number } | null => {
    // Tolerate a leading bullet and/or a literal number ("1 ", "1. ", "1) ").
    const m = /^[ \t]*(?:[-•·▪]\s*)?(?:\d{1,2}[.)]?\s+)?(.*)$/.exec(line);
    if (!m) return null;
    const rest = m[1];
    const prefixLen = line.length - rest.length;
    for (const [num, kw] of SECTION_PATTERNS) {
      const km = kw.exec(rest);
      if (km && km.index === 0) return { num, contentOffset: prefixLen + km[0].length };
    }
    return null;
  };

  type SecMark = { num: number; lineStart: number; contentStart: number };
  const marks: SecMark[] = [];
  const seen = new Set<number>();
  let pos = 0;
  let primesBoundary = workText.length; // numbered sections end where the PRIMES table starts
  for (const line of workText.split('\n')) {
    if (primesBoundary === workText.length && /^\s*PRIMES\b/i.test(line)) {
      primesBoundary = pos;
    }
    const hit = matchAtLineStart(line);
    if (hit && !seen.has(hit.num)) {
      seen.add(hit.num);
      marks.push({ num: hit.num, lineStart: pos, contentStart: pos + hit.contentOffset });
    }
    pos += line.length + 1; // +1 for the consumed '\n'
  }
  marks.sort((a, b) => a.lineStart - b.lineStart);

  const sections: Record<number, string> = {};
  for (let i = 0; i < marks.length; i++) {
    const from = marks[i].contentStart;
    let to = i + 1 < marks.length ? marks[i + 1].lineStart : workText.length;
    if (to > primesBoundary) to = primesBoundary; // don't let section 14 swallow table text
    sections[marks[i].num] = _stripTrailingSecNum(workText.slice(from, Math.max(from, to)).trim());
  }
  return sections;
}

/**
 * Remove a trailing lone section number (1–14) that leaks from the NEXT table
 * row. The doc is a table where the number sits in its own cell; after
 * linearisation it lands at the tail of the previous section's slice
 * (e.g. "…614-610 612\n4"). This strips that dangling number.
 */
function _stripTrailingSecNum(s: string): string {
  return s.replace(/\s*\n\s*(?:[1-9]|1[0-4])\s*$/, '').trim();
}

/** True if a token is purely numeric (or the "-" placeholder). */
function _isNumericToken(t: string): boolean {
  return t === '-' || (/^[\d,.\-]+$/.test(t) && /\d/.test(t));
}

/**
 * Parse a footfall/trains matrix from section text. Because the source is a
 * table, every value lands on its own line, e.g.:
 *   Outward · Inward · PF · Total · UTS · 42651 · 88964 · 8956 · 140571 · …
 * For each row label we capture the next up-to-4 numeric tokens. The header
 * row ("… Total" before the first data label) is skipped because the token
 * following it is a label, not a number.
 */
function _parseMatrixFromSection(sectionText: string, rowKeys: string[][]): string[][] | null {
  // Flatten on ALL whitespace so this works whether the export puts each value
  // in its own table cell (one per line) or on a single space-separated line.
  const tokens = sectionText.split(/\s+/).map(t => t.trim()).filter(t => t !== '');
  const out: string[][] = rowKeys.map(() => ['', '', '', '']);
  for (let i = 0; i < tokens.length; i++) {
    const norm = tokens[i].toLowerCase().replace(/[.\s]/g, '');
    const ri = rowKeys.findIndex(keys => keys.includes(norm));
    if (ri < 0) continue;
    if (i + 1 >= tokens.length || !_isNumericToken(tokens[i + 1])) continue; // header row → skip
    let col = 0;
    for (let p = i + 1; p < tokens.length && col < 4; p++) {
      if (!_isNumericToken(tokens[p])) break;
      out[ri][col] = tokens[p] === '-' ? '' : tokens[p].replace(/,/g, '');
      col++;
    }
  }
  return out.some(r => r.some(v => v !== '')) ? out : null;
}

/** Commercial: split "(Earning ₹ X lakhs PA)" from the status body. */
function _parseCommercialSection(sectionText: string): { earning: string; status: string } {
  const em = sectionText.match(/Earning\s*(?:₹|Rs\.?)?\s*([\d,.]+)\s*lakhs?\s*PA/i);
  const earning = em ? `${em[1]} lakhs PA` : '';
  // Strip everything up to & including the "(Earning … PA)" chunk (with any name remnant before it).
  let status = sectionText.replace(/^[\s\S]*?\(Earning[^)]*\)\s*/i, '');
  if (status === sectionText) status = sectionText.replace(/^[A-Za-z &]+\n/, ''); // no earning paren
  return { earning, status: status.replace(/\n{2,}/g, '\n').trim() };
}

/**
 * Counters (section 7). Mixed-case names (so "Enquiry" is captured), aggregate
 * totals + M/E/N. When the section is split into station sides — lines like
 * "PG Side: …", "AG side: …", "Chandni Chowk Side: …", "Bhogal side: …" — each
 * counter's M/E/N is captured PER SIDE and stored in `sides[]`, so the fetch
 * auto-fills the optional AG/PG breakdown. Counters without a per-side shift
 * detail (e.g. ATVM, JTBS) keep just a total and no sides.
 */
function _parseCounterHeads(sec7: string, sec8: string): CounterHead[] {
  const NON_COUNTER = new Set(['M','E','N','L','G','AC','PG','AG','SL']);
  // total captured in group 2; optional shift group captures M(3), E(4), N(5).
  // N is optional so "(M-1, E-1)" still yields M/E.
  const cRe = /([A-Za-z]{2,}(?:\/[A-Za-z]+)?)\s*[-–]\s*(\d+)(?:\s*\(M[-–](\d+)[^)]*E[-–](\d+)(?:[^)]*N[-–](\d+))?\))?/g;

  const chMap: Record<string, CounterHead> = {};
  const order: string[] = [];
  const ensure = (name: string): CounterHead => {
    if (!chMap[name]) {
      chMap[name] = {
        name, total: '', M: '', E: '', N: '',
        mpOnRoll: '', mpSanctioned: '', mpActual: '', sides: undefined,
        extraFields: [], meta: mkMeta(),
      };
      order.push(name);
    }
    return chMap[name];
  };
  const addShift = (ch: CounterHead, cm: RegExpExecArray) => {
    if (cm[3] !== undefined) ch.M = String((+ch.M || 0) + +cm[3]);
    if (cm[4] !== undefined) ch.E = String((+ch.E || 0) + +cm[4]);
    if (cm[5] !== undefined) ch.N = String((+ch.N || 0) + +cm[5]);
  };

  // Detect side-structured lines ("<label> side: <counters…>").
  const sideLines: { label: string; body: string }[] = [];
  for (const line of sec7.split('\n').map(l => l.trim()).filter(Boolean)) {
    const m = /^(.+?\bside)\s*:\s*(.+)$/i.exec(line);
    if (m) sideLines.push({ label: m[1].replace(/\bside\b/i, 'Side').trim(), body: m[2] });
  }

  if (sideLines.length >= 1) {
    for (const { label, body } of sideLines) {
      cRe.lastIndex = 0;
      let cm: RegExpExecArray | null;
      while ((cm = cRe.exec(body)) !== null) {
        const name = cm[1];
        if (NON_COUNTER.has(name.toUpperCase())) continue;
        const ch = ensure(name);
        ch.total = String((+ch.total || 0) + +(cm[2] || 0));
        addShift(ch, cm);
        // Record a side entry for EVERY occurrence (count always; M/E/N when present).
        (ch.sides ??= []).push({
          label, count: cm[2] || '',
          M: cm[3] || '', E: cm[4] || '', N: cm[5] || '',
        });
      }
    }
  } else {
    cRe.lastIndex = 0;
    let cm: RegExpExecArray | null;
    while ((cm = cRe.exec(sec7)) !== null) {
      const name = cm[1];
      if (NON_COUNTER.has(name.toUpperCase())) continue;
      const ch = ensure(name);
      ch.total = String((+ch.total || 0) + +(cm[2] || 0));
      addShift(ch, cm);
    }
  }

  if (sec8) {
    const mpRe = /([A-Za-z]{2,})\s*[-–]\s*(\d+)\/(\d+)/g;
    let mm: RegExpExecArray | null;
    while ((mm = mpRe.exec(sec8)) !== null) {
      const n = mm[1];
      if (chMap[n]) { chMap[n].mpOnRoll = mm[2]; chMap[n].mpSanctioned = mm[3]; }
    }
  }
  return order.map(n => {
    const ch = chMap[n];
    if (ch.sides && ch.sides.length) {
      const hasShift = ch.sides.some(s => s.M !== '' || s.E !== '' || s.N !== '');
      if (hasShift) {
        ch.sideMode = 'shifts';
      } else if (ch.sides.length >= 2) {
        // e.g. ATVM: AG- 3 / PG- 22 with no shift split → show a count row.
        ch.sideMode = 'count';
      } else {
        // single side, no shift (e.g. JTBS) → not worth a split.
        ch.sides = undefined;
      }
    } else {
      ch.sides = undefined;
    }
    return ch;
  });
}

/** Earning bifurcation: put UTS and PRS on their own lines. */
function _formatBifurcation(raw: string): string {
  return raw
    .replace(/Earning\s*Bifurcation\s*:?\s*/i, '')
    .replace(/\s*PRS\s*:/i, '\nPRS:')
    .replace(/^\s*UTS\s*:/i, 'UTS:')
    .replace(/\n{2,}/g, '\n')
    .trim();
}

/** Platforms: canonical "PF No.: a | b | …" + "Length: x | y | …" two-line form. */
function _formatPlatforms(sec3: string): string {
  const toks = sec3.split('\n').map(t => t.trim()).filter(t => t !== '');
  const li = toks.findIndex(t => /^length/i.test(t));
  if (li < 0) return sec3.replace(/\n+/g, ' ').replace(/\s{2,}/g, ' ').trim();
  const pf = toks.slice(0, li).filter(t => !/^pf\s*no/i.test(t));
  const len = toks.slice(li + 1);
  return `PF No.: ${pf.join(' | ')}\nLength: ${len.join(' | ')}`;
}

/**
 * Parse the canonical platforms string into aligned grid rows for display.
 * Returns null if the string isn't in the "Label: a | b | …" per-line form.
 */
function parsePlatformGrid(platforms: string): { label: string; cells: string[] }[] | null {
  const lines = platforms.split('\n').map(l => l.trim()).filter(Boolean);
  const rows = lines
    .map(l => {
      const m = /^([^:]+):\s*(.*)$/.exec(l);
      if (!m) return null;
      return { label: m[1].trim(), cells: m[2].split('|').map(c => c.trim()) };
    })
    .filter((r): r is { label: string; cells: string[] } => r !== null);
  if (rows.length < 2) return null;
  const width = Math.max(...rows.map(r => r.cells.length));
  rows.forEach(r => { while (r.cells.length < width) r.cells.push(''); });
  return rows;
}

/**
 * Render a commercial "status" string as a bullet list. Numbered points are
 * split into bullets; within each bullet the lead clause (what/who, before the
 * date "w.e.f." or the first parenthesis) is bolded for quick scanning.
 */
function renderStatusBullets(status: string) {
  if (!status || !status.trim()) return '—';
  let points = status.split('\n').map(s => s.trim()).filter(Boolean);
  if (points.length === 1) {
    // Fall back to splitting inline "1. … 2. …" numbered runs.
    points = status.split(/\s+(?=\d{1,2}[.)]\s)/).map(s => s.trim()).filter(Boolean);
  }
  if (points.length <= 1) {
    return <span className="whitespace-pre-wrap">{status}</span>;
  }
  return (
    <ul className="list-disc pl-4 space-y-0.5">
      {points.map((p, i) => {
        const clean = p.replace(/^\d{1,2}[.)]\s*/, '');
        const m = /^(.*?)(\s+w\.e\.f\..*)$/i.exec(clean) ?? /^(.*?)(\s*\(.*)$/.exec(clean);
        return m
          ? <li key={i}><span className="font-semibold text-slate-700">{m[1]}</span><span className="text-slate-500">{m[2]}</span></li>
          : <li key={i} className="text-slate-700">{clean}</li>;
      })}
    </ul>
  );
}

/**
 * Parse a Google Doc HTML export and extract all handout fields.
 * Understands the CMI numbered-section format:
 *   1=Category, 2=Footfall, 3=Platforms, 4=FOB, 5=Waiting Rooms, 6=Trains,
 *   7=Counters, 8=Manpower, 9=Sanitation, 10=Pay&Use, 11=Parking,
 *   12=Catering, 13=Publicity/NFR, 14=ATM  +  PRIMES + Station Earning + Bifurcation
 *
 * Multi-station documents: stationHint (station code, e.g. "NDLS") is used
 * to isolate BOTH the text section AND the HTML table search for that station.
 * Stations are separated by <hr> elements in the Google Docs HTML export.
 */
function parseDocForHandout(html: string, stationHint = ''): DocFields {
  if (typeof document === 'undefined') return {};
  const result: DocFields = {};

  // ── 0. Station isolation — split raw HTML at <hr> tags ────────────────────
  // Google Docs uses <hr> as the visual separator between station blocks.
  // Splitting the raw HTML string works even if <hr> is deeply nested.
  const hrBlocks = html.split(/<hr[^>]*\/?>/gi);
  let stationHtml = html; // fallback: entire document
  if (stationHint) {
    const codeRe = new RegExp(`\\(\\s*${stationHint}\\s*\\)`, 'i');
    for (const blk of hrBlocks) {
      if (codeRe.test(blk)) { stationHtml = blk; break; }
    }
  }

  // Plain text for section parsing
  const workText = _htmlToText(stationHtml);
  // DOM for table parsing (PRIMES / Station Earning are actual <table> elements)
  const workDom = new DOMParser().parseFromString(
    `<html><body>${stationHtml}</body></html>`, 'text/html'
  );

  // ── 1. Station name + code ────────────────────────────────────────────────
  const headM = /^(.+?)\s*\(([A-Z]{2,5})\)/m.exec(workText);
  if (headM) {
    result.stationName = headM[1].trim();
    result.stationCode = headM[2].trim();
  }

  // ── 2. Split text into numbered sections (1–14) ───────────────────────────
  const sections = _splitNumberedSections(workText);

  // ── 3. Simple string sections ─────────────────────────────────────────────
  if (sections[1]) {
    const c = sections[1].match(/NSG[-–\s]*(\d)/i);
    result.category = c ? `NSG-${c[1]}` : sections[1].trim().split(/[\s\n]/)[0];
  }
  if (sections[3]) result.platforms = _formatPlatforms(sections[3]);
  if (sections[4]) {
    const f = sections[4].match(/Nil[^\n]*|\d+/i);
    result.fob = f ? f[0].trim() : sections[4].trim().split(/[\s\n]/)[0];
  }
  if (sections[5]) result.waitingRooms = sections[5].trim();
  if (sections[9]) result.sanitation = sections[9].trim();

  // ── 4. Footfall (section 2) — table cells, one value per line ─────────────
  if (sections[2]) {
    const ff = _parseMatrixFromSection(sections[2], [['uts'], ['prs'], ['total']]);
    if (ff) result.ff = ff;
  }

  // ── 5. Trains (section 6) — table cells, one value per line ───────────────
  if (sections[6]) {
    const tr = _parseMatrixFromSection(sections[6], [['mailexp','mail','mail/exp'], ['passenger'], ['total']]);
    if (tr) result.trains = tr;
  }

  // ── 6. Commercial items (sections 10-14) ──────────────────────────────────
  // Earning is stored WITHOUT the ₹ prefix (the UI adds one) and the status
  // body excludes the "(Earning … PA)" chunk.
  const commercialDefs: [number, string][] = [
    [10,'Pay & Use Toilet'],[11,'Parking'],
    [12,'Catering'],[13,'Publicity'],[14,'ATM'],
  ];
  const cItems: CommercialItem[] = [];
  for (const [n, name] of commercialDefs) {
    const t = sections[n] ?? '';
    const { earning, status } = _parseCommercialSection(t);
    cItems.push({ name, earning, status });
  }
  if (cItems.length) result.commercial = cItems;

  // ── 7. Counter heads (section 7) + Manpower (section 8) ──────────────────
  if (sections[7]) {
    const chs = _parseCounterHeads(sections[7], sections[8] ?? '');
    if (chs.length) result.counterHeads = chs;
  }

  // ── 8. PRIMES + Station Earning from HTML tables (station-isolated DOM) ───
  // These are actual <table> elements in the Google Docs HTML export.
  // They appear at the bottom of each station block, after section 14.
  // Identify them by containing 'ticket' AND 'passenger' in their text.
  const primeCandidates: Element[] = [];
  for (const tbl of workDom.querySelectorAll('table')) {
    const tt = (tbl.textContent ?? '').toLowerCase();
    if (tt.includes('ticket') && tt.includes('passenger') &&
        (tt.includes('uts') || tt.includes('prs'))) {
      primeCandidates.push(tbl);
    }
  }
  if (primeCandidates[0]) { const p = _parsePrimesTable(primeCandidates[0]); if (p) result.primes = p; }
  if (primeCandidates[1]) { const p = _parsePrimesTable(primeCandidates[1]); if (p) result.stationEarning = p; }

  // ── 9. Earning Bifurcation ────────────────────────────────────────────────
  // Appears in the last row of the Station Earning table (merged cell) or in text.
  // Check table cells first, then fall back to workText pattern.
  let bifText = '';
  for (const tbl of primeCandidates) {
    for (const row of tbl.querySelectorAll('tr')) {
      const cellText = row.textContent ?? '';
      if (/bifurcation/i.test(cellText) || /UTS\s*[:：]\s*ATVM/i.test(cellText)) {
        bifText = cellText.trim();
        break;
      }
    }
    if (bifText) break;
  }
  if (!bifText) {
    const bifM = workText.match(/(Earning\s*Bifurcation\s*[:\n][\s\S]*?(?:PRS\s*[:：][^\n]+))/i)
              ?? workText.match(/(UTS\s*[:：]\s*(?:ATVM|JTBS|RailOne|UTS|SMC)[^\n]*(?:\n(?!--|New Delhi|Delhi )[^\n]+)*(?:\nPRS\s*[:：][^\n]+)?)/i);
    if (bifM) bifText = bifM[1].trim();
  }
  if (bifText) result.earningBifurcation = _formatBifurcation(bifText);

  return result;
}

type HD = {
  stationCode: string; stationName: string; category: string;
  state: string; section: string; cmi: string;
  /** Auto-computed from the latest updatedAt across all sections */
  date: string; division: string;
  /** [3×4]  rows: UTS/PRS/Total  ×  cols: Outward/Inward/PF/Total */
  ff: string[][];
  ffMeta: SectionMeta;
  platforms: string; fob: string; waitingRooms: string;
  infraMeta: SectionMeta;
  /** [3×4]  rows: Mail_Exp/Passenger/Total  ×  cols: Orig/Term/Passing/Total */
  trains: string[][];
  trainsMeta: SectionMeta;
  counterHeads: CounterHead[];
  sanitation: string;
  sanitationMeta: SectionMeta;
  commercial: CommercialItem[];
  commercialMeta: SectionMeta;
  /** Parking cell section */
  parking: string;
  parkingMeta: SectionMeta;
  /** Catering cell section */
  catering: string;
  cateringMeta: SectionMeta;
  /** [3×3]  rows: UTS/PRS/Total  ×  cols: Tickets/day, Pax/day, Earning/day */
  primes: string[][];
  primesMeta: SectionMeta;
  /** same shape — Counter/Station Earning */
  stationEarning: string[][];
  stationEarningMeta: SectionMeta;
  earningBifurcation: string;
  earningMeta: SectionMeta;
  /** CMI-level check */
  cmiCheckedBy: string;
  cmiCheckedAt: string;
  /** Linked external data sources */
  dataSources: DataSource[];
};
const mkCH = (name = ''): CounterHead => ({
  name, total: '', M: '', E: '', N: '', mpSanctioned: '', mpOnRoll: '', mpActual: '',
  extraFields: [],
  meta: mkMeta(),
});
const mkCI = (name = ''): CommercialItem => ({ name, earning: '', status: '' });
const mkHD = (): HD => ({
  stationCode: '', stationName: '', category: '',
  state: '', section: '', cmi: '',
  date: '', division: 'Delhi Division',
  ff: [['','','',''],['','','',''],['','','','']],
  ffMeta: mkMeta(),
  platforms: '', fob: '', waitingRooms: '',
  infraMeta: mkMeta(),
  trains: [['','','',''],['','','',''],['','','','']],
  trainsMeta: mkMeta(),
  counterHeads: ['UTS','STBA','ATVM','PRS','Enquiry','Announcement'].map(mkCH),
  sanitation: '',
  sanitationMeta: mkMeta(),
  commercial: ['Pay & Use Toilet','Publicity','ATM'].map(mkCI),
  commercialMeta: mkMeta(),
  parking: '',
  parkingMeta: mkMeta(),
  catering: '',
  cateringMeta: mkMeta(),
  primes:         [['','',''],['','',''],['','','']],
  primesMeta: mkMeta(),
  stationEarning: [['','',''],['','',''],['','','']],
  stationEarningMeta: mkMeta(),
  earningBifurcation: '',
  earningMeta: mkMeta(),
  cmiCheckedBy: '',
  cmiCheckedAt: '',
  dataSources: [],
});

// ── helper: find matching column in a SheetRow by keyword ────────────────────
function findCol(headers: string[], keyword: string): string {
  const kw = keyword.toLowerCase();
  return headers.find(h => h.toLowerCase().includes(kw)) ?? '';
}

// ── date helpers ──────────────────────────────────────────────────────────────
function todayDDMMYYYY(): string {
  const n = new Date();
  return `${String(n.getDate()).padStart(2,'0')}.${String(n.getMonth()+1).padStart(2,'0')}.${n.getFullYear()}`;
}
function computeAsOnDate(h: HD): string {
  const parse = (s: string) => { const [d,m,y]=s.split('.'); return new Date(+y,+m-1,+d).getTime(); };
  const all = [
    h.ffMeta?.updatedAt, h.infraMeta?.updatedAt, h.trainsMeta?.updatedAt,
    h.sanitationMeta?.updatedAt, h.commercialMeta?.updatedAt,
    h.parkingMeta?.updatedAt, h.cateringMeta?.updatedAt,
    h.primesMeta?.updatedAt, h.stationEarningMeta?.updatedAt, h.earningMeta?.updatedAt,
    ...(h.counterHeads?.map(ch=>ch.meta?.updatedAt)??[]),
  ].filter(Boolean) as string[];
  if (!all.length) return h.date ?? '';
  return all.reduce((mx,c) => parse(c)>parse(mx)?c:mx);
}
function fmtMeta(meta?: SectionMeta): { upd: string|null; chk: string|null } {
  return {
    upd: meta?.updatedBy ? `${meta.updatedBy}${meta.updatedAt?` (${meta.updatedAt})`:'' }` : null,
    chk: meta?.checkedBy ? `${meta.checkedBy}${meta.checkedAt?` (${meta.checkedAt})`:'' }` : null,
  };
}

/**
 * Small presentational components used by HandoutWidget. These MUST live at
 * module scope — if they were defined inside HandoutWidget they'd be recreated
 * on every render, causing React to remount their <input> on each keystroke and
 * lose focus after a single character.
 */
const CI = ({ val, onChange, ph }: { val: string; onChange: (v: string) => void; ph?: string }) => (
  <input value={val} onChange={e => onChange(e.target.value)} placeholder={ph}
    onKeyDown={e => { if (e.key === 'Enter') e.currentTarget.blur(); }}
    className="w-full bg-amber-50 border border-amber-200 rounded px-1 py-0.5 text-[10px] text-center focus:outline-none focus:border-amber-400"/>
);
const TH = ({ cols }: { cols: string[] }) => (
  <tr className="bg-amber-600 text-white">
    {cols.map((c, i) => <th key={i} className="px-2 py-1 text-[10px] font-bold border border-amber-500 text-center whitespace-nowrap">{c}</th>)}
  </tr>
);
const TRow = ({ label, cells, hi }: { label: string; cells: string[]; hi?: boolean }) => (
  <tr className={hi ? 'bg-amber-50 font-semibold' : 'hover:bg-amber-50/40'}>
    <td className="px-2 py-1 text-[10px] border border-amber-200 font-medium text-slate-700 whitespace-nowrap">{label}</td>
    {cells.map((c, i) => <td key={i} className="px-2 py-1 text-[10px] text-center border border-amber-200 text-slate-700">{c || '—'}</td>)}
  </tr>
);

function HandoutWidget({ widget, onUpdate, canManage }: {
  widget: LayoutWidget; onUpdate: (p: Partial<LayoutWidget>) => void; canManage: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [d, setD] = useState<HD>(() => {
    const s = (widget as any).handoutData as Partial<HD> | undefined;
    if (!s) return mkHD();
    const base = mkHD();
    return {
      ...base, ...s,
      ff:             (Array.isArray(s.ff) && s.ff.length === 3 && s.ff[0]?.length === 4) ? s.ff : base.ff,
      trains:         (Array.isArray(s.trains) && s.trains.length === 3) ? s.trains : base.trains,
      counterHeads:   Array.isArray(s.counterHeads)
        ? s.counterHeads.map((ch: any) => ({ ...mkCH(ch.name), ...ch,
            extraFields: Array.isArray(ch.extraFields) ? ch.extraFields : [],
            sides: Array.isArray(ch.sides) && ch.sides.length
              ? ch.sides.map((sd: any) => ({ label: sd?.label ?? '', M: sd?.M ?? '', E: sd?.E ?? '', N: sd?.N ?? '', count: sd?.count ?? '' }))
              : undefined,
            sideMode: ch.sideMode === 'count' ? 'count' : (Array.isArray(ch.sides) && ch.sides.length ? 'shifts' : undefined),
            meta: ch.meta ?? mkMeta(),
          }))
        : base.counterHeads,
      commercial:     Array.isArray(s.commercial)   ? s.commercial   : base.commercial,
      primes:         Array.isArray(s.primes)        ? s.primes        : base.primes,
      stationEarning: Array.isArray(s.stationEarning) ? s.stationEarning : base.stationEarning,
      // Migrate old data: add meta fields if missing
      ffMeta:             s.ffMeta             ?? mkMeta(),
      infraMeta:          s.infraMeta          ?? mkMeta(),
      trainsMeta:         s.trainsMeta         ?? mkMeta(),
      sanitationMeta:     s.sanitationMeta     ?? mkMeta(),
      commercialMeta:     s.commercialMeta     ?? mkMeta(),
      parkingMeta:        s.parkingMeta        ?? mkMeta(),
      cateringMeta:       s.cateringMeta       ?? mkMeta(),
      primesMeta:         s.primesMeta         ?? mkMeta(),
      stationEarningMeta: s.stationEarningMeta ?? mkMeta(),
      earningMeta:        s.earningMeta        ?? mkMeta(),
      cmiCheckedBy:       s.cmiCheckedBy       ?? '',
      cmiCheckedAt:       s.cmiCheckedAt       ?? '',
      parking:            s.parking            ?? '',
      catering:           s.catering           ?? '',
      dataSources:        Array.isArray(s.dataSources) ? s.dataSources : [],
    };
  });

  // ── Logged-in user (from auth localStorage) ───────────────────────────────
  const [currentUser, setCurrentUser] = useState<{ name: string; cell: string; cells?: string[]; role: string } | null>(null);
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const u = JSON.parse(localStorage.getItem('rly_dashboard_user') ?? 'null');
      if (u?.name) setCurrentUser({ name: u.name, cell: u.cell ?? '', cells: u.cells, role: u.role ?? 'user' });
    } catch { /* ignore */ }
  }, []);

  // ── Global cell config (applies to ALL handouts) ──────────────────────────
  const [cellConfig, setCellConfig] = useState<HandoutCellConfig>({});
  const [showCellConfig, setShowCellConfig] = useState(false);

  // Dynamic options for Cell Config modal: cells from registry + sectional CMIs from staff
  const [availableCells, setAvailableCells] = useState<{ name: string; head: string }[]>([]);
  const [sectionalCMIs,  setSectionalCMIs]  = useState<{ name: string; designation: string }[]>([]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    // Load cells from registry
    try {
      const BUILTIN_CELL_NAMES = [
        'Planning','Manpower Planning','Security D&AR','Legal','Marketing',
        'Ticket Checking','UTS PRS','JTBS/YTSK/STBA','Store','Sanitation',
        'Catering','Parking','Publicity','License Porter','Complaint/RailMadad',
        'Concession','PA','Commercial Control','Union/DRUCC','DAK',
      ];
      const raw = localStorage.getItem('rly_cell_registry');
      const cells: { name: string; headDesignation: string; status: string }[] = raw
        ? JSON.parse(raw)
        : BUILTIN_CELL_NAMES.map(n => ({ name: n, headDesignation: '', status: 'active' }));
      setAvailableCells(
        cells.filter(c => c.status === 'active').map(c => ({ name: c.name, head: c.headDesignation ?? '' }))
      );
    } catch { /* ignore */ }
    // Load sectional CMIs from staff master (role = 'incharge' or designation containing 'CMI'/'Sectional')
    try {
      const staff: any[] = JSON.parse(localStorage.getItem('rly_staff_master') ?? '[]');
      const cmis = staff.filter(s => {
        const role = (s.role ?? '').toLowerCase();
        const desig = (s.designation ?? s.workingAs ?? '').toLowerCase();
        return role === 'incharge' || desig.includes('cmi') || desig.includes('sectional');
      }).map(s => ({ name: s.name ?? '', designation: s.designation ?? s.workingAs ?? '' }))
        .filter(s => s.name);
      setSectionalCMIs(cmis);
    } catch { /* ignore */ }
    // Load cell config
    try {
      const local = JSON.parse(localStorage.getItem(CELL_CFG_KEY) ?? '{}');
      setCellConfig(local);
    } catch { /* ignore */ }
    // Sync cell config from KV
    import('@/lib/config/sharedSync').then(({ sharedRead }) => {
      sharedRead(CELL_CFG_KEY).then((kv: unknown) => {
        if (kv && typeof kv === 'object') {
          setCellConfig(kv as HandoutCellConfig);
          try { localStorage.setItem(CELL_CFG_KEY, JSON.stringify(kv)); } catch { /* ignore */ }
        }
      }).catch(() => {});
    }).catch(() => {});
  }, []);

  const saveCellConfig = (cfg: HandoutCellConfig) => {
    setCellConfig(cfg);
    try { localStorage.setItem(CELL_CFG_KEY, JSON.stringify(cfg)); } catch { /* ignore */ }
    import('@/lib/config/sharedSync').then(({ sharedWrite }) => {
      sharedWrite(CELL_CFG_KEY, cfg);
    }).catch(() => {});
  };

  /** Can the logged-in user edit a given section? */
  const canEditSec = (sec: string): boolean => {
    if (!currentUser) return canManage; // if user not resolved yet, fall back to canManage
    const role = currentUser.role;
    if (role === 'maintenance' || role === 'admin') return true;
    // incharge with cell='All' can edit everything
    if (role === 'incharge' && (!currentUser.cell || currentUser.cell === 'All')) return true;
    const assignedCell = cellConfig[sec];
    if (!assignedCell) return true; // unassigned section → anyone can edit
    const userCells = [currentUser.cell, ...(currentUser.cells ?? [])].filter(Boolean);
    return userCells.some(c => c === assignedCell);
  };

  /** Auto-fill updatedBy for sections belonging to the current user's cell */
  const autoFillNames = (hd: HD): HD => {
    if (!currentUser?.name) return hd;
    const name = currentUser.name;
    const userCells = [currentUser.cell, ...(currentUser.cells ?? [])].filter(Boolean);
    const isMine = (sec: string) => {
      const assigned = cellConfig[sec];
      if (!assigned) return false; // don't auto-fill unassigned sections
      return userCells.includes(assigned);
    };
    const tryFill = (meta: SectionMeta, sec: string): SectionMeta => {
      if (!isMine(sec)) return meta;
      if (meta.updatedBy && meta.updatedBy !== name) return meta; // already filled by someone else — don't overwrite
      return { ...meta, updatedBy: name };
    };
    return {
      ...hd,
      ffMeta:             tryFill(hd.ffMeta, 'ff'),
      infraMeta:          tryFill(hd.infraMeta, 'infra'),
      trainsMeta:         tryFill(hd.trainsMeta, 'trains'),
      sanitationMeta:     tryFill(hd.sanitationMeta, 'sanitation'),
      commercialMeta:     tryFill(hd.commercialMeta, 'commercial'),
      parkingMeta:        tryFill(hd.parkingMeta, 'parking'),
      cateringMeta:       tryFill(hd.cateringMeta, 'catering'),
      primesMeta:         tryFill(hd.primesMeta, 'primes'),
      stationEarningMeta: tryFill(hd.stationEarningMeta, 'earning'),
      earningMeta:        tryFill(hd.earningMeta, 'ebif'),
      counterHeads: hd.counterHeads.map((ch, i) => ({
        ...ch,
        meta: tryFill(ch.meta, `ch:${i}`),
      })),
    };
  };

  // Check dialog: { sec: section-id, name: checker's name }
  const [checkDialog, setCheckDialog] = useState<{ sec: string; name: string } | null>(null);

  // ── Overview rows for autocomplete (from cached sheet in localStorage) ─────
  const [ovRows,    setOvRows]    = useState<Record<string,string>[]>([]);
  const [ovHeaders, setOvHeaders] = useState<string[]>([]);
  const [sugg,      setSugg]      = useState<Record<string,string>[]>([]);
  const [suggField, setSuggField] = useState<'code'|'name'|null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    // Try localStorage first (fast)
    try {
      const raw = localStorage.getItem('sheet_nsg_category_wise_cache');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed?.rows?.length) {
          setOvRows(parsed.rows);
          setOvHeaders(parsed.headers ?? []);
          return;
        }
      }
    } catch { /* ignore */ }
    // Fallback: read from Upstash (cross-device, fires on fresh devices)
    import('@/lib/config/sharedSync').then(({ sharedRead }) => {
      sharedRead('sheet_nsg_category_wise_cache').then((val: unknown) => {
        if (!val || typeof val !== 'object') return;
        const cached = val as { rows: unknown[]; headers: string[] };
        if (!Array.isArray(cached.rows) || cached.rows.length === 0) return;
        setOvRows(cached.rows as Record<string, string>[]);
        setOvHeaders(cached.headers ?? []);
      }).catch(() => {});
    }).catch(() => {});
  }, [editing]);

  const colCode = useMemo(() => findCol(ovHeaders, 'code'),     [ovHeaders]);
  const colName = useMemo(() => {
    // Try 'name' first (covers "Station Name", "Name")
    const byName = findCol(ovHeaders, 'name');
    if (byName) return byName;
    // Fallback: column called "Station" (exact or containing) but NOT containing "code"
    return ovHeaders.find(h => {
      const hl = h.toLowerCase();
      return hl.includes('station') && !hl.includes('code');
    }) ?? '';
  }, [ovHeaders]);
  const colCat  = useMemo(() => findCol(ovHeaders, 'categor'),  [ovHeaders]);
  const colState= useMemo(() => findCol(ovHeaders, 'state'),    [ovHeaders]);
  const colSec  = useMemo(() => findCol(ovHeaders, 'section'),  [ovHeaders]);
  const colCMI  = useMemo(() => findCol(ovHeaders, 'cmi'),      [ovHeaders]);

  // ── Unique CMI values from Overview sheet (replaces hardcoded station list) ─
  const uniqueOvCMIs = useMemo(() => {
    if (!colCMI || !ovRows.length) return [];
    return [...new Set(ovRows.map(r => String(r[colCMI] ?? '').trim()).filter(Boolean))].sort();
  }, [ovRows, colCMI]);

  const searchRows = (field: 'code'|'name', query: string) => {
    if (!query || query.length < 1) return [];
    const q = query.toLowerCase();
    const col = field === 'code' ? colCode : colName;
    if (!col) return [];
    return ovRows.filter(r => String(r[col] ?? '').toLowerCase().includes(q)).slice(0, 6);
  };

  const applyRow = (row: Record<string,string>) => {
    setD(p => ({
      ...p,
      stationCode: colCode  ? String(row[colCode]  ?? p.stationCode)  : p.stationCode,
      stationName: colName  ? String(row[colName]  ?? p.stationName)  : p.stationName,
      category:    colCat   ? String(row[colCat]   ?? p.category)     : p.category,
      state:       colState ? String(row[colState] ?? p.state)        : p.state,
      section:     colSec   ? String(row[colSec]   ?? p.section)      : p.section,
      cmi:         colCMI   ? String(row[colCMI]   ?? p.cmi)          : p.cmi,
    }));
    setSugg([]);
    setSuggField(null);
  };

  // ── Save — stamp section dates, persist to widget + global store ──────────
  const persistHD = (h: HD) => {
    onUpdate({ handoutData: h } as any);
    const code = h.stationCode?.toUpperCase().trim();
    if (code) {
      import('@/lib/config/sharedSync').then(({ sharedWrite, sharedRead }) => {
        // 1. Save the handout data itself (cross-device)
        sharedWrite(`handout_${code}`, h);
        // 2. Maintain an index of all saved codes so HandoutDirectoryTab can enumerate them
        sharedRead('handout_codes').then((existing: unknown) => {
          const codes: string[] = Array.isArray(existing) ? existing : [];
          if (!codes.includes(code)) {
            sharedWrite('handout_codes', [...codes, code]);
          }
        }).catch(() => {
          sharedWrite('handout_codes', [code]);
        });
      }).catch(() => {});
    }
  };

  const save = () => {
    const today = todayDDMMYYYY();
    const prev = ((widget as any).handoutData ?? {}) as Partial<HD>;
    // Stamp updatedAt today only when updatedBy name changed or date was missing
    const stamp = (cur: SectionMeta, p?: SectionMeta): SectionMeta => {
      if (!cur.updatedBy) return cur;
      if (cur.updatedBy !== (p?.updatedBy ?? '') || !cur.updatedAt)
        return { ...cur, updatedAt: today };
      return cur;
    };
    const stamped: HD = {
      ...d,
      ffMeta:             stamp(d.ffMeta,             prev.ffMeta),
      infraMeta:          stamp(d.infraMeta,           prev.infraMeta),
      trainsMeta:         stamp(d.trainsMeta,          prev.trainsMeta),
      sanitationMeta:     stamp(d.sanitationMeta,      prev.sanitationMeta),
      commercialMeta:     stamp(d.commercialMeta,      prev.commercialMeta),
      parkingMeta:        stamp(d.parkingMeta,         prev.parkingMeta),
      cateringMeta:       stamp(d.cateringMeta,        prev.cateringMeta),
      primesMeta:         stamp(d.primesMeta,          prev.primesMeta),
      stationEarningMeta: stamp(d.stationEarningMeta,  prev.stationEarningMeta),
      earningMeta:        stamp(d.earningMeta,         prev.earningMeta),
      counterHeads: d.counterHeads.map((ch, i) => ({
        ...ch,
        meta: stamp(ch.meta, prev.counterHeads?.[i]?.meta),
      })),
    };
    // Auto-compute "As on" date from the most recent updatedAt across all sections
    const finalD: HD = { ...stamped, date: computeAsOnDate(stamped) };
    setD(finalD);
    persistHD(finalD);
    setEditing(false);
  };

  // ── Save check (cell incharge / CMI, without opening edit mode) ───────────
  const saveCheck = (sec: string, name: string) => {
    if (!name.trim()) return;
    const today = todayDDMMYYYY();
    const n = name.trim();
    let next: HD = { ...d };
    if (sec === 'cmi') {
      next = { ...d, cmiCheckedBy: n, cmiCheckedAt: today };
    } else if (sec === 'ff') {
      next = { ...d, ffMeta: { ...d.ffMeta, checkedBy: n, checkedAt: today } };
    } else if (sec === 'infra') {
      next = { ...d, infraMeta: { ...d.infraMeta, checkedBy: n, checkedAt: today } };
    } else if (sec === 'trains') {
      next = { ...d, trainsMeta: { ...d.trainsMeta, checkedBy: n, checkedAt: today } };
    } else if (sec === 'sanitation') {
      next = { ...d, sanitationMeta: { ...d.sanitationMeta, checkedBy: n, checkedAt: today } };
    } else if (sec === 'commercial') {
      next = { ...d, commercialMeta: { ...d.commercialMeta, checkedBy: n, checkedAt: today } };
    } else if (sec === 'parking') {
      next = { ...d, parkingMeta: { ...d.parkingMeta, checkedBy: n, checkedAt: today } };
    } else if (sec === 'catering') {
      next = { ...d, cateringMeta: { ...d.cateringMeta, checkedBy: n, checkedAt: today } };
    } else if (sec === 'primes') {
      next = { ...d, primesMeta: { ...d.primesMeta, checkedBy: n, checkedAt: today } };
    } else if (sec === 'earning') {
      next = { ...d, stationEarningMeta: { ...d.stationEarningMeta, checkedBy: n, checkedAt: today } };
    } else if (sec === 'ebif') {
      next = { ...d, earningMeta: { ...d.earningMeta, checkedBy: n, checkedAt: today } };
    } else if (sec.startsWith('ch:')) {
      const idx = parseInt(sec.slice(3));
      const chs = d.counterHeads.map((ch, i) =>
        i === idx ? { ...ch, meta: { ...ch.meta, checkedBy: n, checkedAt: today } } : ch
      );
      next = { ...d, counterHeads: chs };
    }
    setD(next);
    persistHD(next);
    setCheckDialog(null);
  };

  /** Open edit mode: auto-fill names for the logged-in user's sections */
  const startEditing = () => {
    setD(prev => autoFillNames(prev));
    setEditing(true);
  };

  const cancel = () => { setD(((widget as any).handoutData as HD | undefined) ?? mkHD()); setEditing(false); };
  const upd    = (patch: Partial<HD>) => setD(p => ({ ...p, ...patch }));

  // ── Print / Export ────────────────────────────────────────────────────────
  const handlePrint = () => {
    const win = window.open('', '_blank', 'width=900,height=700');
    if (!win) return;
    const esc = (s: unknown) => String(s ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
    const has2d = (m: string[][]) => m.some(r => r.some(v => v));

    // ── Footfall / Trains matrix table ──
    const matrixTable = (title: string, cols: string[], rows: string[], data: string[][]) => {
      if (!has2d(data)) return '';
      const head = `<tr><th></th>${cols.map(c=>`<th>${esc(c)}</th>`).join('')}</tr>`;
      const body = rows.map((r,i)=>`<tr${i===rows.length-1?' class="tot"':''}><td class="rl">${esc(r)}</td>${data[i].map(c=>`<td>${esc(c)||'—'}</td>`).join('')}</tr>`).join('');
      return `<div class="section"><h2>${esc(title)}</h2><table>${head}${body}</table></div>`;
    };

    // ── Infrastructure ──
    let infra = '';
    if (d.platforms || d.fob || d.waitingRooms) {
      let pf = '';
      const grid = d.platforms ? parsePlatformGrid(d.platforms) : null;
      if (grid) {
        pf = `<table class="plat">${grid.map((row,ri)=>`<tr${ri===0?' class="pfhdr"':''}><td class="rl">${esc(row.label)}</td>${row.cells.map(c=>`<td>${esc(c)||'—'}</td>`).join('')}</tr>`).join('')}</table>`;
      } else if (d.platforms) {
        pf = `<div class="kv"><b>Platforms:</b> ${esc(d.platforms)}</div>`;
      }
      const fobWr = [['FOB',d.fob],['Waiting Rooms',d.waitingRooms]].filter(([,v])=>v)
        .map(([l,v])=>`<div class="kv"><b>${esc(l)}:</b> ${esc(v).replace(/\n/g,'<br>')}</div>`).join('');
      infra = `<div class="section"><h2>Infrastructure</h2>${pf}${fobWr}</div>`;
    }

    // ── Counters ──
    let counters = '';
    const chVis = d.counterHeads.filter(ch=>ch.name||ch.total||ch.M||ch.E||ch.N||(ch.sides&&ch.sides.length));
    if (chVis.length) {
      const cells = chVis.map(ch=>{
        let shift = '';
        if (ch.sides && ch.sides.length) {
          const hdr = `<tr>${ch.sideMode==='count'?'':'<td class="sc"></td>'}${ch.sides.map(sd=>`<td class="sh">${esc(sd.label)}</td>`).join('')}</tr>`;
          let rows = '';
          if (ch.sideMode==='count') {
            rows = `<tr>${ch.sides.map(sd=>`<td>${esc(sd.count)||'—'}</td>`).join('')}</tr>`;
          } else {
            rows = (['M','E','N'] as const).map(s=>`<tr><td class="sc">${s}</td>${ch.sides!.map(sd=>`<td>${esc(sd[s])||'—'}</td>`).join('')}</tr>`).join('');
          }
          shift = `<table class="sd">${hdr}${rows}</table>`;
        } else {
          shift = (['M','E','N'] as const).filter(s=>ch[s]).map(s=>`<div class="mn">${s} - ${esc(ch[s])}</div>`).join('');
        }
        const mp = (ch.mpSanctioned||ch.mpOnRoll||ch.mpActual)
          ? `<div class="mp"><b>Manpower</b>${ch.mpSanctioned?`<div>S: ${esc(ch.mpSanctioned)}</div>`:''}${ch.mpOnRoll?`<div>OR: ${esc(ch.mpOnRoll)}</div>`:''}${ch.mpActual?`<div>AW: ${esc(ch.mpActual)}</div>`:''}</div>` : '';
        const ef = (ch.extraFields||[]).filter(e=>e.key||e.value).map(e=>`<div class="mn">${e.key?`${esc(e.key)}: `:''}${esc(e.value)}</div>`).join('');
        return `<div class="ch"><div class="ch-name">${esc(ch.name)}${ch.total?` - ${esc(ch.total)}`:''}</div>${shift}${mp}${ef}</div>`;
      }).join('');
      counters = `<div class="section"><h2>Counters (M-Morning · E-Evening · N-Night)</h2><div class="counters">${cells}</div></div>`;
    }

    // ── Commercial earnings (bulleted status) ──
    let commercial = '';
    const ciVis = d.commercial.filter(ci=>ci.name||ci.earning||ci.status);
    if (ciVis.length) {
      const rows = ciVis.map(ci=>{
        const pts = (ci.status||'').split('\n').map(s=>s.trim()).filter(Boolean);
        const status = pts.length>1
          ? `<ul>${pts.map(p=>`<li>${esc(p.replace(/^\d{1,2}[.)]\s*/,''))}</li>`).join('')}</ul>`
          : esc(ci.status||'—');
        return `<tr><td class="rl">${esc(ci.name)}</td><td class="ern">${ci.earning?`₹ ${esc(ci.earning.replace(/^₹\s*/,''))}`:'—'}</td><td>${status}</td></tr>`;
      }).join('');
      commercial = `<div class="section"><h2>Commercial Earnings (₹ lakhs PA)</h2><table class="comm"><tr><th>Item</th><th>Earning</th><th>Status</th></tr>${rows}</table></div>`;
    }

    // ── PRIMES / Station Earning ──
    const primesTable = (title: string, data: string[][]) => {
      if (!has2d(data)) return '';
      const cols = ['Tickets/day','Passengers/day','Earning/day'];
      const head = `<tr><th></th>${cols.map(c=>`<th>${c}</th>`).join('')}</tr>`;
      const rl = ['UTS','PRS','Total'];
      const body = rl.map((r,i)=>`<tr${i===2?' class="tot"':''}><td class="rl">${r}</td>${data[i].map(c=>`<td>${esc(c)||'—'}</td>`).join('')}</tr>`).join('');
      return `<div class="section"><h2>${esc(title)}</h2><table>${head}${body}</table></div>`;
    };

    const bif = d.earningBifurcation
      ? `<div class="section"><h2>Earning Bifurcation</h2><div class="kv mono">${esc(d.earningBifurcation).replace(/\n/g,'<br>')}</div></div>` : '';
    const sanit = d.sanitation
      ? `<div class="section"><h2>Sanitation</h2><div class="kv">${esc(d.sanitation).replace(/\n/g,'<br>')}</div></div>` : '';

    const body = [
      matrixTable('Footfall / Day', FF_COLS, FF_ROWS, d.ff),
      matrixTable('Trains / Day', TR_COLS, TR_ROWS, d.trains),
      infra,
      counters,
      sanit,
      commercial,
      primesTable('PRIMES Data', d.primes),
      primesTable('Counter / Station Earning', d.stationEarning),
      bif,
    ].join('');

    win.document.write(`<!DOCTYPE html><html><head><title>Handout - ${esc(d.stationName || d.stationCode)}</title>
<style>
  @page{size:A4;margin:8mm;}
  *{box-sizing:border-box;}
  body{font-family:Arial,Helvetica,sans-serif;font-size:10px;color:#1e293b;margin:0;padding:0;}
  h1{font-size:15px;margin:0 0 3px;}
  h2{font-size:11px;font-weight:bold;margin:8px 0 3px;text-transform:uppercase;letter-spacing:.04em;color:#b45309;border-bottom:1px solid #fcd34d;padding-bottom:1px;}
  table{border-collapse:collapse;width:100%;margin:0 0 6px;}
  th{background:#d97706;color:#fff;padding:3px 5px;border:1px solid #b45309;font-size:9px;text-align:center;}
  td{padding:3px 5px;border:1px solid #fcd34d;font-size:9px;text-align:center;}
  td.rl{text-align:left;font-weight:600;background:#fffbeb;white-space:nowrap;}
  tr.tot td{background:#fef3c7;font-weight:bold;}
  table.plat td, table.comm td{font-size:9px;}
  table.plat tr.pfhdr td{background:#fef3c7;font-weight:bold;}
  table.comm th:last-child, table.comm td:last-child{text-align:left;}
  table.comm td:nth-child(2){white-space:nowrap;}
  table.comm ul{margin:0;padding-left:14px;} table.comm li{margin:1px 0;}
  .header{background:#d97706;color:#fff;padding:8px 12px;border-radius:6px;margin-bottom:8px;}
  .header h1{color:#fff;} .header p{color:#fde68a;margin:2px 0;font-size:9px;}
  .section{margin-bottom:6px;page-break-inside:avoid;}
  .kv{background:#fffbeb;border:1px solid #fcd34d;border-radius:4px;padding:4px 6px;margin-bottom:4px;}
  .kv b{color:#b45309;}
  .mono{font-family:'Courier New',monospace;}
  .counters{display:flex;flex-wrap:wrap;border:1px solid #fcd34d;border-radius:4px;overflow:hidden;}
  .ch{flex:1;min-width:110px;padding:4px 6px;border-right:1px solid #fcd34d;border-bottom:1px solid #fcd34d;}
  .ch-name{font-weight:bold;color:#b45309;font-size:10px;text-align:center;background:#fef3c7;border-radius:3px;padding:1px 2px;margin-bottom:2px;}
  table.sd{width:100%;margin:0;} table.sd td{padding:1px 3px;font-size:8px;}
  table.sd td.sh{background:#fef3c7;color:#b45309;font-weight:bold;}
  table.sd td.sc{color:#94a3b8;border:none;}
  .mn{font-size:9px;color:#475569;}
  .mp{margin-top:3px;padding-top:2px;border-top:1px solid #fde68a;font-size:8px;color:#64748b;}
  .mp b{display:block;color:#94a3b8;text-transform:uppercase;font-size:7px;}
  @media print{button{display:none;}}
</style></head><body>
<div class="header"><h1>${esc(d.stationName)}${d.stationCode?` (${esc(d.stationCode)})`:''}</h1>
<p>${[d.category,d.state,d.section].filter(Boolean).map(esc).join(' · ')}</p>
<p>${esc(d.division)}${d.date?` · As on ${esc(d.date)}`:''}</p></div>
${body}
<script>window.onload=()=>{window.print();window.close();}</script>
</body></html>`);
    win.document.close();
  };

  const handleExportCSV = () => {
    const rows: string[][] = [
      ['Station Handout', d.stationName, d.stationCode],
      ['Category', d.category, 'State', d.state, 'Section', d.section, 'CMI', d.cmi],
      ['Division', d.division, 'As on', d.date],
      [],
      ['--- FOOTFALL ---'],
      ['Type', 'Outward', 'Inward', 'PF', 'Total'],
      ['UTS', ...d.ff[0]], ['PRS', ...d.ff[1]], ['Total', ...d.ff[2]],
      [],
      ['--- TRAINS ---'],
      ['Type', 'Orig', 'Term', 'Passing', 'Total'],
      ['Mail/Exp', ...d.trains[0]], ['Passenger', ...d.trains[1]], ['Total', ...d.trains[2]],
      [],
      ['--- COUNTERS ---'],
      ['Head','Total','M','E','N','MP-Sanctioned','MP-OnRoll','MP-Actual'],
      ...d.counterHeads.map(ch=>[ch.name,ch.total,ch.M,ch.E,ch.N,ch.mpSanctioned,ch.mpOnRoll,ch.mpActual]),
      [],
      ['--- COMMERCIAL EARNINGS (₹ lakhs PA) ---'],
      ['Item','Earning','Status'],
      ...d.commercial.map(ci=>[ci.name,ci.earning,ci.status]),
      [],
      ['--- PRIMES ---'],
      ['Type','Tickets/day','Passengers/day','Earning/day'],
      ...d.primes.map((row,i)=>[['UTS','PRS','Total'][i],...row]),
      [],
      ['--- STATION EARNING ---'],
      ...d.stationEarning.map((row,i)=>[['UTS','PRS','Total'][i],...row]),
      [],
      ['--- EARNING BIFURCATION ---'],
      [d.earningBifurcation],
    ];
    const csv = rows.map(r => r.map(c => `"${String(c??'').replace(/"/g,'""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `handout_${d.stationCode||'station'}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  // ── Word export (.doc via HTML) ───────────────────────────────────────────
  const handleExportWord = () => {
    const stn = d.stationName || d.stationCode || 'Handout';
    const html = `<html xmlns:o='urn:schemas-microsoft-com:office:office'
      xmlns:w='urn:schemas-microsoft-com:office:word'
      xmlns='http://www.w3.org/TR/REC-html40'>
<head><meta charset='utf-8'><title>${stn}</title>
<style>
  body{font-family:Arial,sans-serif;font-size:11pt;margin:20mm;}
  h1{font-size:16pt;color:#d97706;}h2{font-size:12pt;color:#92400e;border-bottom:1px solid #d97706;padding-bottom:3pt;}
  table{border-collapse:collapse;width:100%;margin-bottom:10pt;}
  th{background:#d97706;color:#fff;padding:4pt 6pt;border:1pt solid #b45309;}
  td{padding:4pt 6pt;border:1pt solid #d1d5db;}
  .meta{font-size:9pt;color:#6b7280;margin-top:2pt;}
</style></head><body>
<h1>${stn}${d.stationCode ? ` (${d.stationCode})` : ''}</h1>
<p>${[d.category,d.state,d.section,d.cmi?`CMI: ${d.cmi}`:'',d.division].filter(Boolean).join(' · ')}</p>
${d.date?`<p><b>As on:</b> ${d.date}</p>`:''}
${d.cmiCheckedBy?`<p><b>CMI Checked by:</b> ${d.cmiCheckedBy}${d.cmiCheckedAt?` (${d.cmiCheckedAt})`:''}</p>`:''}

<h2>Footfall / Day</h2>
<table><tr><th>Type</th><th>Outward</th><th>Inward</th><th>PF</th><th>Total</th></tr>
${['UTS','PRS','Total'].map((r,i)=>`<tr><td><b>${r}</b></td>${d.ff[i].map(v=>`<td>${v||'-'}</td>`).join('')}</tr>`).join('')}
</table>${d.ffMeta?.updatedBy?`<p class="meta">✎ ${d.ffMeta.updatedBy}${d.ffMeta.updatedAt?` (${d.ffMeta.updatedAt})`:''}</p>`:''}

<h2>Infrastructure</h2>
<table><tr><th>Platforms</th><th>FOB</th><th>Waiting Rooms</th></tr>
<tr><td>${d.platforms||'-'}</td><td>${d.fob||'-'}</td><td>${d.waitingRooms||'-'}</td></tr></table>

<h2>Trains / Day</h2>
<table><tr><th>Type</th><th>Originating</th><th>Terminating</th><th>Passing</th><th>Total</th></tr>
${['Mail/Exp','Passenger','Total'].map((r,i)=>`<tr><td><b>${r}</b></td>${d.trains[i].map(v=>`<td>${v||'-'}</td>`).join('')}</tr>`).join('')}
</table>

<h2>Counter Heads</h2>
<table><tr><th>Counter</th><th>Total</th><th>M</th><th>E</th><th>N</th><th>MP Sanc.</th><th>MP OnRoll</th><th>MP Actual</th></tr>
${d.counterHeads.map(ch=>`<tr><td>${ch.name}</td><td>${ch.total||'-'}</td><td>${ch.M||'-'}</td><td>${ch.E||'-'}</td><td>${ch.N||'-'}</td><td>${ch.mpSanctioned||'-'}</td><td>${ch.mpOnRoll||'-'}</td><td>${ch.mpActual||'-'}</td></tr>`).join('')}
</table>

<h2>Sanitation</h2><p>${d.sanitation||'-'}</p>
<h2>Commercial Earnings (₹ lakhs PA)</h2>
<table><tr><th>Item</th><th>Earning</th><th>Status</th></tr>
${d.commercial.map(ci=>`<tr><td>${ci.name}</td><td>${ci.earning||'-'}</td><td>${ci.status||'-'}</td></tr>`).join('')}
</table>
${d.parking?`<h2>Parking</h2><p>${d.parking}</p>`:''}
${d.catering?`<h2>Catering</h2><p>${d.catering}</p>`:''}

<h2>PRIMES</h2>
<table><tr><th>Type</th><th>Tickets/day</th><th>Passengers/day</th><th>Earning/day</th></tr>
${['UTS','PRS','Total'].map((r,i)=>`<tr><td><b>${r}</b></td>${d.primes[i].map(v=>`<td>${v||'-'}</td>`).join('')}</tr>`).join('')}
</table>

<h2>Station Earning</h2>
<table><tr><th>Type</th><th>Col1</th><th>Col2</th><th>Col3</th></tr>
${['UTS','PRS','Total'].map((r,i)=>`<tr><td><b>${r}</b></td>${d.stationEarning[i].map(v=>`<td>${v||'-'}</td>`).join('')}</tr>`).join('')}
</table>
${d.earningBifurcation?`<h2>Earning Bifurcation</h2><p>${d.earningBifurcation}</p>`:''}
</body></html>`;
    const blob = new Blob(['﻿', html], { type: 'application/msword' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url; a.download = `handout_${d.stationCode||'station'}.doc`; a.click();
    URL.revokeObjectURL(url);
  };

  // ── Excel export (.xls via HTML table) ────────────────────────────────────
  const handleExportExcel = () => {
    const stn = d.stationName || d.stationCode || 'Handout';
    const sheet = (title: string, rows: string[][]) =>
      `<h3 style='color:#d97706'>${title}</h3><table border='1' style='border-collapse:collapse;font-size:10pt;'>`
      + rows.map((r,ri) =>
          `<tr>${r.map(c => ri===0
            ? `<th style='background:#d97706;color:#fff;padding:4pt 6pt'>${c}</th>`
            : `<td style='padding:4pt 6pt'>${c||''}</td>`).join('')}</tr>`
        ).join('') + '</table><br/>';
    const html = `<html xmlns:o='urn:schemas-microsoft-com:office:office'
      xmlns:x='urn:schemas-microsoft-com:office:excel'
      xmlns='http://www.w3.org/TR/REC-html40'>
<head><meta charset='utf-8'><title>${stn}</title></head><body>
<h2>${stn} — Station Handout${d.date?` (As on ${d.date})`:''}</h2>
${sheet('Footfall / Day',[
  ['Type','Outward','Inward','PF','Total'],
  ...['UTS','PRS','Total'].map((r,i)=>[r,...d.ff[i]]),
])}
${sheet('Trains / Day',[
  ['Type','Originating','Terminating','Passing','Total'],
  ...['Mail/Exp','Passenger','Total'].map((r,i)=>[r,...d.trains[i]]),
])}
${sheet('Counter Heads',[
  ['Counter','Total','M','E','N','MP Sanc.','MP OnRoll','MP Actual'],
  ...d.counterHeads.map(ch=>[ch.name,ch.total,ch.M,ch.E,ch.N,ch.mpSanctioned,ch.mpOnRoll,ch.mpActual]),
])}
${sheet('Commercial Earnings',[
  ['Item','Earning (₹ lakhs PA)','Status'],
  ...d.commercial.map(ci=>[ci.name,ci.earning,ci.status]),
])}
${sheet('PRIMES',[
  ['Type','Tickets/day','Passengers/day','Earning/day'],
  ...['UTS','PRS','Total'].map((r,i)=>[r,...d.primes[i]]),
])}
${sheet('Station Earning',[
  ['Type','Col1','Col2','Col3'],
  ...['UTS','PRS','Total'].map((r,i)=>[r,...d.stationEarning[i]]),
])}
</body></html>`;
    const blob = new Blob(['﻿', html], { type: 'application/vnd.ms-excel' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url; a.download = `handout_${d.stationCode||'station'}.xls`; a.click();
    URL.revokeObjectURL(url);
  };

  // ── Data Sources helpers ───────────────────────────────────────────────────
  const [showDataSources,    setShowDataSources]    = useState(false);
  const [showExportMenu,     setShowExportMenu]      = useState(false);
  const [dsPreview, setDsPreview] = useState<{id: string; text: string; error?: boolean} | null>(null);
  const [newSrc, setNewSrc] = useState<{type: DataSource['type']; url: string; label: string}>(
    { type: 'sheets', url: '', label: '' }
  );

  /** Convert any Google Sheets share/edit URL to a published CSV export URL */
  function toCSVUrl(url: string): string | null {
    const m = url.match(/\/d\/([a-zA-Z0-9-_]+)/);
    if (!m) return null;
    const gid = url.match(/[?&]gid=(\d+)/)?.[1] ?? '0';
    return `https://docs.google.com/spreadsheets/d/${m[1]}/pub?gid=${gid}&single=true&output=csv`;
  }

  const addDataSource = () => {
    if (!newSrc.url) return;
    const src: DataSource = { id: Date.now().toString(), ...newSrc,
      label: newSrc.label || (newSrc.type === 'sheets' ? 'Google Sheet'
            : newSrc.type === 'docs' ? 'Google Doc'
            : newSrc.type === 'pdf'  ? 'PDF' : 'Source') };
    const updated = { ...d, dataSources: [...d.dataSources, src] };
    setD(updated);
    onUpdate({ ...widget, handoutData: updated } as any);
    setNewSrc({ type: 'sheets', url: '', label: '' });
  };
  const removeDataSource = (id: string) => {
    const updated = { ...d, dataSources: d.dataSources.filter(s => s.id !== id) };
    setD(updated);
    onUpdate({ ...widget, handoutData: updated } as any);
  };
  const fetchDataSource = async (src: DataSource) => {
    if (src.type === 'sheets') {
      const csvUrl = toCSVUrl(src.url);
      if (!csvUrl) {
        setDsPreview({ id: src.id, text: '⚠ Could not parse Sheet URL.', error: true });
        return;
      }
      try {
        const r = await fetch(csvUrl);
        if (!r.ok) throw new Error('HTTP ' + r.status);
        const txt = await r.text();
        setDsPreview({ id: src.id, text: txt.slice(0, 800) + (txt.length > 800 ? '\n…' : '') });
      } catch {
        setDsPreview({ id: src.id, text: '⚠ Could not fetch. Make sure the sheet is published:\nFile → Share → Publish to web → CSV.', error: true });
      }
    } else {
      window.open(src.url, '_blank');
    }
  };
  const SRC_ICONS: Record<DataSource['type'], string> = {
    sheets: '📊', docs: '📄', pdf: '📕', other: '🔗',
  };

  // ── Fetch & Fill from Google Doc ──────────────────────────────────────────
  const [fetchingDocId, setFetchingDocId] = useState<string | null>(null);

  const fetchAndFillFromDoc = async (src: DataSource) => {
    const exportUrl = toDocHtmlUrl(src.url);
    if (!exportUrl) {
      setDsPreview({ id: src.id, text: '⚠ Invalid Google Doc URL. Use the standard docs.google.com/document/d/... link.', error: true });
      return;
    }
    setFetchingDocId(src.id);
    setDsPreview(null);
    try {
      const res = await fetch(`/api/fetch-doc?url=${encodeURIComponent(exportUrl)}`);
      const data: { content?: string; error?: string } = await res.json();
      if (!res.ok || data.error) throw new Error(data.error ?? `HTTP ${res.status}`);

      const rawHtml = data.content ?? '';

      // Detect Google login redirect (document not publicly shared)
      if (rawHtml.includes('accounts.google.com') || rawHtml.includes('ServiceLogin') ||
          rawHtml.includes('signin/oauth') || (rawHtml.length < 5000 && /sign.?in/i.test(rawHtml))) {
        setDsPreview({
          id: src.id,
          text: '⚠ Google is asking for sign-in — the document is not publicly shared.\n\nFix: In Google Docs → Share → "Anyone with the link" → Viewer → Copy link, then paste that URL here.',
          error: true,
        });
        setFetchingDocId(null);
        return;
      }

      const extracted = parseDocForHandout(rawHtml, d.stationCode ?? '');

      // Debug: count HR blocks and section marks for diagnostics
      const hrCount   = (rawHtml.match(/<hr[^>]*\/?>/gi) ?? []).length;
      const stationHtml = (() => {
        if (!d.stationCode) return rawHtml;
        const codeRe = new RegExp(`\\(\\s*${d.stationCode}\\s*\\)`, 'i');
        for (const blk of rawHtml.split(/<hr[^>]*\/?>/gi)) { if (codeRe.test(blk)) return blk; }
        return rawHtml;
      })();
      const wt = _htmlToText(stationHtml);
      // Use the SAME keyword-anchored splitter the parser uses (numbers may be
      // CSS-generated and absent from text) so the debug count is accurate.
      const secMatches = Object.keys(_splitNumberedSections(wt)).map(Number).sort((a,b)=>a-b);
      const debugInfo = `[debug] htmlLen=${rawHtml.length} hrBlocks=${hrCount+1} stationIsolated=${hrCount > 0 && !!d.stationCode} sections=[${secMatches.join(',')}] textPreview: ${wt.slice(0, 120).replace(/\n/g,' ↵ ')}…`;

      // Count non-empty extracted fields (including arrays)
      const filledKeys = Object.keys(extracted).filter(k => {
        const v = (extracted as Record<string,unknown>)[k];
        return v !== undefined && v !== ''
          && !(Array.isArray(v) && v.length === 0);
      });

      if (filledKeys.length === 0) {
        setDsPreview({
          id: src.id,
          text: `⚠ No handout fields found in this document.\n\nTips:\n• Share the doc with "Anyone with the link can view"\n• Make sure your doc uses the standard CMI numbered-section format\n  (1 Category, 2 Footfall/day, 3 Platforms … 14 ATM)\n\n${debugInfo}`,
          error: true,
        });
      } else {
        // Build preview summary
        const previewLines: string[] = [];
        const simpleKeys: (keyof DocFields)[] = ['stationCode','stationName','category','state','section','cmi','division','platforms','fob','waitingRooms','sanitation','earningBifurcation'];
        simpleKeys.forEach(k => { if (extracted[k]) previewLines.push(`${k}: ${extracted[k]}`); });
        if (extracted.ff)             previewLines.push('ff (footfall): ✓ parsed');
        if (extracted.trains)         previewLines.push('trains: ✓ parsed');
        if (extracted.primes)         previewLines.push('primes: ✓ parsed');
        if (extracted.stationEarning) previewLines.push('stationEarning: ✓ parsed');
        if (extracted.counterHeads?.length) previewLines.push(`counterHeads: ${extracted.counterHeads.length} counter(s)`);
        if (extracted.commercial?.length)   previewLines.push(`commercial: ${extracted.commercial.length} item(s) (${extracted.commercial.map(c=>c.name).join(', ')})`);

        setDsPreview({ id: src.id, text: `✅ Filled ${filledKeys.length} field(s) from document:\n\n${previewLines.join('\n')}\n\n${debugInfo}` });

        // Merge: simple string fields + guarded array fields
        const merged: HD = { ...d };
        simpleKeys.forEach(k => { if (extracted[k]) (merged as Record<string,unknown>)[k] = extracted[k]; });
        if (extracted.ff)                   merged.ff             = extracted.ff;
        if (extracted.trains)               merged.trains         = extracted.trains;
        if (extracted.primes)               merged.primes         = extracted.primes;
        if (extracted.stationEarning)       merged.stationEarning = extracted.stationEarning;
        // Merge counters by name so user-added rows (e.g. a manually-added
        // "Enquiry") are preserved and updated rather than wiped out.
        if (extracted.counterHeads?.length) {
          const byName = new Map<string, CounterHead>();
          for (const ch of d.counterHeads) if (ch.name?.trim()) byName.set(ch.name.trim().toLowerCase(), ch);
          for (const ch of extracted.counterHeads) {
            const key = ch.name.trim().toLowerCase();
            const existing = byName.get(key);
            // For a matched counter, let freshly-parsed side data win (clears
            // any stale empty AG/PG columns the user added before fetching).
            byName.set(key, existing ? { ...existing, ...ch, extraFields: existing.extraFields, sides: ch.sides, sideMode: ch.sideMode } : ch);
          }
          // Keep any blank user rows too (rows with no name), appended at the end.
          const named = [...byName.values()];
          const blanks = d.counterHeads.filter(ch => !ch.name?.trim());
          merged.counterHeads = [...named, ...blanks];
        }
        if (extracted.commercial?.length)   merged.commercial     = extracted.commercial;

        setD(merged);
        persistHD(merged);
      }
    } catch (e) {
      setDsPreview({
        id: src.id,
        text: `⚠ ${e instanceof Error ? e.message : String(e)}\n\nMake sure the document is shared with "Anyone with the link can view".`,
        error: true,
      });
    }
    setFetchingDocId(null);
  };

  const updFF  = (r: number, c: number, v: string) => setD(p => { const a = p.ff.map(x=>[...x]); a[r][c]=v; return {...p, ff: a}; });
  const updTr  = (r: number, c: number, v: string) => setD(p => { const a = p.trains.map(x=>[...x]); a[r][c]=v; return {...p, trains: a}; });
  const updPr  = (r: number, c: number, v: string) => setD(p => { const a = p.primes.map(x=>[...x]); a[r][c]=v; return {...p, primes: a}; });
  const updSE  = (r: number, c: number, v: string) => setD(p => { const a = p.stationEarning.map(x=>[...x]); a[r][c]=v; return {...p, stationEarning: a}; });

  const updCH  = (i: number, patch: Partial<CounterHead>) =>
    setD(p => { const a=[...p.counterHeads]; a[i]={...a[i],...patch}; return {...p, counterHeads: a}; });
  const addCH  = () => setD(p => ({...p, counterHeads: [...p.counterHeads, mkCH()]}));
  const rmCH   = (i: number) => setD(p => ({...p, counterHeads: p.counterHeads.filter((_,j)=>j!==i)}));

  const addCHExtra = (i: number) =>
    setD(p => { const a=[...p.counterHeads]; a[i]={...a[i], extraFields:[...a[i].extraFields, {key:'',value:''}]}; return {...p, counterHeads: a}; });
  const updCHExtra = (i: number, fi: number, field: 'key'|'value', val: string) =>
    setD(p => { const a=[...p.counterHeads]; const ef=[...a[i].extraFields]; ef[fi]={...ef[fi],[field]:val}; a[i]={...a[i],extraFields:ef}; return {...p, counterHeads: a}; });
  const rmCHExtra  = (i: number, fi: number) =>
    setD(p => { const a=[...p.counterHeads]; a[i]={...a[i], extraFields:a[i].extraFields.filter((_,j)=>j!==fi)}; return {...p, counterHeads: a}; });

  // ── Optional per-side (AG / PG) shift columns on a counter head ──
  const addCHSide = (i: number) =>
    setD(p => {
      const a = [...p.counterHeads];
      const sides = [...(a[i].sides ?? [])];
      const defaults = ['AG Side', 'PG Side', 'Side 3', 'Side 4'];
      sides.push({ label: defaults[sides.length] ?? `Side ${sides.length + 1}`, M: '', E: '', N: '', count: '' });
      a[i] = { ...a[i], sides, sideMode: a[i].sideMode ?? 'shifts' };
      return { ...p, counterHeads: a };
    });
  const updCHSide = (i: number, si: number, patch: Partial<CounterSide>) =>
    setD(p => { const a=[...p.counterHeads]; const s=[...(a[i].sides??[])]; s[si]={...s[si],...patch}; a[i]={...a[i],sides:s}; return {...p, counterHeads: a}; });
  const rmCHSide = (i: number, si: number) =>
    setD(p => { const a=[...p.counterHeads]; const s=(a[i].sides??[]).filter((_,j)=>j!==si); a[i]={...a[i],sides:s.length?s:undefined, sideMode:s.length?a[i].sideMode:undefined}; return {...p, counterHeads: a}; });
  const setCHSideMode = (i: number, mode: 'shifts'|'count') =>
    setD(p => { const a=[...p.counterHeads]; a[i]={...a[i], sideMode: mode}; return {...p, counterHeads: a}; });

  const updCI  = (i: number, patch: Partial<CommercialItem>) =>
    setD(p => { const a=[...p.commercial]; a[i]={...a[i],...patch}; return {...p, commercial: a}; });
  const addCI  = () => setD(p => ({...p, commercial: [...p.commercial, mkCI()]}));
  const rmCI   = (i: number) => setD(p => ({...p, commercial: p.commercial.filter((_,j)=>j!==i)}));

  const FF_ROWS = ['UTS', 'PRS', 'Total'];
  const FF_COLS = ['Outward', 'Inward', 'PF', 'Total'];
  const TR_ROWS = ['Mail / Exp', 'Passenger', 'Total'];
  const TR_COLS = ['Orig.', 'Term.', 'Passing', 'Total'];
  const PR_ROWS = ['UTS', 'PRS', 'Total'];
  const PR_COLS = ['Tickets / day', 'Passengers / day', 'Earning / day'];

  // ── EDIT MODE ──────────────────────────────────────────────────────────────
  if (editing && canManage) return (
    <div className="space-y-5 text-xs">

      {/* ① Station Info */}
      <div>
        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1.5">Station Info</p>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">

          {/* Station Code — autocomplete */}
          <label className="flex flex-col gap-0.5 relative">
            <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide">Station Code</span>
            <input value={d.stationCode}
              onChange={e => { upd({stationCode:e.target.value}); setSugg(searchRows('code',e.target.value)); setSuggField('code'); }}
              onBlur={() => setTimeout(()=>setSugg([]),200)}
              onKeyDown={e => { if (e.key === 'Enter') e.currentTarget.blur(); }}
              placeholder="e.g. NDLS"
              className="bg-amber-50 border border-amber-200 rounded px-2 py-1 text-xs focus:outline-none focus:border-amber-400"/>
            {suggField==='code' && sugg.length>0 && (
              <div className="absolute top-full left-0 z-50 w-full bg-white border border-amber-200 rounded-lg shadow-lg overflow-hidden">
                {sugg.map((r,i)=>(
                  <button key={i} onMouseDown={()=>applyRow(r)}
                    className="w-full text-left px-3 py-1.5 text-[10px] hover:bg-amber-50 border-b border-amber-100 last:border-0">
                    <span className="font-bold text-amber-700">{colCode?String(r[colCode]??''):''}</span>
                    {colName&&r[colName]&&<span className="ml-1 text-slate-500">{String(r[colName])}</span>}
                    {colCat&&r[colCat]&&<span className="ml-1 text-[9px] text-slate-400">({String(r[colCat])})</span>}
                  </button>
                ))}
              </div>
            )}
          </label>

          {/* Station Name — autocomplete */}
          <label className="flex flex-col gap-0.5 relative">
            <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide">Station Name</span>
            <input value={d.stationName}
              onChange={e => { upd({stationName:e.target.value}); setSugg(searchRows('name',e.target.value)); setSuggField('name'); }}
              onBlur={() => setTimeout(()=>setSugg([]),200)}
              onKeyDown={e => { if (e.key === 'Enter') e.currentTarget.blur(); }}
              placeholder="e.g. New Delhi"
              className="bg-amber-50 border border-amber-200 rounded px-2 py-1 text-xs focus:outline-none focus:border-amber-400"/>
            {suggField==='name' && sugg.length>0 && (
              <div className="absolute top-full left-0 z-50 w-full bg-white border border-amber-200 rounded-lg shadow-lg overflow-hidden">
                {sugg.map((r,i)=>(
                  <button key={i} onMouseDown={()=>applyRow(r)}
                    className="w-full text-left px-3 py-1.5 text-[10px] hover:bg-amber-50 border-b border-amber-100 last:border-0">
                    <span className="font-bold text-amber-700">{colName?String(r[colName]??''):''}</span>
                    {colCode&&r[colCode]&&<span className="ml-1 text-slate-500">({String(r[colCode])})</span>}
                    {colCat&&r[colCat]&&<span className="ml-1 text-[9px] text-slate-400">{String(r[colCat])}</span>}
                  </button>
                ))}
              </div>
            )}
          </label>

          {/* Category */}
          <label className="flex flex-col gap-0.5">
            <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide">Category</span>
            <input value={d.category} onChange={e=>upd({category:e.target.value})} placeholder="e.g. NSG-1"
              onKeyDown={e=>{if(e.key==='Enter')e.currentTarget.blur();}}
              className="bg-amber-50 border border-amber-200 rounded px-2 py-1 text-xs focus:outline-none focus:border-amber-400"/>
          </label>

          {/* State */}
          <label className="flex flex-col gap-0.5">
            <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide">State</span>
            <input value={d.state} onChange={e=>upd({state:e.target.value})} placeholder="e.g. Delhi"
              onKeyDown={e=>{if(e.key==='Enter')e.currentTarget.blur();}}
              className="bg-amber-50 border border-amber-200 rounded px-2 py-1 text-xs focus:outline-none focus:border-amber-400"/>
          </label>

          {/* Section */}
          <label className="flex flex-col gap-0.5">
            <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide">Section</span>
            <input value={d.section} onChange={e=>upd({section:e.target.value})} placeholder="e.g. DLI-NDLS"
              onKeyDown={e=>{if(e.key==='Enter')e.currentTarget.blur();}}
              className="bg-amber-50 border border-amber-200 rounded px-2 py-1 text-xs focus:outline-none focus:border-amber-400"/>
          </label>

          {/* CMI */}
          <label className="flex flex-col gap-0.5">
            <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide">CMI</span>
            <input value={d.cmi} onChange={e=>upd({cmi:e.target.value})} placeholder="CMI name"
              onKeyDown={e=>{if(e.key==='Enter')e.currentTarget.blur();}}
              className="bg-amber-50 border border-amber-200 rounded px-2 py-1 text-xs focus:outline-none focus:border-amber-400"/>
          </label>

          {/* Date — auto-computed, read-only */}
          <label className="flex flex-col gap-0.5">
            <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide">As on Date</span>
            <div className="bg-amber-50/60 border border-amber-200 rounded px-2 py-1 text-xs text-slate-500 italic">
              {computeAsOnDate(d) || 'Auto-filled when sections are updated'}
            </div>
          </label>

          {/* Division — pre-filled */}
          <label className="flex flex-col gap-0.5">
            <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide">Division</span>
            <input value={d.division} onChange={e=>upd({division:e.target.value})} placeholder="Delhi Division"
              onKeyDown={e=>{if(e.key==='Enter')e.currentTarget.blur();}}
              className="bg-amber-50 border border-amber-200 rounded px-2 py-1 text-xs focus:outline-none focus:border-amber-400"/>
          </label>

        </div>
        {ovRows.length > 0 && (
          <p className="text-[9px] text-slate-400 mt-1">
            💡 Start typing a station code or name to auto-fill from Overview data ({ovRows.length} stations loaded)
          </p>
        )}
      </div>

      {/* ② Footfall */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Footfall / Day</p>
          <label className="flex items-center gap-1 shrink-0">
            <span className="text-[9px] text-slate-400">Updated by:</span>
            <input value={d.ffMeta.updatedBy} onChange={e=>upd({ffMeta:{...d.ffMeta,updatedBy:e.target.value}})}
              placeholder="Your name" className="bg-amber-50 border border-amber-200 rounded px-1.5 py-0.5 text-[9px] w-24 focus:outline-none focus:border-amber-400"/>
          </label>
        </div>
        <div className="overflow-x-auto">
          <table className="text-[10px] w-full border-collapse">
            <thead>
              <tr className="bg-amber-100">
                <th className="px-2 py-1 border border-amber-200 text-left">Type</th>
                {FF_COLS.map(h=><th key={h} className="px-2 py-1 border border-amber-200 text-center">{h}</th>)}
              </tr>
            </thead>
            <tbody>
              {FF_ROWS.map((row,r)=>(
                <tr key={row}>
                  <td className="px-2 py-0.5 border border-amber-200 font-medium">{row}</td>
                  {[0,1,2,3].map(c=><td key={c} className="px-1 py-0.5 border border-amber-200"><CI val={d.ff[r][c]} onChange={v=>updFF(r,c,v)}/></td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ③ Infrastructure */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Infrastructure</p>
          <label className="flex items-center gap-1 shrink-0">
            <span className="text-[9px] text-slate-400">Updated by:</span>
            <input value={d.infraMeta.updatedBy} onChange={e=>upd({infraMeta:{...d.infraMeta,updatedBy:e.target.value}})}
              placeholder="Your name" className="bg-amber-50 border border-amber-200 rounded px-1.5 py-0.5 text-[9px] w-24 focus:outline-none focus:border-amber-400"/>
          </label>
        </div>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          {([
            ['Platforms (e.g. 2(P1-570m, P2-550m))', 'platforms',    d.platforms],
            ['FOB',                                    'fob',          d.fob],
            ['Waiting Rooms (e.g. 2 [1L + 1 upper])', 'waitingRooms', d.waitingRooms],
          ] as [string, keyof HD, string][]).map(([lbl,key,val]) => (
            <label key={lbl} className="flex flex-col gap-0.5">
              <span className="text-[10px] font-semibold text-slate-500">{lbl}</span>
              {key === 'fob' ? (
                <input value={val} onChange={e=>upd({[key]:e.target.value} as Partial<HD>)}
                  className="bg-amber-50 border border-amber-200 rounded px-2 py-1 text-xs focus:outline-none focus:border-amber-400"/>
              ) : (
                <textarea value={val} onChange={e=>upd({[key]:e.target.value} as Partial<HD>)} rows={key==='platforms'?2:2}
                  className="bg-amber-50 border border-amber-200 rounded px-2 py-1 text-xs focus:outline-none focus:border-amber-400 resize-y whitespace-pre-wrap"/>
              )}
            </label>
          ))}
        </div>
      </div>

      {/* ④ Trains */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Trains / Day</p>
          <label className="flex items-center gap-1 shrink-0">
            <span className="text-[9px] text-slate-400">Updated by:</span>
            <input value={d.trainsMeta.updatedBy} onChange={e=>upd({trainsMeta:{...d.trainsMeta,updatedBy:e.target.value}})}
              placeholder="Your name" className="bg-amber-50 border border-amber-200 rounded px-1.5 py-0.5 text-[9px] w-24 focus:outline-none focus:border-amber-400"/>
          </label>
        </div>
        <div className="overflow-x-auto">
          <table className="text-[10px] w-full border-collapse">
            <thead>
              <tr className="bg-amber-100">
                <th className="px-2 py-1 border border-amber-200 text-left">Type</th>
                {TR_COLS.map(h=><th key={h} className="px-2 py-1 border border-amber-200 text-center">{h}</th>)}
              </tr>
            </thead>
            <tbody>
              {TR_ROWS.map((row,r)=>(
                <tr key={row}>
                  <td className="px-2 py-0.5 border border-amber-200 font-medium whitespace-nowrap">{row}</td>
                  {[0,1,2,3].map(c=><td key={c} className="px-1 py-0.5 border border-amber-200"><CI val={d.trains[r][c]} onChange={v=>updTr(r,c,v)}/></td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ⑤ Counters & Manpower */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">
            Counters &amp; Manpower
            <span className="ml-1 normal-case font-normal text-slate-400">(M-Morning · E-Evening · N-Night · S-Sanctioned · OR-On Roll · AW-Actual Working)</span>
          </p>
          <button onClick={addCH}
            className="flex items-center gap-1 px-2 py-1 text-[10px] bg-amber-100 text-amber-700 rounded hover:bg-amber-200 shrink-0">
            <Plus size={10}/> Add Head
          </button>
        </div>
        <div className="flex gap-2 overflow-x-auto pb-2">
          {d.counterHeads.map((ch, i) => (
            <div key={i} className="flex-shrink-0 w-44 bg-amber-50 border border-amber-200 rounded-lg p-2 space-y-1.5 relative">
              <button onClick={()=>rmCH(i)} className="absolute top-1 right-1 text-slate-300 hover:text-red-400">
                <X size={10}/>
              </button>
              {/* Head name */}
              <input value={ch.name} onChange={e=>updCH(i,{name:e.target.value})} placeholder="Head (e.g. UTS)"
                onKeyDown={e=>{if(e.key==='Enter')e.currentTarget.blur();}}
                className="w-full text-[10px] font-bold bg-amber-100 border border-amber-200 rounded px-1.5 py-0.5 focus:outline-none focus:border-amber-400 pr-4"/>
              {/* Total */}
              <label className="flex flex-col gap-0.5">
                <span className="text-[9px] text-slate-400 uppercase tracking-wide">Total counters</span>
                <CI val={ch.total} onChange={v=>updCH(i,{total:v})} ph="e.g. 2"/>
              </label>
              {/* Shifts — either a single M/E/N grid, or optional per-side columns */}
              {(!ch.sides || ch.sides.length === 0) ? (
                <div className="space-y-1">
                  <div className="grid grid-cols-3 gap-1">
                    {(['M','E','N'] as const).map(s=>(
                      <label key={s} className="flex flex-col gap-0.5 items-center">
                        <span className="text-[9px] text-slate-400">{s}</span>
                        <CI val={ch[s]} onChange={v=>updCH(i,{[s]:v} as Partial<CounterHead>)} ph="0"/>
                      </label>
                    ))}
                  </div>
                  <button onClick={()=>addCHSide(i)}
                    className="w-full text-[9px] text-amber-600 hover:text-amber-700 py-0.5 rounded border border-dashed border-amber-300 hover:border-amber-400">
                    ⇆ Split by side (AG / PG)
                  </button>
                </div>
              ) : (
                <div className="space-y-1">
                  {/* Mode toggle: M/E/N rows vs a single count row */}
                  <div className="flex gap-1 text-[8px]">
                    <button onClick={()=>setCHSideMode(i,'shifts')}
                      className={`flex-1 rounded py-0.5 border ${(ch.sideMode??'shifts')==='shifts' ? 'bg-amber-600 text-white border-amber-600' : 'bg-amber-50 text-amber-700 border-amber-200'}`}>
                      M/E/N rows
                    </button>
                    <button onClick={()=>setCHSideMode(i,'count')}
                      className={`flex-1 rounded py-0.5 border ${ch.sideMode==='count' ? 'bg-amber-600 text-white border-amber-600' : 'bg-amber-50 text-amber-700 border-amber-200'}`}>
                      Count only
                    </button>
                  </div>
                  <div className="flex items-start gap-1">
                    {/* Row-label column */}
                    <div className="flex flex-col gap-0.5 pt-3.5 shrink-0">
                      {(ch.sideMode==='count' ? ['No.'] : ['M','E','N']).map(s=>(
                        <span key={s} className="text-[9px] text-slate-400 h-[18px] flex items-center">{s}</span>
                      ))}
                    </div>
                    {/* One editable column per side */}
                    {ch.sides.map((sd, si)=>(
                      <div key={si} className="flex-1 min-w-0 space-y-0.5">
                        <div className="flex items-center gap-0.5">
                          <input value={sd.label} onChange={e=>updCHSide(i,si,{label:e.target.value})}
                            placeholder="Side"
                            onKeyDown={e=>{if(e.key==='Enter')e.currentTarget.blur();}}
                            className="w-full text-[8px] font-semibold bg-amber-100 border border-amber-200 rounded px-1 py-0.5 focus:outline-none focus:border-amber-400"/>
                          <button onClick={()=>rmCHSide(i,si)} className="text-slate-300 hover:text-red-400 shrink-0"><X size={8}/></button>
                        </div>
                        {ch.sideMode==='count' ? (
                          <CI val={sd.count ?? ''} onChange={v=>updCHSide(i,si,{count:v})} ph="0"/>
                        ) : (
                          (['M','E','N'] as const).map(s=>(
                            <CI key={s} val={sd[s]} onChange={v=>updCHSide(i,si,{[s]:v} as Partial<CounterSide>)} ph="0"/>
                          ))
                        )}
                      </div>
                    ))}
                  </div>
                  <button onClick={()=>addCHSide(i)}
                    className="w-full text-[9px] text-amber-600 hover:text-amber-700 py-0.5 rounded border border-dashed border-amber-300 hover:border-amber-400">
                    + Add side column
                  </button>
                </div>
              )}
              {/* Manpower */}
              <div className="border-t border-amber-200 pt-1">
                <p className="text-[9px] text-slate-400 uppercase tracking-wide mb-1">Manpower</p>
                <div className="grid grid-cols-3 gap-1">
                  {([
                    ['S',  'mpSanctioned', 'Sanctioned'],
                    ['OR', 'mpOnRoll',     'On Roll'],
                    ['AW', 'mpActual',     'Actual Working'],
                  ] as [string, keyof CounterHead, string][]).map(([code,key,title])=>(
                    <label key={code} className="flex flex-col gap-0.5 items-center">
                      <span className="text-[9px] text-slate-400" title={title}>{code}</span>
                      <CI val={ch[key] as string} onChange={v=>updCH(i,{[key]:v} as Partial<CounterHead>)} ph="0"/>
                    </label>
                  ))}
                </div>
              </div>
              {/* Extra Fields */}
              {ch.extraFields.length > 0 && (
                <div className="border-t border-amber-200 pt-1 space-y-1">
                  {ch.extraFields.map((ef,fi)=>(
                    <div key={fi} className="flex gap-1 items-center">
                      <input value={ef.key} onChange={e=>updCHExtra(i,fi,'key',e.target.value)}
                        placeholder="Label"
                        className="w-[45%] text-[9px] bg-amber-50 border border-amber-200 rounded px-1 py-0.5 focus:outline-none"/>
                      <input value={ef.value} onChange={e=>updCHExtra(i,fi,'value',e.target.value)}
                        placeholder="Value"
                        className="flex-1 text-[9px] bg-amber-50 border border-amber-200 rounded px-1 py-0.5 focus:outline-none"/>
                      <button onClick={()=>rmCHExtra(i,fi)} className="text-slate-300 hover:text-red-400 shrink-0"><X size={8}/></button>
                    </div>
                  ))}
                </div>
              )}
              <button onClick={()=>addCHExtra(i)}
                className="w-full mt-1 text-[9px] text-amber-600 hover:text-amber-700 py-0.5 rounded border border-dashed border-amber-300 hover:border-amber-400">
                + Add Field
              </button>
              {/* Per-counter "Updated by" */}
              <div className="border-t border-amber-200 pt-1 mt-1">
                <label className="flex flex-col gap-0.5">
                  <span className="text-[9px] text-slate-400 uppercase tracking-wide">Updated by</span>
                  <input value={ch.meta?.updatedBy??''}
                    onChange={e=>updCH(i,{meta:{...ch.meta,updatedBy:e.target.value}})}
                    placeholder="Your name"
                    className="w-full text-[9px] bg-amber-50 border border-amber-200 rounded px-1.5 py-0.5 focus:outline-none focus:border-amber-400"/>
                </label>
                {ch.meta?.updatedAt && (
                  <p className="text-[8px] text-slate-400 mt-0.5">Last: {ch.meta.updatedAt}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ⑥ Sanitation */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Sanitation</p>
          <label className="flex items-center gap-1 shrink-0">
            <span className="text-[9px] text-slate-400">Updated by:</span>
            <input value={d.sanitationMeta.updatedBy} onChange={e=>upd({sanitationMeta:{...d.sanitationMeta,updatedBy:e.target.value}})}
              placeholder="Your name" className="bg-amber-50 border border-amber-200 rounded px-1.5 py-0.5 text-[9px] w-24 focus:outline-none focus:border-amber-400"/>
          </label>
        </div>
        <textarea value={d.sanitation} onChange={e=>upd({sanitation:e.target.value})} rows={2}
          placeholder="e.g. Managed through Sanitation Imprest of ₹80,000 per month"
          className="w-full bg-amber-50 border border-amber-200 rounded px-2 py-1.5 text-xs resize-none focus:outline-none focus:border-amber-400"/>
      </div>

      {/* ⑦ Commercial Earnings */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Commercial Earnings (₹ lakhs PA)</p>
          <label className="flex items-center gap-1 shrink-0">
            <span className="text-[9px] text-slate-400">Updated by:</span>
            <input value={d.commercialMeta.updatedBy} onChange={e=>upd({commercialMeta:{...d.commercialMeta,updatedBy:e.target.value}})}
              placeholder="Your name" className="bg-amber-50 border border-amber-200 rounded px-1.5 py-0.5 text-[9px] w-24 focus:outline-none focus:border-amber-400"/>
          </label>
          <button onClick={addCI}
            className="flex items-center gap-1 px-2 py-1 text-[10px] bg-amber-100 text-amber-700 rounded hover:bg-amber-200 shrink-0">
            <Plus size={10}/> Add Item
          </button>
        </div>
        <div className="space-y-1.5">
          <div className="hidden sm:grid grid-cols-[140px_100px_1fr_16px] gap-1.5 px-1">
            {['Item','Earning','Status / Description',''].map(h=>(
              <span key={h} className="text-[9px] font-semibold text-slate-400 uppercase tracking-wide">{h}</span>
            ))}
          </div>
          {d.commercial.map((ci, i)=>(
            <div key={i} className="grid grid-cols-[140px_100px_1fr_16px] gap-1.5 items-center">
              <input value={ci.name}    onChange={e=>updCI(i,{name:e.target.value})}    placeholder="Item"
                className="bg-amber-50 border border-amber-200 rounded px-1.5 py-1 text-[10px] focus:outline-none focus:border-amber-400"/>
              <input value={ci.earning} onChange={e=>updCI(i,{earning:e.target.value})} placeholder="₹ lakhs PA"
                className="bg-amber-50 border border-amber-200 rounded px-1.5 py-1 text-[10px] focus:outline-none focus:border-amber-400"/>
              <input value={ci.status}  onChange={e=>updCI(i,{status:e.target.value})}  placeholder="Status / description"
                className="bg-amber-50 border border-amber-200 rounded px-1.5 py-1 text-[10px] focus:outline-none focus:border-amber-400"/>
              <button onClick={()=>rmCI(i)} className="text-slate-300 hover:text-red-400"><X size={10}/></button>
            </div>
          ))}
        </div>
      </div>

      {/* ⑧ PRIMES Data */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">PRIMES Data</p>
          <label className="flex items-center gap-1 shrink-0">
            <span className="text-[9px] text-slate-400">Updated by:</span>
            <input value={d.primesMeta.updatedBy} onChange={e=>upd({primesMeta:{...d.primesMeta,updatedBy:e.target.value}})}
              placeholder="Your name" className="bg-amber-50 border border-amber-200 rounded px-1.5 py-0.5 text-[9px] w-24 focus:outline-none focus:border-amber-400"/>
          </label>
        </div>
        <div className="overflow-x-auto">
          <table className="text-[10px] w-full border-collapse">
            <thead>
              <tr className="bg-amber-100">
                <th className="px-2 py-1 border border-amber-200"/>
                {PR_COLS.map(h=><th key={h} className="px-2 py-1 border border-amber-200 text-center">{h}</th>)}
              </tr>
            </thead>
            <tbody>
              {PR_ROWS.map((row,r)=>(
                <tr key={row}>
                  <td className="px-2 py-0.5 border border-amber-200 font-medium">{row}</td>
                  {[0,1,2].map(c=><td key={c} className="px-1 py-0.5 border border-amber-200"><CI val={d.primes[r][c]} onChange={v=>updPr(r,c,v)}/></td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ⑨ Counter / Station Earning */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Counter / Station Earning</p>
          <label className="flex items-center gap-1 shrink-0">
            <span className="text-[9px] text-slate-400">Updated by:</span>
            <input value={d.stationEarningMeta.updatedBy} onChange={e=>upd({stationEarningMeta:{...d.stationEarningMeta,updatedBy:e.target.value}})}
              placeholder="Your name" className="bg-amber-50 border border-amber-200 rounded px-1.5 py-0.5 text-[9px] w-24 focus:outline-none focus:border-amber-400"/>
          </label>
        </div>
        <div className="overflow-x-auto">
          <table className="text-[10px] w-full border-collapse">
            <thead>
              <tr className="bg-amber-100">
                <th className="px-2 py-1 border border-amber-200"/>
                {PR_COLS.map(h=><th key={h} className="px-2 py-1 border border-amber-200 text-center">{h}</th>)}
              </tr>
            </thead>
            <tbody>
              {PR_ROWS.map((row,r)=>(
                <tr key={row}>
                  <td className="px-2 py-0.5 border border-amber-200 font-medium">{row}</td>
                  {[0,1,2].map(c=><td key={c} className="px-1 py-0.5 border border-amber-200"><CI val={d.stationEarning[r][c]} onChange={v=>updSE(r,c,v)}/></td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ⑩ Parking */}
      <div className={!canEditSec('parking') ? 'opacity-50 pointer-events-none select-none relative' : ''}>
        {!canEditSec('parking') && (
          <div className="absolute inset-0 flex items-center justify-center z-10">
            <span className="bg-white/80 text-[9px] text-slate-400 px-1.5 py-0.5 rounded border border-slate-200">
              🔒 {cellConfig['parking'] ?? 'Assigned to another cell'}
            </span>
          </div>
        )}
        <div className="flex items-center justify-between mb-1.5">
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Parking</p>
          <div className="flex items-center gap-2">
            {cellConfig['parking'] && <span className="text-[9px] bg-amber-100 text-amber-700 px-1 py-0.5 rounded">{cellConfig['parking']}</span>}
            <label className="flex items-center gap-1 shrink-0">
              <span className="text-[9px] text-slate-400">Updated by:</span>
              <input value={d.parkingMeta.updatedBy} onChange={e=>upd({parkingMeta:{...d.parkingMeta,updatedBy:e.target.value}})}
                placeholder="Your name" className="bg-amber-50 border border-amber-200 rounded px-1.5 py-0.5 text-[9px] w-24 focus:outline-none focus:border-amber-400"/>
            </label>
          </div>
        </div>
        <textarea value={d.parking} onChange={e=>upd({parking:e.target.value})} rows={3}
          placeholder={'Parking details — no. of slots, type, concessionaire, revenue, issues...'}
          className="w-full bg-amber-50 border border-amber-200 rounded px-2 py-1.5 text-xs resize-none focus:outline-none focus:border-amber-400"/>
      </div>

      {/* ⑪ Catering */}
      <div className={!canEditSec('catering') ? 'opacity-50 pointer-events-none select-none relative' : ''}>
        {!canEditSec('catering') && (
          <div className="absolute inset-0 flex items-center justify-center z-10">
            <span className="bg-white/80 text-[9px] text-slate-400 px-1.5 py-0.5 rounded border border-slate-200">
              🔒 {cellConfig['catering'] ?? 'Assigned to another cell'}
            </span>
          </div>
        )}
        <div className="flex items-center justify-between mb-1.5">
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Catering</p>
          <div className="flex items-center gap-2">
            {cellConfig['catering'] && <span className="text-[9px] bg-amber-100 text-amber-700 px-1 py-0.5 rounded">{cellConfig['catering']}</span>}
            <label className="flex items-center gap-1 shrink-0">
              <span className="text-[9px] text-slate-400">Updated by:</span>
              <input value={d.cateringMeta.updatedBy} onChange={e=>upd({cateringMeta:{...d.cateringMeta,updatedBy:e.target.value}})}
                placeholder="Your name" className="bg-amber-50 border border-amber-200 rounded px-1.5 py-0.5 text-[9px] w-24 focus:outline-none focus:border-amber-400"/>
            </label>
          </div>
        </div>
        <textarea value={d.catering} onChange={e=>upd({catering:e.target.value})} rows={3}
          placeholder={'Catering details — stalls, concessionaire, category, revenue, issues...'}
          className="w-full bg-amber-50 border border-amber-200 rounded px-2 py-1.5 text-xs resize-none focus:outline-none focus:border-amber-400"/>
      </div>

      {/* ⑫ Earning Bifurcation */}
      <div className={!canEditSec('ebif') ? 'opacity-50 pointer-events-none select-none relative' : ''}>
        {!canEditSec('ebif') && (
          <div className="absolute inset-0 flex items-center justify-center z-10">
            <span className="bg-white/80 text-[9px] text-slate-400 px-1.5 py-0.5 rounded border border-slate-200">
              🔒 {cellConfig['ebif'] ?? 'Assigned to another cell'}
            </span>
          </div>
        )}
        <div className="flex items-center justify-between mb-1.5">
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Earning Bifurcation</p>
          <div className="flex items-center gap-2">
            {cellConfig['ebif'] && <span className="text-[9px] bg-amber-100 text-amber-700 px-1 py-0.5 rounded">{cellConfig['ebif']}</span>}
            <label className="flex items-center gap-1 shrink-0">
              <span className="text-[9px] text-slate-400">Updated by:</span>
              <input value={d.earningMeta.updatedBy} onChange={e=>upd({earningMeta:{...d.earningMeta,updatedBy:e.target.value}})}
                placeholder="Your name" className="bg-amber-50 border border-amber-200 rounded px-1.5 py-0.5 text-[9px] w-24 focus:outline-none focus:border-amber-400"/>
            </label>
          </div>
        </div>
        <textarea value={d.earningBifurcation} onChange={e=>upd({earningBifurcation:e.target.value})} rows={3}
          placeholder={'e.g. UTS- RailOne- 4631, STBS- 2900, UTS- 54592\nPRS- Cash- 63,273, Cashless- 15,997'}
          className="w-full bg-amber-50 border border-amber-200 rounded px-2 py-1.5 text-xs font-mono resize-none focus:outline-none focus:border-amber-400"/>
      </div>

      {/* Save / Cancel / Export */}
      <div className="flex flex-wrap gap-2 pt-2 border-t border-amber-200">
        <button onClick={save}
          className="flex items-center gap-1.5 px-4 py-1.5 text-xs bg-amber-600 text-white rounded-lg hover:bg-amber-700">
          <Check size={11}/> Save Handout
        </button>
        <button onClick={cancel} className="px-4 py-1.5 text-xs text-slate-500 hover:bg-slate-100 rounded-lg">
          Cancel
        </button>
        <div className="ml-auto flex gap-2">
          <button onClick={handlePrint}
            className="flex items-center gap-1 px-3 py-1.5 text-xs text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50">
            <Printer size={11}/> PDF
          </button>
          <button onClick={handleExportWord}
            className="flex items-center gap-1 px-3 py-1.5 text-xs text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50">
            <Download size={11}/> Word
          </button>
          <button onClick={handleExportExcel}
            className="flex items-center gap-1 px-3 py-1.5 text-xs text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50">
            <Download size={11}/> Excel
          </button>
          <button onClick={handleExportCSV}
            className="flex items-center gap-1 px-3 py-1.5 text-xs text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50">
            <Download size={11}/> CSV
          </button>
        </div>
      </div>
    </div>
  );

  // ── VIEW MODE ──────────────────────────────────────────────────────────────
  const hasData = !!(d.stationName || d.stationCode);

  if (!hasData && canManage) return (
    <div className="text-center py-8 space-y-3">
      <p className="text-4xl">🗂️</p>
      <p className="text-slate-300 text-sm italic">No station data yet</p>
      <button onClick={startEditing}
        className="px-4 py-2 text-xs bg-amber-600 text-white rounded-lg hover:bg-amber-700">
        Fill Station Data
      </button>
    </div>
  );
  if (!hasData) return <p className="text-xs text-slate-300 italic text-center py-4">No station data</p>;

  // Only show a counter if it has at least one data value — hides rows like STBA or
  // Announcement that exist in the list but were never filled in for this station.
  const visibleCH = d.counterHeads.filter(ch =>
    ch.name && (
      ch.total || ch.M || ch.E || ch.N ||
      ch.mpSanctioned || ch.mpOnRoll || ch.mpActual ||
      (ch.sides && ch.sides.some(s => s.count || s.M || s.E || s.N)) ||
      (ch.extraFields && ch.extraFields.some(ef => ef.value))
    )
  );

  /** Compact audit trail shown next to each section header */
  const SecMeta = ({ meta, sec }: { meta?: SectionMeta; sec: string }) => {
    const { upd: updStr, chk } = fmtMeta(meta);
    return (
      <div className="flex items-center gap-1.5 flex-wrap">
        {updStr && <span className="text-[9px] text-slate-400 italic">✎ {updStr}</span>}
        {chk    && <span className="text-[9px] text-green-600 font-medium">✓ {chk}</span>}
        {canManage && (
          <button onClick={()=>setCheckDialog({sec, name:''})}
            className="text-[9px] text-slate-300 hover:text-green-600 transition-colors border border-dashed border-slate-200 hover:border-green-400 rounded px-1 py-0.5">
            ✓ Check
          </button>
        )}
      </div>
    );
  };

  return (
    <>
    {/* Check dialog — renders over view mode */}
    {checkDialog && (
      <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/30 backdrop-blur-sm"
        onClick={()=>setCheckDialog(null)}>
        <div className="bg-white rounded-2xl shadow-2xl p-5 w-72 space-y-3" onClick={e=>e.stopPropagation()}>
          <p className="text-sm font-bold text-slate-700">Mark as Checked</p>
          <p className="text-[11px] text-slate-400">Enter your name to record that you verified this section.</p>
          <input value={checkDialog.name}
            onChange={e=>setCheckDialog(p=>p?{...p,name:e.target.value}:p)}
            placeholder="Your name (e.g. Joginder Kumar)"
            autoFocus
            onKeyDown={e=>{ if(e.key==='Enter' && checkDialog.name.trim()) saveCheck(checkDialog.sec, checkDialog.name); }}
            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-amber-400"/>
          <div className="flex justify-end gap-2">
            <button onClick={()=>setCheckDialog(null)}
              className="px-3 py-1.5 text-xs text-slate-500 hover:bg-slate-100 rounded-lg">Cancel</button>
            <button onClick={()=>saveCheck(checkDialog.sec, checkDialog.name)}
              disabled={!checkDialog.name.trim()}
              className="px-3 py-1.5 text-xs bg-green-600 text-white rounded-lg disabled:opacity-40 hover:bg-green-700">
              ✓ Confirm Check
            </button>
          </div>
        </div>
      </div>
    )}

    <div className="space-y-3">
      {/* Header */}
      <div className="bg-amber-600 text-white rounded-xl px-4 py-3 flex items-start justify-between">
        <div className="min-w-0 flex-1">
          <p className="font-bold text-base leading-tight">
            {d.stationName}{d.stationCode ? ` (${d.stationCode})` : ''}
          </p>
          {(d.category || d.state || d.section || d.cmi || d.division) && (
            <p className="text-amber-100 text-xs mt-0.5">
              {[d.category, d.state, d.section, d.cmi ? `CMI: ${d.cmi}` : '', d.division].filter(Boolean).join(' · ')}
            </p>
          )}
          {d.date && <p className="text-amber-200 text-[10px] mt-0.5">As on {d.date}</p>}
          {/* CMI check status */}
          {d.cmiCheckedBy && (
            <p className="text-green-300 text-[10px] mt-0.5 font-medium">
              ✓ CMI Checked: {d.cmiCheckedBy}{d.cmiCheckedAt ? ` (${d.cmiCheckedAt})` : ''}
            </p>
          )}
        </div>
        <div className="flex items-center gap-1 shrink-0 ml-3">
          {/* CMI Check button */}
          {canManage && (
            <button onClick={()=>setCheckDialog({sec:'cmi', name:''})} title="CMI — Mark Whole Handout as Checked"
              className="p-1.5 rounded-lg bg-green-700/40 hover:bg-green-600/70 text-green-100 hover:text-white transition-colors text-[10px] font-bold">
              CMI ✓
            </button>
          )}
          {/* Data Sources button */}
          <button onClick={()=>setShowDataSources(true)} title="Linked Data Sources"
            className="p-1.5 rounded-lg bg-amber-700/50 hover:bg-amber-700 text-amber-100 hover:text-white transition-colors text-[11px]">
            🔗
          </button>
          {/* Export dropdown */}
          <div className="relative">
            <button onClick={()=>setShowExportMenu(v=>!v)} title="Export Handout"
              className="p-1.5 rounded-lg bg-amber-700/50 hover:bg-amber-700 text-amber-100 hover:text-white transition-colors">
              <Download size={12}/>
            </button>
            {showExportMenu && (
              <div className="absolute right-0 top-8 z-50 bg-white border border-slate-200 rounded-xl shadow-xl py-1 w-40"
                onMouseLeave={()=>setShowExportMenu(false)}>
                <button onClick={()=>{handlePrint();setShowExportMenu(false);}}
                  className="w-full text-left px-3 py-2 text-xs text-slate-700 hover:bg-slate-50 flex items-center gap-2">
                  🖨️ Print / PDF
                </button>
                <button onClick={()=>{handleExportWord();setShowExportMenu(false);}}
                  className="w-full text-left px-3 py-2 text-xs text-slate-700 hover:bg-slate-50 flex items-center gap-2">
                  📝 Word (.doc)
                </button>
                <button onClick={()=>{handleExportExcel();setShowExportMenu(false);}}
                  className="w-full text-left px-3 py-2 text-xs text-slate-700 hover:bg-slate-50 flex items-center gap-2">
                  📊 Excel (.xls)
                </button>
                <button onClick={()=>{handleExportCSV();setShowExportMenu(false);}}
                  className="w-full text-left px-3 py-2 text-xs text-slate-700 hover:bg-slate-50 flex items-center gap-2">
                  📋 CSV
                </button>
              </div>
            )}
          </div>
          {/* Admin: configure cell assignments */}
          {(currentUser?.role === 'maintenance' || currentUser?.role === 'admin') && (
            <button onClick={()=>setShowCellConfig(true)} title="Configure Cell Assignments"
              className="p-1.5 rounded-lg bg-amber-700/50 hover:bg-amber-700 text-amber-100 hover:text-white transition-colors text-[10px]">
              ⚙
            </button>
          )}
          {canManage && (
            <button onClick={startEditing}
              className="p-1.5 rounded-lg bg-amber-700/50 hover:bg-amber-700 text-amber-100 hover:text-white transition-colors">
              <Edit3 size={12}/>
            </button>
          )}
        </div>
      </div>

      {/* Linked data source chips */}
      {d.dataSources.length > 0 && (
        <div className="flex flex-wrap gap-1.5 px-1">
          {d.dataSources.map(src => (
            <button key={src.id}
              onClick={()=>window.open(src.url,'_blank')}
              className="flex items-center gap-1 px-2 py-0.5 bg-slate-100 hover:bg-amber-50 border border-slate-200 hover:border-amber-300 rounded-full text-[10px] text-slate-600 hover:text-amber-700 transition-colors">
              {SRC_ICONS[src.type]} {src.label}
            </button>
          ))}
        </div>
      )}

      {/* Footfall */}
      {d.ff.some(row=>row.some(v=>v)) && (
        <div>
          <div className="flex items-center justify-between mb-1">
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Footfall / Day</p>
            <SecMeta meta={d.ffMeta} sec="ff"/>
          </div>
          <div className="overflow-x-auto rounded-lg border border-amber-200">
            <table className="text-[10px] w-full border-collapse">
              <thead><TH cols={['', ...FF_COLS]}/></thead>
              <tbody>{FF_ROWS.map((r,i)=><TRow key={r} label={r} cells={d.ff[i]} hi={i===2}/>)}</tbody>
            </table>
          </div>
        </div>
      )}

      {/* Infrastructure */}
      {(d.platforms || d.fob || d.waitingRooms) && (
        <div>
          <div className="flex items-center justify-between mb-1">
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Infrastructure</p>
            <SecMeta meta={d.infraMeta} sec="infra"/>
          </div>
          <div className="space-y-1.5">
            {/* Platforms — rendered as a PF No. / Length grid when structured */}
            {d.platforms && (() => {
              const grid = parsePlatformGrid(d.platforms);
              if (!grid) return (
                <div className="bg-slate-50 rounded-lg px-2.5 py-1.5 text-[11px]">
                  <span className="text-slate-400">Platforms: </span>
                  <span className="font-semibold text-slate-700">{d.platforms}</span>
                </div>
              );
              return (
                <div className="overflow-x-auto rounded-lg border border-amber-200">
                  <table className="text-[10px] w-full border-collapse">
                    <tbody>
                      {grid.map((row, ri) => (
                        <tr key={ri} className={ri === 0 ? 'bg-amber-50' : ''}>
                          <td className="px-2 py-1 border border-amber-200 font-semibold text-slate-600 whitespace-nowrap">{row.label}</td>
                          {row.cells.map((c, ci) => (
                            <td key={ci} className={`px-2 py-1 border border-amber-200 text-center whitespace-nowrap ${ri===0?'font-semibold text-slate-600':'text-slate-700'}`}>{c || '—'}</td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              );
            })()}
            {[['FOB', d.fob], ['Waiting Rooms', d.waitingRooms]]
              .filter(([,v])=>v).map(([l,v])=>(
                <div key={l} className="bg-amber-50 border border-amber-200 rounded-lg px-2.5 py-1.5 text-[11px]">
                  <span className="text-amber-700 font-semibold">{l}: </span>
                  <span className="font-medium text-slate-700 whitespace-pre-wrap">{v}</span>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Trains */}
      {d.trains.some(row=>row.some(v=>v)) && (
        <div>
          <div className="flex items-center justify-between mb-1">
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Trains / Day</p>
            <SecMeta meta={d.trainsMeta} sec="trains"/>
          </div>
          <div className="overflow-x-auto rounded-lg border border-amber-200">
            <table className="text-[10px] w-full border-collapse">
              <thead><TH cols={['', ...TR_COLS]}/></thead>
              <tbody>{TR_ROWS.map((r,i)=><TRow key={r} label={r} cells={d.trains[i]} hi={i===2}/>)}</tbody>
            </table>
          </div>
        </div>
      )}

      {/* Counters & Manpower — side-by-side columns */}
      {visibleCH.length > 0 && (
        <div>
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1">
            Counters &nbsp;<span className="normal-case font-normal text-slate-400">(M-Morning · E-Evening · N-Night)</span>
          </p>
          <div className="overflow-x-auto">
            <div className="inline-flex border border-amber-200 rounded-lg overflow-hidden min-w-full">
              {visibleCH.map((ch, i) => (
                <div key={i} className={`flex-1 ${ch.sides && ch.sides.length ? 'min-w-[160px]' : 'min-w-[90px]'} p-2 ${i < visibleCH.length-1 ? 'border-r border-amber-200' : ''}`}>
                  <p className="text-[10px] font-bold text-amber-700 break-words leading-tight text-center bg-amber-100 rounded px-1 py-0.5 -mx-0.5">
                    {ch.name}{ch.total ? ` - ${ch.total}` : ''}
                  </p>
                  {(ch.sides && ch.sides.length > 0) ? (
                    <div className="mt-0.5">
                      <table className="text-[9px] w-full border-collapse">
                        <thead>
                          <tr>
                            {ch.sideMode !== 'count' && <th className="text-left font-normal text-slate-400 pr-1"></th>}
                            {ch.sides.map((sd,si)=>(
                              <th key={si} className="px-1 py-0.5 font-semibold text-amber-700 text-center border border-amber-200 bg-amber-50 break-words">{sd.label||`Side ${si+1}`}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {ch.sideMode === 'count' ? (
                            <tr>
                              {ch.sides.map((sd,si)=>(
                                <td key={si} className="px-1 py-0.5 text-center border border-amber-200 text-slate-700 font-semibold">{sd.count||'—'}</td>
                              ))}
                            </tr>
                          ) : (
                            (['M','E','N'] as const).map(s=>(
                              <tr key={s}>
                                <td className="text-slate-400 pr-1 text-center">{s}</td>
                                {ch.sides!.map((sd,si)=>(
                                  <td key={si} className="px-1 py-0.5 text-center border border-amber-200 text-slate-700 font-medium">{sd[s]||'—'}</td>
                                ))}
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="mt-0.5">
                      {ch.M && <p className="text-[10px] text-slate-600 leading-snug">M - {ch.M}</p>}
                      {ch.E && <p className="text-[10px] text-slate-600 leading-snug">E - {ch.E}</p>}
                      {ch.N && <p className="text-[10px] text-slate-600 leading-snug">N - {ch.N}</p>}
                    </div>
                  )}
                  {(ch.mpSanctioned || ch.mpOnRoll || ch.mpActual) && (
                    <div className="mt-1 pt-1 border-t border-amber-100">
                      <p className="text-[9px] text-slate-400 uppercase tracking-wide leading-tight mb-0.5">Manpower</p>
                      {ch.mpSanctioned && <p className="text-[9px] text-slate-500 leading-snug">S: <span className="font-semibold text-slate-700">{ch.mpSanctioned}</span></p>}
                      {ch.mpOnRoll     && <p className="text-[9px] text-slate-500 leading-snug">OR: <span className="font-semibold text-slate-700">{ch.mpOnRoll}</span></p>}
                      {ch.mpActual     && <p className="text-[9px] text-slate-500 leading-snug">AW: <span className="font-semibold text-slate-700">{ch.mpActual}</span></p>}
                    </div>
                  )}
                  {Array.isArray(ch.extraFields) && ch.extraFields.filter(ef=>ef.key||ef.value).length > 0 && (
                    <div className="mt-1 pt-1 border-t border-amber-100">
                      {ch.extraFields.filter(ef=>ef.key||ef.value).map((ef,fi)=>(
                        <p key={fi} className="text-[9px] text-slate-500 leading-snug">
                          {ef.key && <span className="font-medium text-slate-600">{ef.key}: </span>}
                          <span className="font-semibold text-slate-700">{ef.value}</span>
                        </p>
                      ))}
                    </div>
                  )}
                  {/* Per-counter meta */}
                  {(ch.meta?.updatedBy || ch.meta?.checkedBy) && (
                    <div className="mt-1 pt-1 border-t border-amber-100 space-y-0.5">
                      {ch.meta.updatedBy && (
                        <p className="text-[8px] text-slate-400 italic">
                          ✎ {ch.meta.updatedBy}{ch.meta.updatedAt ? ` (${ch.meta.updatedAt})` : ''}
                        </p>
                      )}
                      {ch.meta.checkedBy && (
                        <p className="text-[8px] text-green-600 font-medium">
                          ✓ {ch.meta.checkedBy}{ch.meta.checkedAt ? ` (${ch.meta.checkedAt})` : ''}
                        </p>
                      )}
                    </div>
                  )}
                  {canManage && (
                    <button onClick={()=>setCheckDialog({sec:`ch:${d.counterHeads.indexOf(ch)}`, name:''})}
                      className="mt-1 w-full text-[8px] text-slate-300 hover:text-green-600 border border-dashed border-slate-200 hover:border-green-400 rounded py-0.5 transition-colors">
                      ✓ Check
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Sanitation */}
      {d.sanitation && (
        <div>
          <div className="flex items-center justify-between mb-1">
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Sanitation</p>
            <SecMeta meta={d.sanitationMeta} sec="sanitation"/>
          </div>
          <div className="bg-amber-50 border border-amber-200 rounded-lg px-2.5 py-2 text-[11px] text-slate-700 whitespace-pre-wrap">{d.sanitation}</div>
        </div>
      )}

      {/* Commercial Earnings */}
      {d.commercial.some(ci=>ci.name||ci.earning||ci.status) && (
        <div>
          <div className="flex items-center justify-between mb-1">
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">
              Commercial Earnings &nbsp;<span className="normal-case font-normal text-slate-400">(₹ lakhs PA)</span>
            </p>
            <SecMeta meta={d.commercialMeta} sec="commercial"/>
          </div>
          <div className="rounded-lg border border-amber-200 overflow-hidden">
            <table className="text-[10px] w-full border-collapse">
              <thead>
                <tr className="bg-amber-50">
                  <th className="px-2.5 py-1 border border-amber-200 text-left font-semibold text-slate-600 whitespace-nowrap">Item</th>
                  <th className="px-2.5 py-1 border border-amber-200 text-center font-semibold text-slate-600 whitespace-nowrap">Earning</th>
                  <th className="px-2.5 py-1 border border-amber-200 text-left font-semibold text-slate-600">Status</th>
                </tr>
              </thead>
              <tbody>
                {d.commercial.filter(ci=>ci.name||ci.earning||ci.status).map((ci,i)=>(
                  <tr key={i} className="hover:bg-amber-50/40 align-top">
                    <td className="px-2.5 py-1.5 border border-amber-200 font-medium text-slate-700 whitespace-nowrap">{ci.name||'—'}</td>
                    <td className="px-2.5 py-1.5 border border-amber-200 text-center text-slate-700 whitespace-nowrap">{ci.earning ? `₹ ${ci.earning.replace(/^₹\s*/,'')}` : '—'}</td>
                    <td className="px-2.5 py-1.5 border border-amber-200 text-slate-600">{renderStatusBullets(ci.status)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* PRIMES */}
      {d.primes.some(row=>row.some(v=>v)) && (
        <div>
          <div className="flex items-center justify-between mb-1">
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">PRIMES Data</p>
            <SecMeta meta={d.primesMeta} sec="primes"/>
          </div>
          <div className="overflow-x-auto rounded-lg border border-amber-200">
            <table className="text-[10px] w-full border-collapse">
              <thead><TH cols={['', ...PR_COLS]}/></thead>
              <tbody>{PR_ROWS.map((r,i)=><TRow key={r} label={r} cells={d.primes[i]} hi={i===2}/>)}</tbody>
            </table>
          </div>
        </div>
      )}

      {/* Counter / Station Earning */}
      {d.stationEarning.some(row=>row.some(v=>v)) && (
        <div>
          <div className="flex items-center justify-between mb-1">
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Counter / Station Earning</p>
            <SecMeta meta={d.stationEarningMeta} sec="earning"/>
          </div>
          <div className="overflow-x-auto rounded-lg border border-amber-200">
            <table className="text-[10px] w-full border-collapse">
              <thead><TH cols={['', ...PR_COLS]}/></thead>
              <tbody>{PR_ROWS.map((r,i)=><TRow key={r} label={r} cells={d.stationEarning[i]} hi={i===2}/>)}</tbody>
            </table>
          </div>
        </div>
      )}

      {/* Parking */}
      {d.parking && (
        <div>
          <div className="flex items-center justify-between mb-1">
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Parking</p>
            <SecMeta meta={d.parkingMeta} sec="parking"/>
          </div>
          <div className="bg-amber-50 border border-amber-200 rounded-lg px-2.5 py-2 text-[11px] text-slate-700 whitespace-pre-wrap">{d.parking}</div>
        </div>
      )}

      {/* Catering */}
      {d.catering && (
        <div>
          <div className="flex items-center justify-between mb-1">
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Catering</p>
            <SecMeta meta={d.cateringMeta} sec="catering"/>
          </div>
          <div className="bg-amber-50 border border-amber-200 rounded-lg px-2.5 py-2 text-[11px] text-slate-700 whitespace-pre-wrap">{d.catering}</div>
        </div>
      )}

      {/* Earning Bifurcation */}
      {d.earningBifurcation && (
        <div>
          <div className="flex items-center justify-between mb-1">
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Earning Bifurcation</p>
            <SecMeta meta={d.earningMeta} sec="ebif"/>
          </div>
          <div className="bg-amber-50 border border-amber-200 rounded-lg px-2.5 py-2 text-[11px] text-slate-700 font-mono whitespace-pre-wrap">{d.earningBifurcation}</div>
        </div>
      )}
    </div>

    {/* ── Cell Config Modal (admin only) ──────────────────────────────────── */}
    {showCellConfig && (
      <div className="fixed inset-0 z-[400] flex items-center justify-center bg-black/40 backdrop-blur-sm"
        onClick={()=>setShowCellConfig(false)}>
        <div className="bg-white rounded-2xl shadow-2xl w-[min(90vw,520px)] max-h-[85vh] flex flex-col"
          onClick={e=>e.stopPropagation()}>
          <div className="px-5 pt-5 pb-3 border-b border-slate-100">
            <p className="font-bold text-slate-700 text-sm">Cell Assignment Configuration</p>
            <p className="text-[11px] text-slate-400 mt-0.5">Assign each section to a cell. Only that cell's members can update it. Applies to all handouts.</p>
          </div>
          <div className="overflow-y-auto flex-1 px-5 py-3 space-y-2">
            {Object.entries(SEC_LABELS).map(([sec, label]) => (
              <div key={sec} className="flex items-center justify-between gap-3">
                <span className="text-[11px] text-slate-600 font-medium min-w-0 flex-1">{label}</span>
                <input
                  value={cellConfig[sec] ?? ''}
                  onChange={e => {
                    const v = e.target.value;
                    const next = { ...cellConfig };
                    if (v) next[sec] = v; else delete next[sec];
                    saveCellConfig(next);
                  }}
                  placeholder="Select cell or CMI…"
                  list="handout-cells-datalist"
                  className="border border-slate-200 rounded-lg px-2 py-1 text-[11px] w-44 focus:outline-none focus:border-amber-400"/>
              </div>
            ))}
            <datalist id="handout-cells-datalist">
              {/* ── Active cells from Cell Management ── */}
              {availableCells.map(c => <option key={`cell-${c.name}`} value={c.name}/>)}
              {/* ── Sectional CMIs — dynamic from Overview sheet cache ── */}
              {uniqueOvCMIs.map(c => <option key={`scmi-${c}`} value={c}/>)}
              {/* ── Divisional CMIs (function-based) ── */}
              {DIVISIONAL_CMI_OPTIONS.map(c => <option key={`dcmi-${c}`} value={c}/>)}
              {/* ── CMIs from Staff Master (registered incharges) ── */}
              {sectionalCMIs.map(s => <option key={`staffcmi-${s.name}`} value={s.name}/>)}
              {/* ── Preserve any already-assigned values not in the above lists ── */}
              {Object.values(cellConfig).filter(v =>
                !availableCells.some(c => c.name === v) &&
                !uniqueOvCMIs.includes(v) &&
                !(DIVISIONAL_CMI_OPTIONS as readonly string[]).includes(v) &&
                !sectionalCMIs.some(s => s.name === v)
              ).map(v => <option key={`existing-${v}`} value={v}/>)}
            </datalist>
          </div>
          <div className="px-5 py-3 border-t border-slate-100 flex justify-between items-center">
            <button onClick={()=>saveCellConfig({})}
              className="text-xs text-red-400 hover:text-red-600">Clear All</button>
            <button onClick={()=>setShowCellConfig(false)}
              className="px-4 py-1.5 text-xs bg-amber-600 text-white rounded-lg hover:bg-amber-700">Done</button>
          </div>
        </div>
      </div>
    )}

    {/* ── Data Sources Modal ──────────────────────────────────────────────── */}
    {showDataSources && (
      <div className="fixed inset-0 z-[400] flex items-center justify-center bg-black/40 backdrop-blur-sm"
        onClick={()=>{setShowDataSources(false);setDsPreview(null);}}>
        <div className="bg-white rounded-2xl shadow-2xl w-[min(92vw,560px)] max-h-[88vh] flex flex-col"
          onClick={e=>e.stopPropagation()}>

          {/* Header */}
          <div className="px-5 pt-5 pb-3 border-b border-slate-100">
            <p className="font-bold text-slate-700 text-sm">📎 Linked Data Sources</p>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Attach Google Sheets, Docs, PDFs, or any URL as reference sources for this handout.
            </p>
          </div>

          <div className="overflow-y-auto flex-1 px-5 py-4 space-y-3">

            {/* Existing sources */}
            {d.dataSources.length === 0 ? (
              <p className="text-xs text-slate-400 italic text-center py-4">No sources linked yet.</p>
            ) : d.dataSources.map(src => (
              <div key={src.id} className="border border-slate-200 rounded-xl p-3 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-base">{SRC_ICONS[src.type]}</span>
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-slate-700 truncate">{src.label}</p>
                      <p className="text-[10px] text-slate-400 truncate">{src.url}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button onClick={()=>window.open(src.url,'_blank')}
                      className="px-2 py-1 text-[10px] bg-slate-100 hover:bg-slate-200 rounded-lg text-slate-600">
                      Open ↗
                    </button>
                    {src.type === 'sheets' && (
                      <button onClick={()=>fetchDataSource(src)}
                        className="px-2 py-1 text-[10px] bg-amber-50 hover:bg-amber-100 rounded-lg text-amber-700">
                        Preview CSV
                      </button>
                    )}
                    {src.type === 'docs' && (
                      <button onClick={()=>fetchAndFillFromDoc(src)}
                        disabled={fetchingDocId === src.id}
                        className="px-2 py-1 text-[10px] bg-emerald-50 hover:bg-emerald-100 disabled:opacity-50 rounded-lg text-emerald-700 font-medium">
                        {fetchingDocId === src.id ? '⏳ Fetching…' : '📥 Fetch & Fill'}
                      </button>
                    )}
                    <button onClick={()=>removeDataSource(src.id)}
                      className="px-2 py-1 text-[10px] bg-red-50 hover:bg-red-100 rounded-lg text-red-500">
                      ✕
                    </button>
                  </div>
                </div>
                {/* CSV preview */}
                {dsPreview?.id === src.id && (
                  <div className={`rounded-lg p-2 text-[10px] font-mono whitespace-pre-wrap max-h-32 overflow-y-auto ${dsPreview.error ? 'bg-red-50 text-red-600' : 'bg-slate-50 text-slate-600'}`}>
                    {dsPreview.text}
                  </div>
                )}
              </div>
            ))}

            {/* Add new source */}
            <div className="border border-dashed border-slate-300 rounded-xl p-3 space-y-2 bg-slate-50">
              <p className="text-[11px] font-semibold text-slate-500">+ Add New Source</p>
              <div className="flex gap-2">
                <select value={newSrc.type}
                  onChange={e=>setNewSrc(p=>({...p, type: e.target.value as DataSource['type']}))}
                  className="border border-slate-200 rounded-lg px-2 py-1.5 text-[11px] focus:outline-none focus:border-amber-400 bg-white">
                  <option value="sheets">Google Sheet</option>
                  <option value="docs">Google Doc</option>
                  <option value="pdf">PDF</option>
                  <option value="other">Other Link</option>
                </select>
                <input value={newSrc.label} placeholder="Label (optional)"
                  onChange={e=>setNewSrc(p=>({...p, label: e.target.value}))}
                  className="border border-slate-200 rounded-lg px-2 py-1.5 text-[11px] focus:outline-none focus:border-amber-400 flex-1 bg-white"/>
              </div>
              <div className="flex gap-2">
                <input value={newSrc.url} placeholder="Paste URL here…"
                  onChange={e=>setNewSrc(p=>({...p, url: e.target.value}))}
                  className="border border-slate-200 rounded-lg px-2 py-1.5 text-[11px] focus:outline-none focus:border-amber-400 flex-1 bg-white"/>
                <button onClick={addDataSource} disabled={!newSrc.url}
                  className="px-3 py-1.5 text-[11px] bg-amber-600 text-white rounded-lg hover:bg-amber-700 disabled:opacity-40">
                  Add
                </button>
              </div>
              {newSrc.type === 'sheets' && (
                <p className="text-[10px] text-slate-400">
                  💡 For live preview, publish the sheet first: File → Share → Publish to web → CSV.
                </p>
              )}
            </div>
          </div>

          <div className="px-5 py-3 border-t border-slate-100 flex justify-end">
            <button onClick={()=>{setShowDataSources(false);setDsPreview(null);}}
              className="px-4 py-1.5 text-xs bg-amber-600 text-white rounded-lg hover:bg-amber-700">Done</button>
          </div>
        </div>
      </div>
    )}
    </>
  );
}

function EmbedWidget({ widget, onUpdate, canManage }: {
 widget: LayoutWidget; onUpdate: (p: Partial<LayoutWidget>) => void; canManage: boolean;
}) {
 const savedUrl: string = (widget as any).embedUrl ?? widget.content ?? '';
 const savedType: EmbedServiceType = (widget as any).embedType ?? 'url';
 const [editing, setEditing] = useState(!savedUrl);
 const [url, setUrl] = useState(savedUrl);
 const [svcType, setSvcType] = useState<EmbedServiceType>(savedType);

 if (editing && canManage) {
 return (
 <div className="space-y-3">
 <div className="grid grid-cols-3 gap-1.5 sm:grid-cols-4 lg:grid-cols-5">
 {EMBED_SERVICE_TYPES.map(et => (
 <button key={et.id} onClick={() => setSvcType(et.id)}
 className={`flex items-center gap-1.5 px-2.5 py-2 rounded-xl border text-left text-xs transition-all ${svcType === et.id ? 'bg-rail-50 border-rail-300 text-rail-700 font-semibold' : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
 <span>{et.icon}</span><span>{et.label}</span>
 </button>
 ))}
 </div>
 <div>
 <p className="text-[10px] text-slate-400 mb-1.5">{EMBED_SERVICE_TYPES.find(e => e.id === svcType)?.hint}</p>
 <input value={url} onChange={e => setUrl(e.target.value)} placeholder="Paste URL here…"
 className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-mono focus:outline-none focus:border-rail-400"/>
 </div>
 <div className="flex gap-1.5 justify-end">
 {savedUrl && <button onClick={() => setEditing(false)} className="px-3 py-1.5 text-xs text-slate-500 hover:bg-slate-100 rounded-lg">Cancel</button>}
 <button onClick={() => {
 const embedSrc = toEmbedSrc(url.trim(), svcType);
 onUpdate({ embedUrl: url.trim(), embedType: svcType, content: embedSrc } as any);
 setEditing(false);
 }} disabled={!url.trim()}
 className="px-3 py-1.5 text-xs bg-rail-600 text-white rounded-lg disabled:opacity-40 hover:bg-rail-700">
 Embed
 </button>
 </div>
 </div>
 );
 }
 if (!savedUrl) return <div className="text-xs text-slate-300 italic text-center py-4">No URL configured</div>;
 const iframeSrc = toEmbedSrc(savedUrl, savedType);
 return (
 <div className="group relative">
 <iframe
 src={iframeSrc}
 className="w-full rounded-xl border border-slate-200 block"
 style={{ height: widget.fullscreen ? 'calc(100vh - 140px)' : '520px' }}
 allowFullScreen
 title={widget.title}
 sandbox="allow-scripts allow-same-origin allow-popups allow-forms allow-presentation allow-downloads"
 />
 {canManage && (
 <button onClick={() => { setUrl(savedUrl); setSvcType(savedType); setEditing(true); }}
 className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 p-1.5 rounded-lg bg-white shadow text-slate-400 hover:text-slate-600 transition-opacity">
 <Edit3 size={12}/>
 </button>
 )}
 </div>
 );
}

// ── Main WidgetRenderer ───────────────────────────────────────────────────────

// ── TableScopePicker ─────────────────────────────────────────────────────────
function TableScopePicker({ sectionGroups, unassigned, onSelect }: {
  sectionGroups: { id: string; title: string; tables: any[] }[];
  unassigned: any[];
  onSelect: (scope: 'all'|'section'|'table', secId: string|null, tblId: string|null, label: string) => void;
}) {
  const [step, setStep] = useState<'scope'|'section'|'table'>('scope');
  const [pendingScope, setPendingScope] = useState<'section'|'table'>('section');
  const [pendingSec, setPendingSec] = useState<{ id: string; title: string; tables: any[] }|null>(null);

  const allGroups = [...sectionGroups, ...(unassigned.length > 0 ? [{ id: '__none__', title: 'No Section', tables: unassigned }] : [])];

  if (step === 'scope') return (
    <div className="space-y-2.5">
      <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">What do you want to display?</p>
      {/* All sections */}
      <button onClick={() => onSelect('all', null, null, 'All Tables')}
        className="w-full flex items-center gap-3 px-3 py-3 bg-slate-50 hover:bg-rail-50 border border-slate-200 hover:border-rail-300 rounded-xl text-left transition-all group">
        <div className="w-9 h-9 rounded-lg bg-indigo-100 flex items-center justify-center shrink-0">
          <Database size={16} className="text-indigo-600"/>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-slate-800">All Tables</p>
          <p className="text-[10px] text-slate-400">Show every table from all sections</p>
        </div>
        <ChevronRight size={14} className="text-slate-300 group-hover:text-rail-500"/>
      </button>
      {/* Specific section */}
      {sectionGroups.length > 0 && (
        <button onClick={() => { setPendingScope('section'); setStep('section'); }}
          className="w-full flex items-center gap-3 px-3 py-3 bg-slate-50 hover:bg-rail-50 border border-slate-200 hover:border-rail-300 rounded-xl text-left transition-all group">
          <div className="w-9 h-9 rounded-lg bg-emerald-100 flex items-center justify-center shrink-0">
            <FolderOpen size={16} className="text-emerald-600"/>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-slate-800">A Section — all its tables</p>
            <p className="text-[10px] text-slate-400">Pick one section, show all tables inside it</p>
          </div>
          <ChevronRight size={14} className="text-slate-300 group-hover:text-rail-500"/>
        </button>
      )}
      {/* Specific table */}
      <button onClick={() => { setPendingScope('table'); setStep('section'); }}
        className="w-full flex items-center gap-3 px-3 py-3 bg-slate-50 hover:bg-rail-50 border border-slate-200 hover:border-rail-300 rounded-xl text-left transition-all group">
        <div className="w-9 h-9 rounded-lg bg-amber-100 flex items-center justify-center shrink-0">
          <Table2 size={16} className="text-amber-600"/>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-slate-800">A Specific Table</p>
          <p className="text-[10px] text-slate-400">Choose one table to embed</p>
        </div>
        <ChevronRight size={14} className="text-slate-300 group-hover:text-rail-500"/>
      </button>
    </div>
  );

  if (step === 'section') return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 mb-3">
        <button onClick={() => setStep('scope')} className="text-[10px] text-slate-400 hover:text-slate-700">← Back</button>
        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
          {pendingScope === 'section' ? 'Choose Section' : 'Choose Section'}
        </p>
      </div>
      {allGroups.map(g => (
        <button key={g.id} onClick={() => {
          if (pendingScope === 'section') {
            onSelect('section', g.id, null, g.title);
          } else {
            setPendingSec(g); setStep('table');
          }
        }}
          className="w-full flex items-center gap-2.5 px-3 py-2.5 bg-slate-50 hover:bg-rail-50 border border-slate-200 hover:border-rail-300 rounded-xl text-left transition-all group">
          <FolderOpen size={14} className="text-emerald-500 shrink-0"/>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-slate-800">{g.title}</p>
            <p className="text-[10px] text-slate-400">{g.tables.length} table{g.tables.length !== 1 ? 's' : ''}</p>
          </div>
          <ChevronRight size={12} className="text-slate-300 group-hover:text-rail-500"/>
        </button>
      ))}
    </div>
  );

  // step === 'table'
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 mb-3">
        <button onClick={() => setStep('section')} className="text-[10px] text-slate-400 hover:text-slate-700">← Back</button>
        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Choose Table</p>
      </div>
      {(pendingSec?.tables ?? []).map((t: any) => (
        <button key={t.id} onClick={() => onSelect('table', pendingSec?.id ?? null, t.id, t.name)}
          className="w-full flex items-center gap-2.5 px-3 py-2.5 bg-slate-50 hover:bg-rail-50 border border-slate-200 hover:border-rail-300 rounded-xl text-left transition-all group">
          <Table2 size={14} className="text-rail-500 shrink-0"/>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-slate-800 truncate">{t.name}</p>
            <p className="text-[10px] text-slate-400">{t.rows?.length ?? 0} rows · {t.fields?.length ?? 0} cols</p>
          </div>
          <span className="text-[10px] text-rail-600 font-bold opacity-0 group-hover:opacity-100">Select →</span>
        </button>
      ))}
    </div>
  );
}

// ── TableMultiView ────────────────────────────────────────────────────────────
function TableMultiView({ tables, scope, scopeLabel, hook, cell, canManage, userId, userName, onReset }: {
  tables: any[]; scope: string; scopeLabel: string;
  hook: any; cell: string; canManage: boolean;
  userId?: string; userName?: string; onReset?: () => void;
}) {
  const [activeId, setActiveId] = useState<string>('');
  const effectiveId = activeId && tables.find((t: any) => t.id === activeId) ? activeId : (tables[0]?.id ?? '');
  const activeTbl = tables.find((t: any) => t.id === effectiveId);

  return (
    <div className="flex flex-col gap-0">
      {/* Header bar: scope label + tab strip + reset */}
      <div className="flex items-center gap-2 mb-2 flex-wrap">
        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider shrink-0">
          {scopeLabel}
        </span>
        {tables.length > 1 && (
          <div className="flex items-center gap-1 flex-1 overflow-x-auto min-w-0">
            {tables.map((t: any) => (
              <button key={t.id} onClick={() => setActiveId(t.id)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-medium whitespace-nowrap transition-all ${
                  t.id === effectiveId
                    ? 'bg-rail-600 text-white shadow-sm'
                    : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                }`}>
                {t.name}
              </button>
            ))}
          </div>
        )}
        {onReset && (
          <button onClick={onReset}
            className="text-[10px] text-slate-400 hover:text-slate-600 flex items-center gap-1 shrink-0 ml-auto">
            <Settings size={9}/> Change
          </button>
        )}
      </div>
      {activeTbl
        ? <TableEngine table={activeTbl} hook={hook} cell={cell} canManage={canManage} userId={userId} userName={userName}/>
        : <p className="text-xs text-slate-400 py-4 text-center">No table selected</p>
      }
    </div>
  );
}

export function WidgetRenderer({
 widget, col, cell, canManage, userId, userName,
 workspaceHook, onUpdate,
}: {
 widget: LayoutWidget;
 col?: LayoutColumn;
 cell: string;
 canManage: boolean;
 userId?: string;
 userName?: string;
 workspaceHook?: ReturnType<typeof useWorkspace>;
 onUpdate: (patch: Partial<LayoutWidget>) => void;
}) {
 switch (widget.type) {
 case 'sanitation_status':
 return (
  <>
    <SanitationStatusWidget />
    <QRPatrolWidget />
  </>
 );
 case 'kpi':
 return <SmartKPI widget={widget} onUpdate={onUpdate} canManage={canManage} workspaceHook={workspaceHook}/>;

 case 'text':
 return <EditableText widget={widget} onUpdate={onUpdate} canManage={canManage}/>;

 case 'announcements':
 return <AnnouncementsWidget widget={widget} onUpdate={onUpdate} canManage={canManage}/>;

 case 'quick_links':
 return <QuickLinksWidget widget={widget} onUpdate={onUpdate} canManage={canManage}/>;

 case 'embed':
 case 'google_sheet':
 return <EmbedWidget widget={widget} onUpdate={onUpdate} canManage={canManage}/>;

 case 'staff':
 return <CellStaffRoster cell={cell}/>;

 case 'approval_queue':
 return <ApprovalQueue cell={cell}/>;

 case 'staff_requests':
 return <StaffRequestPanel cell={cell}/>;

 case 'shared_table':
 return <SharedTablesView cell={cell}/>;

 case 'activity':
 return <CellActivityDashboard cell={cell}/>;

    case 'table': {
      if (!workspaceHook) return <p className="text-xs text-slate-400">Workspace not loaded</p>;

      // ── helpers ──────────────────────────────────────────────────────────────
      const allTables: any[] = workspaceHook.ws.tables; // deleted tables are removed from this array
      const wsSections: any[] = (workspaceHook.ws.sections ?? [])
        .slice().sort((a: any, b: any) => (a.order ?? 0) - (b.order ?? 0));

      // Map tableId → sectionId (first section wins)
      const tableToSection = new Map<string, string>();
      wsSections.forEach((sec: any) => {
        (sec.widgets ?? []).forEach((w: any) => {
          if (w.type === 'table' && w.tableId && !tableToSection.has(w.tableId))
            tableToSection.set(w.tableId, sec.id);
        });
      });

      // Build groups: sections that have at least one live table
      const sectionGroups = wsSections
        .map((sec: any) => ({
          id: sec.id, title: sec.title || 'Untitled Section',
          tables: allTables.filter((t: any) => tableToSection.get(t.id) === sec.id),
        }))
        .filter(g => g.tables.length > 0);
      const unassignedTables = allTables.filter((t: any) => !tableToSection.has(t.id));

      // resolve the tables this widget should show right now
      const scope: string = (widget as any).tableScope ?? '';
      const scopeSecId: string = (widget as any).tableSectionId ?? '';

      let resolvedTables: any[] = [];
      if (scope === 'all') {
        resolvedTables = allTables;
      } else if (scope === 'section') {
        const sec = wsSections.find((s: any) => s.id === scopeSecId);
        const ids = new Set(
          (sec?.widgets ?? []).filter((w: any) => w.type === 'table').map((w: any) => w.tableId)
        );
        resolvedTables = allTables.filter((t: any) => ids.has(t.id));
      } else if (scope === 'table') {
        resolvedTables = allTables.filter((t: any) => t.id === widget.tableId);
      }

      // ── SCOPE PICKER (shown when no scope chosen yet) ─────────────────────
      if (!scope) {
        if (allTables.length === 0) return (
          <div className="flex flex-col items-center gap-2 py-6 text-center">
            <Table2 size={20} className="text-slate-300"/>
            <p className="text-xs font-semibold text-slate-500">No tables yet</p>
            <p className="text-[10px] text-slate-400">Open the Database panel to create a table first</p>
          </div>
        );
        return <TableScopePicker
          sectionGroups={sectionGroups} unassigned={unassignedTables}
          onSelect={(sc, secId, tblId, label) =>
            onUpdate({ tableScope: sc, tableSectionId: secId ?? undefined, tableId: tblId ?? undefined, title: label } as any)
          }
        />;
      }

      // ── NOTHING FOUND (tables deleted or scope invalid) ───────────────────
      if (resolvedTables.length === 0) return (
        <div className="space-y-2 py-4 text-center">
          <p className="text-xs text-amber-600">No tables found — they may have been deleted.</p>
          {canManage && (
            <button onClick={() => onUpdate({ tableScope: undefined, tableSectionId: undefined, tableId: undefined } as any)}
              className="text-xs text-rail-600 hover:underline">← Change selection</button>
          )}
        </div>
      );

      // ── MULTI-TABLE TAB VIEW ──────────────────────────────────────────────
      return <TableMultiView
        tables={resolvedTables} scope={scope} scopeLabel={
          scope === 'all' ? 'All Tables' :
          scope === 'section' ? (wsSections.find((s: any) => s.id === scopeSecId)?.title ?? 'Section') :
          resolvedTables[0]?.name ?? 'Table'
        }
        hook={workspaceHook} cell={cell} canManage={canManage}
        userId={userId} userName={userName}
        onReset={canManage ? () => onUpdate({ tableScope: undefined, tableSectionId: undefined, tableId: undefined } as any) : undefined}
      />;
    }

 case 'chart':
 return (
 <div className="rounded-xl border border-dashed border-slate-200 flex items-center justify-center py-10 gap-2 text-slate-300">
 <TrendingUp size={16}/>
 <span className="text-xs">Connect a data source to show charts</span>
 </div>
 );

    case 'heading':
      return <HeadingWidget widget={widget} onUpdate={onUpdate} canManage={canManage}/>;

    case 'divider':
      return <div className="border-t border-slate-200 my-2"/>;

    case 'callout':
      return <CalloutWidget widget={widget} onUpdate={onUpdate} canManage={canManage}/>;

    case 'toggle':
      return <ToggleWidget widget={widget} onUpdate={onUpdate} canManage={canManage}/>;

    case 'checklist':
      return <ChecklistWidget widget={widget} onUpdate={onUpdate} canManage={canManage}/>;

    case 'google_links': {
      const { GoogleLinksRepo } = require('@/components/cell/GoogleLinksRepo');
      return <GoogleLinksRepo cell={widget.tableId ?? cell ?? 'default'}/>;
    }

    case 'powerbi': {
      const PBIW = () => {
        const [url, setUrl] = React.useState<string>((widget as any).embedUrl ?? '');
        const [editing, setEditing] = React.useState<boolean>(!(widget as any).embedUrl);
        if (editing) return (
          <div className="space-y-2">
            <input value={url} onChange={e => setUrl(e.target.value)} placeholder="Power BI embed URL"
              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-mono focus:outline-none focus:border-amber-400"/>
            <button onClick={() => { if (onUpdate) onUpdate({ embedUrl: url } as any); setEditing(false); }} disabled={!url.trim()}
              className="px-3 py-1.5 text-xs bg-amber-600 text-white rounded-lg disabled:opacity-40">Connect</button>
          </div>
        );
        return (
          <div className="space-y-2">
            <iframe src={url} className="w-full rounded-lg border" style={{ height: 320 }} allowFullScreen sandbox="allow-scripts allow-same-origin allow-popups allow-forms allow-presentation"/>
            {canManage && <button onClick={() => setEditing(true)} className="text-[10px] text-slate-400 hover:text-amber-600">Change URL</button>}
          </div>
        );
      };
      return <PBIW/>;
    }

    // 'embed' handled above by EmbedWidget

    // ── Enterprise Blocks ─────────────────────────────────────────────────────
    case 'database': {
      if (!workspaceHook) return <p className="text-xs text-slate-400">Workspace not loaded</p>;
      return (
        <DatabaseBlock
          tableId={widget.tableId}
          hook={workspaceHook}
          cell={cell}
          userId={userId}
          userName={userName}
          canManage={canManage}
        />
      );
    }

    case 'ai_assistant': {
      const tables = workspaceHook?.ws?.tables ?? [];
      return <AIAssistantBlock cell={cell} tables={tables}/>;
    }

    case 'knowledge_base':
      return (
        <KnowledgeBaseBlock
          cell={cell}
          canManage={canManage}
          userId={userId ?? 'user'}
          userName={userName ?? 'User'}
        />
      );

    case 'task_manager':
      return (
        <TaskManagerBlock
          cell={cell}
          canManage={canManage}
          userId={userId ?? 'user'}
          userName={userName ?? 'User'}
        />
      );

    case 'financial':
      return (
        <FinancialDashboard
          canManage={canManage}
          canApprove={canManage}
          currentUser={userName ?? 'User'}
          mode="embedded"
        />
      );

    case 'monthly_report':
      return (
        <MonthlyReportWidget
          division={(widget as any).division ?? 'DELHI'}
          isAdmin={canManage}
        />
      );

    case 'handout':
      return <HandoutWidget widget={widget} onUpdate={onUpdate} canManage={canManage}/>;

 default:
 return <p className="text-xs text-slate-300 italic">Unknown widget type: {widget.type}</p>;
 }
}
