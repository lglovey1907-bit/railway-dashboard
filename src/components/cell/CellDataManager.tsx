'use client';
import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { createPortal } from 'react-dom';
import { useEffect } from 'react';
import { useAuthStore } from '@/store/authStore';
import { useWorkspace } from '@/lib/cellData/useWorkspace';
import { canManageCellStructure } from '@/lib/cellData/useCellDataStructure';
import { TableEngine, CreateTableModal } from './TableEngine';
import type { Section, Widget, TableWidget, TextWidget, KpiWidget } from '@/lib/cellData/types';
import {
 LayoutGrid, Plus, Trash2, ChevronDown, ChevronRight, X,
 Crown, Table2, Type, BarChart2, ArrowUp, ArrowDown, Edit3, Check,
 Undo2, Redo2, RotateCcw, Activity,
} from 'lucide-react';
import { CellActivityDashboard } from './CellActivityDashboard';
import { cn } from '@/lib/utils';

function Portal({ children }: { children: React.ReactNode }) {
 const [m, setM] = useState(false);
 useEffect(() => { setM(true); }, []);
 if (!m) return null;
 return createPortal(children, document.body);
}

// ── Inline editable heading ──────────────────────────────────────────────────
function InlineEdit({ value, onSave, className }: { value: string; onSave: (v: string) => void; className?: string }) {
 const [editing, setEditing] = useState(false);
 const [draft, setDraft] = useState(value);
 if (editing) {
 return (
 <input value={draft} autoFocus
 onChange={e => setDraft(e.target.value)}
 onBlur={() => { if (draft.trim()) onSave(draft.trim()); setEditing(false); }}
 onKeyDown={e => { if (e.key === 'Enter') { if (draft.trim()) onSave(draft.trim()); setEditing(false); } if (e.key === 'Escape') { setDraft(value); setEditing(false); } }}
 className={cn(className, 'bg-transparent border-b border-indigo-400 outline-none')}/>
 );
 }
 return (
 <button onDoubleClick={() => { setDraft(value); setEditing(true); }} className={cn(className, 'text-left hover:underline decoration-dotted underline-offset-2')} title="Double-click to rename">
 {value}
 </button>
 );
}

// ── Text widget ──────────────────────────────────────────────────────────────
function TextWidgetBlock({ widget, sId, hook, canManage }: { widget: TextWidget; sId: string; hook: ReturnType<typeof useWorkspace>; canManage: boolean }) {
 const [editing, setEditing] = useState(false);
 const [draft, setDraft] = useState(widget.content);

 if (editing) {
 return (
 <div className="rounded-xl border border-blue-300 p-3 bg-white">
 <textarea value={draft} onChange={e => setDraft(e.target.value)} rows={4} autoFocus
 className="w-full bg-transparent text-sm text-slate-800 outline-none resize-none"/>
 <div className="flex justify-end gap-2 mt-2">
 <button onClick={() => { hook.updateWidget(sId, widget.id, { content: draft } as any); setEditing(false); }}
 className="px-3 py-1 text-xs bg-blue-600 text-white rounded-lg">Save</button>
 <button onClick={() => setEditing(false)} className="px-3 py-1 text-xs text-slate-500 hover:bg-slate-100 rounded-lg">Cancel</button>
 </div>
 </div>
 );
 }

 return (
 <div className={cn('rounded-xl border border-slate-200 p-4 bg-white text-sm text-slate-700 whitespace-pre-wrap', canManage && 'cursor-pointer hover:border-blue-300 ')}
 onClick={canManage ? () => setEditing(true) : undefined}>
 {widget.content || <span className="text-slate-300 italic">Click to add text…</span>}
 </div>
 );
}

// ── KPI widget ───────────────────────────────────────────────────────────────
function KpiWidgetBlock({ widget, sId, hook, canManage }: { widget: KpiWidget; sId: string; hook: ReturnType<typeof useWorkspace>; canManage: boolean }) {
 return (
 <div className="rounded-xl border border-slate-200 bg-white p-4 text-center shadow-elevation-sm">
 {canManage ? (
 <input value={widget.label} onChange={e => hook.updateWidget(sId, widget.id, { label: e.target.value } as any)}
 className="text-xs text-slate-400 font-medium bg-transparent outline-none border-b border-dashed border-slate-200 text-center w-full mb-1"/>
 ) : (
 <p className="text-xs text-slate-400 font-medium mb-1">{widget.label}</p>
 )}
 {canManage ? (
 <input value={widget.value} onChange={e => hook.updateWidget(sId, widget.id, { value: e.target.value } as any)}
 className="text-2xl font-bold text-slate-900 bg-transparent outline-none border-b border-dashed border-slate-200 text-center w-full"/>
 ) : (
 <p className="text-2xl font-bold text-slate-900">{widget.value}</p>
 )}
 {widget.suffix && <p className="text-xs text-slate-400 mt-1">{widget.suffix}</p>}
 </div>
 );
}

