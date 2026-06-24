'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  LayoutGrid, Plus, Settings2, ChevronDown, ChevronUp, ChevronRight,
  Maximize2, Minimize2, Pin, PinOff, Trash2, GripVertical,
  Save, History, Palette, X, Check, RefreshCw, Layers,
  ArrowUp, ArrowDown, Columns, AlignJustify, Table2,
  BarChart3, FileText, Users2, Activity, UserCheck,
  ClipboardList, Share2, Megaphone, Link2, FileSpreadsheet,
  Globe, TrendingUp, Edit3, Plus as PlusIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  AVAILABLE_WIDGETS, type LayoutWidget, type LayoutColumn,
} from '@/lib/workspace/layoutEngine';
import {
  getRowLayout, saveRowLayout, addRow, removeRow, moveRow, updateRow,
  setRowColumns, addWidgetToRow, removeWidgetFromRow, updateWidgetInRow,
  moveWidgetInRow, resizeRowColumn, saveRowLayoutVersion, loadRowLayoutVersion,
  ROW_COLUMN_PRESETS, type RowBasedLayout, type LayoutRow,
} from '@/lib/workspace/layoutEngine';
import { WidgetRenderer } from './WidgetRenderer';
import { useWorkspace } from '@/lib/cellData/useWorkspace';
import { canManageCellStructure } from '@/lib/cellData/useCellDataStructure';
import { useAuthStore } from '@/store/authStore';
import { CellDataManager } from '@/components/cell/CellDataManager';

