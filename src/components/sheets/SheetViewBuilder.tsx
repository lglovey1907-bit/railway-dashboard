'use client';
/**
 * SheetViewBuilder — req 97-101
 *
 * Lets users configure which columns from a linked Google Sheet appear in
 * cards, tables, and dashboards. All settings persist in localStorage.
 *
 * Features:
 * - Dynamically reads available columns from the connected sheet
 * - Toggle column visibility (show/hide)
 * - Rename display labels without touching source data
 * - Reorder columns (move up/down)
 * - Reset to auto-detected defaults
 */
import { useState } from 'react';
import {
  Settings2, Eye, EyeOff, ChevronUp, ChevronDown,
  RotateCcw, Edit3, Check, X, GripVertical, Plus,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { PageField } from '@/lib/sheets/usePageFields';

interface SheetViewBuilderProps {
  fields: PageField[];
  sheetHeaders: string[];            // all columns from the sheet
  canEdit: boolean;
  onToggle: (id: string) => void;
  onRename: (id: string, label: string) => void;
  onMove: (id: string, dir: 'up' | 'down') => void;
  onAdd: (label: string, column: string) => void;
  onRemove: (id: string) => void;
  onReset: () => void;
}

export function SheetViewBuilder({
  fields, sheetHeaders, canEdit,
  onToggle, onRename, onMove, onAdd, onRemove, onReset,
}: SheetViewBuilderProps) {
  const [open, setOpen]           = useState(false);
  const [renaming, setRenaming]   = useState<string | null>(null);
  const [draft, setDraft]         = useState('');
  const [addMode, setAddMode]     = useState(false);
  const [addLabel, setAddLabel]   = useState('');
  const [addColumn, setAddColumn] = useState('');

  if (!canEdit) return null;

  const sorted = [...fields].sort((a, b) => a.order - b.order);
  const visibleCount = fields.filter(f => f.visible).length;
  const unmappedHeaders = sheetHeaders.filter(
    h => h && !fields.some(f => f.column === h)
  );

  return (
    <div className="relative">
      <button onClick={() => setOpen(o => !o)}
        className={cn(
          'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all',
          open
            ? 'bg-violet-600 text-white border-violet-600'
            : 'bg-white border-slate-200 text-slate-600 hover:border-violet-300 hover:text-violet-600',
        )}>
        <Settings2 size={12}/>
        View Fields
        <span className={cn('text-[10px] rounded-full px-1.5 py-0.5 font-bold',
          open ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500')}>
          {visibleCount}/{fields.length}
        </span>
      </button>

      {open && (
        <div className="absolute top-full right-0 mt-1.5 w-72 bg-white border border-slate-200 rounded-xl shadow-lg z-50 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 bg-slate-50">
            <div>
              <p className="text-xs font-bold text-slate-800">Configure View Fields</p>
              <p className="text-[10px] text-slate-400 mt-0.5">
                {visibleCount} of {fields.length} fields visible
              </p>
            </div>
            <button onClick={() => { if (confirm('Reset all field settings?')) { onReset(); setOpen(false); } }}
              title="Reset to auto-detected defaults"
              className="p-1.5 rounded-lg hover:bg-slate-200 text-slate-400 hover:text-slate-600 transition-colors">
              <RotateCcw size={12}/>
            </button>
          </div>

          {/* Field list */}
          <div className="max-h-64 overflow-y-auto divide-y divide-slate-50">
            {sorted.length === 0 ? (
              <div className="px-4 py-6 text-center">
                <p className="text-xs text-slate-400">No fields configured.</p>
                <p className="text-[10px] text-slate-300 mt-1">
                  {sheetHeaders.length > 0
                    ? 'Click the + button below to add sheet columns.'
                    : 'Connect a Google Sheet to auto-detect columns.'}
                </p>
              </div>
            ) : sorted.map((field, idx) => (
              <div key={field.id} className="flex items-center gap-2 px-3 py-2.5 hover:bg-slate-50 transition-colors">
                <GripVertical size={11} className="text-slate-300 shrink-0"/>

                {/* Visibility toggle */}
                <button onClick={() => onToggle(field.id)}
                  className={cn('p-1 rounded transition-colors shrink-0',
                    field.visible ? 'text-rail-600 hover:text-rail-700' : 'text-slate-300 hover:text-slate-500')}>
                  {field.visible ? <Eye size={12}/> : <EyeOff size={12}/>}
                </button>

                {/* Label (editable) */}
                {renaming === field.id ? (
                  <input value={draft} onChange={e => setDraft(e.target.value)} autoFocus
                    className="flex-1 text-xs bg-rail-50 border border-rail-300 rounded px-1.5 py-0.5 focus:outline-none"
                    onBlur={() => { if (draft.trim()) onRename(field.id, draft.trim()); setRenaming(null); }}
                    onKeyDown={e => {
                      if (e.key === 'Enter') { if (draft.trim()) onRename(field.id, draft.trim()); setRenaming(null); }
                      if (e.key === 'Escape') setRenaming(null);
                    }}/>
                ) : (
                  <div className="flex-1 min-w-0">
                    <p className={cn('text-xs truncate', field.visible ? 'text-slate-800 font-medium' : 'text-slate-400')}>
                      {field.label}
                    </p>
                    {field.label !== field.column && (
                      <p className="text-[9px] text-slate-300 truncate">← {field.column}</p>
                    )}
                  </div>
                )}

                {/* Actions */}
                <div className="flex items-center gap-0.5 shrink-0">
                  <button onClick={() => { setDraft(field.label); setRenaming(field.id); }}
                    className="p-1 rounded hover:bg-slate-200 text-slate-300 hover:text-slate-600 transition-colors">
                    <Edit3 size={10}/>
                  </button>
                  <button onClick={() => onMove(field.id, 'up')} disabled={idx === 0}
                    className="p-1 rounded hover:bg-slate-200 text-slate-300 hover:text-slate-600 disabled:opacity-20 transition-colors">
                    <ChevronUp size={10}/>
                  </button>
                  <button onClick={() => onMove(field.id, 'down')} disabled={idx === sorted.length - 1}
                    className="p-1 rounded hover:bg-slate-200 text-slate-300 hover:text-slate-600 disabled:opacity-20 transition-colors">
                    <ChevronDown size={10}/>
                  </button>
                  <button onClick={() => onRemove(field.id)}
                    className="p-1 rounded hover:bg-red-50 text-slate-300 hover:text-red-500 transition-colors">
                    <X size={10}/>
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Add from unmapped sheet headers */}
          {(unmappedHeaders.length > 0 || addMode) && (
            <div className="border-t border-slate-100 px-3 py-2.5 space-y-2 bg-slate-50">
              {!addMode ? (
                <div>
                  <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                    Available from sheet ({unmappedHeaders.length})
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {unmappedHeaders.slice(0, 8).map(h => (
                      <button key={h} onClick={() => onAdd(h, h)}
                        className="text-[10px] bg-white border border-slate-200 hover:border-rail-300 hover:bg-rail-50 text-slate-600 hover:text-rail-700 rounded-full px-2 py-0.5 transition-all">
                        + {h}
                      </button>
                    ))}
                    {unmappedHeaders.length > 8 && (
                      <button onClick={() => setAddMode(true)}
                        className="text-[10px] text-slate-400 hover:text-slate-600 px-2 py-0.5">
                        +{unmappedHeaders.length - 8} more
                      </button>
                    )}
                  </div>
                </div>
              ) : (
                <div className="space-y-1.5">
                  <input value={addLabel} onChange={e => setAddLabel(e.target.value)}
                    placeholder="Display label" className="w-full text-xs bg-white border border-slate-200 rounded px-2 py-1.5 focus:outline-none focus:border-rail-400"/>
                  <select value={addColumn} onChange={e => setAddColumn(e.target.value)}
                    className="w-full text-xs bg-white border border-slate-200 rounded px-2 py-1.5 focus:outline-none focus:border-rail-400">
                    <option value="">Select sheet column…</option>
                    {sheetHeaders.map(h => <option key={h} value={h}>{h}</option>)}
                  </select>
                  <div className="flex gap-1.5 justify-end">
                    <button onClick={() => { setAddMode(false); setAddLabel(''); setAddColumn(''); }}
                      className="px-2.5 py-1 text-xs text-slate-500 hover:bg-slate-100 rounded-lg">Cancel</button>
                    <button onClick={() => { if (addLabel && addColumn) { onAdd(addLabel, addColumn); setAddMode(false); setAddLabel(''); setAddColumn(''); }}}
                      disabled={!addLabel || !addColumn}
                      className="px-2.5 py-1 text-xs bg-rail-600 text-white rounded-lg hover:bg-rail-700 disabled:opacity-40">Add</button>
                  </div>
                </div>
              )}
              {!addMode && (
                <button onClick={() => setAddMode(true)}
                  className="flex items-center gap-1 text-[10px] text-slate-400 hover:text-slate-600 transition-colors">
                  <Plus size={9}/> Custom field
                </button>
              )}
            </div>
          )}

          <div className="px-4 py-2.5 border-t border-slate-100 bg-slate-50">
            <p className="text-[10px] text-slate-300">
              Changes apply immediately · Saved automatically
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
