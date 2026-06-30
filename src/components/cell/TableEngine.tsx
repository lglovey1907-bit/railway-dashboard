'use client';
import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { createPortal } from 'react-dom';
import {
 Plus, Trash2, X, Check, ChevronUp, ChevronDown, Filter,
 Users, FileSpreadsheet, Link2, Unlink, RefreshCw, AlertCircle,
 Settings2, ArrowLeft, ArrowRight, ArrowUp, ArrowDown,
 Download, Upload, Clock, Undo2, Redo2, RotateCcw, Hash,
 DollarSign, Calendar, Mail, Globe, List, CheckSquare, Phone,
 Sigma, ChevronRight, SlidersHorizontal, Share2, History,
 WrapText, AlignJustify, Maximize2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { TableDef, FieldDef, RowDef, FieldType, DropdownOption } from '@/lib/cellData/types';
import { FIELD_TYPE_LABELS, validateValue, evalFormula, canFill, makeTable } from '@/lib/cellData/types';
import { mockUsers } from '@/lib/data/mockData';
import type { useWorkspace } from '@/lib/cellData/useWorkspace';
import { CollaborationPanel } from './CollaborationPanel';
import { ActivityLogModal, LastEditedBadge } from './ActivityLog';

type Hook = ReturnType<typeof useWorkspace>;

function Portal({ children }: { children: React.ReactNode }) {
 const [m, setM] = useState(false);
 useEffect(() => { setM(true); }, []);
 if (!m) return null;
 return createPortal(children, document.body);
}

// ── Field type icons ──────────────────────────────────────────────────────────
function TypeIcon({ type, size = 11, className = '' }: { type: FieldType; size?: number; className?: string }) {
 const cls = cn('shrink-0 text-slate-400 ', className);
 const p = { size, className: cls };
 if (type === 'number') return <Hash {...p}/>;
 if (type === 'currency') return <DollarSign {...p}/>;
 if (type === 'date') return <Calendar {...p}/>;
 if (type === 'checkbox') return <CheckSquare {...p}/>;
 if (type === 'email') return <Mail {...p}/>;
 if (type === 'url') return <Globe {...p}/>;
 if (type === 'phone') return <Phone {...p}/>;
 if (type === 'dropdown' || type === 'multiselect') return <List {...p}/>;
 if (type === 'formula') return <Sigma {...p}/>;
 return <span className={cn(cls, 'text-[10px] font-bold leading-none')} style={{fontSize:size}}>T</span>;
}

// ── Confirm dialog ─────────────────────────────────────────────────────────────
function ConfirmDialog({ title, message, onConfirm, onCancel, danger = true }: {
 title: string; message: string; onConfirm: () => void; onCancel: () => void; danger?: boolean;
}) {
 return (
 <Portal>
 <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
 className="fixed inset-0 z-[2150] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
 onClick={onCancel}>
 <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95 }}
 className="bg-white border border-slate-200 rounded-2xl p-6 w-full max-w-sm shadow-2xl"
 onClick={e => e.stopPropagation()}>
 <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center mb-4', danger ? 'bg-red-100 ' : 'bg-amber-100 ')}>
 <AlertCircle size={20} className={danger ? 'text-red-600 ' : 'text-amber-600 '}/>
 </div>
 <h3 className="font-bold text-slate-900 text-base mb-2">{title}</h3>
 <p className="text-slate-500 text-sm mb-6">{message}</p>
 <div className="flex gap-2 justify-end">
 <button onClick={onCancel} className="px-4 py-2 text-sm text-slate-500 hover:bg-slate-100 rounded-xl transition-colors">Cancel</button>
 <button onClick={onConfirm} className={cn('px-4 py-2 text-sm text-white rounded-xl transition-colors', danger ? 'bg-red-600 hover:bg-red-700' : 'bg-amber-600 hover:bg-amber-700')}>Delete</button>
 </div>
 </motion.div>
 </motion.div>
 </Portal>
 );
}

// ── Nominee picker ─────────────────────────────────────────────────────────────
function NomineePickerModal({ title, current, cellStaff, onClose, onSave }: {
 title: string; current: string[]; cellStaff: typeof mockUsers; onClose: () => void; onSave: (ids: string[]) => void;
}) {
 const [sel, setSel] = useState(current);
 const toggle = (id: string) => setSel(p => p.includes(id) ? p.filter(x => x !== id) : [...p, id]);
 return (
 <Portal>
 <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
 className="fixed inset-0 z-[2100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"onClick={onClose}>
 <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }}
 className="bg-white border border-slate-200 rounded-2xl p-6 w-full max-w-sm shadow-2xl"onClick={e => e.stopPropagation()}>
 <p className="font-semibold text-slate-900 text-sm mb-4 flex items-center gap-2"><Users size={15} className="text-blue-500"/>{title}</p>
 <div className="space-y-1.5 max-h-52 overflow-y-auto mb-4">
 {cellStaff.map(u => {
 const on = sel.includes(u.id);
 return (
 <button key={u.id} onClick={() => toggle(u.id)}
 className={cn('w-full flex items-center gap-3 px-3 py-2 rounded-xl border text-left transition-all',
 on ? 'bg-blue-50 border-blue-300 ' : 'bg-slate-50 border-slate-200 ')}>
 <div className={cn('w-4 h-4 rounded border flex items-center justify-center shrink-0', on ? 'bg-blue-600 border-blue-600' : 'border-slate-300 ')}>
 {on && <Check size={10} className="text-white"/>}
 </div>
 <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center text-[10px] font-bold text-blue-700 shrink-0">{u.name[0]}</div>
 <div className="min-w-0">
 <p className="text-xs font-medium text-slate-800 truncate">{u.name}</p>
 <p className="text-[10px] text-slate-400">{u.workingAs}</p>
 </div>
 </button>
 );
 })}
 {!cellStaff.length && <p className="text-xs text-slate-400 text-center py-4">No staff found</p>}
 </div>
 <div className="flex justify-end gap-2">
 <button onClick={onClose} className="px-3 py-1.5 text-xs text-slate-500 hover:bg-slate-100 rounded-lg">Cancel</button>
 <button onClick={() => { onSave(sel); onClose(); }} className="px-3 py-1.5 text-xs bg-blue-600 text-white hover:bg-blue-700 rounded-lg">Save</button>
 </div>
 </motion.div>
 </motion.div>
 </Portal>
 );
}

