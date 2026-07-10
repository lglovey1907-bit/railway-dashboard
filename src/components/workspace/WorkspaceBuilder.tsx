'use client';
import { useState, useEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutGrid, Table2, Plus, Settings2, Check, X, GripVertical,
  ChevronDown, ChevronUp, ChevronLeft, ChevronRight, Maximize2, Pin, Copy, Trash2,
  Palette, MoreHorizontal, Lock, Globe, Users, Building,
  Edit3, Star, Archive, RefreshCw, Database, ScanSearch, PanelRight,
} from 'lucide-react';
import { DatabasePeekModal, DatabaseFullPage, type DbPeekMode } from '@/components/database/DatabasePeekModal';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/store/authStore';
import { canManageCellStructure } from '@/lib/cellData/useCellDataStructure';
import { useWorkspace } from '@/lib/cellData/useWorkspace';
import { WidgetRenderer } from './WidgetRenderer';
import { CellDataManager } from '@/components/cell/CellDataManager';
import { SanitationStatusWidget } from '@/components/dashboard/SanitationStatusWidget';
import { loadWindowLayoutFromCloud, loadWindowStoreFromCloud } from '@/lib/workspace/windowsEngine';
import {
  getRowLayout, saveRowLayout, addRow, removeRow, moveRow, updateRow,
  setRowColumns, addWidgetToRow, removeWidgetFromRow, updateWidgetInRow,
  moveWidgetInRow, resizeRowColumn, saveRowLayoutVersion, loadRowLayoutVersion,
  ROW_COLUMN_PRESETS, type RowBasedLayout, type LayoutRow,
  type LayoutColumn, type LayoutWidget, type WidgetType,
} from '@/lib/workspace/layoutEngine';
import {
  getWindowStore, saveWindowStore, createWindow, updateWindow, deleteWindow,
  getVisibleWindows, getWindowLayout, saveWindowLayout, canEditWindow,
  type CellWindowStore, type CellWindow, type WindowVisibility,
  WINDOW_ICONS, WINDOW_COLORS,
} from '@/lib/workspace/windowsEngine';
import { getStaffForCell, getAllMasterStaff, STAFF_CHANGED_EVENT, type MasterStaffRecord } from '@/lib/staff/masterStaff';
import { SearchTrigger } from '@/components/search/UniversalSearch';

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