// ── Widget Picker ─────────────────────────────────────────────────────────────
function WidgetPicker({ onAdd, onClose }: {
  onAdd: (w: Partial<LayoutWidget>) => void; onClose: () => void;
}) {
  const [search, setSearch] = useState('');
  const filtered = AVAILABLE_WIDGETS.filter(w =>
    !search || w.label.toLowerCase().includes(search.toLowerCase()) ||
    w.description.toLowerCase().includes(search.toLowerCase())
  );
  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/30 backdrop-blur-sm p-4" onClick={onClose}>
      <motion.div initial={{ scale: 0.96, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
        className="bg-white border border-slate-200 rounded-2xl w-full max-w-lg shadow-xl overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="flex items-center gap-3 px-5 py-4 border-b border-slate-100">
          <div className="w-8 h-8 rounded-lg bg-rail-50 flex items-center justify-center">
            <Plus size={15} className="text-rail-600"/>
          </div>
          <div className="flex-1">
            <p className="font-bold text-slate-900 text-sm">Add Widget</p>
            <p className="text-xs text-slate-400">Choose a block to add to this column</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400"><X size={15}/></button>
        </div>
        <div className="px-5 py-3 border-b border-slate-100">
          <input value={search} onChange={e => setSearch(e.target.value)} autoFocus placeholder="Search widgets…"
            className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-700 focus:outline-none focus:border-rail-400"/>
        </div>
        <div className="p-4 grid grid-cols-2 gap-2 max-h-[380px] overflow-y-auto">
          {filtered.map(w => (
            <button key={w.type} onClick={() => { onAdd({ type: w.type, title: w.label }); onClose(); }}
              className="flex items-start gap-3 p-3 rounded-xl border border-slate-200 hover:border-rail-300 hover:bg-rail-50 transition-all text-left">
              <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center shrink-0">
                <span className="text-slate-500 text-xs">{w.icon[0]}</span>
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-800">{w.label}</p>
                <p className="text-[10px] text-slate-400 mt-0.5 leading-snug">{w.description}</p>
              </div>
            </button>
          ))}
        </div>
      </motion.div>
    </div>
  );
}

// ── Layout Panel ──────────────────────────────────────────────────────────────
function LayoutPanel({ layout, onApplyPreset, onSaveVersion, onLoadVersion, onClose, user }: {
  layout: RowBasedLayout;
  onApplyPreset: (rowId: string, widths: number[]) => void;
  onSaveVersion: (label: string) => void;
  onLoadVersion: (id: string) => void;
  onClose: () => void;
  user: any;
}) {
  const [tab, setTab] = useState<'presets' | 'saved'>('presets');
  const [saveLabel, setSaveLabel] = useState('');
  const [selectedRow, setSelectedRow] = useState(layout.rows[0]?.id ?? '');

  return (
    <div className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center bg-black/30 backdrop-blur-sm p-4" onClick={onClose}>
      <motion.div initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
        className="bg-white border border-slate-200 rounded-2xl w-full max-w-2xl shadow-xl overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-violet-50 flex items-center justify-center">
              <Palette size={15} className="text-violet-600"/>
            </div>
            <p className="font-bold text-slate-900">Customize Layout</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400"><X size={15}/></button>
        </div>

        <div className="flex border-b border-slate-100">
          {(['presets', 'saved'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={cn('flex-1 py-3 text-xs font-semibold capitalize transition-colors',
                tab === t ? 'text-rail-600 border-b-2 border-rail-600' : 'text-slate-400 hover:text-slate-700')}>
              {t === 'presets' ? 'Column Layouts' : 'Saved Views'}
            </button>
          ))}
        </div>

        <div className="p-5 max-h-[420px] overflow-y-auto">
          {tab === 'presets' && (
            <div className="space-y-4">
              <div>
                <p className="text-xs font-semibold text-slate-500 mb-1">Apply to row:</p>
                <select value={selectedRow} onChange={e => setSelectedRow(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-700 focus:outline-none focus:border-rail-400">
                  {layout.rows.map((r, i) => (
                    <option key={r.id} value={r.id}>{r.label || `Row ${i + 1}`}</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {ROW_COLUMN_PRESETS.map(preset => (
                  <button key={preset.label} onClick={() => { onApplyPreset(selectedRow, preset.widths); onClose(); }}
                    className="flex flex-col items-start gap-2 p-3 rounded-xl border border-slate-200 hover:border-rail-300 hover:bg-rail-50 transition-all text-left">
                    <div className="flex gap-0.5 h-5 w-full">
                      {preset.widths.map((w, i) => (
                        <div key={i} className="bg-rail-200 rounded-sm" style={{ flex: w }}/>
                      ))}
                    </div>
                    <p className="text-xs font-semibold text-slate-700">{preset.label}</p>
                    <p className="text-[10px] text-slate-400">{preset.widths.map(w => `${w}%`).join(' / ')}</p>
                  </button>
                ))}
              </div>
            </div>
          )}

          {tab === 'saved' && (
            <div className="space-y-3">
              <div className="flex gap-2">
                <input value={saveLabel} onChange={e => setSaveLabel(e.target.value)}
                  placeholder="View name (e.g. Daily Monitoring)"
                  onKeyDown={e => { if (e.key === 'Enter' && saveLabel.trim()) { onSaveVersion(saveLabel); setSaveLabel(''); }}}
                  className="flex-1 bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-700 focus:outline-none focus:border-rail-400"/>
                <button onClick={() => { if (saveLabel.trim()) { onSaveVersion(saveLabel); setSaveLabel(''); }}}
                  disabled={!saveLabel.trim()} className="px-4 py-2 text-sm bg-rail-600 text-white rounded-lg hover:bg-rail-700 disabled:opacity-40">Save</button>
              </div>
              {layout.versions.length === 0
                ? <p className="text-sm text-slate-400 text-center py-6">No saved views yet</p>
                : layout.versions.map(v => (
                  <div key={v.id} className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200">
                    <div>
                      <p className="text-sm font-semibold text-slate-800">{v.label}</p>
                      <p className="text-[10px] text-slate-400">Saved by {v.savedByName} · {new Date(v.savedAt).toLocaleDateString('en-IN')}</p>
                    </div>
                    <button onClick={() => { onLoadVersion(v.id); onClose(); }}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-rail-600 hover:bg-rail-50 rounded-lg border border-rail-200 transition-colors">
                      <RefreshCw size={11}/> Load
                    </button>
                  </div>
                ))
              }
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}

// ── Widget Card ───────────────────────────────────────────────────────────────
function WidgetCard({
  widget, rowId, col, cell, canManage, isEditing, userId, userName,
  workspaceHook, onUpdate, onRemove, onToggleCollapse, onTogglePin, onToggleFullscreen,
  onDragStart, onDrop,
}: {
  widget: LayoutWidget; rowId: string; col: LayoutColumn; cell: string;
  canManage: boolean; isEditing: boolean; userId?: string; userName?: string;
  workspaceHook?: ReturnType<typeof useWorkspace>;
  onUpdate: (p: Partial<LayoutWidget>) => void;
  onRemove: () => void; onToggleCollapse: () => void;
  onTogglePin: () => void; onToggleFullscreen: () => void;
  onDragStart: () => void; onDrop: (toRowId: string, toColId: string, toIdx: number) => void;
}) {
  const [renaming, setRenaming] = useState(false);
  const [draftName, setDraftName] = useState(widget.title);

  return (
    <div className={cn(
      'bg-white border border-slate-200 rounded-xl overflow-hidden transition-all',
      widget.pinned && 'border-l-[3px] border-l-amber-400',
      widget.fullscreen && 'fixed inset-4 z-[100] shadow-2xl overflow-auto rounded-2xl',
      isEditing && 'cursor-grab active:cursor-grabbing',
    )}
    style={{ boxShadow: '0 1px 3px rgba(15,23,42,0.06)' }}
    draggable={isEditing}
    onDragStart={isEditing ? onDragStart : undefined}
    onDragOver={e => e.preventDefault()}
    onDrop={e => { e.preventDefault(); const idx = col.widgets.findIndex(w => w.id === widget.id); onDrop(rowId, col.id, idx); }}
    >
      {/* Header */}
      <div className={cn('flex items-center gap-2 px-4 py-2.5 border-b border-slate-100 bg-slate-50',
        isEditing && 'cursor-grab')}>
        {isEditing && <GripVertical size={13} className="text-slate-300 shrink-0"/>}
        {widget.pinned && <Pin size={10} className="text-amber-500 shrink-0"/>}
        {renaming && canManage ? (
          <input value={draftName} onChange={e => setDraftName(e.target.value)} autoFocus
            onBlur={() => { onUpdate({ title: draftName }); setRenaming(false); }}
            onKeyDown={e => { if (e.key === 'Enter') { onUpdate({ title: draftName }); setRenaming(false); } if (e.key === 'Escape') setRenaming(false); }}
            className="flex-1 text-xs font-semibold bg-white border border-rail-300 rounded px-2 py-0.5 focus:outline-none"/>
        ) : (
          <p className="font-semibold text-slate-700 text-xs flex-1 truncate" onDoubleClick={() => canManage && setRenaming(true)}>{widget.title}</p>
        )}
        <div className="flex items-center gap-0.5">
          {canManage && isEditing && <>
            <button onClick={onTogglePin} title={widget.pinned ? 'Unpin' : 'Pin'}
              className="p-1 rounded hover:bg-white text-slate-300 hover:text-amber-500 transition-colors"><Pin size={11}/></button>
            <button onClick={onRemove} className="p-1 rounded hover:bg-white text-slate-300 hover:text-red-500 transition-colors"><Trash2 size={11}/></button>
          </>}
          <button onClick={onToggleFullscreen} className="p-1 rounded hover:bg-white text-slate-300 hover:text-slate-600 transition-colors">
            {widget.fullscreen ? <Minimize2 size={11}/> : <Maximize2 size={11}/>}
          </button>
          <button onClick={onToggleCollapse} className="p-1 rounded hover:bg-white text-slate-300 hover:text-slate-600 transition-colors">
            {widget.collapsed ? <ChevronRight size={11}/> : <ChevronDown size={11}/>}
          </button>
        </div>
      </div>

      {/* Body */}
      {!widget.collapsed && (
        <div className="p-4">
          <WidgetRenderer widget={widget} col={col} cell={cell} canManage={canManage}
            userId={userId} userName={userName} workspaceHook={workspaceHook}
            onUpdate={onUpdate}/>
        </div>
      )}
    </div>
  );
}

// ── Row Component ─────────────────────────────────────────────────────────────
function WorkspaceRow({
  row, rowIdx, totalRows, layout, cell, canManage, isEditing,
  userId, userName, workspaceHook,
  onUpdate, onRemove, onMoveUp, onMoveDown, onAddWidget, onRemoveWidget,
  onUpdateWidget, onToggleWidget, onDragStart, onDrop, onResizeCol,
}: {
  row: LayoutRow; rowIdx: number; totalRows: number; layout: RowBasedLayout;
  cell: string; canManage: boolean; isEditing: boolean;
  userId?: string; userName?: string; workspaceHook?: ReturnType<typeof useWorkspace>;
  onUpdate: (patch: Partial<LayoutRow>) => void;
  onRemove: () => void; onMoveUp: () => void; onMoveDown: () => void;
  onAddWidget: (colId: string, w: Partial<LayoutWidget>) => void;
  onRemoveWidget: (colId: string, widgetId: string) => void;
  onUpdateWidget: (colId: string, widgetId: string, patch: Partial<LayoutWidget>) => void;
  onToggleWidget: (colId: string, widgetId: string, prop: 'collapsed' | 'pinned' | 'fullscreen') => void;
  onDragStart: (colId: string, widgetId: string) => void;
  onDrop: (toRowId: string, toColId: string, toIdx: number) => void;
  onResizeCol: (colId: string, pct: number) => void;
}) {
  const [addToCol, setAddToCol] = useState<string | null>(null);
  const [renamingRow, setRenamingRow] = useState(false);
  const [draftRowName, setDraftRowName] = useState(row.label ?? '');
  const [dragOverCol, setDragOverCol] = useState<string | null>(null);
  const colResizeRef = useRef<{ colId: string; startX: number; startPct: number } | null>(null);

  const startResize = (e: React.MouseEvent, colId: string, currentPct: number) => {
    e.preventDefault();
    colResizeRef.current = { colId, startX: e.clientX, startPct: currentPct };
    const move = (ev: MouseEvent) => {
      if (!colResizeRef.current) return;
      const dx = ev.clientX - colResizeRef.current.startX;
      const containerW = (ev.target as HTMLElement).closest('[data-row-canvas]')?.getBoundingClientRect().width ?? 1000;
      const newPct = Math.max(5, Math.min(90, colResizeRef.current.startPct + (dx / containerW) * 100));
      onResizeCol(colResizeRef.current.colId, newPct);
    };
    const up = () => { colResizeRef.current = null; window.removeEventListener('mousemove', move); window.removeEventListener('mouseup', up); };
    window.addEventListener('mousemove', move);
    window.addEventListener('mouseup', up);
  };

  return (
    <div className={cn('relative', isEditing && 'border border-dashed border-slate-200 rounded-xl')}>
      {/* Row header (edit mode) */}
      {isEditing && (
        <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-50 border-b border-slate-100 rounded-t-xl">
          <AlignJustify size={12} className="text-slate-300"/>
          {renamingRow ? (
            <input value={draftRowName} onChange={e => setDraftRowName(e.target.value)} autoFocus
              onBlur={() => { onUpdate({ label: draftRowName }); setRenamingRow(false); }}
              onKeyDown={e => { if (e.key === 'Enter') { onUpdate({ label: draftRowName }); setRenamingRow(false); }}}
              className="flex-1 text-[11px] font-semibold bg-white border border-slate-200 rounded px-2 py-0.5 focus:outline-none"/>
          ) : (
            <span className="text-[11px] font-semibold text-slate-400 flex-1 cursor-text" onDoubleClick={() => setRenamingRow(true)}>
              {row.label || `Row ${rowIdx + 1}`}
            </span>
          )}
          <div className="flex items-center gap-1">
            <button onClick={onMoveUp} disabled={rowIdx === 0} className="p-1 rounded hover:bg-white text-slate-300 hover:text-slate-600 disabled:opacity-30"><ArrowUp size={11}/></button>
            <button onClick={onMoveDown} disabled={rowIdx === totalRows - 1} className="p-1 rounded hover:bg-white text-slate-300 hover:text-slate-600 disabled:opacity-30"><ArrowDown size={11}/></button>
            <button onClick={onRemove} className="p-1 rounded hover:bg-white text-slate-300 hover:text-red-500"><Trash2 size={11}/></button>
          </div>
        </div>
      )}

      {/* Columns */}
      <div className="flex gap-3 min-h-[80px] p-3 relative" data-row-canvas="true">
        {row.columns.map((col, colIdx) => (
          <div key={col.id}
            className="flex flex-col gap-2.5 min-w-0 relative"
            style={{ width: `${col.widthPercent}%`, flexShrink: 0, flexGrow: 0 }}
            onDragOver={e => { e.preventDefault(); setDragOverCol(col.id); }}
            onDrop={() => { onDrop(row.id, col.id, col.widgets.length); setDragOverCol(null); }}>

            {/* Drop highlight */}
            {dragOverCol === col.id && (
              <div className="absolute inset-0 border-2 border-dashed border-rail-400 rounded-xl bg-rail-50/50 pointer-events-none z-10"/>
            )}

            {/* Widgets */}
            {[...col.widgets.filter(w => w.pinned), ...col.widgets.filter(w => !w.pinned)].map(widget => (
              <WidgetCard key={widget.id}
                widget={widget} rowId={row.id} col={col} cell={cell}
                canManage={canManage} isEditing={isEditing}
                userId={userId} userName={userName} workspaceHook={workspaceHook}
                onUpdate={p => onUpdateWidget(col.id, widget.id, p)}
                onRemove={() => onRemoveWidget(col.id, widget.id)}
                onToggleCollapse={() => onToggleWidget(col.id, widget.id, 'collapsed')}
                onTogglePin={() => onToggleWidget(col.id, widget.id, 'pinned')}
                onToggleFullscreen={() => onToggleWidget(col.id, widget.id, 'fullscreen')}
                onDragStart={() => onDragStart(col.id, widget.id)}
                onDrop={onDrop}
              />
            ))}

            {/* Add widget button */}
            {isEditing && canManage && (
              <button onClick={() => setAddToCol(col.id)}
                className="flex items-center justify-center gap-1.5 py-2.5 rounded-xl border border-dashed border-slate-300 text-slate-400 hover:border-rail-400 hover:text-rail-600 hover:bg-rail-50 transition-all text-xs font-medium">
                <Plus size={12}/> Add Widget
              </button>
            )}

            {/* Empty state */}
            {!isEditing && col.widgets.length === 0 && (
              <div className="flex-1 rounded-xl border border-dashed border-slate-100 flex items-center justify-center py-8">
                <p className="text-xs text-slate-300">Empty</p>
              </div>
            )}

            {/* Column resize handle */}
            {isEditing && colIdx < row.columns.length - 1 && (
              <div className="absolute -right-1.5 top-0 bottom-0 w-3 cursor-col-resize flex items-center justify-center group z-20"
                onMouseDown={e => startResize(e, col.id, col.widthPercent)}>
                <div className="w-0.5 h-10 bg-rail-300 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"/>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Widget picker */}
      <AnimatePresence>
        {addToCol && <WidgetPicker onAdd={w => onAddWidget(addToCol, w)} onClose={() => setAddToCol(null)}/>}
      </AnimatePresence>
    </div>
  );
}

// ── Main WorkspaceBuilder ─────────────────────────────────────────────────────
export function WorkspaceBuilder({ cell }: { cell: string }) {
  const { user } = useAuthStore();
  const canManage = canManageCellStructure(user, cell);
  const workspaceHook = useWorkspace(cell, user ? { id: user.id, name: user.name } : undefined);

  const [layout, setLayout] = useState<RowBasedLayout | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [showPanel, setShowPanel] = useState(false);
  const [showDataManager, setShowDataManager] = useState(false);

  const dragRef = useRef<{ fromRowId: string; fromColId: string; fromWidgetId: string } | null>(null);

  useEffect(() => { setLayout(getRowLayout(cell)); }, [cell]);

  const commit = useCallback((next: RowBasedLayout) => {
    setLayout(next);
    saveRowLayout({ ...next, updatedBy: user?.id, updatedByName: user?.name });
  }, [user]);

  if (!layout) return (
    <div className="flex items-center justify-center py-12">
      <div className="w-5 h-5 border-2 border-rail-400/30 border-t-rail-400 rounded-full animate-spin"/>
    </div>
  );

  const handleDrop = (toRowId: string, toColId: string, toIdx: number) => {
    if (!dragRef.current) return;
    const { fromRowId, fromColId, fromWidgetId } = dragRef.current;
    const fromRow = layout.rows.find(r => r.id === fromRowId);
    const fromIdx = fromRow?.columns.find(c => c.id === fromColId)?.widgets.findIndex(w => w.id === fromWidgetId) ?? -1;
    if (fromIdx < 0) return;
    commit(moveWidgetInRow(layout, fromRowId, fromColId, fromIdx, toRowId, toColId, toIdx));
    dragRef.current = null;
  };

  const toggleWidget = (rowId: string, colId: string, widgetId: string, prop: 'collapsed' | 'pinned' | 'fullscreen') => {
    const row = layout.rows.find(r => r.id === rowId);
    const col = row?.columns.find(c => c.id === colId);
    const widget = col?.widgets.find(w => w.id === widgetId);
    if (!widget) return;
    commit(updateWidgetInRow(layout, rowId, colId, widgetId, { [prop]: !widget[prop] }));
  };

  return (
    <div className="space-y-4 pb-8">
      {/* Toolbar */}
      <div className="flex items-center justify-between gap-3 flex-wrap bg-white border border-slate-200 rounded-xl px-4 py-3"
        style={{ boxShadow: '0 1px 3px rgba(15,23,42,0.06)' }}>
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-rail-50 border border-rail-100 flex items-center justify-center">
            <LayoutGrid size={15} className="text-rail-600"/>
          </div>
          <div>
            <p className="text-sm font-bold text-slate-900">{cell} Workspace</p>
            <p className="text-[10px] text-slate-400">
              {layout.rows.length} row{layout.rows.length !== 1 ? 's' : ''} ·{' '}
              {layout.rows.reduce((s, r) => s + r.columns.reduce((cs, c) => cs + c.widgets.length, 0), 0)} widgets
              {layout.updatedByName && ` · by ${layout.updatedByName}`}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setShowDataManager(d => !d)}
            className={cn('flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all',
              showDataManager
                ? 'bg-rail-50 border-rail-200 text-rail-700'
                : 'bg-white border-slate-200 text-slate-500 hover:border-rail-200 hover:text-rail-600')}>
            <Table2 size={12}/> Tables & Data
          </button>
          {canManage && <>
            <button onClick={() => setShowPanel(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border border-slate-200 bg-white text-slate-500 hover:border-violet-300 hover:text-violet-600 transition-all">
              <Palette size={12}/> Layout
            </button>
            <button onClick={() => setIsEditing(e => !e)}
              className={cn('flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all',
                isEditing
                  ? 'bg-rail-600 border-rail-600 text-white hover:bg-rail-700'
                  : 'bg-white border-slate-200 text-slate-500 hover:border-rail-300 hover:text-rail-600')}>
              {isEditing ? <><Check size={12}/> Done</> : <><Settings2 size={12}/> Customize</>}
            </button>
          </>}
        </div>
      </div>

      {/* Edit mode banner */}
      {isEditing && canManage && (
        <div className="flex items-center gap-2 bg-rail-50 border border-rail-200 rounded-xl px-4 py-2.5">
          <Layers size={13} className="text-rail-600 shrink-0"/>
          <p className="text-xs text-rail-700 flex-1">
            Edit mode — drag widgets, resize columns by dragging edges, add rows below
          </p>
          <button onClick={() => setShowPanel(true)} className="text-xs text-rail-600 hover:text-rail-700 flex items-center gap-1 shrink-0 font-medium">
            <History size={11}/> Saved views
          </button>
        </div>
      )}

      {/* Rows */}
      <div className="space-y-3">
        {layout.rows.map((row, rowIdx) => (
          <WorkspaceRow
            key={row.id} row={row} rowIdx={rowIdx} totalRows={layout.rows.length}
            layout={layout} cell={cell} canManage={canManage} isEditing={isEditing}
            userId={user?.id} userName={user?.name} workspaceHook={workspaceHook}
            onUpdate={patch => commit(updateRow(layout, row.id, patch))}
            onRemove={() => commit(removeRow(layout, row.id))}
            onMoveUp={() => commit(moveRow(layout, row.id, 'up'))}
            onMoveDown={() => commit(moveRow(layout, row.id, 'down'))}
            onAddWidget={(colId, w) => commit(addWidgetToRow(layout, row.id, colId, w))}
            onRemoveWidget={(colId, widgetId) => commit(removeWidgetFromRow(layout, row.id, colId, widgetId))}
            onUpdateWidget={(colId, widgetId, patch) => commit(updateWidgetInRow(layout, row.id, colId, widgetId, patch))}
            onToggleWidget={(colId, widgetId, prop) => toggleWidget(row.id, colId, widgetId, prop)}
            onDragStart={(colId, widgetId) => { dragRef.current = { fromRowId: row.id, fromColId: colId, fromWidgetId: widgetId }; }}
            onDrop={handleDrop}
            onResizeCol={(colId, pct) => commit(resizeRowColumn(layout, row.id, colId, pct))}
          />
        ))}
      </div>

      {/* Add row button */}
      {isEditing && canManage && (
        <button onClick={() => commit(addRow(layout))}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border border-dashed border-slate-300 text-slate-400 hover:border-rail-400 hover:text-rail-600 hover:bg-rail-50 transition-all text-sm font-medium">
          <Plus size={14}/> Add Row
        </button>
      )}

      {/* Data manager */}
      {showDataManager && (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden" style={{ boxShadow: '0 1px 3px rgba(15,23,42,0.06)' }}>
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 bg-slate-50">
            <p className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Table2 size={14} className="text-rail-600"/> Tables & Data
            </p>
            <button onClick={() => setShowDataManager(false)} className="text-xs text-slate-400 hover:text-slate-600 flex items-center gap-1">
              <X size={12}/> Hide
            </button>
          </div>
          <div className="p-4"><CellDataManager cell={cell}/></div>
        </div>
      )}

      {/* Layout panel */}
      <AnimatePresence>
        {showPanel && (
          <LayoutPanel layout={layout}
            onApplyPreset={(rowId, widths) => commit(setRowColumns(layout, rowId, widths))}
            onSaveVersion={label => { if (user) commit(saveRowLayoutVersion(layout, label, user.id, user.name)); }}
            onLoadVersion={id => commit(loadRowLayoutVersion(layout, id))}
            onClose={() => setShowPanel(false)} user={user}/>
        )}
      </AnimatePresence>
    </div>
  );
}