// ── Column settings panel ──────────────────────────────────────────────────────
function ColSettingsModal({ field, tableId, hook, cellStaff, onClose }: {
 field: FieldDef; tableId: string; hook: Hook; cellStaff: typeof mockUsers; onClose: () => void;
}) {
 const [label, setLabel] = useState(field.label);
 const [type, setType] = useState<FieldType>(field.type);
 const [formula, setFormula] = useState(field.formula ?? '');
 const [options, setOptions] = useState<DropdownOption[]>(field.options ?? []);
 const [newOpt, setNewOpt] = useState('');
 const [showNominee, setShowNominee] = useState(false);
 // Display options
 const [wrapText, setWrapText] = useState(field.wrapText ?? false);
 const [autoHeight, setAutoHeight] = useState(field.autoHeight ?? false);
 const [frozen, setFrozen] = useState(field.frozen ?? false);
 const [hidden, setHidden] = useState(field.hidden ?? false);

 const save = () => {
 hook.updateColumn(tableId, field.id, {
 label: label.trim() || field.label, type,
 formula: formula || undefined, options,
 wrapText, autoHeight: wrapText ? autoHeight : false,
 frozen, hidden,
 });
 onClose();
 };

 const addOption = () => {
 if (!newOpt.trim()) return;
 setOptions(o => [...o, { label: newOpt.trim(), value: newOpt.trim() }]);
 setNewOpt('');
 };

 // Toggle helpers
 const ToggleRow = ({ checked, onChange, label: lbl, sub }: {
 checked: boolean; onChange: (v: boolean) => void; label: string; sub?: string;
 }) => (
 <label className="flex items-start gap-3 cursor-pointer group py-1.5">
 <button type="button"onClick={() => onChange(!checked)}
 className={cn('w-4 h-4 rounded border flex items-center justify-center shrink-0 mt-0.5 transition-all',
 checked ? 'bg-indigo-600 border-indigo-600' : 'border-slate-300 bg-white group-hover:border-indigo-400')}>
 {checked && <Check size={10} className="text-white"/>}
 </button>
 <div>
 <p className="text-xs font-medium text-slate-700">{lbl}</p>
 {sub && <p className="text-[10px] text-slate-400 mt-0.5">{sub}</p>}
 </div>
 </label>
 );

 return (
 <Portal>
 <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
 className="fixed inset-0 z-[2100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"onClick={onClose}>
 <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }}
 className="bg-white border border-slate-200 rounded-2xl p-6 w-full max-w-lg shadow-2xl overflow-y-auto max-h-[90vh]"onClick={e => e.stopPropagation()}>
 <div className="flex items-center justify-between mb-4">
 <h3 className="font-bold text-slate-900 flex items-center gap-2"><Settings2 size={15} className="text-indigo-500"/> Column Settings</h3>
 <button onClick={onClose}><X size={16} className="text-slate-400"/></button>
 </div>

 <div className="space-y-4">
 <div>
 <label className="text-xs font-medium text-slate-500 block mb-1.5">Column Name</label>
 <input value={label} onChange={e => setLabel(e.target.value)} onKeyDown={e => e.key === 'Enter' && save()}
 className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-800 focus:outline-none focus:border-indigo-400"/>
 </div>

 <div>
 <label className="text-xs font-medium text-slate-500 block mb-1.5">Field Type</label>
 <div className="grid grid-cols-3 gap-1.5">
 {(Object.keys(FIELD_TYPE_LABELS) as FieldType[]).map(t => (
 <button key={t} onClick={() => setType(t)}
 className={cn('flex items-center gap-1.5 px-2.5 py-2 rounded-lg border text-xs transition-all',
 type === t ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-slate-50 text-slate-600 border-slate-200 hover:border-indigo-300 ')}>
 <TypeIcon type={t} size={11} className={type === t ? 'text-white' : ''}/> {FIELD_TYPE_LABELS[t]}
 </button>
 ))}
 </div>
 </div>

 {(type === 'dropdown' || type === 'multiselect') && (
 <div>
 <label className="text-xs font-medium text-slate-500 block mb-1.5">Options</label>
 <div className="space-y-1 mb-2 max-h-36 overflow-y-auto">
 {options.map((o, i) => (
 <div key={i} className="flex items-center gap-2 bg-slate-50 rounded-lg px-2 py-1.5">
 <div className="w-2 h-2 rounded-full bg-indigo-400 shrink-0"/>
 <span className="text-xs text-slate-700 flex-1">{o.label}</span>
 <button onClick={() => setOptions(opts => opts.filter((_, j) => j !== i))} className="text-slate-300 hover:text-red-500"><X size={12}/></button>
 </div>
 ))}
 {!options.length && <p className="text-xs text-slate-300 italic text-center py-2">No options yet</p>}
 </div>
 <div className="flex gap-2">
 <input value={newOpt} onChange={e => setNewOpt(e.target.value)} onKeyDown={e => e.key === 'Enter' && addOption()}
 placeholder="Add option..."className="flex-1 bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 focus:outline-none focus:border-indigo-400"/>
 <button onClick={addOption} className="px-3 py-1.5 rounded-lg text-xs bg-indigo-600 text-white hover:bg-indigo-700"><Plus size={11}/></button>
 </div>
 </div>
 )}

 {type === 'formula' && (
 <div>
 <label className="text-xs font-medium text-slate-500 block mb-1.5">Formula</label>
 <input value={formula} onChange={e => setFormula(e.target.value)} placeholder="e.g. {Quantity} * {Rate}"
 className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs font-mono text-slate-800 focus:outline-none focus:border-indigo-400 mb-2"/>
 <p className="text-[10px] text-slate-400">
 Reference other column values using {'{'}Column Name{'}'}.
 Supports: SUM(), AVERAGE(), MIN(), MAX(), COUNT(), IF(), ROUND(), CONCAT(), TODAY()
 </p>
 </div>
 )}

 {/* ── Display Options ─────────────────────────────────── */}
 <div className="border border-slate-200 rounded-xl p-3 space-y-0.5 bg-slate-50">
 <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">Display Options</p>
 <ToggleRow checked={wrapText} onChange={v => { setWrapText(v); if (v) setAutoHeight(true); }}
 label="Wrap Text"sub="Show full content on multiple lines (ideal for remarks, notes, descriptions)"/>
 {wrapText && (
 <ToggleRow checked={autoHeight} onChange={setAutoHeight}
 label="Auto Height"sub="Row height expands automatically to fit all content"/>
 )}
 <ToggleRow checked={frozen} onChange={setFrozen}
 label="Freeze Column"sub="Pin this column to the left edge while scrolling"/>
 <ToggleRow checked={hidden} onChange={setHidden}
 label="Hide Column"sub="Hide from view (data is preserved — unhide from column settings)"/>
 </div>

 <div className="flex items-center justify-between pt-2 border-t border-slate-100">
 <button onClick={() => setShowNominee(true)} className="flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-700">
 <Users size={12}/> Nominate Staff
 {field.nominatedUserIds.length > 0 && <span className="bg-blue-100 text-blue-700 rounded-full px-1.5">{field.nominatedUserIds.length}</span>}
 </button>
 <div className="flex gap-2">
 <button onClick={onClose} className="px-3 py-1.5 text-xs text-slate-500 hover:bg-slate-100 rounded-lg">Cancel</button>
 <button onClick={save} className="px-3 py-1.5 text-xs bg-indigo-600 text-white hover:bg-indigo-700 rounded-lg">Save</button>
 </div>
 </div>
 </div>
 </motion.div>
 </motion.div>
 <AnimatePresence>
 {showNominee && <NomineePickerModal title={`Column:"${field.label}"`} current={field.nominatedUserIds} cellStaff={cellStaff} onClose={() => setShowNominee(false)} onSave={ids => hook.setColumnNominees(tableId, field.id, ids)}/>}
 </AnimatePresence>
 </Portal>
 );
}