// ── Add widget menu ──────────────────────────────────────────────────────────
function AddWidgetMenu({ sId, hook, cell, onClose }: { sId: string; hook: ReturnType<typeof useWorkspace>; cell: string; onClose: () => void }) {
 const [showCreateTable, setShowCreateTable] = useState(false);
 const options = [
 { icon: Table2, label: 'Table', sub: 'Spreadsheet-style data grid', action: () => setShowCreateTable(true) },
 { icon: Type, label: 'Text / Note', sub: 'Rich text block for notes, descriptions', action: () => { hook.addTextToSection(sId); onClose(); } },
 { icon: BarChart2, label: 'KPI Metric', sub: 'A single key metric number', action: () => { hook.addKpiToSection(sId); onClose(); } },
 ];

 return (
 <>
 <Portal>
 <div className="fixed inset-0 z-[200]"onClick={onClose}/>
 <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
 className="fixed z-[201] bg-white border border-slate-200 rounded-2xl shadow-xl p-2 w-72"
 style={{ top: '50%', left: '50%', transform: 'translate(-50%, -55%)' }}>
 <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 px-3 py-2">Add to Section</p>
 {options.map(opt => (
 <button key={opt.label} onClick={opt.action}
 className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-slate-100 transition-colors text-left">
 <div className="w-8 h-8 rounded-lg bg-indigo-100 flex items-center justify-center shrink-0">
 <opt.icon size={15} className="text-indigo-600"/>
 </div>
 <div>
 <p className="text-sm font-medium text-slate-800">{opt.label}</p>
 <p className="text-[10px] text-slate-400">{opt.sub}</p>
 </div>
 </button>
 ))}
 </motion.div>
 </Portal>
 <AnimatePresence>
 {showCreateTable && (
 <CreateTableModal onClose={() => { setShowCreateTable(false); onClose(); }}
 cell={cell}
 onCreated={table => { hook.addTableToSection(sId, table); onClose(); }}/>
 )}
 </AnimatePresence>
 </>
 );
}