function WindowFormModal({ open, onClose, onSave, initial, existingWindows, cell }: {
  open: boolean; onClose: () => void;
  onSave: (label: string, icon: string, vis: WindowVisibility, roles: string[], cloneFrom: string, users: string[], editors: string[]) => void;
  initial?: Partial<CellWindow>; existingWindows: CellWindow[]; cell: string;
}) {
  const [label, setLabel]       = useState(initial?.label ?? 'New Window');
  const [icon, setIcon]         = useState(initial?.icon ?? '📋');
  const [showIconPicker, setShowIconPicker] = useState(false);
  const [vis, setVis]           = useState<WindowVisibility>(initial?.visibility ?? 'cell');
  const [roles, setRoles]       = useState<string[]>(initial?.visibleToRoles ?? []);
  const [cloneFrom, setCloneFrom] = useState('');
  const [selectedUsers, setSelectedUsers] = useState<string[]>(initial?.visibleToUsers ?? []);
  const [selectedEditors, setSelectedEditors] = useState<string[]>(initial?.editableByUsers ?? []);
  const [cellMembers, setCellMembers] = useState<MasterStaffRecord[]>([]);
  const [adminUsers, setAdminUsers] = useState<MasterStaffRecord[]>([]);
  const ALL_ROLES = ['admin', 'maintenance', 'incharge', 'user'];

  // Cell members are needed for the Editors picker regardless of the chosen
  // visibility mode, so load them independently of `vis`.
  useEffect(() => {
    setCellMembers(getStaffForCell(cell));
  }, [cell]);

  useEffect(() => {
    if (vis === 'cell') {
      setCellMembers(getStaffForCell(cell));
    } else if (vis === 'admin') {
      setAdminUsers(getAllMasterStaff().filter(s => s.role === 'admin' || s.role === 'maintenance' || s.workingAs === 'admin' || s.workingAs === 'maintenance'));
    }
    // Reset user selection when switching visibility mode
    setSelectedUsers(initial?.visibleToUsers ?? []);
  }, [vis, cell, initial]);

  const handleSave = () => { if (!label.trim()) return; onSave(label.trim(), icon, vis, roles, cloneFrom, selectedUsers, selectedEditors); onClose(); };

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
              <button
                type="button"
                className="w-12 h-10 rounded-xl border border-slate-200 text-xl flex items-center justify-center hover:bg-slate-50 transition-colors"
                onClick={e => { e.stopPropagation(); setShowIconPicker(v => !v); }}>
                {icon}
              </button>
              {showIconPicker && (
                <>
                  {/* Click-outside overlay */}
                  <div className="fixed inset-0 z-[9]" onClick={() => setShowIconPicker(false)}/>
                  <div className="absolute top-full left-0 mt-1 z-10 bg-white border border-slate-200 rounded-xl shadow-lg p-2 grid grid-cols-5 gap-1 w-36">
                    {WINDOW_ICONS.map(em => (
                      <button
                        key={em}
                        type="button"
                        onClick={() => { setIcon(em); setShowIconPicker(false); }}
                        className={cn('text-lg p-1 rounded-lg hover:bg-slate-100 transition-colors', icon === em && 'bg-rail-50 ring-1 ring-rail-400')}>
                        {em}
                      </button>
                    ))}
                  </div>
                </>
              )}
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

          {/* Cell member picker */}
          {vis === 'cell' && (
            <div className="mt-3 p-3 bg-slate-50 rounded-xl border border-slate-200">
              <div className="flex items-center justify-between mb-2.5">
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Share with specific members</p>
                <button type="button"
                  onClick={() => setSelectedUsers(selectedUsers.length === cellMembers.length && cellMembers.length > 0 ? [] : cellMembers.map(s => s.id))}
                  className="text-[10px] font-semibold text-rail-600 hover:underline">
                  {selectedUsers.length === cellMembers.length && cellMembers.length > 0 ? 'Deselect All' : 'Select All'}
                </button>
              </div>
              {cellMembers.length === 0 ? (
                <p className="text-[10px] text-slate-400 text-center py-3">No members found in this cell</p>
              ) : (
                <div className="space-y-1 max-h-40 overflow-y-auto custom-scroll">
                  {cellMembers.map(member => {
                    const initials = member.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
                    const checked = selectedUsers.includes(member.id);
                    return (
                      <label key={member.id}
                        className={cn('flex items-center gap-2.5 px-2.5 py-2 rounded-lg cursor-pointer transition-colors',
                          checked ? 'bg-rail-50 border border-rail-200' : 'hover:bg-white border border-transparent')}>
                        <input type="checkbox" checked={checked}
                          onChange={() => setSelectedUsers(u => checked ? u.filter(x => x !== member.id) : [...u, member.id])}
                          className="rounded border-slate-300 text-rail-600 focus:ring-rail-400 shrink-0"/>
                        <div className="w-6 h-6 rounded-full bg-gradient-to-br from-slate-400 to-slate-600 flex items-center justify-center text-[9px] font-bold text-white shrink-0">
                          {initials}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold text-slate-800 truncate">{member.name}</p>
                          <p className="text-[9px] text-slate-400 truncate">{member.designation}{member.workingAs ? ` · ${member.workingAs}` : ''}</p>
                        </div>
                      </label>
                    );
                  })}
                </div>
              )}
              <p className="text-[9px] text-slate-400 mt-2 italic">
                {selectedUsers.length === 0 ? 'No selection = visible to all cell members' : `${selectedUsers.length} member${selectedUsers.length !== 1 ? 's' : ''} selected`}
              </p>
            </div>
          )}

          {/* Admin user picker */}
          {vis === 'admin' && (
            <div className="mt-3 p-3 bg-slate-50 rounded-xl border border-slate-200">
              <div className="flex items-center justify-between mb-2.5">
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Share with specific admins</p>
                <button type="button"
                  onClick={() => setSelectedUsers(selectedUsers.length === adminUsers.length && adminUsers.length > 0 ? [] : adminUsers.map(s => s.id))}
                  className="text-[10px] font-semibold text-rail-600 hover:underline">
                  {selectedUsers.length === adminUsers.length && adminUsers.length > 0 ? 'Deselect All' : 'Select All'}
                </button>
              </div>
              {adminUsers.length === 0 ? (
                <p className="text-[10px] text-slate-400 text-center py-3">No admin users found</p>
              ) : (
                <div className="space-y-1 max-h-40 overflow-y-auto custom-scroll">
                  {adminUsers.map(admin => {
                    const initials = admin.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
                    const checked = selectedUsers.includes(admin.id);
                    return (
                      <label key={admin.id}
                        className={cn('flex items-center gap-2.5 px-2.5 py-2 rounded-lg cursor-pointer transition-colors',
                          checked ? 'bg-rail-50 border border-rail-200' : 'hover:bg-white border border-transparent')}>
                        <input type="checkbox" checked={checked}
                          onChange={() => setSelectedUsers(u => checked ? u.filter(x => x !== admin.id) : [...u, admin.id])}
                          className="rounded border-slate-300 text-rail-600 focus:ring-rail-400 shrink-0"/>
                        <div className="w-6 h-6 rounded-full bg-gradient-to-br from-violet-500 to-violet-700 flex items-center justify-center text-[9px] font-bold text-white shrink-0">
                          {initials}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold text-slate-800 truncate">{admin.name}</p>
                          <p className="text-[9px] text-slate-400 truncate capitalize">{admin.role} · {admin.designation}</p>
                        </div>
                      </label>
                    );
                  })}
                </div>
              )}
              <p className="text-[9px] text-slate-400 mt-2 italic">
                {selectedUsers.length === 0 ? 'No selection = visible to all admins' : `${selectedUsers.length} admin${selectedUsers.length !== 1 ? 's' : ''} selected`}
              </p>
            </div>
          )}
        </div>

        {/* Editors — who can edit this window's content, independent of who can view it */}
        <div>
          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-2">Who can edit this window?</label>
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
            <div className="flex items-center justify-between mb-2.5">
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Select editors</p>
              <button type="button"
                onClick={() => setSelectedEditors(selectedEditors.length === cellMembers.length && cellMembers.length > 0 ? [] : cellMembers.map(s => s.id))}
                className="text-[10px] font-semibold text-rail-600 hover:underline">
                {selectedEditors.length === cellMembers.length && cellMembers.length > 0 ? 'Deselect All' : 'Select All'}
              </button>
            </div>
            {cellMembers.length === 0 ? (
              <p className="text-[10px] text-slate-400 text-center py-3">No members found in this cell</p>
            ) : (
              <div className="space-y-1 max-h-40 overflow-y-auto custom-scroll">
                {cellMembers.map(member => {
                  const initials = member.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
                  const checked = selectedEditors.includes(member.id);
                  return (
                    <label key={member.id}
                      className={cn('flex items-center gap-2.5 px-2.5 py-2 rounded-lg cursor-pointer transition-colors',
                        checked ? 'bg-emerald-50 border border-emerald-200' : 'hover:bg-white border border-transparent')}>
                      <input type="checkbox" checked={checked}
                        onChange={() => setSelectedEditors(u => checked ? u.filter(x => x !== member.id) : [...u, member.id])}
                        className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-400 shrink-0"/>
                      <div className="w-6 h-6 rounded-full bg-gradient-to-br from-emerald-500 to-emerald-700 flex items-center justify-center text-[9px] font-bold text-white shrink-0">
                        {initials}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-slate-800 truncate">{member.name}</p>
                        <p className="text-[9px] text-slate-400 truncate">{member.designation}{member.workingAs ? ` · ${member.workingAs}` : ''}</p>
                      </div>
                    </label>
                  );
                })}
              </div>
            )}
            <p className="text-[9px] text-slate-400 mt-2 italic">
              {selectedEditors.length === 0 ? 'No selection = all cell members can edit (default)' : `${selectedEditors.length} editor${selectedEditors.length !== 1 ? 's' : ''} selected — only they (+ you) can add or change content`}
            </p>
          </div>
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
// ── Block picker data ─────────────────────────────────────────────────────────
const BLOCK_TEMPLATES: { type: WidgetType; label: string; icon: string; desc: string }[] = [
  { type: 'financial',     label: 'Revenue Dashboard',  icon: '💰', desc: 'Financial performance overview' },
  { type: 'monthly_report',label: 'Monthly Statement',  icon: '📋', desc: 'Revenue comparative report' },
  { type: 'handout',       label: 'Station Handout',    icon: '🗂️', desc: 'Station info card — footfall, trains, commercial' },
];

const BLOCK_FUNCTIONS: { type: WidgetType; label: string; icon: string; desc: string }[] = [
  { type: 'table',          label: 'Table',        icon: '📊', desc: 'Workspace data table' },
  { type: 'kpi',            label: 'KPI',          icon: '📈', desc: 'Key performance indicator card' },
  { type: 'text',           label: 'Text',         icon: '📝', desc: 'Rich text content' },
  { type: 'heading',        label: 'Heading',      icon: '📌', desc: 'Section heading' },
  { type: 'callout',        label: 'Callout',      icon: '💡', desc: 'Highlighted callout box' },
  { type: 'divider',        label: 'Divider',      icon: '➖', desc: 'Horizontal rule' },
  { type: 'toggle',         label: 'Toggle',       icon: '▶',  desc: 'Collapsible content block' },
  { type: 'checklist',      label: 'Checklist',    icon: '✅', desc: 'To-do checklist' },
  { type: 'staff',          label: 'Staff',        icon: '👥', desc: 'Staff roster' },
  { type: 'approval_queue', label: 'Approvals',    icon: '🔔', desc: 'Approval queue' },
  { type: 'google_links',   label: 'Links',        icon: '🔗', desc: 'Links repository' },
  { type: 'google_sheet',   label: 'Google Sheet', icon: '📗', desc: 'Embed a Google Sheet' },
  { type: 'powerbi',        label: 'Power BI',     icon: '📉', desc: 'Power BI dashboard' },
  { type: 'embed',          label: 'Embed',        icon: '🌐', desc: 'Any URL embed' },
  { type: 'announcements',  label: 'Notices',      icon: '📢', desc: 'Announcements board' },
  { type: 'activity',       label: 'Activity',     icon: '⚡', desc: 'Activity feed' },
  { type: 'database',       label: 'Database',     icon: '🗄️', desc: 'Database view' },
];

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
  const [pickerQuery, setPickerQuery] = useState('');

  // ── Double-click rename state ─────────────────────────────────────────────
  const [editingTitle, setEditingTitle] = useState<string | null>(null); // widget.id being renamed
  const [titleDraft,   setTitleDraft]   = useState('');
  const titleInputRef = useRef<HTMLInputElement>(null);

  const commitTitleEdit = (colId: string, widgetId: string, draft: string, original: string) => {
    const trimmed = draft.trim();
    if (trimmed && trimmed !== original) onUpdateWidget(colId, widgetId, { title: trimmed });
    setEditingTitle(null);
  };

  // ── Column layout live-preview state ─────────────────────────────────────
  // Saved original columns so we can revert on Cancel
  const originalColsRef = useRef<LayoutColumn[] | null>(null);
  const [colPreviewing, setColPreviewing] = useState(false); // true while a preset was clicked but not confirmed

  const applyColPreset = (preset: { label: string; widths: number[] }) => {
    if (!colPreviewing) {
      // Save original columns on the first preview click
      originalColsRef.current = row.columns.map(c => ({ ...c, widgets: [...c.widgets] }));
    }
    const newCols: LayoutColumn[] = preset.widths.map((w, i) => ({
      id: row.columns[i]?.id ?? `c${Date.now()}${i}`,
      widthPercent: w,
      widgets: row.columns[i]?.widgets ?? [],
    }));
    onUpdate({ columns: newCols }); // immediately commit → live preview
    setColPreviewing(true);
  };

  const confirmColPreset = () => {
    originalColsRef.current = null;
    setColPreviewing(false);
  };

  const cancelColPreset = () => {
    if (originalColsRef.current) onUpdate({ columns: originalColsRef.current });
    originalColsRef.current = null;
    setColPreviewing(false);
  };

  // Enter confirms, Escape cancels when column picker is in preview mode
  useEffect(() => {
    if (!colPreviewing) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Enter')  { e.preventDefault(); confirmColPreset(); }
      if (e.key === 'Escape') { e.preventDefault(); cancelColPreset(); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [colPreviewing, row.columns]);

  // ── Block picker (Templates / Functions) ─────────────────────────────────
  // Query state lives in WorkspaceRow so it persists while the picker is open.
  // The inner const is re-created each render but has no local state — all data
  // comes from the outer closure, so re-renders are safe.
  const BlockPickerContent = ({ colId }: { colId: string }) => {
    const lower          = pickerQuery.toLowerCase().trim();
    const isTemplateOnly = lower.startsWith('/t-');
    const isFunctionOnly = lower.startsWith('/f-');
    const searchTerm     = lower.replace(/^\/[tf]-/, '').trim();

    const filter = (items: typeof BLOCK_TEMPLATES) =>
      searchTerm
        ? items.filter(b => b.label.toLowerCase().includes(searchTerm) || b.desc.toLowerCase().includes(searchTerm))
        : items;

    const templates = !isFunctionOnly ? filter(BLOCK_TEMPLATES) : [];
    const functions  = !isTemplateOnly ? filter(BLOCK_FUNCTIONS)  : [];
    const isEmpty    = templates.length === 0 && functions.length === 0;

    const add = (type: WidgetType, label: string) => {
      onAddWidget(colId, { type, title: label });
      setPickCol(null);
      setPickerQuery('');
    };

    return (
      <div className="flex flex-col" style={{ maxHeight: 400 }}>
        {/* Search / slash filter */}
        <div className="px-2 pt-2 pb-1.5 border-b border-slate-100">
          <div className="relative">
            <input
              autoFocus
              value={pickerQuery}
              onChange={e => setPickerQuery(e.target.value)}
              onKeyDown={e => { if (e.key === 'Escape') { setPickCol(null); setPickerQuery(''); } }}
              placeholder="Search or /t- templates, /f- functions…"
              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:border-rail-400"
            />
            {pickerQuery && (
              <button onClick={() => setPickerQuery('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-300 hover:text-slate-600 p-0.5">
                <X size={11}/>
              </button>
            )}
          </div>
          <div className="flex gap-1 mt-1.5">
            <button
              onClick={() => setPickerQuery('/t-')}
              className={`px-1.5 py-0.5 rounded text-[10px] font-medium border transition-all ${isTemplateOnly ? 'bg-amber-50 border-amber-300 text-amber-700' : 'border-slate-200 text-slate-400 hover:border-slate-300'}`}>
              /t-&nbsp;Templates
            </button>
            <button
              onClick={() => setPickerQuery('/f-')}
              className={`px-1.5 py-0.5 rounded text-[10px] font-medium border transition-all ${isFunctionOnly ? 'bg-rail-50 border-rail-300 text-rail-700' : 'border-slate-200 text-slate-400 hover:border-slate-300'}`}>
              /f-&nbsp;Functions
            </button>
          </div>
        </div>

        {/* Block list */}
        <div className="overflow-y-auto p-2 space-y-2">
          {/* Templates section */}
          {templates.length > 0 && (
            <div>
              <p className="text-[10px] font-bold text-amber-600 uppercase tracking-wider px-1 mb-1">⭐ Templates</p>
              <div className="space-y-0.5">
                {templates.map(b => (
                  <button key={b.type} onClick={() => add(b.type, b.label)}
                    className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-amber-50 border border-transparent hover:border-amber-200 text-left w-full transition-all group">
                    <span className="text-base shrink-0">{b.icon}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-slate-700 group-hover:text-amber-700">{b.label}</p>
                      <p className="text-[10px] text-slate-400 truncate">{b.desc}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {templates.length > 0 && functions.length > 0 && <div className="border-t border-slate-100"/>}

          {/* Functions section */}
          {functions.length > 0 && (
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-1 mb-1">⚡ Functions</p>
              <div className="grid grid-cols-2 gap-0.5">
                {functions.map(b => (
                  <button key={b.type} onClick={() => add(b.type, b.label)}
                    className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg hover:bg-rail-50 border border-transparent hover:border-rail-200 text-left transition-all">
                    <span className="text-sm shrink-0">{b.icon}</span>
                    <span className="text-xs text-slate-600 font-medium">{b.label}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {isEmpty && (
            <p className="text-xs text-slate-300 italic text-center py-4">No blocks match</p>
          )}
        </div>
      </div>
    );
  };

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

                    {/* Widget header — double-click title to rename */}
                    {widget.type !== 'divider' && (
                      <div className="flex items-center gap-2 px-3 py-2 border-b border-slate-50">
                        {isEditing && <GripVertical size={11} className="text-slate-300 shrink-0 cursor-grab"/>}

                        {editingTitle === widget.id ? (
                          /* Inline rename input */
                          <input
                            ref={titleInputRef}
                            autoFocus
                            value={titleDraft}
                            onChange={e => setTitleDraft(e.target.value)}
                            onBlur={() => commitTitleEdit(col.id, widget.id, titleDraft, widget.title)}
                            onKeyDown={e => {
                              if (e.key === 'Enter')  { e.preventDefault(); commitTitleEdit(col.id, widget.id, titleDraft, widget.title); }
                              if (e.key === 'Escape') { e.stopPropagation(); setEditingTitle(null); }
                            }}
                            className="text-xs font-semibold text-slate-700 flex-1 min-w-0 bg-rail-50 border border-rail-300 rounded-md px-1.5 py-0.5 outline-none ring-1 ring-rail-300"
                            onClick={e => e.stopPropagation()}
                          />
                        ) : (
                          /* Static title — double-click to edit */
                          <p
                            className={cn(
                              'text-xs font-semibold text-slate-700 flex-1 truncate',
                              canManage && 'cursor-text select-none'
                            )}
                            title={canManage ? 'Double-click to rename' : widget.title}
                            onDoubleClick={() => {
                              if (!canManage) return;
                              setTitleDraft(widget.title);
                              setEditingTitle(widget.id);
                            }}>
                            {widget.title}
                          </p>
                        )}

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
                          userId={userId} userName={userName}
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
                      <BlockPickerContent colId={col.id}/>
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

      {/* Column layout selector (edit mode) — live preview on click, Done/Cancel to confirm */}
      {isEditing && canManage && (
        <div className="border-t border-slate-50 px-3 py-2 flex items-center gap-2 flex-wrap">
          <p className="text-[10px] text-slate-400 font-medium shrink-0">Columns:</p>
          <div className="flex gap-1 flex-wrap">
            {ROW_COLUMN_PRESETS.slice(0, 5).map(preset => (
              <button key={preset.label}
                onClick={() => applyColPreset(preset)}
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

          {/* Done / Cancel — shown after a preset is clicked */}
          {colPreviewing && (
            <div className="flex items-center gap-1.5 ml-1">
              <button
                onClick={confirmColPreset}
                className="flex items-center gap-1 px-2 py-1 rounded-lg bg-green-500 hover:bg-green-600 text-white text-[10px] font-semibold transition-colors"
                title="Confirm layout (Enter)">
                <Check size={9}/> Done
              </button>
              <button
                onClick={cancelColPreset}
                className="flex items-center gap-1 px-2 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-500 text-[10px] font-semibold transition-colors"
                title="Revert (Escape)">
                <X size={9}/> Cancel
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Main WorkspaceBuilder ─────────────────────────────────────────────────────
export function WorkspaceBuilder({ cell, pendingWidget, onPendingConsumed, enterprise, hideSidebar }: {
  cell: string;
  pendingWidget?: { type: WidgetType; title: string } | null;
  onPendingConsumed?: () => void;
  enterprise?: boolean;
  /** Hide the left sidebar entirely (used for overview custom tabs) */
  hideSidebar?: boolean;
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
  const [dbPeekMode, setDbPeekMode] = useState<DbPeekMode | null>(null);
  const [showDbMenu, setShowDbMenu] = useState(false);
  const dragRef = useRef<{ fromRowId: string; fromColId: string; fromWidgetId: string } | null>(null);

  // Staff for enterprise sidebar
  const [staff, setStaff] = useState<MasterStaffRecord[]>([]);
  useEffect(() => {
    if (!enterprise) return;
    const reload = () => setStaff(getStaffForCell(cell));
    reload();
    window.addEventListener(STAFF_CHANGED_EVENT, reload);
    return () => window.removeEventListener(STAFF_CHANGED_EVENT, reload);
  }, [cell, enterprise]);

  // Sidebar collapse toggle (cell workspaces only, not when hideSidebar)
  const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(() => {
    if (hideSidebar) return true;
    if (typeof window === 'undefined') return false;
    try { return JSON.parse(localStorage.getItem(`rly_sidebar_hidden_${cell}`) ?? 'false'); } catch { return false; }
  });
  const toggleSidebar = () => {
    setSidebarCollapsed(v => {
      const next = !v;
      try { localStorage.setItem(`rly_sidebar_hidden_${cell}`, JSON.stringify(next)); } catch { /**/ }
      return next;
    });
  };

  // Load window store
  useEffect(() => {
    const store = getWindowStore(cell, user?.id ?? 'system', user?.name ?? 'System');
    setWinStore(store);
  }, [cell, user?.id]);

  // Shared-cloud rehydration keeps separate browsers aligned on the same cell.
  useEffect(() => {
    if (typeof window === 'undefined') return;

    let cancelled = false;
    const refresh = async () => {
      try {
        const cloudStore = await loadWindowStoreFromCloud(cell);
        if (cancelled || !cloudStore) return;
        saveWindowStore(cloudStore);
        setWinStore(cloudStore);

        const cloudLayout = await loadWindowLayoutFromCloud(cell, cloudStore.activeWindowId);
        if (cancelled || !cloudLayout) return;
        saveWindowLayout(cell, cloudStore.activeWindowId, cloudLayout);
        setLayout(cloudLayout);
      } catch { /* silent */ }
    };

    refresh();
    const timer = window.setInterval(refresh, 8000);
    const onFocus = () => { void refresh(); };
    const onVisibility = () => { if (!document.hidden) void refresh(); };
    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      cancelled = true;
      clearInterval(timer);
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [cell]);

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
  // Fine-grained content-edit permission: falls back to `canManage` (any cell
  // member) unless the active window's creator restricted editing to specific people.
  const canEditContent = canEditWindow(activeWin, user?.id, canManage);

  // ── Role gradient colours (sidebar avatars) ───────────────────────────────
  const SIDE_ROLE_COLORS: Record<string, string> = {
    CMI:     'from-indigo-500 to-indigo-700',
    COS:     'from-violet-500 to-violet-700',
    OS:      'from-teal-500 to-teal-700',
    Dealer:  'from-amber-500 to-amber-700',
    Incharge:'from-emerald-500 to-emerald-700',
    default: 'from-slate-500 to-slate-700',
  };

  // ── Shared: rows canvas section ───────────────────────────────────────────
  const rowsCanvas = (
    <div className="space-y-3">
      {isEditing && canEditContent && (
        <div className="flex items-center gap-2 bg-rail-50 border border-rail-200 rounded-xl px-4 py-2.5">
          <LayoutGrid size={13} className="text-rail-600 shrink-0"/>
          <p className="text-xs text-rail-700 flex-1">Edit mode — drag widgets between columns, use the column buttons to change layout</p>
        </div>
      )}
      {layout.rows.map((row, rowIdx) => (
        <WorkspaceRow
          key={row.id} row={row} rowIdx={rowIdx} totalRows={layout.rows.length}
          cell={cell} canManage={canEditContent} isEditing={isEditing} layout={layout}
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
      {canEditContent && (
        <button onClick={() => commitLayout(addRow(layout))}
          className={cn('w-full flex items-center justify-center gap-2 py-3 rounded-xl border border-dashed transition-all text-sm font-medium',
            isEditing
              ? 'border-rail-300 text-rail-500 hover:bg-rail-50 bg-rail-50/30'
              : 'border-slate-200 text-slate-300 hover:border-slate-300 hover:text-slate-400 hover:bg-slate-50')}>
          <Plus size={14}/> Add Row
        </button>
      )}
    </div>
  );

  // ── Shared: all modals ────────────────────────────────────────────────────
  const sharedModals = (
    <AnimatePresence>
      {showCreateWin && (
        <WindowFormModal
          open={showCreateWin} onClose={() => setShowCreateWin(false)}
          existingWindows={winStore.windows} cell={cell}
          onSave={(label, icon, vis, roles, cloneFrom, users, editors) => {
            const next = createWindow(winStore, label, icon, vis, user?.id ?? '', user?.name ?? 'User', roles, users.length > 0 ? users : undefined, cloneFrom || undefined, editors.length > 0 ? editors : undefined);
            commitStore(next);
          }}
        />
      )}
      {editingWin && (
        <WindowFormModal
          open={!!editingWin} onClose={() => setEditingWin(null)}
          initial={editingWin} existingWindows={winStore.windows} cell={cell}
          onSave={(label, icon, vis, roles, _cloneFrom, users, editors) => {
            commitStore(updateWindow(winStore, editingWin.id, { label, icon, visibility: vis, visibleToRoles: roles, visibleToUsers: users.length > 0 ? users : undefined, editableByUsers: editors.length > 0 ? editors : undefined }));
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
                Delete <strong>&ldquo;{deleteTargetWin.label}&rdquo;</strong>? The window layout will be removed. Underlying databases are not affected.
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
  );

  // ── Enterprise sidebar + canvas layout ────────────────────────────────────
  if (enterprise) {
    return (
      <div className="flex h-full overflow-hidden">

        {/* ── LEFT SIDEBAR — hidden when hideSidebar, collapsible otherwise ── */}
        {!hideSidebar && !sidebarCollapsed && (
        <div className="relative w-[220px] bg-slate-900 flex flex-col shrink-0 border-r border-slate-800">

          {/* Cell identity */}
          <div className="px-4 py-4 border-b border-slate-800">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-rail-700/60 border border-rail-600/50 flex items-center justify-center text-lg shrink-0">
                🏢
              </div>
              <div className="min-w-0">
                <p className="text-[13px] font-bold text-white truncate leading-tight">{cell}</p>
                <p className="text-[10px] text-slate-500 mt-0.5">Delhi Division · NR</p>
              </div>
            </div>
          </div>

          {/* Windows navigation (scrollable) */}
          <div className="flex-1 overflow-y-auto py-3 custom-scroll">
            <p className="text-[9px] font-bold text-slate-600 uppercase tracking-widest px-4 mb-2">Workspaces</p>

            {visibleWindows.map(win => {
              const isActive = win.id === winStore.activeWindowId;
              return (
                <div key={win.id} className="relative px-2 mb-0.5">
                  <div className={cn(
                    'flex items-center gap-2 px-3 py-2 rounded-lg transition-all cursor-pointer group/win',
                    isActive ? 'bg-rail-700 text-white' : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                  )}>
                    <button
                      onClick={() => commitStore({ ...winStore, activeWindowId: win.id })}
                      className="flex items-center gap-2 flex-1 min-w-0 text-left">
                      <span className="text-sm shrink-0">{win.icon ?? '📋'}</span>
                      <span className="text-[11px] font-medium truncate">{win.label}</span>
                      {win.isDefault && <Star size={9} className="text-amber-400 fill-amber-400 shrink-0"/>}
                      {win.isPinned && <Pin size={9} className={cn('shrink-0', isActive ? 'text-rail-300' : 'text-slate-600')}/>}
                      {win.visibility === 'personal' && <Lock size={9} className={cn('shrink-0', isActive ? 'text-rail-300' : 'text-slate-600')}/>}
                    </button>
                    {canManage && (
                      <button
                        ref={el => { if (el) menuBtnRefs.current[win.id] = el; }}
                        onClick={e => { e.stopPropagation(); setOpenMenu(m => m === win.id ? null : win.id); }}
                        className={cn(
                          'p-0.5 rounded opacity-0 group-hover/win:opacity-100 transition-opacity shrink-0',
                          isActive ? 'text-rail-300 hover:text-white' : 'text-slate-500 hover:text-slate-300'
                        )}>
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
                      const next = createWindow(winStore, win.label + ' (copy)', win.icon ?? '📋', win.visibility, user?.id ?? '', user?.name ?? 'User', win.visibleToRoles, win.visibleToUsers, win.id, win.editableByUsers);
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

            {canManage && (
              <button onClick={() => setShowCreateWin(true)}
                className="w-full flex items-center gap-2 px-5 py-2 mt-1 text-slate-600 hover:text-slate-300 text-[11px] font-medium transition-colors">
                <Plus size={12}/> New window
              </button>
            )}
          </div>

          {/* Staff mini-roster */}
          <div className="px-4 py-3 border-t border-slate-800">
            <div className="flex items-center justify-between mb-2">
              <p className="text-[9px] font-bold text-slate-600 uppercase tracking-widest">Staff</p>
              <span className="text-[10px] text-slate-600 font-medium">{staff.length}</span>
            </div>
            {staff.length > 0 ? (
              <div className="flex -space-x-1.5">
                {staff.slice(0, 8).map(s => {
                  const initials = s.name.split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase();
                  const grad = SIDE_ROLE_COLORS[s.workingAs ?? ''] ?? SIDE_ROLE_COLORS.default;
                  return (
                    <div key={s.id} title={`${s.name} · ${s.workingAs ?? s.designation}`}
                      className={cn('w-6 h-6 rounded-full bg-gradient-to-br border-2 border-slate-900 flex items-center justify-center text-[8px] font-bold text-white shrink-0 cursor-default', grad)}>
                      {initials}
                    </div>
                  );
                })}
                {staff.length > 8 && (
                  <div className="w-6 h-6 rounded-full bg-slate-700 border-2 border-slate-900 flex items-center justify-center text-[8px] font-bold text-slate-300">
                    +{staff.length - 8}
                  </div>
                )}
              </div>
            ) : (
              <p className="text-[10px] text-slate-700">No staff assigned</p>
            )}
          </div>

          {/* Search */}
          <div className="px-3 pb-4">
            <SearchTrigger cell={cell} tables={workspaceHook.ws.tables ?? []}/>
          </div>

          {/* Collapse button — right edge of sidebar */}
          <button
            onClick={toggleSidebar}
            title="Collapse sidebar"
            className="absolute -right-3 top-1/2 -translate-y-1/2 z-10 w-6 h-12 bg-slate-800 border border-slate-700 rounded-r-lg flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-700 transition-all shadow-md">
            <ChevronLeft size={13}/>
          </button>
        </div>
        )}

        {/* Collapsed strip — expand button when sidebar is hidden (toggle only, not hideSidebar) */}
        {!hideSidebar && sidebarCollapsed && (
          <div className="w-7 bg-slate-900 border-r border-slate-800 flex items-center justify-center shrink-0">
            <button
              onClick={toggleSidebar}
              title="Expand sidebar"
              className="w-6 h-12 flex items-center justify-center text-slate-500 hover:text-white transition-colors">
              <ChevronRight size={13}/>
            </button>
          </div>
        )}

        {/* ── RIGHT CONTENT ──────────────────────────────────────────────── */}
        <div className="flex-1 flex flex-col overflow-hidden bg-slate-50">

          {/* Window header bar */}
          <div className="flex items-center gap-3 px-5 py-3 bg-white border-b border-slate-200 shrink-0" style={{ boxShadow: '0 1px 3px rgba(15,23,42,0.04)' }}>
            <span className="text-xl">{activeWin?.icon ?? '📋'}</span>
            <div className="flex-1 min-w-0">
              <h1 className="text-sm font-bold text-slate-900 truncate">{activeWin?.label ?? 'Workspace'}</h1>
              <p className="text-[10px] text-slate-400">{cell} · Delhi Division</p>
            </div>
            <div className="flex items-center gap-1.5">
              {/* Database button with 3-mode dropdown */}
              <div className="relative">
                <button
                  onClick={() => setShowDbMenu(v => !v)}
                  className={cn('flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition-all',
                    dbPeekMode ? 'bg-rail-50 border-rail-200 text-rail-700' : 'bg-white border-slate-200 text-slate-500 hover:border-slate-300')}>
                  <Database size={11}/> Database <ChevronDown size={9} className={cn('transition-transform', showDbMenu && 'rotate-180')}/>
                </button>
                {showDbMenu && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setShowDbMenu(false)}/>
                    <div className="absolute left-0 top-full mt-1 w-44 bg-white rounded-xl border border-slate-200 shadow-xl z-50 overflow-hidden">
                      {([
                        { id: 'center'   as DbPeekMode, Icon: ScanSearch, label: 'Center Peek'   },
                        { id: 'side'     as DbPeekMode, Icon: PanelRight,  label: 'Side Peek'    },
                        { id: 'fullpage' as DbPeekMode, Icon: Maximize2,   label: 'Full Page'    },
                      ]).map(({ id, Icon, label }) => (
                        <button
                          key={id}
                          onClick={() => { setDbPeekMode(id); setShowDbMenu(false); }}
                          className={cn(
                            'flex items-center gap-2.5 w-full px-3.5 py-2.5 text-xs transition-colors border-b border-slate-100 last:border-0',
                            dbPeekMode === id ? 'bg-rail-50 text-rail-700 font-semibold' : 'text-slate-600 hover:bg-slate-50',
                          )}>
                          <Icon size={12} className={dbPeekMode === id ? 'text-rail-600' : 'text-slate-400'}/>
                          {label}
                        </button>
                      ))}
                      {dbPeekMode && (
                        <button
                          onClick={() => { setDbPeekMode(null); setShowDbMenu(false); }}
                          className="flex items-center gap-2.5 w-full px-3.5 py-2.5 text-xs text-slate-400 hover:bg-slate-50 transition-colors">
                          <X size={12}/> Close Database
                        </button>
                      )}
                    </div>
                  </>
                )}
              </div>
              {canEditContent && (
                <button onClick={() => setIsEditing(e => !e)}
                  className={cn('flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition-all',
                    isEditing ? 'bg-rail-600 border-rail-600 text-white' : 'bg-white border-slate-200 text-slate-500 hover:border-slate-300')}>
                  {isEditing ? <><Check size={11}/> Done</> : <><Settings2 size={11}/> Edit</>}
                </button>
              )}
              {canEditContent && (
                <button onClick={() => commitLayout(addRow(layout))}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-rail-600 hover:bg-rail-700 text-white text-xs font-bold rounded-lg transition-all shadow-sm">
                  <Plus size={12}/> Add block
                </button>
              )}
            </div>
          </div>

          {/* Canvas — full-page database mode */}
          {dbPeekMode === 'fullpage' && (
            <div className="flex-1 overflow-hidden p-4">
              <DatabaseFullPage
                cell={cell}
                onClose={() => setDbPeekMode(null)}
                onChangeMode={setDbPeekMode}
              />
            </div>
          )}

          {/* Canvas — normal workspace content */}
          <div className={cn('flex-1 overflow-y-auto p-4 custom-scroll', dbPeekMode === 'fullpage' && 'hidden')}>
            {layout.rows.length === 0 ? (
              /* ── Empty state ── */
              <div className="flex flex-col items-center justify-center min-h-[400px] gap-5">
                <div className="w-20 h-20 rounded-2xl bg-white border border-slate-200 flex items-center justify-center text-4xl shadow-sm">
                  {activeWin?.icon ?? '🏠'}
                </div>
                <div className="text-center">
                  <p className="text-base font-bold text-slate-800">{activeWin?.label ?? 'Workspace'}</p>
                  <p className="text-xs text-slate-400 mt-1.5">This window is empty. Choose a block to get started.</p>
                </div>
                {canEditContent && (
                  <div className="grid grid-cols-3 gap-2.5 w-[420px]">
                    {([
                      { type: 'database'     as WidgetType, emoji: '📊', label: 'Database',          desc: 'Structured table view' },
                      { type: 'financial'     as WidgetType, emoji: '💰', label: 'Revenue Dashboard',  desc: 'Financial performance' },
                      { type: 'monthly_report' as WidgetType, emoji: '📋', label: 'Monthly Statement', desc: 'Revenue comparative' },
                      { type: 'handout'        as WidgetType, emoji: '🗂️', label: 'Station Handout',   desc: 'Station info card' },
                      { type: 'task_manager' as WidgetType, emoji: '✅', label: 'Tasks',             desc: 'Track action items' },
                      { type: 'ai_assistant' as WidgetType, emoji: '🤖', label: 'AI Assistant',      desc: 'Chat with AI' },
                      { type: 'knowledge_base' as WidgetType, emoji: '📚', label: 'Knowledge',       desc: 'Docs & SOPs' },
                      { type: 'kpi'          as WidgetType, emoji: '📈', label: 'KPI Cards',         desc: 'Key metrics' },
                      { type: 'text'         as WidgetType, emoji: '📝', label: 'Text Block',        desc: 'Rich content' },
                    ] as { type: WidgetType; emoji: string; label: string; desc: string }[]).map(item => (
                      <button key={item.type}
                        onClick={() => {
                          const next0 = addRow(layout);
                          const col = next0.rows[0].columns[0];
                          const next1 = addWidgetToRow(next0, next0.rows[0].id, col.id, { type: item.type, title: item.label });
                          commitLayout(next1);
                        }}
                        className="flex flex-col items-start gap-1.5 px-3.5 py-3.5 bg-white hover:bg-rail-50 border border-slate-200 hover:border-rail-300 rounded-xl text-left transition-all group shadow-sm hover:shadow-md">
                        <span className="text-xl">{item.emoji}</span>
                        <div>
                          <p className="text-xs font-bold text-slate-800 group-hover:text-rail-700">{item.label}</p>
                          <p className="text-[10px] text-slate-400 mt-0.5">{item.desc}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              rowsCanvas
            )}
          </div>
        </div>

        {/* Shared modals */}
        {sharedModals}

        {/* Database peek (center / side) */}
        {dbPeekMode && dbPeekMode !== 'fullpage' && (
          <DatabasePeekModal
            cell={cell}
            mode={dbPeekMode}
            onClose={() => setDbPeekMode(null)}
            onChangeMode={setDbPeekMode}
          />
        )}
      </div>
    );
  }

  // ── Legacy tab-bar layout (non-enterprise) ────────────────────────────────
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
                    const next = createWindow(winStore, win.label + ' (copy)', win.icon ?? '📋', win.visibility, user?.id ?? '', user?.name ?? 'User', win.visibleToRoles, win.visibleToUsers, win.id, win.editableByUsers);
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
            <div className="relative">
              <button
                onClick={() => setShowDbMenu(v => !v)}
                className={cn('flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition-all',
                  dbPeekMode ? 'bg-rail-50 border-rail-200 text-rail-700' : 'bg-white border-slate-200 text-slate-500 hover:border-slate-300')}>
                <Database size={11}/> <span className="hidden sm:inline">Database</span> <ChevronDown size={9}/>
              </button>
              {showDbMenu && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setShowDbMenu(false)}/>
                  <div className="absolute right-0 top-full mt-1 w-44 bg-white rounded-xl border border-slate-200 shadow-xl z-50 overflow-hidden">
                    {([
                      { id: 'center'   as DbPeekMode, Icon: ScanSearch, label: 'Center Peek' },
                      { id: 'side'     as DbPeekMode, Icon: PanelRight,  label: 'Side Peek'  },
                      { id: 'fullpage' as DbPeekMode, Icon: Maximize2,   label: 'Full Page'  },
                    ]).map(({ id, Icon, label }) => (
                      <button
                        key={id}
                        onClick={() => { setDbPeekMode(id); setShowDbMenu(false); }}
                        className={cn(
                          'flex items-center gap-2.5 w-full px-3.5 py-2.5 text-xs transition-colors border-b border-slate-100 last:border-0',
                          dbPeekMode === id ? 'bg-rail-50 text-rail-700 font-semibold' : 'text-slate-600 hover:bg-slate-50',
                        )}>
                        <Icon size={12} className={dbPeekMode === id ? 'text-rail-600' : 'text-slate-400'}/>
                        {label}
                      </button>
                    ))}
                    {dbPeekMode && (
                      <button
                        onClick={() => { setDbPeekMode(null); setShowDbMenu(false); }}
                        className="flex items-center gap-2.5 w-full px-3.5 py-2.5 text-xs text-slate-400 hover:bg-slate-50 transition-colors">
                        <X size={12}/> Close Database
                      </button>
                    )}
                  </div>
                </>
              )}
            </div>
            {canEditContent && (
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
      {isEditing && canEditContent && (
        <div className="flex items-center gap-2 bg-rail-50 border border-rail-200 rounded-xl px-4 py-2.5">
          <LayoutGrid size={13} className="text-rail-600 shrink-0"/>
          <p className="text-xs text-rail-700 flex-1">
            Edit mode — drag widgets between columns, use the column buttons to change layout
          </p>
        </div>
      )}

      {/* ── Custom Injections ────────────────────────────────────────────── */}
      {cell === 'Sanitation' && winStore?.windows.find(w => w.id === winStore.activeWindowId)?.label === 'Station Cleanliness Status' && (
        <SanitationStatusWidget />
      )}

      {/* ── Rows ─────────────────────────────────────────────────────────── */}
      <div className="space-y-3">
        {layout.rows.map((row, rowIdx) => (
          <WorkspaceRow
            key={row.id} row={row} rowIdx={rowIdx} totalRows={layout.rows.length}
            cell={cell} canManage={canEditContent} isEditing={isEditing} layout={layout}
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
      {canEditContent && (
        <button onClick={() => commitLayout(addRow(layout))}
          className={cn('w-full flex items-center justify-center gap-2 py-3 rounded-xl border border-dashed transition-all text-sm font-medium',
            isEditing
              ? 'border-rail-300 text-rail-500 hover:bg-rail-50 bg-rail-50/30'
              : 'border-slate-200 text-slate-300 hover:border-slate-300 hover:text-slate-400 hover:bg-slate-50')}>
          <Plus size={14}/> Add Row
        </button>
      )}

      {/* ── Database peek (legacy layout) ─────────────────────────────── */}
      {dbPeekMode === 'fullpage' && (
        <DatabaseFullPage
          cell={cell}
          onClose={() => setDbPeekMode(null)}
          onChangeMode={setDbPeekMode}
        />
      )}
      {dbPeekMode && dbPeekMode !== 'fullpage' && (
        <DatabasePeekModal
          cell={cell}
          mode={dbPeekMode}
          onClose={() => setDbPeekMode(null)}
          onChangeMode={setDbPeekMode}
        />
      )}

      {/* ── Modals ───────────────────────────────────────────────────────── */}
      <AnimatePresence>
        {showCreateWin && (
          <WindowFormModal
            open={showCreateWin} onClose={() => setShowCreateWin(false)}
            existingWindows={winStore.windows} cell={cell}
            onSave={(label, icon, vis, roles, cloneFrom, users, editors) => {
              const next = createWindow(winStore, label, icon, vis, user?.id ?? '', user?.name ?? 'User', roles, users.length > 0 ? users : undefined, cloneFrom || undefined, editors.length > 0 ? editors : undefined);
              commitStore(next);
            }}
          />
        )}
        {editingWin && (
          <WindowFormModal
            open={!!editingWin} onClose={() => setEditingWin(null)}
            initial={editingWin} existingWindows={winStore.windows} cell={cell}
            onSave={(label, icon, vis, roles, _cloneFrom, users, editors) => {
              commitStore(updateWindow(winStore, editingWin.id, { label, icon, visibility: vis, visibleToRoles: roles, visibleToUsers: users.length > 0 ? users : undefined, editableByUsers: editors.length > 0 ? editors : undefined }));
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
