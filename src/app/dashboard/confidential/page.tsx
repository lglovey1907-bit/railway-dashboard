'use client';
import { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuthStore } from '@/store/authStore';
import {
 CONFIDENTIAL_REPORTS_SEED, EXTENDED_USERS,
 type ConfidentialReport, type ConfidentialReportRow
} from '@/lib/data/mockData';
import {
 Lock, LockOpen, Shield, Eye, EyeOff, Plus, Trash2,
 UserCheck, X, Save, ChevronDown, ChevronUp, Check,
 AlertTriangle, FileText, Users, Clock, Search, Edit3,
 ShieldAlert, ShieldCheck, Bell
} from 'lucide-react';
import { cn } from '@/lib/utils';

// ──────────────────────────────────────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────────────────────────────────────
const CONFIDENTIALITY_CONFIG = {
 public: { label: 'Public', icon: LockOpen, color: 'text-emerald-600 ', bg: 'bg-emerald-500/15', border: 'border-emerald-500/30', desc: 'Visible to all logged-in users' },
 confidential: { label: 'Confidential', icon: Lock, color: 'text-amber-600 ', bg: 'bg-amber-500/15', border: 'border-amber-500/30', desc: 'Visible only to selected users + Admin' },
 restricted: { label: 'Restricted', icon: ShieldAlert, color: 'text-red-600 ', bg: 'bg-red-500/15', border: 'border-red-500/30', desc: 'Visible ONLY to explicitly selected users' },
};

const REPORT_CATEGORIES = [
 'Punishment','D&AR','Staff List','Inspection Report','Complaint Investigation',
 'Revenue Audit','Performance Review','Legal Correspondence','Union Matter',
 'Vigilance','Incident Report','Other',
];

function ConfidentialityBadge({ level }: { level: ConfidentialReport['confidentiality'] }) {
 const cfg = CONFIDENTIALITY_CONFIG[level];
 const Icon = cfg.icon;
 return (
 <span className={`inline-flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${cfg.bg} ${cfg.border} ${cfg.color}`}>
 <Icon size={9} /> {cfg.label}
 </span>
 );
}

function StatusBadge({ status }: { status: ConfidentialReport['status'] }) {
 const map = {
 draft: 'bg-slate-500/15 border-slate-500/30 text-slate-400',
 submitted: 'bg-blue-500/15 border-blue-500/30 text-blue-600 ',
 acknowledged: 'bg-emerald-500/15 border-emerald-500/30 text-emerald-600 ',
 };
 return (
 <span className={`inline-flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${map[status]}`}>
 {status}
 </span>
 );
}

function UserChip({ userId, onRemove }: { userId: string; onRemove?: () => void }) {
 const u = EXTENDED_USERS.find(x => x.id === userId);
 if (!u) return null;
 return (
 <span className="inline-flex items-center gap-1.5 bg-blue-500/15 border border-blue-500/30 text-blue-700 text-[10px] font-medium rounded-full pl-2 pr-1 py-0.5">
 <span className="w-4 h-4 rounded-full bg-blue-600/40 flex items-center justify-center text-[8px] font-bold">
 {u.name[0]}
 </span>
 {u.name} <span className="text-blue-600">({u.designation})</span>
 {onRemove && (
 <button onClick={onRemove} className="hover:text-red-600 transition-colors ml-0.5">
 <X size={9}/>
 </button>
 )}
 </span>
 );
}

// ──────────────────────────────────────────────────────────────────────────────
// Create / Edit Report Modal
// ──────────────────────────────────────────────────────────────────────────────
interface CreateModalProps {
 onClose: () => void;
 onSave: (r: ConfidentialReport) => void;
 existing?: ConfidentialReport;
 currentUserId: string;
 currentUser: { name: string; designation: string };
 userCell: string;
}

