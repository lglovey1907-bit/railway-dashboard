'use client';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { createPortal } from 'react-dom';
import { useEffect } from 'react';
import { Settings2, Plus, Trash2, X, RotateCcw, Sparkles } from 'lucide-react';
import type { PageField } from '@/lib/sheets/usePageFields';
import { cn } from '@/lib/utils';

export function FieldManager({
 fields, sheetHeaders, onAdd, onRemove, onReset, canEdit,
}: {
 fields: PageField[];
 sheetHeaders: string[];
 onAdd: (label: string, column: string) => void;
 onRemove: (id: string) => void;
 onReset: () => void;
 canEdit: boolean;
}) {
 const [open, setOpen] = useState(false);
 const [mounted, setMounted] = useState(false);
 const [newLabel, setNewLabel] = useState('');
 const [newColumn, setNewColumn] = useState('');

 useEffect(() => { setMounted(true); }, []);

 if (!canEdit) return null;

 // Sheet columns not yet mapped to a visible field — quick-add suggestions
 const usedColumns = new Set(fields.map(f => f.column.toLowerCase()));
 const unusedColumns = sheetHeaders.filter(h =>
 !usedColumns.has(h.toLowerCase()) &&
 !['code', 'station code', 'name', 'station name'].includes(h.toLowerCase())
 );

 const handleAdd = () => {
 if (!newLabel.trim() || !newColumn.trim()) return;
 onAdd(newLabel, newColumn);
 setNewLabel('');
 setNewColumn('');
 };

 const quickAdd = (col: string) => onAdd(col, col);

 return (
 <>
 <button onClick={() => setOpen(true)}
 className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border bg-slate-900/5 border-slate-900/10 text-slate-800/50 hover:bg-slate-900/10 hover:text-slate-800/70 transition-colors">
 <Settings2 size={12}/> Manage Fields
 <span className="text-[9px] bg-slate-900/10 rounded-full px-1.5 py-0.5">{fields.length}</span>
 </button>

 {mounted && createPortal(
 <AnimatePresence>
 {open && (
 <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
 className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
 onClick={() => setOpen(false)}>
 <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
 className="bg-slate-900 border border-slate-900/10 rounded-2xl p-6 w-full max-w-2xl shadow-2xl max-h-[85vh] overflow-y-auto"
 onClick={e => e.stopPropagation()}>

 <div className="flex items-center justify-between mb-1">
 <h3 className="text-slate-900 font-semibold flex items-center gap-2">
 <Settings2 size={16} className="text-blue-600"/> Manage Visible Fields
 </h3>
 <button onClick={() => setOpen(false)} className="text-slate-800/30 hover:text-slate-800/60">
 <X size={16}/>
 </button>
 </div>
 <p className="text-slate-800/40 text-xs mb-5">
 Choose exactly which fields appear on station cards and tables. Add any column from your Google Sheet, or remove ones you don't need.
 </p>

 {/* Current fields */}
 <div className="mb-5">
 <p className="text-slate-800/30 text-[10px] uppercase tracking-wider mb-2">Currently Shown ({fields.length})</p>
 <div className="space-y-1.5">
 {fields.map(f => (
 <div key={f.id} className="flex items-center justify-between gap-2 bg-slate-50 border border-slate-900/8 rounded-lg px-3 py-2">
 <div className="min-w-0">
 <p className="text-slate-800/80 text-xs font-medium truncate">{f.label}</p>
 <p className="text-slate-800/30 text-[10px] truncate">Sheet column: <span className="font-mono">{f.column}</span></p>
 </div>
 <button onClick={() => onRemove(f.id)}
 className="p-1.5 rounded-lg hover:bg-red-500/15 text-slate-800/20 hover:text-red-600 transition-colors shrink-0">
 <Trash2 size={12}/>
 </button>
 </div>
 ))}
 {fields.length === 0 && (
 <p className="text-slate-800/20 text-xs text-center py-4">No fields configured — add one below</p>
 )}
 </div>
 </div>

 {/* Quick-add from unmapped sheet columns */}
 {unusedColumns.length > 0 && (
 <div className="mb-5">
 <p className="text-slate-800/30 text-[10px] uppercase tracking-wider mb-2 flex items-center gap-1.5">
 <Sparkles size={10} className="text-amber-600"/> Found in your sheet — not shown yet
 </p>
 <div className="flex flex-wrap gap-1.5">
 {unusedColumns.map(col => (
 <button key={col} onClick={() => quickAdd(col)}
 className="flex items-center gap-1 text-[10px] bg-amber-500/10 border border-amber-500/25 text-amber-700 rounded-full px-2.5 py-1 hover:bg-amber-500/20 transition-colors">
 <Plus size={9}/> {col}
 </button>
 ))}
 </div>
 </div>
 )}

 {/* Manual add */}
 <div className="rounded-xl border border-blue-500/20 bg-blue-500/5 p-3 mb-4">
 <p className="text-blue-700 text-[11px] font-semibold mb-2">Add a Custom Field</p>
 <div className="grid grid-cols-2 gap-2 mb-2">
 <input value={newLabel} onChange={e => setNewLabel(e.target.value)}
 placeholder="Display label (e.g. STBA)"
 className="bg-slate-900/5 border border-slate-900/15 rounded-lg px-2.5 py-2 text-xs text-slate-800/80 focus:outline-none focus:border-blue-400/60"/>
 <input value={newColumn} onChange={e => setNewColumn(e.target.value)}
 placeholder="Sheet column name"
 className="bg-slate-900/5 border border-slate-900/15 rounded-lg px-2.5 py-2 text-xs text-slate-800/80 focus:outline-none focus:border-blue-400/60"/>
 </div>
 <button onClick={handleAdd} disabled={!newLabel.trim() || !newColumn.trim()}
 className="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium bg-blue-600/25 border border-blue-500/30 text-blue-700 hover:bg-blue-600/40 disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
 <Plus size={12}/> Add Field
 </button>
 </div>

 <div className="flex items-center justify-between pt-3 border-t border-slate-900/8">
 <button onClick={onReset}
 className="flex items-center gap-1.5 text-xs text-slate-800/30 hover:text-slate-800/60 transition-colors">
 <RotateCcw size={11}/> Reset to defaults
 </button>
 <button onClick={() => setOpen(false)}
 className="px-4 py-1.5 rounded-lg text-xs bg-emerald-600/30 text-emerald-700 border border-emerald-500/30 hover:bg-emerald-600/50">
 Done
 </button>
 </div>
 </motion.div>
 </motion.div>
 )}
 </AnimatePresence>,
 document.body
 )}
 </>
 );
}
