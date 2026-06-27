'use client';
import { useState, useEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutGrid, Table2, Plus, Settings2, Check, X, GripVertical,
  ChevronDown, ChevronUp, Maximize2, Pin, Copy, Trash2,
  Palette, MoreHorizontal, Lock, Globe, Users, Building,
  Edit3, Star, Archive, RefreshCw,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/store/authStore';
import { canManageCellStructure } from '@/lib/cellData/useCellDataStructure';
import { useWorkspace } from '@/lib/cellData/useWorkspace';
import { WidgetRenderer } from './WidgetRenderer';
import { CellDataManager } from '@/components/cell/CellDataManager';
import {
  getRowLayout, saveRowLayout, addRow, removeRow, moveRow, updateRow,
  setRowColumns, addWidgetToRow, removeWidgetFromRow, updateWidgetInRow,
  moveWidgetInRow, resizeRowColumn, saveRowLayoutVersion, loadRowLayoutVersion,
  ROW_COLUMN_PRESETS, type RowBasedLayout, type LayoutRow,
  type LayoutWidget, type WidgetType,
} from '@/lib/workspace/layoutEngine';
import {
  getWindowStore, saveWindowStore, createWindow, updateWindow, deleteWindow,
  getVisibleWindows, getWindowLayout, saveWindowLayout,
  type CellWindowStore, type CellWindow, type WindowVisibility,
  WINDOW_ICONS, WINDOW_COLORS,
} from '@/lib/workspace/windowsEngine';

// ── Portal modal helper ───────────────────────────────────────────────────────
function Modal({ open, onClose, children, maxWidth = 'max-w-sm' }: {
  open: boolean; onClose: () => void; children: React.ReactNode; maxWidth?: string;
}) {
  useEffect(() => {
    if (open) document.body.style.overflow = 'hidden';
    else document.body.style.overflow = '';
    return () => { document.body.style.overflow = ''; };
  }, [open]);
  if (!open || typeof window === 'undefined') return null;
  return createPortal(
    <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(3px)' }}
      onClick={onClose}>
      <motion.div initial={{ scale: 0.96, opacity: 0, y: 8 }} animate={{ scale: 1, opacity: 1, y: 0 }}
        className={cn('bg-white rounded-2xl w-full shadow-2xl overflow-hidden', maxWidth)}
        onClick={e => e.stopPropagation()}>
        {children}
      </motion.div>
    </div>,
    document.body
  );
}

// ── Create / Edit Window Modal ────────────────────────────────────────────────
const VIS_OPTIONS: { id: WindowVisibility; label: string; icon: React.ElementType; desc: string }[] = [
  { id: 'personal', label: 'Only Me',      icon: Lock,     desc: 'Private to your account' },
  { id: 'cell',     label: 'Cell Members', icon: Building, desc: 'Visible to all Cell members' },
  { id: 'role',     label: 'By Role',      icon: Users,    desc: 'Specific roles only' },
  { id: 'admin',    label: 'Admin Only',   icon: Lock,     desc: 'Maintenance & Admin only' },
  { id: 'public',   label: 'Everyone',     icon: Globe,    desc: 'Visible to all users' },
];

function WindowFormModal({ open, onClose, onSave, initial, existingWindows }: {
  open: boolean; onClose: () => void;
  onSave: (label: string, icon: string, vis: WindowVisibility, roles: string[], cloneFrom: string) => void;
  initial?: Partial<CellWindow>; existingWindows: CellWindow[];
}) {
  const [label, setLabel]   = useState(initial?.label ?? 'New Window');
  const [icon, setIcon]     = useState(initial?.icon ?? '📋');
  const [vis, setVis]       = useState<WindowVisibility>(initial?.visibility ?? 'cell');
  const [roles, setRoles]   = useState<string[]>(initial?.visibleToRoles ?? []);
  const [cloneFrom, setCloneFrom] = useState('');
  const ALL_ROLES = ['admin', 'maintenance', 'incharge', 'user'];

  const handleSave = () => { if (!label.trim()) return; onSave(label.trim(), icon, vis, roles, cloneFrom); onClose(); };

  return (
    <Modal open={open} onClose={onClose} maxWidth="max-w-md">
      <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
        <p className="text-sm font-bold text-slate-900">{initial ? 'Edit Window' : 'Create Window'}</p>
        <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400"><X size={15}/></button>
      </div>
      <div className="p-5 space-y-5 max-h-[70vh] overflow-y-auto">
        {/* Name + icon */}
        <div>
          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-2">Window Name</label>
          <div className="flex gap-2">
            <div className="relative">
              <button className="w-12 h-10 rounded-xl border border-slate-200 text-xl flex items-center justify-center hover:bg-slate-50"
                onClick={e => e.stopPropagation()}>
                {icon}
              </button>
              <div className="absolute top-full left-0 mt-1 z-10 bg-white border border-slate-200 rounded-xl shadow-lg p-2 grid grid-cols-5 gap-1 w-36">
                {WINDOW_ICONS.map(em => (
                  <button key={em} onClick={() => setIcon(em)}
                    className={cn('text-lg p-1 rounded-lg hover:bg-slate-100', icon === em && 'bg-rail-50 ring-1 ring-rail-400')}>
                    {em}
                  </button>
                ))}
              </div>
            </div>
            <input value={label} onChange={e => setLabel(e.target.value)} autoFocus
              onKeyDown={e => e.key === 'Enter' && handleSave()}
              className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-800 focus:outline-none focus:border-rail-400"/>
          </div>
        </div>

        {/* Visibility */}
        <div>
          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-2">Visibility</label>
          <div className="space-y-1.5">
            {VIS_OPTIONS.map(opt => {
              const Icon = opt.icon;
              return (
                <button key={opt.id} onClick={() => setVis(opt.id)}
                  className={cn('flex items-center gap-3 w-full px-3 py-2.5 rounded-xl border text-left transition-all',
                    vis === opt.id ? 'bg-rail-50 border-rail-400' : 'border-slate-200 hover:bg-slate-50')}>
                  <div className={cn('w-7 h-7 rounded-lg flex items-center justify-center shrink-0',
                    vis === opt.id ? 'bg-rail-100' : 'bg-slate-100')}>
                    <Icon size={13} className={vis === opt.id ? 'text-rail-600' : 'text-slate-400'}/>
                  </div>
                  <div className="flex-1">
                    <p className={cn('text-xs font-semibold', vis === opt.id ? 'text-rail-800' : 'text-slate-700')}>{opt.label}</p>
                    <p className="text-[10px] text-slate-400">{opt.desc}</p>
                  </div>
                  {vis === opt.id && <Check size={13} className="text-rail-600 shrink-0"/>}
                </button>
              );
            })}
          </div>
          {vis === 'role' && (
            <div className="mt-3 p-3 bg-slate-50 rounded-xl border border-slate-200">
              <p className="text-[10px] font-bold text-slate-500 mb-2">Select Roles</p>
              <div className="flex flex-wrap gap-2">
                {ALL_ROLES.map(role => (
                  <button key={role} onClick={() => setRoles(r => r.includes(role) ? r.filter(x => x !== role) : [...r, role])}
                    className={cn('px-2.5 py-1.5 rounded-lg text-xs font-semibold border capitalize transition-all',
                      roles.includes(role) ? 'bg-rail-600 border-rail-600 text-white' : 'border-slate-200 text-slate-600 hover:bg-slate-100')}>
                    {role}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Clone from */}
        {!initial && existingWindows.length > 0 && (
          <div>
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">Copy layout from</label>
            <select value={cloneFrom} onChange={e => setCloneFrom(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-700 focus:outline-none focus:border-rail-400">
              <option value="">Start blank</option>
              {existingWindows.map(w => <option key={w.id} value={w.id}>{w.icon} {w.label}</option>)}
            </select>
          </div>
        )}
      </div>
      <div className="flex gap-3 px-5 py-4 border-t border-slate-100 bg-slate-50">
        <button onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-500 hover:bg-white">Cancel</button>
        <button onClick={handleSave} disabled={!label.trim()}
          className="flex-1 py-2.5 rounded-xl bg-rail-600 hover:bg-rail-700 text-white text-sm font-bold disabled:opacity-40">
          {initial ? 'Save Changes' : 'Create Window'}
        </button>
      </div>
    </Modal>
  );
}

// ── Window context menu (portal) ──────────────────────────────────────────────
function WindowMenu({ win, btnRef, open, onClose, onRename, onDuplicate, onDelete, onPin, onSetDefault }: {
  win: CellWindow; btnRef: React.RefObject<HTMLElement>; open: boolean; onClose: () => void;
  onRename: () => void; onDuplicate: () => void; onDelete: () => void;
  onPin: () => void; onSetDefault: () => void;
}) {
  const [pos, setPos] = useState({ top: 0, left: 0 });
  useEffect(() => {
    if (!open || !btnRef.current) return;
    const r = btnRef.current.getBoundingClientRect();
    setPos({ top: r.bottom + 4 + window.scrollY, left: r.left });
  }, [open, btnRef]);

  if (!open || typeof window === 'undefined') return null;
  return createPortal(
    <>
      <div className="fixed inset-0 z-[1998]" onClick={onClose}/>
      <div className="fixed z-[1999] bg-white border border-slate-200 rounded-xl shadow-xl py-1 w-44"
        style={{ top: pos.top, left: pos.left }}>
        <button onClick={() => { onRename(); onClose(); }} className="flex items-center gap-2 px-3 py-2 text-xs text-slate-700 hover:bg-slate-50 w-full"><Edit3 size={11} className="text-slate-400"/> Rename</button>
        <button onClick={() => { onPin(); onClose(); }} className="flex items-center gap-2 px-3 py-2 text-xs text-slate-700 hover:bg-slate-50 w-full"><Pin size={11} className="text-slate-400"/> {win.isPinned ? 'Unpin' : 'Pin'}</button>
        <button onClick={() => { onSetDefault(); onClose(); }} className="flex items-center gap-2 px-3 py-2 text-xs text-slate-700 hover:bg-slate-50 w-full"><Star size={11} className="text-slate-400"/> Set as default</button>
        <button onClick={() => { onDuplicate(); onClose(); }} className="flex items-center gap-2 px-3 py-2 text-xs text-slate-700 hover:bg-slate-50 w-full"><Copy size={11} className="text-slate-400"/> Duplicate</button>
        <div className="border-t border-slate-100 my-1"/>
        <button onClick={() => { onDelete(); onClose(); }} className="flex items-center gap-2 px-3 py-2 text-xs text-red-600 hover:bg-red-50 w-full"><Trash2 size={11}/> Delete</button>
      </div>
    </>,
    document.body
  );
}

// ── Workspace Row ─────────────────────────────────────────────────────────────
function WorkspaceRow({
  row, rowIdx, totalRows, cell, canManage, isEditing,
  userId, userName, workspaceHook, layout,
  onUpdate, onRemove, onMoveUp, onMoveDown,
  onAddWidget, onRemoveWidget, onUpdateWidget, onToggleWidget,
  onDragStart, onDrop, onResizeCol,
}: {
  row: LayoutRow; rowIdx: number; totalRows: number; cell: string;
  canManage: boolean; isEditing: boolean; userId?: string; userName?: string;
  workspaceHook: any; layout: RowBasedLayout;
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
  const [hovering, setHovering] = useState(false);
  const [pickCol, setPickCol]   = useState<string | null>(null);

  // Widget type picker for column
  const WidgetTypePicker = ({ colId }: { colId: string }) => (
    <div className="grid grid-cols-2 gap-1.5 p-2 max-h-60 overflow-y-auto">
      {[
        { type: 'table' as WidgetType, label: 'Table', icon: '📊' },
        { type: 'kpi' as WidgetType, label: 'KPI', icon: '📈' },
        { type: 'text' as WidgetType, label: 'Text', icon: '📝' },
        { type: 'heading' as WidgetType, label: 'Heading', icon: '📌' },
        { type: 'callout' as WidgetType, label: 'Callout', icon: '💡' },
        { type: 'divider' as WidgetType, label: 'Divider', icon: '➖' },
        { type: 'toggle' as WidgetType, label: 'Toggle', icon: '▶' },
        { type: 'checklist' as WidgetType, label: 'Checklist', icon: '✅' },
        { type: 'staff' as WidgetType, label: 'Staff', icon: '👥' },
        { type: 'approval_queue' as WidgetType, label: 'Approvals', icon: '🔔' },
        { type: 'google_links' as WidgetType, label: 'Links', icon: '🔗' },
        { type: 'google_sheet' as WidgetType, label: 'Gsheet', icon: '📋' },
        { type: 'powerbi' as WidgetType, label: 'Power BI', icon: '📉' },
        { type: 'embed' as WidgetType, label: 'Embed', icon: '🌐' },
        { type: 'announcements' as WidgetType, label: 'Notices', icon: '📢' },
        { type: 'activity' as WidgetType, label: 'Activity', icon: '⚡' },
      ].map(({ type, label, icon }) => (
        <button key={type}
          onClick={() => { onAddWidget(colId, { type, title: label }); setPickCol(null); }}
          className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg hover:bg-rail-50 hover:border-rail-200 border border-transparent text-xs text-slate-600 font-medium text-left">
          <span>{icon}</span> {label}
        </button>
      ))}
    </div>
  );

  return (
    <div className={cn('relative group/row border border-slate-200 rounded-xl overflow-visible bg-white transition-all', isEditing && 'border-slate-300')}
      style={{ boxShadow: '0 1px 3px rgba(15,23,42,0.06)' }}
      onMouseEnter={() => setHovering(true)} onMouseLeave={() => setHovering(false)}>

      {/* Row controls (edit mode only) */}
      {isEditing && canManage && (
        <div className="absolute -left-8 top-2 flex flex-col gap-0.5 z-10">
          <button onClick={onMoveUp} disabled={rowIdx === 0} className="w-6 h-6 rounded hover:bg-slate-200 flex items-center justify-center text-slate-400 disabled:opacity-20"><ChevronUp size={12}/></button>
          <GripVertical size={12} className="text-slate-300 mx-auto"/>
          <button onClick={onMoveDown} disabled={rowIdx === totalRows - 1} className="w-6 h-6 rounded hover:bg-slate-200 flex items-center justify-center text-slate-400 disabled:opacity-20"><ChevronDown size={12}/></button>
        </div>
      )}
      {isEditing && canManage && (
        <button onClick={onRemove} className="absolute -right-2 -top-2 z-10 w-5 h-5 rounded-full bg-red-500 text-white flex items-center justify-center opacity-0 group-hover/row:opacity-100 transition-opacity hover:bg-red-600">
          <X size={10}/>
        </button>
      )}

      {/* Columns */}
      <div className="flex min-h-[60px]" style={{ alignItems: 'stretch' }}>
        {row.columns.map((col, colIdx) => (
          <div key={col.id} className="relative flex flex-col"
            style={{ width: `${col.widthPercent}%`, minWidth: 0, borderRight: colIdx < row.columns.length - 1 ? '1px solid #f1f5f9' : 'none' }}>

            {/* Column content */}
            <div className="flex-1 p-3 space-y-3">
              {col.widgets.map((widget, wIdx) => (
                <div key={widget.id} className="relative group/widget"
                  draggable={isEditing}
                  onDragStart={() => onDragStart(col.id, widget.id)}
                  onDragOver={e => e.preventDefault()}
                  onDrop={() => onDrop(row.id, col.id, wIdx)}>

                  {/* Widget card */}
                  <div className={cn('bg-white border border-slate-100 rounded-xl overflow-visible transition-all',
                    widget.fullscreen && 'fixed inset-4 z-[300] shadow-2xl')}>

                    {/* Widget header */}
                    {widget.type !== 'divider' && (
                      <div className="flex items-center gap-2 px-3 py-2 border-b border-slate-50">
                        {isEditing && <GripVertical size={11} className="text-slate-300 shrink-0 cursor-grab"/>}
                        <p className="text-xs font-semibold text-slate-700 flex-1 truncate">{widget.title}</p>
                        <div className="flex gap-0.5 opacity-0 group-hover/widget:opacity-100 transition-opacity">
                          <button onClick={() => onToggleWidget(col.id, widget.id, 'collapsed')} title="Collapse"
                            className="p-1 rounded hover:bg-slate-100 text-slate-300 hover:text-slate-600">
                            {widget.collapsed ? <ChevronDown size={11}/> : <ChevronUp size={11}/>}
                          </button>
                          <button onClick={() => onToggleWidget(col.id, widget.id, 'fullscreen')} title="Fullscreen"
                            className="p-1 rounded hover:bg-slate-100 text-slate-300 hover:text-slate-600"><Maximize2 size={11}/></button>
                          {isEditing && canManage && (
                            <button onClick={() => onRemoveWidget(col.id, widget.id)} title="Remove"
                              className="p-1 rounded hover:bg-red-50 text-slate-300 hover:text-red-500"><Trash2 size={11}/></button>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Widget body */}
                    {!widget.collapsed && (
                      <div className={cn('p-3', widget.type === 'divider' && 'p-1')}>
                        <WidgetRenderer
                          widget={widget} cell={cell} canManage={canManage}
                          workspaceHook={workspaceHook}
                          onUpdate={patch => onUpdateWidget(col.id, widget.id, patch)}
                        />
                      </div>
                    )}
                  </div>
                </div>
              ))}

              {/* Add widget to column */}
              {(isEditing || col.widgets.length === 0) && canManage && (
                <div className="relative">
                  {pickCol === col.id ? (
                    <div className="bg-white border border-slate-200 rounded-xl shadow-md overflow-hidden">
                      <div className="flex items-center justify-between px-3 py-2 border-b border-slate-100 bg-slate-50">
                        <p className="text-xs font-bold text-slate-600">Add block</p>
                        <button onClick={() => setPickCol(null)} className="text-slate-400 hover:text-slate-600"><X size={12}/></button>
                      </div>
                      <WidgetTypePicker colId={col.id}/>
                    </div>
                  ) : (
                    <button onClick={() => setPickCol(col.id)}
                      className="w-full flex items-center justify-center gap-1.5 py-2.5 rounded-xl border border-dashed border-slate-200 text-slate-300 hover:border-rail-300 hover:text-rail-500 hover:bg-rail-50/50 transition-all text-xs font-medium">
                      <Plus size={12}/> {col.widgets.length === 0 ? 'Add block' : 'Add another block'}
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Column layout selector (edit mode) */}
      {isEditing && canManage && (
        <div className="border-t border-slate-50 px-3 py-2 flex items-center gap-2">
          <p className="text-[10px] text-slate-400 font-medium">Columns:</p>
          <div className="flex gap-1">
            {ROW_COLUMN_PRESETS.slice(0, 5).map(preset => (
              <button key={preset.label}
                onClick={() => {
                  // apply preset to this row via parent commit
                  const p = { ...layout };
                  const rIdx = p.rows.findIndex(r => r.id === row.id);
                  if (rIdx < 0) return;
                  const newCols = preset.widths.map((w, i) => ({
                    id: row.columns[i]?.id ?? `c${Date.now()}${i}`,
                    widthPercent: w,
                    widgets: row.columns[i]?.widgets ?? [],
                  }));
                  p.rows[rIdx] = { ...row, columns: newCols };
                }}
                className={cn(
                  'px-2 py-1 text-[10px] rounded-lg border font-medium transition-all',
                  row.columns.length === preset.widths.length
                    ? 'bg-rail-600 text-white border-rail-600'
                    : 'border-slate-200 text-slate-500 hover:bg-slate-50'
                )}
                title={preset.label}>
                {preset.widths.length}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main WorkspaceBuilder ─────────────────────────────────────────────────────
export function WorkspaceBuilder({ cell, pendingWidget, onPendingConsumed }: {
  cell: string;
  pendingWidget?: { type: WidgetType; title: string } | null;
  onPendingConsumed?: () => void;
}) {
  const { user } = useAuthStore();
  const canManage = canManageCellStructure(user, cell);
  const workspaceHook = useWorkspace(cell, user ? { id: user.id, name: user.name } : undefined);

  // Windows state
  const [winStore, setWinStore] = useState<CellWindowStore | null>(null);
  const [showCreateWin, setShowCreateWin]   = useState(false);
  const [editingWin,    setEditingWin]      = useState<CellWindow | null>(null);
  const [deleteTargetWin, setDeleteTargetWin] = useState<CellWindow | null>(null);
  const [openMenu,      setOpenMenu]        = useState<string | null>(null);
  const menuBtnRefs = useRef<Record<string, HTMLButtonElement>>({});

  // Current window's layout
  const [layout, setLayout]     = useState<RowBasedLayout | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [showDataManager, setShowDataManager] = useState(false);
  const dragRef = useRef<{ fromRowId: string; fromColId: string; fromWidgetId: string } | null>(null);

  // Load window store
  useEffect(() => {
    const store = getWindowStore(cell, user?.id ?? 'system', user?.name ?? 'System');
    setWinStore(store);
  }, [cell, user?.id]);

  // Load layout for active window
  useEffect(() => {
    if (!winStore) return;
    setLayout(getWindowLayout(cell, winStore.activeWindowId));
  }, [cell, winStore?.activeWindowId]);

  // Consume pendingWidget — add to first available column
  useEffect(() => {
    if (!pendingWidget || !layout || !winStore) return;
    let next: RowBasedLayout;
    if (layout.rows.length === 0) {
      next = addRow(layout);
      const col = next.rows[0].columns[0];
      next = addWidgetToRow(next, next.rows[0].id, col.id, { type: pendingWidget.type, title: pendingWidget.title });
    } else {
      const row = layout.rows[0];
      const col = row.columns[0];
      next = addWidgetToRow(layout, row.id, col.id, { type: pendingWidget.type, title: pendingWidget.title });
    }
    commitLayout(next);
    onPendingConsumed?.();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingWidget]);

  const commitStore = useCallback((next: CellWindowStore) => {
    setWinStore(next); saveWindowStore(next);
  }, []);

  const commitLayout = useCallback((next: RowBasedLayout) => {
    if (!winStore) return;
    setLayout(next);
    saveWindowLayout(cell, winStore.activeWindowId, { ...next, updatedBy: user?.id, updatedByName: user?.name });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cell, winStore?.activeWindowId, user?.id]);

  const handleDrop = (toRowId: string, toColId: string, toIdx: number) => {
    if (!dragRef.current || !layout) return;
    const { fromRowId, fromColId, fromWidgetId } = dragRef.current;
    const srcRow = layout.rows.find(r => r.id === fromRowId);
    const srcCol = srcRow?.columns.find(c => c.id === fromColId);
    const fromIdx = srcCol?.widgets.findIndex(w => w.id === fromWidgetId) ?? 0;
    commitLayout(moveWidgetInRow(layout, fromRowId, fromColId, fromIdx, toRowId, toColId, toIdx));
    dragRef.current = null;
  };

  if (!winStore || !layout) return (
    <div className="flex items-center justify-center py-12">
      <div className="w-5 h-5 border-2 border-rail-400/30 border-t-rail-400 rounded-full animate-spin"/>
    </div>
  );

  const visibleWindows = getVisibleWindows(winStore, user?.id ?? '', user?.role ?? 'user');
  const activeWin = winStore.windows.find(w => w.id === winStore.activeWindowId);

  return (
    <div className="space-y-3">

      {/* ── Windows tab bar ──────────────────────────────────────────────── */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-visible"
        style={{ boxShadow: '0 1px 6px rgba(15,23,42,0.08)' }}>

        {/* Tab row */}
        <div className="flex items-center border-b border-slate-100 px-2 overflow-x-auto"
          style={{ overflowY: 'visible' }}>
          {visibleWindows.map(win => {
            const isActive = win.id === winStore.activeWindowId;
            return (
              <div key={win.id} className="relative shrink-0">
                <div className={cn(
                  'flex items-center gap-1.5 px-3 py-2.5 border-b-2 transition-all cursor-pointer whitespace-nowrap',
                  isActive ? 'text-rail-600 border-rail-600' : 'text-slate-500 border-transparent hover:text-slate-700 hover:bg-slate-50'
                )}>
                  <button onClick={() => commitStore({ ...winStore, activeWindowId: win.id })}
                    className="flex items-center gap-1.5 text-xs font-semibold">
                    <span>{win.icon ?? '📋'}</span>
                    {win.label}
                    {win.isDefault && <Star size={9} className="text-amber-400 fill-amber-400 shrink-0"/>}
                    {win.isPinned && <Pin size={9} className="text-slate-300 shrink-0"/>}
                    {win.visibility === 'personal' && <Lock size={9} className="text-slate-300 shrink-0"/>}
                  </button>
                  {canManage && (
                    <button
                      ref={el => { if (el) menuBtnRefs.current[win.id] = el; }}
                      onClick={e => { e.stopPropagation(); setOpenMenu(m => m === win.id ? null : win.id); }}
                      className="p-0.5 rounded hover:bg-slate-100 text-slate-300 hover:text-slate-500">
                      <MoreHorizontal size={12}/>
                    </button>
                  )}
                </div>

                <WindowMenu
                  win={win}
                  btnRef={{ current: menuBtnRefs.current[win.id] }}
                  open={openMenu === win.id} onClose={() => setOpenMenu(null)}
                  onRename={() => setEditingWin(win)}
                  onDuplicate={() => {
                    const next = createWindow(winStore, win.label + ' (copy)', win.icon ?? '📋', win.visibility, user?.id ?? '', user?.name ?? 'User', win.visibleToRoles, win.visibleToUsers, win.id);
                    commitStore(next);
                  }}
                  onDelete={() => setDeleteTargetWin(win)}
                  onPin={() => commitStore(updateWindow(winStore, win.id, { isPinned: !win.isPinned }))}
                  onSetDefault={() => {
                    const next = { ...winStore, windows: winStore.windows.map(w => ({ ...w, isDefault: w.id === win.id })) };
                    commitStore(next);
                  }}
                />
              </div>
            );
          })}

          {/* + New Window */}
          {canManage && (
            <button onClick={() => setShowCreateWin(true)}
              className="flex items-center gap-1 px-2.5 py-2.5 text-[11px] font-medium text-slate-400 hover:text-rail-600 hover:bg-slate-50 transition-colors rounded-lg shrink-0 ml-1 whitespace-nowrap">
              <Plus size={12}/> New Window
            </button>
          )}

          {/* Right: toolbar actions */}
          <div className="ml-auto flex items-center gap-1.5 px-3 shrink-0">
            <button onClick={() => setShowDataManager(d => !d)}
              className={cn('flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition-all',
                showDataManager ? 'bg-rail-50 border-rail-200 text-rail-700' : 'bg-white border-slate-200 text-slate-500 hover:border-slate-300')}>
              <Table2 size={11}/> <span className="hidden sm:inline">Data</span>
            </button>
            {canManage && (
              <button onClick={() => setIsEditing(e => !e)}
                className={cn('flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition-all',
                  isEditing ? 'bg-rail-600 border-rail-600 text-white' : 'bg-white border-slate-200 text-slate-500 hover:border-slate-300')}>
                {isEditing ? <><Check size={11}/> Done</> : <><Settings2 size={11}/> Edit</>}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ── Edit mode banner ─────────────────────────────────────────────── */}
      {isEditing && canManage && (
        <div className="flex items-center gap-2 bg-rail-50 border border-rail-200 rounded-xl px-4 py-2.5">
          <LayoutGrid size={13} className="text-rail-600 shrink-0"/>
          <p className="text-xs text-rail-700 flex-1">
            Edit mode — drag widgets between columns, use the column buttons to change layout
          </p>
        </div>
      )}

      {/* ── Rows ─────────────────────────────────────────────────────────── */}
      <div className="space-y-3">
        {layout.rows.map((row, rowIdx) => (
          <WorkspaceRow
            key={row.id} row={row} rowIdx={rowIdx} totalRows={layout.rows.length}
            cell={cell} canManage={canManage} isEditing={isEditing} layout={layout}
            userId={user?.id} userName={user?.name} workspaceHook={workspaceHook}
            onUpdate={patch => commitLayout(updateRow(layout, row.id, patch))}
            onRemove={() => commitLayout(removeRow(layout, row.id))}
            onMoveUp={() => commitLayout(moveRow(layout, row.id, 'up'))}
            onMoveDown={() => commitLayout(moveRow(layout, row.id, 'down'))}
            onAddWidget={(colId, w) => commitLayout(addWidgetToRow(layout, row.id, colId, w))}
            onRemoveWidget={(colId, wid) => commitLayout(removeWidgetFromRow(layout, row.id, colId, wid))}
            onUpdateWidget={(colId, wid, patch) => commitLayout(updateWidgetInRow(layout, row.id, colId, wid, patch))}
            onToggleWidget={(colId, wid, prop) => {
              const rr = layout.rows.find(r => r.id === row.id);
              const cc = rr?.columns.find(c => c.id === colId);
              const ww = cc?.widgets.find(w => w.id === wid);
              if (!ww) return;
              commitLayout(updateWidgetInRow(layout, row.id, colId, wid, { [prop]: !(ww as any)[prop] }));
            }}
            onDragStart={(colId, widgetId) => { dragRef.current = { fromRowId: row.id, fromColId: colId, fromWidgetId: widgetId }; }}
            onDrop={handleDrop}
            onResizeCol={(colId, pct) => commitLayout(resizeRowColumn(layout, row.id, colId, pct))}
          />
        ))}
      </div>

      {/* ── Add Row ──────────────────────────────────────────────────────── */}
      {canManage && (
        <button onClick={() => commitLayout(addRow(layout))}
          className={cn('w-full flex items-center justify-center gap-2 py-3 rounded-xl border border-dashed transition-all text-sm font-medium',
            isEditing
              ? 'border-rail-300 text-rail-500 hover:bg-rail-50 bg-rail-50/30'
              : 'border-slate-200 text-slate-300 hover:border-slate-300 hover:text-slate-400 hover:bg-slate-50')}>
          <Plus size={14}/> Add Row
        </button>
      )}

      {/* ── Data manager ─────────────────────────────────────────────────── */}
      {showDataManager && (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden" style={{ boxShadow: '0 1px 3px rgba(15,23,42,0.06)' }}>
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 bg-slate-50">
            <p className="text-sm font-bold text-slate-900 flex items-center gap-2"><Table2 size={14} className="text-rail-600"/> Tables & Data</p>
            <button onClick={() => setShowDataManager(false)} className="text-xs text-slate-400 hover:text-slate-600 flex items-center gap-1"><X size={12}/> Hide</button>
          </div>
          <div className="p-4"><CellDataManager cell={cell}/></div>
        </div>
      )}

      {/* ── Modals ───────────────────────────────────────────────────────── */}
      <AnimatePresence>
        {showCreateWin && (
          <WindowFormModal
            open={showCreateWin} onClose={() => setShowCreateWin(false)}
            existingWindows={winStore.windows}
            onSave={(label, icon, vis, roles, cloneFrom) => {
              const next = createWindow(winStore, label, icon, vis, user?.id ?? '', user?.name ?? 'User', roles, undefined, cloneFrom || undefined);
              commitStore(next);
            }}
          />
        )}
        {editingWin && (
          <WindowFormModal
            open={!!editingWin} onClose={() => setEditingWin(null)}
            initial={editingWin} existingWindows={winStore.windows}
            onSave={(label, icon, vis, roles) => {
              commitStore(updateWindow(winStore, editingWin.id, { label, icon, visibility: vis, visibleToRoles: roles }));
            }}
          />
        )}
        {deleteTargetWin && (
          <Modal open={!!deleteTargetWin} onClose={() => setDeleteTargetWin(null)} maxWidth="max-w-sm">
            <div className="p-6 text-center space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-red-50 flex items-center justify-center mx-auto">
                <Trash2 size={20} className="text-red-500"/>
              </div>
              <div>
                <p className="text-sm font-bold text-slate-900">Delete Window</p>
                <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
                  Delete <strong>"{deleteTargetWin.label}"</strong>? The window layout will be removed. Underlying databases are not affected.
                </p>
              </div>
              <div className="flex gap-3">
                <button onClick={() => setDeleteTargetWin(null)} className="flex-1 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-500 hover:bg-slate-50">Cancel</button>
                <button onClick={() => { commitStore(deleteWindow(winStore, deleteTargetWin.id)); setDeleteTargetWin(null); }}
                  className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-sm font-bold">Delete</button>
              </div>
            </div>
          </Modal>
        )}
      </AnimatePresence>
    </div>
  );
}