// ── Sheet connector modal ──────────────────────────────────────────────────────
function SheetModal({ table, hook, onClose }: { table: TableDef; hook: Hook; onClose: () => void }) {
 const [mode, setMode] = useState<'import' | 'link'>(table.sheet?.mode ?? 'link');
 const [url, setUrl] = useState(table.sheet?.url ?? '');
 const [loading, setLoading] = useState(false);
 const [err, setErr] = useState('');

 const doConnect = async () => {
 if (!url.trim()) return;
 setLoading(true); setErr('');
 const error = mode === 'link'
 ? await hook.linkSheet(table.id, url.trim())
 : await hook.importFromSheet(table.id, url.trim());
 setLoading(false);
 if (error) { setErr(error); } else { onClose(); }
 };

 const isLinked = table.dataSource === 'linked_sheet';

 return (
 <Portal>
 <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
 className="fixed inset-0 z-[2100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"onClick={onClose}>
 <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }}
 className="bg-white border border-slate-200 rounded-2xl p-6 w-full max-w-lg shadow-2xl"onClick={e => e.stopPropagation()}>
 <div className="flex items-center justify-between mb-1">
 <h3 className="font-bold text-slate-900 flex items-center gap-2"><FileSpreadsheet size={15} className="text-emerald-500"/> Google Sheets</h3>
 <button onClick={onClose}><X size={16} className="text-slate-400"/></button>
 </div>
 <p className="text-slate-500 text-xs mb-4">Connect a Google Sheet to populate this table.</p>

 {/* Mode selector */}
 <div className="grid grid-cols-2 gap-2 mb-4">
 {(['import', 'link'] as const).map(m => (
 <button key={m} onClick={() => setMode(m)}
 className={cn('flex flex-col items-start p-3 rounded-xl border text-left transition-all', mode === m ? 'border-emerald-400 bg-emerald-50 ' : 'border-slate-200 hover:border-slate-300 ')}>
 {m === 'import' ? <Download size={14} className={mode===m ? 'text-emerald-600' : 'text-slate-400'}/> : <Link2 size={14} className={mode===m ? 'text-emerald-600' : 'text-slate-400'}/>}
 <p className={cn('text-xs font-semibold mt-1.5', mode===m ? 'text-emerald-700 ' : 'text-slate-700 ')}>{m === 'import' ? 'Import' : 'Link (Live)'}</p>
 <p className="text-[10px] text-slate-400 mt-0.5">
 {m === 'import' ? 'One-time copy. Future sheet changes don\'t sync.' : 'Live connection. Sheet changes auto-update here every 30 s.'}
 </p>
 </button>
 ))}
 </div>

 {isLinked && table.sheet && (
 <div className="bg-emerald-50 border border-emerald-200 rounded-xl px-3 py-2.5 mb-3 flex items-center justify-between">
 <div>
 <p className="text-xs font-medium text-emerald-700 flex items-center gap-1.5"><Link2 size={11}/> Live sheet connected</p>
 {table.sheet.lastSynced && <p className="text-[10px] text-emerald-600/60 mt-0.5">Last synced: {new Date(table.sheet.lastSynced).toLocaleString()}</p>}
 </div>
 <button onClick={() => { hook.unlinkSheet(table.id); onClose(); }} className="text-[10px] text-red-500 hover:text-red-700 flex items-center gap-1"><Unlink size={10}/> Disconnect</button>
 </div>
 )}

 <input value={url} onChange={e => setUrl(e.target.value)} placeholder="https://docs.google.com/spreadsheets/d/..."
 className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2.5 text-sm text-slate-800 focus:outline-none focus:border-emerald-400 mb-3"/>
 {err && <p className="text-red-600 text-xs mb-3 flex items-center gap-1.5"><AlertCircle size={11}/>{err}</p>}
 <p className="text-[10px] text-slate-400 mb-4">Sheet must be shared: <b>Anyone with the link → Viewer</b>. First row = column headers. First column's value = row identifier.</p>
 <div className="flex justify-end gap-2">
 <button onClick={onClose} className="px-4 py-2 text-sm text-slate-500 hover:bg-slate-100 rounded-xl">Cancel</button>
 <button onClick={doConnect} disabled={!url.trim() || loading}
 className="px-4 py-2 text-sm bg-emerald-600 text-white hover:bg-emerald-700 rounded-xl disabled:opacity-40 flex items-center gap-1.5">
 {loading && <RefreshCw size={12} className="animate-spin"/>}
 {loading ? 'Connecting…' : (mode === 'link' ? 'Link & Sync' : 'Import')}
 </button>
 </div>
 </motion.div>
 </motion.div>
 </Portal>
 );
}