function CreateEditModal({ onClose, onSave, existing, currentUserId, currentUser, userCell }: CreateModalProps) {
 const isEdit = !!existing;
 const [title, setTitle] = useState(existing?.title ?? '');
 const [category, setCategory] = useState(existing?.category ?? REPORT_CATEGORIES[0]);
 const [summary, setSummary] = useState(existing?.summary ?? '');
 const [confidentiality, setConfidentiality] = useState<ConfidentialReport['confidentiality']>(existing?.confidentiality ?? 'confidential');
 const [allowedUserIds, setAllowedUserIds] = useState<string[]>(existing?.allowedUserIds ?? []);
 const [userSearch, setUserSearch] = useState('');
 const [showUserPicker, setShowUserPicker] = useState(false);

 // Table columns + rows
 const [columns, setColumns] = useState<string[]>(
 existing?.content?.[0] ? Object.keys(existing.content[0]) : ['Sr No', 'Name', 'Designation', 'Remarks']
 );
 const [rows, setRows] = useState<ConfidentialReportRow[]>(existing?.content ?? []);
 const [newCol, setNewCol] = useState('');

 // Filtered users for picker (exclude self + already added)
 const pickableUsers = useMemo(() =>
 EXTENDED_USERS.filter(u =>
 u.id !== currentUserId &&
 u.approved &&
 !allowedUserIds.includes(u.id) &&
 (userSearch === '' ||
 u.name.toLowerCase().includes(userSearch.toLowerCase()) ||
 u.designation.toLowerCase().includes(userSearch.toLowerCase()) ||
 u.cell.toLowerCase().includes(userSearch.toLowerCase()))
 ), [allowedUserIds, userSearch]);

 const addUser = (id: string) => { setAllowedUserIds(p => [...p, id]); setUserSearch(''); };
 const removeUser = (id: string) => setAllowedUserIds(p => p.filter(x => x !== id));

 const addColumn = () => {
 if (!newCol.trim()) return;
 const key = newCol.trim();
 setColumns(p => [...p, key]);
 setRows(p => p.map(r => ({ ...r, [key]: '' })));
 setNewCol('');
 };

 const removeColumn = (col: string) => {
 setColumns(p => p.filter(c => c !== col));
 setRows(p => p.map(r => { const n = { ...r }; delete n[col]; return n; }));
 };

 const addRow = () => setRows(p => [...p, Object.fromEntries(columns.map(c => [c, '']))]);
 const removeRow = (i: number) => setRows(p => p.filter((_, idx) => idx !== i));
 const updateCell = (rowIdx: number, col: string, val: string) =>
 setRows(p => p.map((r, i) => i === rowIdx ? { ...r, [col]: val } : r));

 const canSave = title.trim() && category &&
 (confidentiality === 'public' || allowedUserIds.length > 0);

 const handleSave = (asDraft = false) => {
 const report: ConfidentialReport = {
 id: existing?.id ?? `cr${Date.now()}`,
 title: title.trim(),
 category,
 cell: userCell,
 createdBy: currentUserId,
 createdByName: currentUser.name,
 createdByDesignation: currentUser.designation,
 createdAt: existing?.createdAt ?? new Date().toISOString(),
 updatedAt: new Date().toISOString(),
 confidentiality,
 allowedUserIds,
 status: asDraft ? 'draft' : 'submitted',
 summary: summary.trim(),
 content: rows,
 acknowledged: existing?.acknowledged ?? [],
 };
 onSave(report);
 onClose();
 };

 return (
 <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
 className="fixed inset-0 z-50 flex items-start justify-center bg-black/70 backdrop-blur-sm p-4 overflow-y-auto"
 onClick={onClose}>
 <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
 exit={{ scale: 0.95, opacity: 0 }}
 className="bg-slate-950 border border-slate-900/10 rounded-2xl w-full max-w-4xl shadow-2xl my-8"
 onClick={e => e.stopPropagation()}>

 {/* Modal header */}
 <div className="flex items-center justify-between px-6 py-4 border-b border-slate-900/8">
 <div className="flex items-center gap-3">
 <div className="w-8 h-8 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center">
 <Shield size={15} className="text-amber-600"/>
 </div>
 <div>
 <h2 className="text-slate-900 font-semibold text-sm">{isEdit ? 'Edit Confidential Report' : 'Create Confidential Report'}</h2>
 <p className="text-slate-800/30 text-xs">From: {currentUser.designation} · {userCell} Cell</p>
 </div>
 </div>
 <button onClick={onClose} className="p-2 rounded-xl hover:bg-slate-900/5 text-slate-800/40 hover:text-slate-800/70 transition-colors">
 <X size={16}/>
 </button>
 </div>

 <div className="p-6 space-y-6">
 {/* Basic fields */}
 <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
 <div className="sm:col-span-2">
 <label className="text-slate-800/40 text-xs uppercase tracking-wider block mb-1.5">Report Title *</label>
 <input value={title} onChange={e => setTitle(e.target.value)}
 placeholder="e.g. Staff Under Punishment — June 2026"
 className="w-full bg-slate-900/5 border border-slate-900/10 rounded-xl px-3 py-2.5 text-sm text-slate-800/80 focus:outline-none focus:border-blue-400/50 placeholder:text-slate-800/20"/>
 </div>
 <div>
 <label className="text-slate-800/40 text-xs uppercase tracking-wider block mb-1.5">Category *</label>
 <select value={category} onChange={e => setCategory(e.target.value)}
 className="w-full bg-slate-900 border border-slate-900/10 rounded-xl px-3 py-2.5 text-sm text-slate-800/80 focus:outline-none focus:border-blue-400/50">
 {REPORT_CATEGORIES.map(c => <option key={c} value={c} className="bg-slate-900">{c}</option>)}
 </select>
 </div>
 <div>
 <label className="text-slate-800/40 text-xs uppercase tracking-wider block mb-1.5">Summary</label>
 <input value={summary} onChange={e => setSummary(e.target.value)}
 placeholder="Brief description of contents"
 className="w-full bg-slate-900/5 border border-slate-900/10 rounded-xl px-3 py-2.5 text-sm text-slate-800/80 focus:outline-none focus:border-blue-400/50 placeholder:text-slate-800/20"/>
 </div>
 </div>

 {/* ── Confidentiality selector ── */}
 <div>
 <label className="text-slate-800/40 text-xs uppercase tracking-wider block mb-2">Confidentiality Level *</label>
 <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
 {(Object.entries(CONFIDENTIALITY_CONFIG) as [ConfidentialReport['confidentiality'], typeof CONFIDENTIALITY_CONFIG['public']][]).map(([level, cfg]) => {
 const Icon = cfg.icon;
 const active = confidentiality === level;
 return (
 <button key={level} onClick={() => setConfidentiality(level)}
 className={cn('rounded-xl border p-3 text-left transition-all',
 active ? `${cfg.bg} ${cfg.border}` : 'bg-slate-900/3 border-slate-900/8 hover:bg-slate-900/5 ')}>
 <div className="flex items-center gap-2 mb-1">
 <Icon size={14} className={active ? cfg.color : 'text-slate-800/30 '}/>
 <span className={`text-xs font-semibold ${active ? cfg.color : 'text-slate-800/40 '}`}>{cfg.label}</span>
 {active && <Check size={12} className={cfg.color + ' ml-auto'}/>}
 </div>
 <p className="text-slate-800/30 text-[10px] leading-snug">{cfg.desc}</p>
 </button>
 );
 })}
 </div>
 </div>

 {/* ── User access selector (shown when not public) ── */}
 {(confidentiality === 'confidential' || confidentiality === 'restricted') && (
 <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4 space-y-3">
 <div className="flex items-center gap-2">
 <Users size={14} className="text-amber-600"/>
 <h3 className="text-amber-700 text-sm font-semibold">Select Authorised Viewers</h3>
 {confidentiality === 'restricted' && (
 <span className="text-[9px] text-red-600 bg-red-500/15 border border-red-500/30 rounded px-1.5 py-0.5 font-bold">RESTRICTED — only listed users can view</span>
 )}
 </div>
 <p className="text-slate-800/30 text-xs">
 {confidentiality === 'confidential'
 ? 'Selected users + all Admins/Maintenance role will be able to view this report.'
 : 'ONLY the explicitly selected users below can view this report. No Admin override.'}
 </p>

 {/* Already selected */}
 {allowedUserIds.length > 0 && (
 <div className="flex flex-wrap gap-2">
 {allowedUserIds.map(uid => (
 <UserChip key={uid} userId={uid} onRemove={() => removeUser(uid)}/>
 ))}
 </div>
 )}

 {/* Search + pick */}
 <div className="relative">
 <Search size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-800/30"/>
 <input value={userSearch} onChange={e => { setUserSearch(e.target.value); setShowUserPicker(true); }}
 onFocus={() => setShowUserPicker(true)}
 placeholder="Search by name, designation, or cell…"
 className="w-full bg-slate-900/5 border border-slate-900/10 rounded-xl pl-8 pr-3 py-2 text-xs text-slate-800/70 focus:outline-none focus:border-blue-400/50 placeholder:text-slate-800/20"/>
 </div>

 {showUserPicker && (
 <div className="rounded-xl border border-slate-900/10 bg-slate-900 overflow-hidden max-h-56 overflow-y-auto">
 {pickableUsers.length === 0 ? (
 <p className="text-slate-800/30 text-xs p-3 text-center">No more users to add</p>
 ) : (
 pickableUsers.map(u => (
 <button key={u.id} onClick={() => { addUser(u.id); setShowUserPicker(false); }}
 className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-slate-900/5 transition-colors text-left group">
 <div className="w-7 h-7 rounded-full bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-[11px] font-bold text-blue-700 shrink-0">
 {u.name[0]}
 </div>
 <div className="min-w-0 flex-1">
 <p className="text-slate-800/80 text-xs font-medium truncate">{u.name}</p>
 <p className="text-slate-800/30 text-[10px] truncate">{u.designation} · {u.cell}</p>
 </div>
 <div className="shrink-0">
 {u.role === 'maintenance' && <span className="text-[9px] text-red-700 bg-red-500/15 border border-red-500/30 rounded px-1.5 py-0.5 font-bold">Sr.DCM</span>}
 {u.role === 'admin' && <span className="text-[9px] text-amber-700 bg-amber-500/15 border border-amber-500/30 rounded px-1.5 py-0.5 font-bold">DCM</span>}
 </div>
 <Plus size={12} className="text-slate-800/20 group-hover:text-blue-600 transition-colors shrink-0"/>
 </button>
 ))
 )}
 </div>
 )}

 {(confidentiality === 'confidential' || confidentiality === 'restricted') && allowedUserIds.length === 0 && (
 <p className="text-amber-600 text-[10px] flex items-center gap-1">
 <AlertTriangle size={10}/> Add at least one authorised viewer before submitting
 </p>
 )}
 </div>
 )}

 {/* ── Data Table ── */}
 <div>
 <div className="flex items-center justify-between mb-3">
 <h3 className="text-slate-800/60 text-xs uppercase tracking-wider font-semibold">Data Table</h3>
 <div className="flex items-center gap-2">
 <input value={newCol} onChange={e => setNewCol(e.target.value)}
 onKeyDown={e => e.key === 'Enter' && addColumn()}
 placeholder="New column name…"
 className="bg-slate-900/5 border border-slate-900/10 rounded-lg px-2 py-1 text-xs text-slate-800/70 focus:outline-none focus:border-blue-400/50 w-36 placeholder:text-slate-800/20"/>
 <button onClick={addColumn}
 className="px-2.5 py-1 rounded-lg text-xs bg-blue-600/20 border border-blue-500/30 text-blue-700 hover:bg-blue-600/30 transition-colors flex items-center gap-1">
 <Plus size={11}/> Col
 </button>
 <button onClick={addRow}
 className="px-2.5 py-1 rounded-lg text-xs bg-emerald-600/20 border border-emerald-500/30 text-emerald-700 hover:bg-emerald-600/30 transition-colors flex items-center gap-1">
 <Plus size={11}/> Row
 </button>
 </div>
 </div>

 <div className="overflow-x-auto rounded-xl border border-slate-900/8">
 <table className="w-full text-xs">
 <thead>
 <tr className="bg-slate-900/5 border-b border-slate-900/8">
 {columns.map(col => (
 <th key={col} className="px-3 py-2 text-left text-slate-800/50 font-semibold whitespace-nowrap group">
 <div className="flex items-center gap-1.5">
 {col}
 {columns.length > 1 && (
 <button onClick={() => removeColumn(col)} className="opacity-0 group-hover:opacity-100 hover:text-red-600 transition-all">
 <X size={9}/>
 </button>
 )}
 </div>
 </th>
 ))}
 <th className="px-2 py-2 w-8"/>
 </tr>
 </thead>
 <tbody>
 {rows.length === 0 && (
 <tr><td colSpan={columns.length + 1} className="text-center text-slate-800/20 py-6 text-xs">No rows yet — click"+ Row"to add</td></tr>
 )}
 {rows.map((row, ri) => (
 <tr key={ri} className="border-b border-slate-900/5 hover:bg-slate-900/3">
 {columns.map(col => (
 <td key={col} className="px-1 py-1">
 <input value={String(row[col] ?? '')}
 onChange={e => updateCell(ri, col, e.target.value)}
 className="w-full bg-transparent border-0 border-b border-slate-900/10 px-1 py-0.5 text-xs text-slate-800/70 focus:outline-none focus:border-blue-400/50 min-w-[80px]"/>
 </td>
 ))}
 <td className="px-2 py-1">
 <button onClick={() => removeRow(ri)} className="text-slate-800/20 hover:text-red-600 transition-colors">
 <Trash2 size={11}/>
 </button>
 </td>
 </tr>
 ))}
 </tbody>
 </table>
 </div>
 </div>

 {/* Actions */}
 <div className="flex items-center justify-between pt-2 border-t border-slate-900/8">
 <button onClick={() => handleSave(true)}
 className="px-4 py-2 rounded-xl text-xs text-slate-800/50 hover:bg-slate-900/5 border border-slate-900/8 hover:text-slate-800/70 transition-colors flex items-center gap-1.5">
 <Save size={12}/> Save as Draft
 </button>
 <div className="flex gap-3">
 <button onClick={onClose} className="px-4 py-2 rounded-xl text-xs text-slate-800/40 hover:text-slate-800/60 transition-colors">Cancel</button>
 <button onClick={() => handleSave(false)} disabled={!canSave}
 className={cn('px-5 py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-2',
 canSave
 ? 'bg-amber-600/30 border border-amber-500/40 text-amber-700 hover:bg-amber-600/50'
 : 'bg-slate-900/5 border border-slate-900/8 text-slate-800/20 cursor-not-allowed')}>
 <Shield size={12}/> Submit Report
 </button>
 </div>
 </div>
 </div>
 </motion.div>
 </motion.div>
 );
}