// ── Section block ─────────────────────────────────────────────────────────────
function SectionBlock({ section, hook, isFirst, isLast, canManage, cell, userId, userName }: {
 section: Section; hook: ReturnType<typeof useWorkspace>; isFirst: boolean; isLast: boolean;
 canManage: boolean; cell: string; userId?: string; userName?: string;
}) {
 const [addMenu, setAddMenu] = useState(false);

 return (
 <div className="rounded-2xl border border-slate-200 overflow-hidden bg-white shadow-elevation-sm">
 {/* Section header */}
 <div className="flex items-center gap-2 px-4 py-3 bg-slate-50 border-b border-slate-200">
 <button onClick={() => hook.toggleSection(section.id)} className="text-slate-400 shrink-0">
 {section.collapsed ? <ChevronRight size={15}/> : <ChevronDown size={15}/>}
 </button>
 <InlineEdit value={section.title} onSave={(v) => hook.renameSection(section.id, v)}
 className="font-bold text-slate-900 text-sm flex-1 min-w-0"/>
 {canManage && (
 <div className="flex items-center gap-1 shrink-0 ml-auto">
 {!isFirst && <button onClick={() => hook.moveSectionUp(section.id)} title="Move up"className="p-1 rounded hover:bg-slate-200 text-slate-400"><ArrowUp size={13}/></button>}
 {!isLast && <button onClick={() => hook.moveSectionDown(section.id)} title="Move down"className="p-1 rounded hover:bg-slate-200 text-slate-400"><ArrowDown size={13}/></button>}
 <button onClick={() => setAddMenu(a => !a)}
 className="flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-medium bg-indigo-600 text-white hover:bg-indigo-700 transition-colors ml-1">
 <Plus size={11}/> Add
 </button>
 <button onClick={() => hook.removeSection(section.id)} className="p-1 rounded hover:bg-red-100 text-slate-300 hover:text-red-500 ml-0.5"><Trash2 size={13}/></button>
 </div>
 )}
 </div>

 {!section.collapsed && (
 <div className="p-4 space-y-4">
 {section.widgets.length === 0 ? (
 <p className="text-slate-300 text-xs italic text-center py-6">
 {canManage ? 'Empty section — click"+ Add"to add a table, text, or KPI' : 'Nothing here yet'}
 </p>
 ) : (
 section.widgets.map(widget => (
 <div key={widget.id} className="relative group/widget">
 {widget.type === 'table' && (() => {
 const table = hook.ws.tables.find(t => t.id === (widget as TableWidget).tableId);
 if (!table) return null;
 return (
 <div>
 <div className="flex items-center justify-between mb-2">
 <InlineEdit value={table.name} onSave={(v) => hook.updateTable(table.id, { name: v })}
 className="font-semibold text-sm text-slate-800"/>
 {canManage && <button onClick={() => hook.removeWidget(section.id, widget.id, table.id)}
 className="p-1.5 rounded-lg hover:bg-red-100 text-slate-300 hover:text-red-500 opacity-0 group-hover/widget:opacity-100 transition-all">
 <Trash2 size={12}/>
 </button>}
 </div>
 <TableEngine table={table} hook={hook} cell={cell} canManage={canManage} userId={userId} userName={userName}/>
 </div>
 );
 })()}
 {widget.type === 'text' && (
 <div className="relative">
 {canManage && <button onClick={() => hook.removeWidget(section.id, widget.id)}
 className="absolute top-2 right-2 p-1 rounded hover:bg-red-100 text-slate-300 hover:text-red-500 opacity-0 group-hover/widget:opacity-100 transition-all z-10">
 <Trash2 size={11}/>
 </button>}
 <TextWidgetBlock widget={widget as TextWidget} sId={section.id} hook={hook} canManage={canManage}/>
 </div>
 )}
 {widget.type === 'kpi' && (
 <div className="relative">
 {canManage && <button onClick={() => hook.removeWidget(section.id, widget.id)}
 className="absolute top-2 right-2 p-1 rounded hover:bg-red-100 text-slate-300 hover:text-red-500 opacity-0 group-hover/widget:opacity-100 transition-all z-10">
 <Trash2 size={11}/>
 </button>}
 <KpiWidgetBlock widget={widget as KpiWidget} sId={section.id} hook={hook} canManage={canManage}/>
 </div>
 )}
 </div>
 ))
 )}
 </div>
 )}

 <AnimatePresence>{addMenu && <AddWidgetMenu sId={section.id} hook={hook} cell={cell} onClose={() => setAddMenu(false)}/>}</AnimatePresence>
 </div>
 );
}