// ── Cell display ───────────────────────────────────────────────────────────────
function CellView({ value, field }: { value: string; field: FieldDef }) {
 const wrap = field.wrapText;
 if (!value && field.type !== 'checkbox') return <span className="text-slate-300">—</span>;
 switch (field.type) {
 case 'checkbox': return <input type="checkbox"checked={value === 'true'} readOnly className="accent-blue-600 w-4 h-4 cursor-default"/>;
 case 'currency': {
 const n = parseFloat(value);
 return <span className="font-medium">{isNaN(n) ? value : `₹${n.toLocaleString('en-IN')}`}</span>;
 }
 case 'url': return <a href={value.startsWith('http') ? value : `https://${value}`} target="_blank"rel="noreferrer"onClick={e => e.stopPropagation()} className={cn('text-blue-600 underline', wrap ? 'break-all' : 'truncate block')}>{value}</a>;
 case 'email': return <a href={`mailto:${value}`} onClick={e => e.stopPropagation()} className="text-blue-600 underline">{value}</a>;
 case 'multiselect': return (
 <div className="flex flex-wrap gap-1">{value.split(',').filter(Boolean).map((v,i) => (
 <span key={i} className="text-[10px] bg-indigo-100 text-indigo-700 rounded-full px-1.5 py-0.5">{v.trim()}</span>
 ))}</div>
 );
 default: return wrap
 ? <span className="whitespace-pre-wrap break-words leading-relaxed">{value}</span>
 : <span className="truncate block">{value}</span>;
 }
}

// ── Cell editor ─────────────────────────────────────────────────────────────────
function CellEditor({ value, field, onSave, onCancel }: {
 value: string; field: FieldDef; onSave: (v: string) => void; onCancel: () => void;
}) {
 const [draft, setDraft] = useState(value);
 const [error, setError] = useState('');
 const ref = useRef<HTMLInputElement & HTMLSelectElement & HTMLTextAreaElement>(null);
 useEffect(() => { ref.current?.focus(); (ref.current as HTMLInputElement)?.select?.(); }, []);

 const commit = () => {
 const result = validateValue(draft, field);
 if (!result.valid) { setError(result.error ?? 'Invalid value'); return; }
 onSave(draft);
 };

 const kd = (e: React.KeyboardEvent) => {
 if (e.key === 'Enter') commit();
 if (e.key === 'Escape') onCancel();
 };

 if (field.type === 'checkbox') {
 return <input type="checkbox"checked={draft === 'true'} onChange={e => { const v = e.target.checked ? 'true' : 'false'; setDraft(v); onSave(v); }} className="accent-blue-600 w-4 h-4"/>;
 }

 if (field.type === 'dropdown' && field.options?.length) {
 return (
 <select ref={ref as any} value={draft} onChange={e => setDraft(e.target.value)} onBlur={commit}
 className="w-full bg-white border border-blue-500 rounded px-1.5 py-0.5 text-xs text-slate-900 outline-none">
 <option value="">— Select —</option>
 {field.options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
 </select>
 );
 }

 if (field.type === 'multiselect' && field.options?.length) {
 const selected = new Set(draft.split(',').map(s => s.trim()).filter(Boolean));
 return (
 <div className="flex flex-col gap-1 p-1 bg-white border border-blue-500 rounded">
 {field.options.map(o => (
 <label key={o.value} className="flex items-center gap-2 px-1.5 py-1 rounded hover:bg-slate-100 cursor-pointer">
 <input type="checkbox"checked={selected.has(o.value)} onChange={e => {
 const ns = new Set(selected);
 e.target.checked ? ns.add(o.value) : ns.delete(o.value);
 const v = Array.from(ns).join(', ');
 setDraft(v); onSave(v);
 }} className="accent-blue-600 w-3 h-3"/>
 <span className="text-xs text-slate-700">{o.label}</span>
 </label>
 ))}
 </div>
 );
 }

 return (
 <div className="w-full">
 <input ref={ref as any} value={draft} onChange={e => { setDraft(e.target.value); setError(''); }} onBlur={commit} onKeyDown={kd}
 type={field.type === 'date' ? 'date' : field.type === 'number' || field.type === 'currency' ? 'number' : field.type === 'email' ? 'email' : field.type === 'url' ? 'url' : field.type === 'phone' ? 'tel' : 'text'}
 className={cn('w-full bg-white border rounded px-1.5 py-0.5 text-xs text-slate-900 outline-none', error ? 'border-red-500' : 'border-blue-500')}/>
 {error && <p className="text-[9px] text-red-500 mt-0.5 leading-tight">{error}</p>}
 </div>
 );
}

// ── Create Table modal (exported for CellDataManager) ─────────────────────────
export function CreateTableModal({ onClose, onCreated, cell = '' }: {
 onClose: () => void; onCreated: (t: TableDef) => void; cell?: string;
}) {
 const [name, setName] = useState('');
 const [firstCol, setFirstCol] = useState('Label');
 const [cols, setCols] = useState(3);
 const [rows, setRows] = useState(4);
 const create = () => { if (!name.trim()) return; onCreated(makeTable(name.trim(), cols, rows, firstCol.trim() || 'Label', cell)); onClose(); };
 return (
 <Portal>
 <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
 className="fixed inset-0 z-[2100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"onClick={onClose}>
 <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }}
 className="bg-white border border-slate-200 rounded-2xl p-6 w-full max-w-md shadow-2xl"onClick={e => e.stopPropagation()}>
 <h3 className="font-bold text-slate-900 text-base mb-5">Create Table</h3>
 <div className="space-y-3 mb-5">
 <div>
 <label className="text-xs text-slate-500 font-medium block mb-1.5">Table Name</label>
 <input value={name} onChange={e => setName(e.target.value)} autoFocus onKeyDown={e => e.key==='Enter' && create()} placeholder="e.g. Platform Inventory"
 className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-800 focus:outline-none focus:border-indigo-400"/>
 </div>
 <div>
 <label className="text-xs text-slate-500 font-medium block mb-1.5">First Column Header</label>
 <input value={firstCol} onChange={e => setFirstCol(e.target.value)} placeholder="Label / Station / Employee ID"
 className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-800 focus:outline-none focus:border-indigo-400"/>
 <p className="text-[10px] text-slate-400 mt-1">Identifies each row — rename at any time by double-clicking the header.</p>
 </div>
 <div className="grid grid-cols-2 gap-3">
 <div>
 <label className="text-xs text-slate-500 font-medium block mb-1.5">Rows</label>
 <input type="number"min={1} max={200} value={rows} onChange={e => setRows(Math.max(1,+e.target.value))}
 className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-800 focus:outline-none focus:border-indigo-400"/>
 </div>
 <div>
 <label className="text-xs text-slate-500 font-medium block mb-1.5">Columns</label>
 <input type="number"min={1} max={30} value={cols} onChange={e => setCols(Math.max(1,+e.target.value))}
 className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-800 focus:outline-none focus:border-indigo-400"/>
 </div>
 </div>
 </div>
 <div className="flex justify-end gap-2">
 <button onClick={onClose} className="px-4 py-2 text-sm text-slate-500 hover:bg-slate-100 rounded-xl">Cancel</button>
 <button onClick={create} disabled={!name.trim()} className="px-4 py-2 text-sm bg-indigo-600 text-white hover:bg-indigo-700 rounded-xl disabled:opacity-40">Create</button>
 </div>
 </motion.div>
 </motion.div>
 </Portal>
 );
}