// ──────────────────────────────────────────────────────────────────────────────
// Report Viewer Modal
// ──────────────────────────────────────────────────────────────────────────────
function ViewReportModal({ report, onClose, onAcknowledge, currentUserId }: {
 report: ConfidentialReport;
 onClose: () => void;
 onAcknowledge: (id: string) => void;
 currentUserId: string;
}) {
 const hasAcknowledged = report.acknowledged.includes(currentUserId);
 const cfg = CONFIDENTIALITY_CONFIG[report.confidentiality];
 const CfgIcon = cfg.icon;
 const columns = report.content.length > 0 ? Object.keys(report.content[0]) : [];

 return (
 <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
 className="fixed inset-0 z-50 flex items-start justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto"
 onClick={onClose}>
 <motion.div initial={{ scale: 0.96, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
 exit={{ scale: 0.96, opacity: 0 }}
 className="bg-slate-950 border border-slate-900/10 rounded-2xl w-full max-w-5xl shadow-2xl my-8"
 onClick={e => e.stopPropagation()}>

 {/* Header */}
 <div className={cn('px-6 py-4 border-b border-slate-900/8 rounded-t-2xl', cfg.bg)}>
 <div className="flex items-start justify-between gap-4">
 <div className="flex items-start gap-3">
 <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5 border', cfg.bg, cfg.border)}>
 <CfgIcon size={16} className={cfg.color}/>
 </div>
 <div>
 <div className="flex items-center gap-2 flex-wrap mb-1">
 <ConfidentialityBadge level={report.confidentiality}/>
 <StatusBadge status={report.status}/>
 <span className="text-slate-800/30 text-[10px]">{report.category} · {report.cell}</span>
 </div>
 <h2 className="text-slate-900 font-bold text-base leading-snug">{report.title}</h2>
 <p className="text-slate-800/40 text-xs mt-0.5">
 Created by {report.createdByName} ({report.createdByDesignation}) · {new Date(report.createdAt).toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'numeric' })}
 </p>
 </div>
 </div>
 <button onClick={onClose} className="p-2 rounded-xl hover:bg-slate-900/10 text-slate-800/40 hover:text-slate-800/70 transition-colors shrink-0">
 <X size={16}/>
 </button>
 </div>
 </div>

 <div className="p-6 space-y-5">
 {/* Summary + access info */}
 <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
 {report.summary && (
 <div className="bg-slate-900/3 rounded-xl border border-slate-900/8 p-3">
 <p className="text-slate-800/30 text-[10px] uppercase tracking-wider mb-1">Summary</p>
 <p className="text-slate-800/70 text-sm">{report.summary}</p>
 </div>
 )}
 <div className="bg-slate-900/3 rounded-xl border border-slate-900/8 p-3">
 <p className="text-slate-800/30 text-[10px] uppercase tracking-wider mb-2">Authorised Viewers</p>
 {report.confidentiality === 'public' ? (
 <p className="text-emerald-600 text-xs flex items-center gap-1"><LockOpen size={11}/> All logged-in users</p>
 ) : (
 <div className="flex flex-wrap gap-1.5">
 {report.allowedUserIds.map(uid => <UserChip key={uid} userId={uid}/>)}
 </div>
 )}
 </div>
 </div>

 {/* Data table */}
 {report.content.length > 0 && columns.length > 0 ? (
 <div className="overflow-x-auto rounded-xl border border-slate-900/8">
 <table className="w-full text-xs">
 <thead>
 <tr className="bg-slate-900/5 border-b border-slate-900/8">
 {columns.map(col => (
 <th key={col} className="px-3 py-2.5 text-left text-slate-800/50 font-semibold whitespace-nowrap">{col}</th>
 ))}
 </tr>
 </thead>
 <tbody>
 {report.content.map((row, i) => (
 <tr key={i} className={cn('border-b border-slate-900/5 ', i % 2 === 0 ? 'bg-slate-900/1 ' : '')}>
 {columns.map(col => (
 <td key={col} className="px-3 py-2 text-slate-800/70 whitespace-nowrap">{String(row[col] ?? '—')}</td>
 ))}
 </tr>
 ))}
 </tbody>
 </table>
 </div>
 ) : (
 <div className="text-center py-8 text-slate-800/20 text-sm border border-slate-900/5 rounded-xl">No data rows in this report</div>
 )}

 {/* Acknowledge strip */}
 <div className="flex items-center justify-between pt-3 border-t border-slate-900/8">
 <div className="flex items-center gap-2 text-xs text-slate-800/30">
 <UserCheck size={13}/>
 {report.acknowledged.length} of {report.allowedUserIds.length} viewers acknowledged
 </div>
 {!hasAcknowledged && (
 <button onClick={() => { onAcknowledge(report.id); onClose(); }}
 className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600/20 border border-emerald-500/30 text-emerald-700 text-xs font-medium hover:bg-emerald-600/35 transition-colors">
 <Check size={13}/> Mark as Acknowledged
 </button>
 )}
 {hasAcknowledged && (
 <span className="flex items-center gap-1.5 text-emerald-600 text-xs">
 <ShieldCheck size={14}/> You have acknowledged this report
 </span>
 )}
 </div>
 </div>
 </motion.div>
 </motion.div>
 );
}