// ── Main export ───────────────────────────────────────────────────────────────
export function CellDataManager({ cell }: { cell: string }) {
 const { user } = useAuthStore();
 const canManage = canManageCellStructure(user, cell);
 const hook = useWorkspace(cell, user ? { id: user.id, name: user.name } : undefined);
 const { ws, addSection, undo, redo, canUndo, canRedo, restoreFromTrash, emptyTrash } = hook;
 const [showTrash, setShowTrash] = useState(false);
 const [showDashboard, setShowDashboard] = useState(false);

 if (!canManage && ws.sections.length === 0) return null;

 const trashCount = ws.trash?.length ?? 0;

 return (
 <div className="space-y-4 mb-6">
 {/* Workspace header */}
 <div className="flex items-center justify-between flex-wrap gap-2">
 <div className="flex items-center gap-3">
 <div className="w-8 h-8 rounded-xl bg-indigo-100 border border-indigo-200 flex items-center justify-center">
 <LayoutGrid size={15} className="text-indigo-600"/>
 </div>
 <div>
 <p className="text-slate-900 font-bold text-sm">{cell} Workspace</p>
 <p className="text-slate-400 text-[11px]">
 {ws.sections.length} section{ws.sections.length !== 1 ? 's' : ''} · {ws.tables.length} table{ws.tables.length !== 1 ? 's' : ''}
 {canManage && <span className="ml-1.5 text-indigo-600 inline-flex items-center gap-0.5"><Crown size={9}/> You manage this cell</span>}
 </p>
 </div>
 </div>
 {canManage && (
 <div className="flex items-center gap-2">
 {/* Undo / Redo */}
 <div className="flex items-center gap-1 bg-slate-100 rounded-xl p-1 border border-slate-200">
 <button onClick={undo} disabled={!canUndo} title="Undo (Ctrl+Z)"
 className="p-1.5 rounded-lg text-slate-500 hover:bg-white hover:text-slate-900 disabled:opacity-30 disabled:cursor-not-allowed transition-all">
 <Undo2 size={13}/>
 </button>
 <button onClick={redo} disabled={!canRedo} title="Redo (Ctrl+Y)"
 className="p-1.5 rounded-lg text-slate-500 hover:bg-white hover:text-slate-900 disabled:opacity-30 disabled:cursor-not-allowed transition-all">
 <Redo2 size={13}/>
 </button>
 </div>
 {/* Trash */}
 <button onClick={() => setShowDashboard(d => !d)}
 className={cn('flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs border transition-all',
 showDashboard ? 'bg-indigo-50 border-indigo-300 text-indigo-600 ' : 'bg-white border-slate-200 text-slate-500 hover:border-indigo-300 hover:text-indigo-500')}>
 <Activity size={12}/> Activity
 </button>
 <button onClick={() => setShowTrash(t => !t)}
 className={cn('flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs border transition-all',
 showTrash ? 'bg-red-50 border-red-300 text-red-600 ' : 'bg-white border-slate-200 text-slate-500 hover:border-red-300 hover:text-red-500')}>
 <Trash2 size={12}/>
 {trashCount > 0 && <span className={cn('rounded-full px-1.5 text-[9px] font-medium', showTrash ? 'bg-red-200 text-red-700 ' : 'bg-slate-200 text-slate-600 ')}>{trashCount}</span>}
 </button>
 <button onClick={() => addSection()} className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium bg-indigo-600 text-white hover:bg-indigo-700 transition-colors shadow-elevation-xs">
 <Plus size={12}/> Add Section
 </button>
 </div>
 )}
 </div>

 {/* Undo hint */}
 {canUndo && (
 <p className="text-[10px] text-slate-400 flex items-center gap-1">
 <Undo2 size={9}/> Last change can be undone (Ctrl+Z)
 </p>
 )}

 {/* Activity Dashboard panel */}
 {showDashboard && canManage && (
 <CellActivityDashboard cell={cell}/>
 )}

 {/* Trash panel */}
 {showTrash && canManage && (
 <div className="rounded-2xl border border-red-200 bg-red-50/50 overflow-hidden">
 <div className="flex items-center justify-between px-4 py-3 border-b border-red-200">
 <p className="font-semibold text-sm text-red-700 flex items-center gap-2"><Trash2 size={14}/> Trash ({trashCount} item{trashCount!==1?'s':''})</p>
 {trashCount > 0 && (
 <button onClick={emptyTrash} className="text-xs text-red-500 hover:text-red-700">Empty Trash</button>
 )}
 </div>
 {trashCount === 0 ? (
 <p className="text-sm text-slate-400 text-center py-6">Trash is empty</p>
 ) : (
 <div className="divide-y divide-red-100">
 {[...(ws.trash ?? [])].sort((a, b) => b.deletedAt.localeCompare(a.deletedAt)).map(entry => (
 <div key={entry.id} className="flex items-center justify-between px-4 py-2.5 gap-3">
 <div className="min-w-0">
 <p className="text-xs font-medium text-slate-700 truncate">{entry.label}</p>
 <p className="text-[10px] text-slate-400">{entry.type} · deleted {new Date(entry.deletedAt).toLocaleString()}</p>
 </div>
 <button onClick={() => restoreFromTrash(entry.id)}
 className="flex items-center gap-1 text-xs text-emerald-600 hover:text-emerald-700 shrink-0 px-2.5 py-1.5 rounded-lg hover:bg-emerald-100 transition-colors">
 <RotateCcw size={11}/> Restore
 </button>
 </div>
 ))}
 </div>
 )}
 </div>
 )}

 {ws.sections.length === 0 ? (
 <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50/50 flex flex-col items-center justify-center gap-2 py-12 text-center">
 <LayoutGrid size={28} className="text-slate-300"/>
 <p className="text-slate-400 text-sm font-medium">
 {canManage ? 'No sections yet' : 'Cell head has not set up this workspace yet'}
 </p>
 {canManage && <p className="text-slate-300 text-xs">Add a section to organise tables, notes, and KPIs for your cell.</p>}
 </div>
 ) : (
 ws.sections.map((section, i) => (
 <SectionBlock key={section.id} section={section} hook={hook}
 isFirst={i === 0} isLast={i === ws.sections.length - 1}
 canManage={canManage} cell={cell} userId={user?.id} userName={user?.name}/>
 ))
 )}
 </div>
 );
}
