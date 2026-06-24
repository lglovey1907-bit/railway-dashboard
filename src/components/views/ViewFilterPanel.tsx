'use client';
/**
 * ViewFilterPanel — per-view filters (req 111) and groupBy (req 112)
 */
import { useState } from 'react';
import { Plus, Trash2, Filter, Layers, X, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ViewFilter, View } from '@/lib/views/viewEngine';
import { OP_LABELS } from '@/lib/views/viewEngine';

interface Props {
  view: View;
  sheetHeaders: string[];
  canEdit: boolean;
  onUpdateFilters: (filters: ViewFilter[]) => void;
  onUpdateGroupBy: (col: string | undefined) => void;
}

function gid() { return `fi${Date.now()}${Math.floor(Math.random() * 999)}`; }

export function ViewFilterPanel({ view, sheetHeaders, canEdit, onUpdateFilters, onUpdateGroupBy }: Props) {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<'filter' | 'group'>('filter');

  const filters = view.filters ?? [];
  const activeFilters = filters.length;

  const addFilter = () => {
    if (!sheetHeaders.length) return;
    const newF: ViewFilter = { id: gid(), field: sheetHeaders[0], op: 'contains', value: '' };
    onUpdateFilters([...filters, newF]);
  };

  const updateFilter = (id: string, patch: Partial<ViewFilter>) => {
    onUpdateFilters(filters.map(f => f.id !== id ? f : { ...f, ...patch }));
  };

  const removeFilter = (id: string) => {
    onUpdateFilters(filters.filter(f => f.id !== id));
  };

  return (
    <div className="relative">
      <button onClick={() => setOpen(o => !o)}
        className={cn(
          'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all',
          activeFilters > 0
            ? 'bg-amber-50 border-amber-200 text-amber-700'
            : 'bg-white border-slate-200 text-slate-500 hover:border-slate-300',
        )}>
        <Filter size={12}/>
        Filter
        {activeFilters > 0 && (
          <span className="bg-amber-200 text-amber-800 text-[10px] font-bold rounded-full px-1.5 py-0.5">
            {activeFilters}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute top-full left-0 mt-1.5 z-[100] w-80 bg-white border border-slate-200 rounded-xl shadow-lg overflow-hidden"
          onClick={e => e.stopPropagation()}>
          {/* Tabs */}
          <div className="flex border-b border-slate-100">
            {(['filter', 'group'] as const).map(t => (
              <button key={t} onClick={() => setTab(t)}
                className={cn('flex-1 py-2.5 text-xs font-semibold capitalize transition-colors',
                  tab === t ? 'text-rail-600 border-b-2 border-rail-600' : 'text-slate-400 hover:text-slate-600')}>
                {t === 'filter' ? <><Filter size={10} className="inline mr-1"/>Filters</> : <><Layers size={10} className="inline mr-1"/>Group By</>}
              </button>
            ))}
            <button onClick={() => setOpen(false)} className="px-3 text-slate-300 hover:text-slate-500"><X size={13}/></button>
          </div>

          <div className="p-3 space-y-2 max-h-72 overflow-y-auto">
            {tab === 'filter' && (
              <>
                {filters.length === 0 ? (
                  <p className="text-xs text-slate-400 text-center py-3">No filters applied</p>
                ) : filters.map(f => (
                  <div key={f.id} className="flex items-center gap-2 bg-slate-50 rounded-lg p-2">
                    {/* Field */}
                    <select value={f.field} onChange={e => updateFilter(f.id, { field: e.target.value })}
                      className="flex-1 bg-white border border-slate-200 rounded px-1.5 py-1 text-[11px] text-slate-700 focus:outline-none focus:border-rail-400 min-w-0">
                      {sheetHeaders.map(h => <option key={h} value={h}>{h}</option>)}
                    </select>
                    {/* Operator */}
                    <select value={f.op} onChange={e => updateFilter(f.id, { op: e.target.value as ViewFilter['op'] })}
                      className="bg-white border border-slate-200 rounded px-1.5 py-1 text-[11px] text-slate-700 focus:outline-none focus:border-rail-400">
                      {(Object.entries(OP_LABELS) as [ViewFilter['op'], string][]).map(([op, lbl]) => (
                        <option key={op} value={op}>{lbl}</option>
                      ))}
                    </select>
                    {/* Value */}
                    {!['empty', 'not_empty'].includes(f.op) && (
                      <input value={f.value} onChange={e => updateFilter(f.id, { value: e.target.value })}
                        placeholder="value"
                        className="w-20 bg-white border border-slate-200 rounded px-1.5 py-1 text-[11px] text-slate-700 focus:outline-none focus:border-rail-400"/>
                    )}
                    {canEdit && (
                      <button onClick={() => removeFilter(f.id)} className="p-1 text-slate-300 hover:text-red-500 transition-colors shrink-0">
                        <Trash2 size={11}/>
                      </button>
                    )}
                  </div>
                ))}
                {canEdit && (
                  <button onClick={addFilter} disabled={!sheetHeaders.length}
                    className="flex items-center gap-1.5 text-xs text-rail-600 hover:text-rail-700 font-medium disabled:opacity-40">
                    <Plus size={11}/> Add filter
                  </button>
                )}
              </>
            )}

            {tab === 'group' && (
              <div className="space-y-2">
                <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Group rows by column</p>
                <select value={view.groupBy ?? ''} onChange={e => onUpdateGroupBy(e.target.value || undefined)}
                  className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-700 focus:outline-none focus:border-rail-400">
                  <option value="">No grouping</option>
                  {sheetHeaders.map(h => <option key={h} value={h}>{h}</option>)}
                </select>
                {view.groupBy && (
                  <button onClick={() => onUpdateGroupBy(undefined)} className="text-xs text-slate-400 hover:text-red-500 transition-colors">
                    Clear grouping
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