// ──────────────────────────────────────────────────────────────────────────────
// Report List Card
// ──────────────────────────────────────────────────────────────────────────────
function ReportCard({
 report, currentUserId, isOwner, onView, onEdit, onDelete,
}: {
 report: ConfidentialReport;
 currentUserId: string;
 isOwner: boolean;
 onView: () => void;
 onEdit: () => void;
 onDelete: () => void;
}) {
 const hasAcknowledged = report.acknowledged.includes(currentUserId);
 const cfg = CONFIDENTIALITY_CONFIG[report.confidentiality];
 const CfgIcon = cfg.icon;

 return (
 <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
 className={cn('rounded-xl border p-4 transition-all hover:border-opacity-70', cfg.border,
 report.confidentiality === 'restricted' ? 'bg-red-950/20' :
 report.confidentiality === 'confidential' ? 'bg-amber-950/15' : 'bg-slate-900/3 ')}>
 <div className="flex items-start gap-3">
 <div className={cn('w-8 h-8 rounded-xl flex items-center justify-center shrink-0 border', cfg.bg, cfg.border)}>
 <CfgIcon size={14} className={cfg.color}/>
 </div>

 <div className="flex-1 min-w-0">
 <div className="flex items-start justify-between gap-2 flex-wrap mb-1.5">
 <div className="flex items-center gap-2 flex-wrap">
 <ConfidentialityBadge level={report.confidentiality}/>
 <StatusBadge status={report.status}/>
 <span className="text-slate-800/30 text-[10px]">{report.category}</span>
 </div>
 <div className="flex items-center gap-1 shrink-0">
 {!hasAcknowledged && report.status === 'submitted' && (
 <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse"title="Awaiting acknowledgement"/>
 )}
 <button onClick={onView}
 className="p-1.5 rounded-lg hover:bg-slate-900/10 text-slate-800/40 hover:text-slate-800/70 transition-colors">
 <Eye size={13}/>
 </button>
 {isOwner && (
 <>
 <button onClick={onEdit}
 className="p-1.5 rounded-lg hover:bg-blue-500/15 text-slate-800/30 hover:text-blue-600 transition-colors">
 <Edit3 size={13}/>
 </button>
 <button onClick={onDelete}
 className="p-1.5 rounded-lg hover:bg-red-500/15 text-slate-800/30 hover:text-red-600 transition-colors">
 <Trash2 size={13}/>
 </button>
 </>
 )}
 </div>
 </div>

 <h3 className="text-slate-800/85 text-sm font-semibold leading-snug mb-1 cursor-pointer hover:text-slate-900 transition-colors"
 onClick={onView}>{report.title}</h3>

 {report.summary && <p className="text-slate-800/35 text-xs mb-2 line-clamp-1">{report.summary}</p>}

 <div className="flex items-center gap-3 flex-wrap">
 <span className="text-slate-800/25 text-[10px] flex items-center gap-1">
 <FileText size={9}/> {report.cell}
 </span>
 <span className="text-slate-800/25 text-[10px] flex items-center gap-1">
 <Clock size={9}/> {new Date(report.updatedAt).toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'numeric' })}
 </span>
 <span className="text-slate-800/25 text-[10px] flex items-center gap-1">
 <Users size={9}/> {report.confidentiality === 'public' ? 'All users' : `${report.allowedUserIds.length} viewer${report.allowedUserIds.length !== 1 ? 's' : ''}`}
 </span>
 {report.content.length > 0 && (
 <span className="text-slate-800/25 text-[10px] flex items-center gap-1">
 <FileText size={9}/> {report.content.length} row{report.content.length !== 1 ? 's' : ''}
 </span>
 )}
 {hasAcknowledged && (
 <span className="text-emerald-600 text-[10px] flex items-center gap-1">
 <ShieldCheck size={9}/> Acknowledged
 </span>
 )}
 </div>
 </div>
 </div>
 </motion.div>
 );
}