// ── Main TableEngine ───────────────────────────────────────────────────────────
export function TableEngine({ table, hook, cell, canManage, userId, userName }: {
 table: TableDef; hook: Hook; cell: string; canManage: boolean; userId?: string; userName?: string;
}) {
 const cellStaff = mockUsers.filter(u => u.cell === cell);
 const [editing, setEditing] = useState<{ rId: string; fId: string } | null>(null);
 const [editFirstCol, setEditFirstCol] = useState<string | null>(null);
 const [colSettings, setColSettings] = useState<string | null>(null); // fieldId
 const [colFilter, setColFilter] = useState<string | null>(null);
 const [filterDraft, setFilterDraft] = useState('');
 const [showSheet, setShowSheet] = useState(false);
 const [showTableNominees, setShowTableNominees] = useState(false);
 const [showCollab, setShowCollab] = useState(false);
 const [showHistory, setShowHistory] = useState(false);
 const [showRowNominees, setShowRowNominees] = useState<string | null>(null); // rowId
 const [confirmDelete, setConfirmDelete] = useState<{ type: 'column' | 'row' | 'table'; id: string; label: string } | null>(null);
 const [syncing, setSyncing] = useState(false);
 const [colWidths, setColWidths] = useState<Record<string, number>>({});
 const [globalWrap, setGlobalWrap] = useState(false);
 const [rowHeightMode, setRowHeightMode] = useState<'auto' | 'fixed'>('auto');
 const resizeRef = useRef<{ id: string; startX: number; startW: number } | null>(null);
 const isLinked = table.dataSource === 'linked_sheet';

 // Ordered fields
 const orderedFields = useMemo(() => {
 const order = table.columnOrder ?? table.fields.map(f => f.id);
 const fields = order.map(id => table.fields.find(f => f.id === id)).filter(Boolean) as FieldDef[];
 // Remove hidden columns, sort frozen columns first
 const visible = fields.filter(f => !f.hidden);
 const frozen = visible.filter(f => f.frozen);
 const normal = visible.filter(f => !f.frozen);
 return [...frozen, ...normal];
 }, [table.fields, table.columnOrder]);

 // Sorted + filtered rows
 const visibleRows = useMemo(() => {
 let rows = [...table.rows].sort((a, b) => a.order - b.order);
 const filters = table.filters ?? {};
 Object.entries(filters).forEach(([fId, fVal]) => {
 if (!fVal) return;
 rows = rows.filter(r => {
 const v = fId === '__label__' ? (table.values[`${r.id}:__label__`] ?? '') : (table.values[`${r.id}:${fId}`] ?? '');
 return v.toLowerCase().includes(fVal.toLowerCase());
 });
 });
 if (table.sortField) {
 const dir = table.sortDir === 'desc' ? -1 : 1;
 rows = [...rows].sort((a, b) => {
 const va = table.values[`${a.id}:${table.sortField}`] ?? table.values[`${a.id}:__label__`] ?? '';
 const vb = table.values[`${b.id}:${table.sortField}`] ?? table.values[`${b.id}:__label__`] ?? '';
 return va.localeCompare(vb, undefined, { numeric: true }) * dir;
 });
 }
 return rows;
 }, [table.rows, table.values, table.filters, table.sortField, table.sortDir]);

 // Formula values
 const formulaValues = useMemo(() => {
 const result: Record<string, string> = {};
 const formulaCols = orderedFields.filter(f => f.type === 'formula' && f.formula);
 table.rows.forEach(row => {
 formulaCols.forEach(field => {
 result[`${row.id}:${field.id}`] = evalFormula(field.formula!, table, row.id, table.values);
 });
 });
 return result;
 }, [orderedFields, table.rows, table.values, table.fields]);

 const getVal = (rId: string, fId: string) => {
 if (formulaValues[`${rId}:${fId}`] !== undefined) return formulaValues[`${rId}:${fId}`];
 return table.values[`${rId}:${fId}`] ?? '';
 };

 // Column resize
 const startResize = (e: React.MouseEvent, id: string) => {
 e.preventDefault();
 const startW = colWidths[id] ?? (orderedFields.find(f => f.id === id)?.width ?? 160);
 resizeRef.current = { id, startX: e.clientX, startW };
 const move = (ev: MouseEvent) => {
 if (!resizeRef.current) return;
 setColWidths(p => ({ ...p, [resizeRef.current!.id]: Math.max(60, resizeRef.current!.startW + ev.clientX - resizeRef.current!.startX) }));
 };
 const up = () => { resizeRef.current = null; window.removeEventListener('mousemove', move); window.removeEventListener('mouseup', up); };
 window.addEventListener('mousemove', move); window.addEventListener('mouseup', up);
 };

 // Auto-sync
 useEffect(() => {
 if (!isLinked || !table.sheet?.url) return;
 const doSync = async () => { setSyncing(true); await hook.syncSheet(table.id); setSyncing(false); };
 doSync();
 const interval = table.sheet.autoSyncIntervalMinutes
 ? setInterval(doSync, table.sheet.autoSyncIntervalMinutes * 60 * 1000)
 : setInterval(doSync, 30000);
 return () => clearInterval(interval);
 }, [table.sheet?.url, table.id]); // eslint-disable-line

 const manualSync = async () => { setSyncing(true); await hook.syncSheet(table.id); setSyncing(false); };

 const activeFilters = table.filters ?? {};
 const hasFilters = Object.values(activeFilters).some(Boolean);
 const W = (f: FieldDef) => colWidths[f.id] ?? f.width;
 /** True when this column should wrap — per-column setting OR global Wrap All */
 const isWrapped = (f: FieldDef) => !!(f.wrapText || globalWrap);
 /** Effective CSS class for cell content depending on wrap mode */
 const cellClass = (f: FieldDef) => isWrapped(f)
 ? 'whitespace-pre-wrap break-words leading-relaxed'
 : 'truncate block';

 return (
 <div className="rounded-xl border border-slate-200 overflow-hidden bg-white">
 {/* Toolbar */}
 <div className="flex items-center gap-2 px-3 py-2 bg-slate-50 border-b border-slate-200 flex-wrap">
 <div className="flex items-center gap-1.5 flex-1 min-w-0">
 {isLinked && (
 <span className="inline-flex items-center gap-1 text-[10px] bg-emerald-100 border border-emerald-300 text-emerald-700 rounded-full px-2 py-0.5">
 <Link2 size={9}/> Live
 {table.sheet?.lastSynced && <span className="opacity-60 ml-0.5">· {new Date(table.sheet.lastSynced).toLocaleTimeString()}</span>}
 {syncing && <RefreshCw size={9} className="animate-spin ml-0.5"/>}
 </span>
 )}
 {table.dataSource === 'manual' && table.sheet?.mode === 'import' && (
 <span className="inline-flex items-center gap-1 text-[10px] bg-slate-100 border border-slate-200 text-slate-500 rounded-full px-2 py-0.5">
 <Download size={9}/> Imported
 </span>
 )}
 {hasFilters && <span className="text-[10px] bg-amber-100 border border-amber-300 text-amber-700 rounded-full px-2 py-0.5 flex items-center gap-1"><Filter size={9}/> Filtered</span>}
 {table.sheet?.syncError && <span className="text-[10px] text-red-600 flex items-center gap-1"><AlertCircle size={9}/> Sync error</span>}
 </div>
 <div className="flex items-center gap-1">
 {isLinked && <button onClick={manualSync} disabled={syncing} title="Refresh now"className="p-1.5 rounded-lg hover:bg-slate-200 text-slate-400 hover:text-slate-700"><RefreshCw size={12} className={syncing ? 'animate-spin' : ''}/></button>}
 {/* Wrap All toggle */}
 <button
 onClick={() => setGlobalWrap(v => !v)}
 title={globalWrap ? 'Disable wrap for all columns' : 'Wrap text in all columns'}
 className={cn('flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] transition-colors',
 globalWrap
 ? 'bg-amber-100 text-amber-700 hover:bg-amber-200 '
 : 'hover:bg-slate-200 text-slate-400 hover:text-slate-700 ')}>
 <WrapText size={12}/>{globalWrap ? 'Wrapped' : 'Wrap All'}
 </button>
 {/* Row height mode */}
 <button
 onClick={() => setRowHeightMode(m => m === 'auto' ? 'fixed' : 'auto')}
 title={rowHeightMode === 'auto' ? 'Switch to fixed row height' : 'Switch to auto row height'}
 className="flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-slate-200 text-slate-400 hover:text-slate-700 text-[10px]">
 <AlignJustify size={12}/>{rowHeightMode === 'auto' ? 'Auto' : 'Fixed'}
 </button>
 {/* Auto-fit columns */}
 {canManage && (
 <button
 title="Auto-fit all column widths to content (double-click any header to auto-fit that column)"
 onClick={() => {
 // Reset all manual widths — columns snap back to their field.width defaults
 setColWidths({});
 }}
 className="flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-slate-200 text-slate-400 hover:text-slate-700 text-[10px]">
 <Maximize2 size={12}/> Auto-fit
 </button>
 )}
 {canManage && <>
 <button onClick={() => setShowTableNominees(true)} title="Table-level access"className="flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-blue-100 text-slate-400 hover:text-blue-600 text-[10px]">
 <Users size={12}/> Access{table.nominatedUserIds.length > 0 && <span className="bg-blue-100 text-blue-700 rounded-full px-1 ml-0.5">{table.nominatedUserIds.length}</span>}
 </button>
 <button onClick={() => setShowSheet(true)} className="flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-emerald-100 text-slate-400 hover:text-emerald-600 text-[10px]">
 <FileSpreadsheet size={12}/> {isLinked ? 'Sheet' : 'Connect Sheet'}
 </button>
 <button onClick={() => setShowCollab(true)} className="flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-purple-100 text-slate-400 hover:text-purple-600 text-[10px]">
 <Share2 size={12}/> Share
 </button>
 </>}
 <button onClick={() => setShowHistory(true)} className="flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-indigo-100 text-slate-400 hover:text-indigo-600 text-[10px]">
 <History size={12}/> History
 </button>
 </div>
 </div>

 {/* Grid */}
 <div className="overflow-auto max-h-[600px]">
 <table className="border-collapse text-xs"style={{ minWidth: '100%' }}>
 <thead className="sticky top-0 z-10">
 <tr className="bg-slate-100 border-b border-slate-200">
 <th className="w-8 border-r border-slate-200 bg-slate-100"/>

 {/* First col header */}
 <th className="border-r border-slate-200 bg-slate-100 relative"style={{ width: colWidths['__label__'] ?? 140 }}>
 <div className="flex items-center gap-1 px-2 py-2">
 {editFirstCol === '__header__' ? (
 <input value={table.firstColLabel} onChange={e => hook.setFirstColLabel(table.id, e.target.value)}
 onBlur={() => setEditFirstCol(null)} onKeyDown={e => (e.key==='Enter'||e.key==='Escape') && setEditFirstCol(null)}
 autoFocus className="bg-white border border-blue-500 rounded px-1 text-xs text-slate-900 outline-none w-full font-semibold"/>
 ) : (
 <button onDoubleClick={() => !isLinked && canManage && setEditFirstCol('__header__')}
 onClick={() => hook.setSort(table.id, '__label__')}
 className="flex items-center gap-1 font-semibold text-[11px] text-slate-600 hover:text-slate-900 flex-1 text-left">
 <span title="Double-click to rename">{table.firstColLabel}</span>
 {table.sortField === '__label__' && (table.sortDir==='asc' ? <ChevronUp size={10}/> : <ChevronDown size={10}/>)}
 </button>
 )}
 <button onClick={() => setColFilter(f => f==='__label__' ? null : '__label__')} className={cn('shrink-0', activeFilters['__label__'] ? 'text-blue-500' : 'text-slate-300 hover:text-slate-500')}><Filter size={10}/></button>
 </div>
 {colFilter === '__label__' && (
 <div className="px-2 pb-1"><input value={activeFilters['__label__'] ?? ''} onChange={e => hook.setFilter(table.id, '__label__', e.target.value)} placeholder="Filter…"autoFocus onBlur={() => setColFilter(null)} className="w-full bg-white border border-blue-400 rounded px-1.5 py-0.5 text-xs outline-none"/></div>
 )}
 <div className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-blue-400"
 onMouseDown={e => startResize(e, '__label__')}
 onDoubleClick={() => setColWidths(p => { const {['__label__']: _, ...rest} = p; return rest; })}
 title="Drag to resize · Double-click to auto-fit"/>
 </th>

 {/* Data cols */}
 {orderedFields.map((field, fi) => (
 <th key={field.id} className={cn("border-r border-slate-200 bg-slate-100 relative", field.frozen &&"sticky left-0 z-20")} style={{ width: W(field), minWidth: 80 }}>
 <div className="flex items-center gap-1 px-2 py-2">
 <button onClick={() => hook.setSort(table.id, field.id)} className="flex items-center gap-1 font-semibold text-[11px] text-slate-600 hover:text-slate-900 flex-1 text-left min-w-0">
 <TypeIcon type={field.type} size={10}/>
 <span className="truncate">{field.label}</span>
 {table.sortField === field.id && (table.sortDir==='asc' ? <ChevronUp size={10}/> : <ChevronDown size={10}/>)}
 </button>
 <div className="flex items-center gap-0.5 shrink-0">
 <button onClick={() => { setColFilter(f => f===field.id ? null : field.id); setFilterDraft(activeFilters[field.id] ?? ''); }} className={cn(activeFilters[field.id] ? 'text-blue-500' : 'text-slate-300 hover:text-slate-500')}><Filter size={10}/></button>
 {canManage && !isLinked && <>
 <button onClick={() => hook.moveColumn(table.id, field.id, 'left')} disabled={fi===0} className="text-slate-300 hover:text-slate-600 disabled:opacity-30"><ArrowLeft size={10}/></button>
 <button onClick={() => hook.moveColumn(table.id, field.id, 'right')} disabled={fi===orderedFields.length-1} className="text-slate-300 hover:text-slate-600 disabled:opacity-30"><ArrowRight size={10}/></button>
 <button onClick={() => setColSettings(field.id)} className="text-slate-300 hover:text-slate-600"><Settings2 size={10}/></button>
 <button onClick={() => setConfirmDelete({ type: 'column', id: field.id, label: field.label })} className="text-slate-300 hover:text-red-500"><X size={10}/></button>
 </>}
 </div>
 </div>
 {colFilter === field.id && (
 <div className="px-2 pb-1"><input value={activeFilters[field.id] ?? ''} onChange={e => hook.setFilter(table.id, field.id, e.target.value)} placeholder="Filter…"autoFocus onBlur={() => setColFilter(null)} className="w-full bg-white border border-blue-400 rounded px-1.5 py-0.5 text-xs outline-none"/></div>
 )}
 {field.nominatedUserIds.length > 0 && <div className="px-2 pb-1"><span className="text-[8px] bg-blue-100 text-blue-700 rounded-full px-1">{field.nominatedUserIds.length} nominee{field.nominatedUserIds.length>1?'s':''}</span></div>}
 <div className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-blue-400"
 onMouseDown={e => startResize(e, field.id)}
 onDoubleClick={() => setColWidths(p => { const {[field.id]: _, ...rest} = p; return rest; })}
 title="Drag to resize · Double-click to auto-fit"/>
 </th>
 ))}

 {/* Add col */}
 {canManage && !isLinked && (
 <th className="w-8 border-r-0 border-slate-200 bg-slate-100">
 <button onClick={() => hook.addColumn(table.id)} className="w-full h-full flex items-center justify-center py-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors">
 <Plus size={13}/>
 </button>
 </th>
 )}
 </tr>
 </thead>

 <tbody>
 {visibleRows.map((row, idx) => {
 const labelVal = table.values[`${row.id}:__label__`] || (isLinked ? '' : `Row ${idx+1}`);
 return (
 <tr key={row.id} className={cn('group hover:bg-blue-50/40 transition-colors border-b border-slate-100 ', idx%2===1 && 'bg-slate-50/30 ')}>
 {/* Row # + controls */}
 <td className="w-8 border-r border-slate-100 px-1 text-center align-middle">
 <div className="flex flex-col items-center gap-0.5">
 {canManage && !isLinked ? (<>
 <button onClick={() => hook.moveRow(table.id, row.id, 'up')} disabled={idx===0} className="hidden group-hover:flex text-slate-300 hover:text-slate-600 disabled:opacity-20 p-px"><ChevronUp size={9}/></button>
 <span className="text-[10px] text-slate-300 leading-none group-hover:hidden">{idx+1}</span>
 <button onClick={() => hook.moveRow(table.id, row.id, 'down')} disabled={idx===visibleRows.length-1} className="hidden group-hover:flex text-slate-300 hover:text-slate-600 disabled:opacity-20 p-px"><ChevronDown size={9}/></button>
 </>) : <span className="text-[10px] text-slate-300">{idx+1}</span>}
 </div>
 </td>

 {/* Label cell */}
 <td className="border-r border-slate-100 px-2 py-1.5 font-medium text-slate-700"style={{ width: colWidths['__label__'] ?? 140 }}>
 {isLinked ? (
 <span className="whitespace-pre-wrap break-words block">{labelVal}</span>
 ) : editFirstCol === row.id ? (
 <input value={table.values[`${row.id}:__label__`] ?? ''}
 autoFocus onChange={e => hook.setCellValue(table.id, row.id, '__label__', e.target.value)}
 onBlur={() => setEditFirstCol(null)} onKeyDown={e => { if (e.key==='Enter'||e.key==='Escape') setEditFirstCol(null); }}
 className="w-full bg-white border border-blue-500 rounded px-1.5 py-0.5 text-xs text-slate-900 outline-none"/>
 ) : (
 <div className="flex items-center gap-1 group/lbl">
 <button onDoubleClick={() => setEditFirstCol(row.id)} className="flex-1 text-left truncate">{labelVal || <span className="text-slate-300 italic">double-click</span>}</button>
 {canManage && (
 <button onClick={() => setShowRowNominees(row.id)} className="opacity-0 group-hover/lbl:opacity-100 text-slate-300 hover:text-blue-500 shrink-0"><Users size={10}/></button>
 )}
 {row.nominatedUserIds.length > 0 && <span className="text-[8px] bg-blue-100 text-blue-700 rounded-full px-1">{row.nominatedUserIds.length}</span>}
 {canManage && !isLinked && (
 <button onClick={() => setConfirmDelete({ type: 'row', id: row.id, label: labelVal || `Row ${idx+1}` })} className="opacity-0 group-hover/lbl:opacity-100 text-slate-300 hover:text-red-500 shrink-0"><Trash2 size={10}/></button>
 )}
 </div>
 )}
 </td>

 {/* Data cells */}
 {orderedFields.map(field => {
 const isFormula = field.type === 'formula';
 const cellEditable = canFill(userId, canManage, table, row, field) && !isLinked && !isFormula;
 const val = getVal(row.id, field.id);
 const isEditing = editing?.rId === row.id && editing?.fId === field.id;
 return (
 <td key={field.id}
 className={cn('border-r border-slate-100 px-2',
 field.frozen ? 'sticky left-0 bg-white z-[1]' : '',
 // vertical padding: more when auto-height with wrap
 isWrapped(field) && rowHeightMode === 'auto' ? 'py-2 align-top' : 'py-1.5 align-middle'
 )}
 style={{ width: W(field) }}
 onDoubleClick={() => cellEditable && setEditing({ rId: row.id, fId: field.id })}>
 {isEditing ? (
 <CellEditor value={val} field={field} onSave={v => { hook.setCellValue(table.id, row.id, field.id, v); setEditing(null); }} onCancel={() => setEditing(null)}/>
 ) : (
 <div className={cn('min-h-[20px]',
 isFormula && 'text-indigo-600 font-medium',
 !val && cellEditable && 'text-slate-200 italic',
 // fixed height: clamp to 2 lines with"…show more"hint
 !isWrapped(field) || rowHeightMode === 'fixed' ? 'max-h-10 overflow-hidden' : '',
 )}>
 {isFormula && !val
 ? <span className="text-[10px] opacity-50">={field.formula}</span>
 : <CellView value={val} field={{ ...field, wrapText: isWrapped(field) }}/>
 }
 {/*"…more"hint in fixed-height mode when content overflows */}
 {rowHeightMode === 'fixed' && isWrapped(field) && val.length > 60 && (
 <span className="text-[9px] text-blue-500">…more</span>
 )}
 </div>
 )}
 </td>
 );
 })}
 {canManage && !isLinked && <td/>}
 </tr>
 );
 })}

 {/* Add row */}
 {canManage && !isLinked && (
 <tr>
 <td colSpan={orderedFields.length + 3}>
 <button onClick={() => hook.addRow(table.id)} className="w-full flex items-center gap-1.5 px-3 py-2 text-xs text-slate-400 hover:text-indigo-600 hover:bg-indigo-50/50 transition-colors">
 <Plus size={12}/> Add row
 </button>
 </td>
 </tr>
 )}
 {!visibleRows.length && (
 <tr><td colSpan={orderedFields.length + 3} className="text-center text-slate-300 py-8 text-xs italic">{hasFilters ? 'No rows match the current filter' : 'No rows yet'}</td></tr>
 )}
 </tbody>
 </table>
 </div>

 {/* Row count footer */}
 <div className="flex items-center justify-between px-3 py-1.5 bg-slate-50 border-t border-slate-200 text-[10px] text-slate-400">
 <span>{visibleRows.length} of {table.rows.length} row{table.rows.length!==1?'s':''}{hasFilters && ' (filtered)'}</span>
 <div className="flex items-center gap-3">
 <LastEditedBadge tableId={table.id} cell={cell}/>
 {hasFilters && <button onClick={() => { orderedFields.forEach(f => hook.clearFilter(table.id, f.id)); hook.clearFilter(table.id, '__label__'); }} className="text-blue-500 hover:text-blue-700 flex items-center gap-0.5"><RotateCcw size={9}/> Clear filters</button>}
 </div>
 </div>

 {/* Modals */}
 <AnimatePresence>
 {confirmDelete && (
 <ConfirmDialog
 title={`Delete ${confirmDelete.type}?`}
 message={`"${confirmDelete.label}"will be deleted and moved to Trash. You can restore it from the trash.`}
 onConfirm={() => {
 if (confirmDelete.type === 'column') hook.removeColumn(table.id, confirmDelete.id);
 else if (confirmDelete.type === 'row') hook.removeRow(table.id, confirmDelete.id);
 setConfirmDelete(null);
 }}
 onCancel={() => setConfirmDelete(null)}
 />
 )}
 {showSheet && <SheetModal table={table} hook={hook} onClose={() => setShowSheet(false)}/>}
 {colSettings && <ColSettingsModal field={orderedFields.find(f => f.id === colSettings)!} tableId={table.id} hook={hook} cellStaff={cellStaff} onClose={() => setColSettings(null)}/>}
 {showTableNominees && <NomineePickerModal title="Whole-table access"current={table.nominatedUserIds} cellStaff={cellStaff} onClose={() => setShowTableNominees(false)} onSave={ids => hook.setTableNominees(table.id, ids)}/>}
 {showRowNominees && <NomineePickerModal title={`Row:"${table.values[`${showRowNominees}:__label__`] ?? 'this row'}"`} current={table.rows.find(r => r.id === showRowNominees)?.nominatedUserIds ?? []} cellStaff={cellStaff} onClose={() => setShowRowNominees(null)} onSave={ids => hook.setRowNominees(table.id, showRowNominees, ids)}/>}
 {showCollab && (
 <CollaborationPanel table={table} cell={cell} userId={userId} userName={userName} canManage={canManage}
 onLockToggle={() => hook.updateTable(table.id, { locked: !table.locked })}
 onClose={() => setShowCollab(false)}/>
 )}
 {showHistory && (
 <ActivityLogModal table={table} cell={cell} userId={userId} userName={userName} canManage={canManage}
 onRestoreVersion={(snapshot) => {
 try {
 const restored = JSON.parse(snapshot);
 hook.updateTable(table.id, restored);
 } catch { /* ignore parse error */ }
 }}
 onClose={() => setShowHistory(false)}/>
 )}
 </AnimatePresence>
 </div>
 );
}
