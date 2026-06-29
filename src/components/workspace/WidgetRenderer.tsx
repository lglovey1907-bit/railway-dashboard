'use client';
import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import {
  Table2, BarChart3, FileText, Users2, Activity, UserCheck,
  ClipboardList, Share2, Megaphone, Link2, FileSpreadsheet,
  Globe, TrendingUp, ExternalLink, Edit3, Check, X, ChevronRight,
  Database, Bot, BookOpen, CheckSquare, Plus, Trash2, Settings2,
  ChevronDown, TrendingDown, Target, Layers, Filter,
} from 'lucide-react';
import type { KpiSource, KpiAggregation, KpiCombineMode } from '@/lib/workspace/layoutEngine';
import type { TableDef } from '@/lib/cellData/types';
import dynamic from 'next/dynamic';
const DatabaseBlock = dynamic(() => import('@/components/database/DatabaseBlock').then(m => ({ default: m.DatabaseBlock })), { ssr: false });
const AIAssistantBlock = dynamic(() => import('@/components/ai/AIAssistantBlock').then(m => ({ default: m.AIAssistantBlock })), { ssr: false });
const KnowledgeBaseBlock = dynamic(() => import('@/components/knowledge/KnowledgeBaseBlock').then(m => ({ default: m.KnowledgeBaseBlock })), { ssr: false });
const TaskManagerBlock = dynamic(() => import('@/components/tasks/TaskManagerBlock').then(m => ({ default: m.TaskManagerBlock })), { ssr: false });
const FinancialDashboard = dynamic(() => import('@/components/financial/FinancialDashboard').then(m => ({ default: m.FinancialDashboard })), { ssr: false });
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

// ── Embed / Google Service Widget ──────────────────────────────────────────────
const EMBED_SERVICE_TYPES = [
 { id: 'url',    label: 'URL',         icon: '🌐', hint: 'Any embeddable URL' },
 { id: 'gsheet', label: 'Google Sheet',icon: '📊', hint: 'Paste Google Sheet share URL' },
 { id: 'gdoc',   label: 'Google Doc',  icon: '📄', hint: 'Paste Google Doc share URL' },
 { id: 'gform',  label: 'Google Form', icon: '📝', hint: 'Paste Google Form URL' },
 { id: 'gdrive', label: 'Drive Folder',icon: '📁', hint: 'Paste Google Drive folder URL' },
] as const;
type EmbedServiceType = typeof EMBED_SERVICE_TYPES[number]['id'];

function toEmbedSrc(url: string, type: EmbedServiceType): string {
 if (!url) return '';
 try {
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
 } catch {}
 return url;
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
 <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3 lg:grid-cols-5">
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
      if (!widget.tableId) {
        const available = workspaceHook.ws.tables.filter((t: any) => !t.deletedAt);
        if (available.length === 0) return (
          <div className="flex flex-col items-center gap-2 py-6 text-center">
            <Table2 size={20} className="text-slate-300"/>
            <p className="text-xs font-semibold text-slate-500">No tables yet</p>
            <p className="text-[10px] text-slate-400">Open "Tables & Data" below to create your first table</p>
          </div>
        );
        return (
          <div className="space-y-2">
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Select table to display:</p>
            <div className="space-y-1.5">
              {available.map((t: any) => (
                <button key={t.id} onClick={() => onUpdate({ tableId: t.id, title: t.name })}
                  className="w-full flex items-center gap-2.5 px-3 py-2.5 bg-slate-50 hover:bg-rail-50 border border-slate-200 hover:border-rail-300 rounded-xl text-left transition-all group">
                  <Table2 size={14} className="text-rail-500 shrink-0"/>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold text-slate-800 truncate">{t.name}</p>
                    <p className="text-[10px] text-slate-400">{t.rows?.length ?? 0} rows · {t.fields?.length ?? 0} cols</p>
                  </div>
                  <span className="text-[10px] text-rail-600 font-bold opacity-0 group-hover:opacity-100 transition-opacity">Select →</span>
                </button>
              ))}
            </div>
          </div>
        );
      }
      const tbl = workspaceHook.ws.tables.find((t: any) => t.id === widget.tableId);
      if (!tbl) return (
        <div className="space-y-1.5">
          <p className="text-xs text-amber-600">Table not found — it may have been deleted.</p>
          <button onClick={() => onUpdate({ tableId: undefined })} className="text-xs text-rail-600 hover:underline">← Choose a different table</button>
        </div>
      );
      return (
        <div>
          {canManage && (
            <div className="flex justify-end mb-2">
              <button onClick={() => onUpdate({ tableId: undefined })} className="text-[10px] text-slate-400 hover:text-slate-600 flex items-center gap-1 hover:underline">
                <Table2 size={9}/> Change table
              </button>
            </div>
          )}
          <TableEngine table={tbl} hook={workspaceHook} cell={cell} canManage={canManage} userId={userId} userName={userName}/>
        </div>
      );
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

    case 'toggle': {
      const ToggleW = () => {
        const [open, setOpen] = React.useState<boolean>((widget as any).toggleOpen ?? true);
        return (
          <div>
            <button onClick={() => setOpen(o => !o)} className="flex items-center gap-2 text-sm font-semibold text-slate-800 w-full text-left hover:bg-slate-50 rounded-lg px-2 py-1.5 -mx-2">
              <ChevronRight size={14} className={`text-slate-400 transition-transform \${open ? 'rotate-90' : ''}`}/>
              {widget.title}
            </button>
            {open && <div className="pl-5 mt-1.5 text-sm text-slate-600 leading-relaxed">{(widget as any).richText || <span className="text-slate-300 italic">Click ⚙ Edit to add content</span>}</div>}
          </div>
        );
      };
      return <ToggleW/>;
    }

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

 default:
 return <p className="text-xs text-slate-300 italic">Unknown widget type: {widget.type}</p>;
 }
}