// ──────────────────────────────────────────────────────────────────────────────
// Main Page
// ──────────────────────────────────────────────────────────────────────────────
type FilterType = 'all' | 'mine' | 'shared' | 'confidential' | 'restricted' | 'pending';

export default function ConfidentialPage() {
 const { user } = useAuthStore();
 const uid = user?.id ?? '';
 const isAdminOrMaint = user?.role === 'maintenance' || user?.role === 'admin';

 const [reports, setReports] = useState<ConfidentialReport[]>(CONFIDENTIAL_REPORTS_SEED);
 const [createOpen, setCreateOpen] = useState(false);
 const [editingReport, setEditingReport] = useState<ConfidentialReport | undefined>();
 const [viewingReport, setViewingReport] = useState<ConfidentialReport | undefined>();
 const [filter, setFilter] = useState<FilterType>('all');
 const [search, setSearch] = useState('');

 // Access check: can the current user see a report?
 const canView = (r: ConfidentialReport): boolean => {
 if (r.createdBy === uid) return true;
 if (r.confidentiality === 'public') return true;
 if (r.confidentiality === 'confidential' && isAdminOrMaint) return true;
 return r.allowedUserIds.includes(uid);
 };

 const visibleReports = useMemo(() => {
 return reports.filter(r => {
 if (!canView(r)) return false;
 if (search && !r.title.toLowerCase().includes(search.toLowerCase()) &&
 !r.category.toLowerCase().includes(search.toLowerCase()) &&
 !r.cell.toLowerCase().includes(search.toLowerCase())) return false;
 switch (filter) {
 case 'mine': return r.createdBy === uid;
 case 'shared': return r.createdBy !== uid && canView(r);
 case 'confidential': return r.confidentiality === 'confidential';
 case 'restricted': return r.confidentiality === 'restricted';
 case 'pending': return r.allowedUserIds.includes(uid) && !r.acknowledged.includes(uid) && r.status === 'submitted';
 default: return true;
 }
 });
 }, [reports, filter, search, uid]);

 const pendingCount = reports.filter(r =>
 r.allowedUserIds.includes(uid) && !r.acknowledged.includes(uid) && r.status === 'submitted'
 ).length;

 const saveReport = (r: ConfidentialReport) => {
 setReports(p => {
 const idx = p.findIndex(x => x.id === r.id);
 if (idx >= 0) { const n = [...p]; n[idx] = r; return n; }
 return [r, ...p];
 });
 };

 const deleteReport = (id: string) => setReports(p => p.filter(r => r.id !== id));

 const acknowledge = (id: string) => setReports(p =>
 p.map(r => r.id === id && !r.acknowledged.includes(uid)
 ? { ...r, acknowledged: [...r.acknowledged, uid], status: 'acknowledged' }
 : r)
 );

 const FILTERS: { id: FilterType; label: string; count?: number }[] = [
 { id: 'all', label: 'All Visible' },
 { id: 'mine', label: 'Created by Me' },
 { id: 'shared', label: 'Shared with Me' },
 { id: 'confidential', label: 'Confidential' },
 { id: 'restricted', label: 'Restricted' },
 { id: 'pending', label: 'Pending Acknowledgement', count: pendingCount },
 ];

 return (
 <div className="space-y-5 pb-8">
 {/* Header */}
 <div className="rounded-2xl border border-amber-500/20 bg-gradient-to-r from-amber-950/30 via-slate-900/60 to-slate-950/60 backdrop-blur-xl p-5 flex items-center justify-between flex-wrap gap-4">
 <div className="flex items-start gap-4">
 <div className="w-10 h-10 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center">
 <Shield size={20} className="text-amber-600"/>
 </div>
 <div>
 <h1 className="text-slate-900 text-xl font-bold">Confidential Reports</h1>
 <p className="text-slate-800/40 text-sm mt-0.5">Secure, role-restricted report sharing · Delhi Division</p>
 <div className="flex items-center gap-3 mt-2 flex-wrap">
 {[
 { icon: LockOpen, label: 'Public', color: 'text-emerald-600 ' },
 { icon: Lock, label: 'Confidential', color: 'text-amber-600 ' },
 { icon: ShieldAlert, label: 'Restricted', color: 'text-red-600 ' },
 ].map(({ icon: Icon, label, color }) => (
 <span key={label} className={`flex items-center gap-1 text-[10px] ${color} opacity-70`}>
 <Icon size={10}/> {label}
 </span>
 ))}
 </div>
 </div>
 </div>
 <div className="flex items-center gap-3">
 {pendingCount > 0 && (
 <div className="flex items-center gap-2 text-xs text-amber-700 bg-amber-500/15 border border-amber-500/30 rounded-xl px-3 py-2">
 <Bell size={13} className="animate-pulse"/>
 {pendingCount} pending acknowledgement
 </div>
 )}
 <button onClick={() => { setEditingReport(undefined); setCreateOpen(true); }}
 className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-600/25 border border-amber-500/40 text-amber-700 text-sm font-medium hover:bg-amber-600/40 transition-all">
 <Plus size={15}/> New Report
 </button>
 </div>
 </div>

 {/* Filter bar */}
 <div className="flex items-center gap-3 flex-wrap">
 <div className="relative flex-1 min-w-48">
 <Search size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-800/30"/>
 <input value={search} onChange={e => setSearch(e.target.value)}
 placeholder="Search reports…"
 className="w-full bg-slate-900/5 border border-slate-900/10 rounded-xl pl-8 pr-3 py-2 text-xs text-slate-800/70 focus:outline-none focus:border-blue-400/40 placeholder:text-slate-800/20"/>
 </div>
 <div className="flex gap-1.5 flex-wrap">
 {FILTERS.map(f => (
 <button key={f.id} onClick={() => setFilter(f.id)}
 className={cn('px-3 py-1.5 rounded-xl text-xs font-medium border transition-all flex items-center gap-1.5',
 filter === f.id
 ? 'bg-slate-900/10 text-slate-900 border-slate-900/20 '
 : 'text-slate-800/40 border-slate-900/8 hover:text-slate-800/60 hover:bg-slate-900/5 ')}>
 {f.label}
 {f.count !== undefined && f.count > 0 && (
 <span className="w-4 h-4 rounded-full bg-amber-500/80 text-slate-900 text-[9px] font-bold flex items-center justify-center">{f.count}</span>
 )}
 </button>
 ))}
 </div>
 </div>

 {/* Report list */}
 <div className="space-y-3">
 {visibleReports.length === 0 ? (
 <div className="rounded-2xl border border-slate-900/5 bg-slate-900/2 flex flex-col items-center justify-center py-16 gap-3">
 <EyeOff size={32} className="text-slate-800/20"/>
 <p className="text-slate-800/30 text-sm">No reports visible to you with this filter</p>
 {filter !== 'all' && (
 <button onClick={() => setFilter('all')} className="text-xs text-blue-600 hover:underline">Clear filter</button>
 )}
 </div>
 ) : (
 visibleReports.map(r => (
 <ReportCard key={r.id} report={r} currentUserId={uid}
 isOwner={r.createdBy === uid || isAdminOrMaint}
 onView={() => setViewingReport(r)}
 onEdit={() => { setEditingReport(r); setCreateOpen(true); }}
 onDelete={() => deleteReport(r.id)}/>
 ))
 )}
 </div>

 {/* Access legend */}
 <div className="rounded-xl border border-slate-900/5 bg-slate-900/2 p-4">
 <p className="text-slate-800/30 text-[10px] uppercase tracking-wider mb-3">How access control works</p>
 <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
 {(Object.entries(CONFIDENTIALITY_CONFIG) as [string, typeof CONFIDENTIALITY_CONFIG['public']][]).map(([level, cfg]) => {
 const Icon = cfg.icon;
 return (
 <div key={level} className={cn('rounded-xl border p-3', cfg.bg, cfg.border)}>
 <div className={`flex items-center gap-1.5 font-semibold mb-1 ${cfg.color}`}>
 <Icon size={12}/> {cfg.label}
 </div>
 <p className="text-slate-800/35 text-[10px] leading-snug">{cfg.desc}</p>
 </div>
 );
 })}
 </div>
 </div>

 {/* Modals */}
 <AnimatePresence>
 {createOpen && user && (
 <CreateEditModal
 onClose={() => { setCreateOpen(false); setEditingReport(undefined); }}
 onSave={saveReport}
 existing={editingReport}
 currentUserId={uid}
 currentUser={{ name: user.name, designation: user.designation }}
 userCell={user.cell}
 />
 )}
 {viewingReport && (
 <ViewReportModal
 report={viewingReport}
 onClose={() => setViewingReport(undefined)}
 onAcknowledge={acknowledge}
 currentUserId={uid}
 />
 )}
 </AnimatePresence>
 </div>
 );
}
