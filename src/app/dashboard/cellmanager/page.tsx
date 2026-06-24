'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuthStore } from '@/store/authStore';
import {
 getAllCells, createCell, updateCell, setCellStatus, archiveCell,
 AVAILABLE_ICONS, type CellRecord, type CellStatus,
} from '@/lib/cells/cellRegistry';
import { notifyCellsChanged } from '@/lib/cells/useCellList';
import {
 Plus, Edit3, Archive, RotateCcw, Search, Filter, Download,
 ChevronUp, ChevronDown, Users2, Database, Activity,
 CheckCircle2, XCircle, AlertTriangle, X, Check, Folder,
 LayoutGrid, ArrowUpDown,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const STATUS_BADGE: Record<CellStatus, { cls: string; icon: React.ElementType; label: string }> = {
 active: { cls: 'bg-emerald-100 text-emerald-700 border-emerald-300 ', icon: CheckCircle2, label: 'Active' },
 inactive: { cls: 'bg-amber-100 text-amber-700 border-amber-300 ', icon: XCircle, label: 'Inactive' },
 archived: { cls: 'bg-slate-100 text-slate-500 border-slate-300 ', icon: Archive, label: 'Archived' },
};

function ConfirmDialog({ title, message, danger = true, onConfirm, onCancel }: {
 title: string; message: string; danger?: boolean; onConfirm: () => void; onCancel: () => void;
}) {
 return (
 <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"onClick={onCancel}>
 <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
 className="bg-white border border-slate-200 rounded-2xl p-6 w-full max-w-sm shadow-2xl"
 onClick={e => e.stopPropagation()}>
 <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center mb-4', danger ? 'bg-red-100 ' : 'bg-amber-100 ')}>
 <AlertTriangle size={20} className={danger ? 'text-red-600 ' : 'text-amber-600 '}/>
 </div>
 <h3 className="font-bold text-slate-900 text-base mb-2">{title}</h3>
 <p className="text-sm text-slate-500 mb-6">{message}</p>
 <div className="flex gap-2 justify-end">
 <button onClick={onCancel} className="px-4 py-2 text-sm text-slate-500 hover:bg-slate-100 rounded-xl">Cancel</button>
 <button onClick={onConfirm} className={cn('px-4 py-2 text-sm text-white rounded-xl', danger ? 'bg-red-600 hover:bg-red-700' : 'bg-amber-600 hover:bg-amber-700')}>Confirm</button>
 </div>
 </motion.div>
 </div>
 );
}

function CellFormModal({ cell, onClose, onSave, userId }: {
 cell?: CellRecord | null; onClose: () => void;
 onSave: (data: Partial<CellRecord>) => void; userId?: string;
}) {
 const isEdit = !!cell;
 const [name, setName] = useState(cell?.name ?? '');
 const [code, setCode] = useState(cell?.code ?? '');
 const [description, setDescription] = useState(cell?.description ?? '');
 const [headDesignation, setHeadDesignation] = useState(cell?.headDesignation ?? '');
 const [iconKey, setIconKey] = useState(cell?.iconKey ?? 'Folder');
 const [status, setStatus] = useState<CellStatus>(cell?.status ?? 'active');

 // Auto-generate code from name
 const handleNameChange = (v: string) => {
 setName(v);
 if (!isEdit) setCode(v.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8));
 };

 const canSave = name.trim() && code.trim();

 return (
 <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"onClick={onClose}>
 <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
 className="bg-white border border-slate-200 rounded-2xl w-full max-w-lg shadow-2xl overflow-y-auto max-h-[90vh]"
 onClick={e => e.stopPropagation()}>
 <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100">
 <h2 className="font-bold text-slate-900 text-lg">{isEdit ? 'Edit Cell' : 'Add New Cell'}</h2>
 <button onClick={onClose}><X size={18} className="text-slate-400"/></button>
 </div>

 <div className="p-6 space-y-4">
 <div className="grid grid-cols-2 gap-3">
 <div className="col-span-2">
 <label className="text-xs font-semibold text-slate-500 block mb-1.5">Cell Name *</label>
 <input value={name} onChange={e => handleNameChange(e.target.value)} placeholder="e.g. Parcel Cell"
 className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2.5 text-sm text-slate-800 focus:outline-none focus:border-indigo-400"/>
 </div>
 <div>
 <label className="text-xs font-semibold text-slate-500 block mb-1.5">Cell Code *</label>
 <input value={code} onChange={e => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g,'').slice(0,8))} placeholder="PARCEL"
 className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2.5 text-sm font-mono text-slate-800 focus:outline-none focus:border-indigo-400"/>
 <p className="text-[10px] text-slate-400 mt-1">Max 8 chars, letters & numbers</p>
 </div>
 <div>
 <label className="text-xs font-semibold text-slate-500 block mb-1.5">Status</label>
 <select value={status} onChange={e => setStatus(e.target.value as CellStatus)}
 className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2.5 text-sm text-slate-800 focus:outline-none focus:border-indigo-400">
 <option value="active">Active</option>
 <option value="inactive">Inactive</option>
 </select>
 </div>
 </div>

 <div>
 <label className="text-xs font-semibold text-slate-500 block mb-1.5">Description</label>
 <textarea value={description} onChange={e => setDescription(e.target.value)} rows={2} placeholder="Brief description of this cell's function"
 className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2.5 text-sm text-slate-800 focus:outline-none focus:border-indigo-400 resize-none"/>
 </div>

 <div>
 <label className="text-xs font-semibold text-slate-500 block mb-1.5">Head Designation</label>
 <input value={headDesignation} onChange={e => setHeadDesignation(e.target.value)} placeholder="e.g. CMI/Parcel"
 className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2.5 text-sm text-slate-800 focus:outline-none focus:border-indigo-400"/>
 </div>

 <div>
 <label className="text-xs font-semibold text-slate-500 block mb-1.5">Icon</label>
 <div className="grid grid-cols-8 gap-1.5">
 {AVAILABLE_ICONS.map(key => {
 const Icon = ({ size, className }: { size: number; className?: string }) => {
 // Dynamic icon rendering
 const icons: Record<string, React.ElementType> = {
 Folder: require('lucide-react').Folder, Users2: require('lucide-react').Users2,
 BarChart3: require('lucide-react').BarChart3, ShieldCheck: require('lucide-react').ShieldCheck,
 Scale: require('lucide-react').Scale, Megaphone: require('lucide-react').Megaphone,
 Ticket: require('lucide-react').Ticket, Store: require('lucide-react').Store,
 Package: require('lucide-react').Package, Sparkles: require('lucide-react').Sparkles,
 UtensilsCrossed: require('lucide-react').UtensilsCrossed,
 ParkingSquare: require('lucide-react').ParkingSquare, Radio: require('lucide-react').Radio,
 Briefcase: require('lucide-react').Briefcase, MessageCircle: require('lucide-react').MessageCircle,
 Tag: require('lucide-react').Tag, Phone: require('lucide-react').Phone,
 Monitor: require('lucide-react').Monitor, FolderOpen: require('lucide-react').FolderOpen,
 ClipboardList: require('lucide-react').ClipboardList, Building2: require('lucide-react').Building2,
 Globe: require('lucide-react').Globe, Truck: require('lucide-react').Truck,
 Layers: require('lucide-react').Layers, Activity: require('lucide-react').Activity,
 Database: require('lucide-react').Database, FileText: require('lucide-react').FileText,
 Settings: require('lucide-react').Settings, Boxes: require('lucide-react').Boxes,
 LayoutGrid: require('lucide-react').LayoutGrid,
 };
 const Comp = icons[key] ?? icons.Folder;
 return <Comp size={size} className={className}/>;
 };
 return (
 <button key={key} onClick={() => setIconKey(key)} title={key}
 className={cn('w-8 h-8 rounded-lg flex items-center justify-center border transition-all',
 iconKey === key ? 'bg-indigo-100 border-indigo-400 ' : 'border-slate-200 hover:bg-slate-100 ')}>
 <Icon size={14} className={iconKey === key ? 'text-indigo-600 ' : 'text-slate-400 '}/>
 </button>
 );
 })}
 </div>
 </div>

 {!isEdit && (
 <div className="rounded-xl bg-blue-50 border border-blue-200 p-3">
 <p className="text-xs font-semibold text-blue-700 mb-1">Automatically generated after save:</p>
 <ul className="text-[11px] text-slate-500 space-y-0.5 list-inside list-disc">
 <li>Cell page at <code className="bg-slate-100 px-1 rounded">/dashboard/cell/{name.toLowerCase().replace(/[^a-z0-9]+/g,'-') || 'cell-slug'}</code></li>
 <li>Data workspace for cell-specific tables</li>
 <li>Staff roster section</li>
 <li>Activity log</li>
 </ul>
 </div>
 )}
 </div>

 <div className="flex justify-end gap-2 px-6 py-4 border-t border-slate-100">
 <button onClick={onClose} className="px-4 py-2 text-sm text-slate-500 hover:bg-slate-100 rounded-xl">Cancel</button>
 <button onClick={() => { if (canSave) { onSave({ name, code, description, headDesignation, iconKey, status }); onClose(); } }}
 disabled={!canSave}
 className="px-5 py-2 text-sm font-medium bg-indigo-600 text-white hover:bg-indigo-700 rounded-xl disabled:opacity-40">
 {isEdit ? 'Save Changes' : 'Create Cell'}
 </button>
 </div>
 </motion.div>
 </div>
 );
}

export default function CellManagerPage() {
 const { user } = useAuthStore();
 const router = useRouter();
 const [cells, setCells] = useState<CellRecord[]>([]);
 const [search, setSearch] = useState('');
 const [filterStatus, setFilterStatus] = useState<CellStatus | 'all'>('all');
 const [formOpen, setFormOpen] = useState(false);
 const [editCell, setEditCell] = useState<CellRecord | null>(null);
 const [confirmArchive, setConfirmArchive] = useState<CellRecord | null>(null);
 const [sortKey, setSortKey] = useState<'order' | 'name' | 'status'>('order');

 const isAdmin = user?.role === 'admin' || user?.role === 'maintenance';
 useEffect(() => { if (isAdmin === false) router.push('/dashboard'); }, [isAdmin, router]);

 const refresh = () => { setCells(getAllCells()); notifyCellsChanged(); };
 useEffect(() => { refresh(); }, []);

 const filtered = cells
 .filter(c => filterStatus === 'all' || c.status === filterStatus)
 .filter(c => !search || c.name.toLowerCase().includes(search.toLowerCase()) || c.code.toLowerCase().includes(search.toLowerCase()))
 .sort((a, b) => sortKey === 'name' ? a.name.localeCompare(b.name) : sortKey === 'status' ? a.status.localeCompare(b.status) : a.order - b.order);

 const stats = {
 total: cells.length,
 active: cells.filter(c => c.status === 'active').length,
 inactive: cells.filter(c => c.status === 'inactive').length,
 archived: cells.filter(c => c.status === 'archived').length,
 custom: cells.filter(c => !c.isBuiltin).length,
 };

 if (!isAdmin) return null;

 return (
 <div className="space-y-6 pb-8">
 {/* Header */}
 <div className="flex items-center justify-between flex-wrap gap-3">
 <div>
 <h1 className="text-xl font-bold text-slate-900">Cell Management</h1>
 <p className="text-sm text-slate-400 mt-0.5">Create, configure, and manage department cells. Changes take effect immediately.</p>
 </div>
 <button onClick={() => { setEditCell(null); setFormOpen(true); }}
 className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 transition-colors shadow-elevation-sm">
 <Plus size={16}/> Add New Cell
 </button>
 </div>

 {/* KPI strip */}
 <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
 {[
 { label: 'Total Cells', value: stats.total, color: 'bg-indigo-500' },
 { label: 'Active', value: stats.active, color: 'bg-emerald-500' },
 { label: 'Inactive', value: stats.inactive, color: 'bg-amber-500' },
 { label: 'Archived', value: stats.archived, color: 'bg-slate-400' },
 { label: 'Custom Cells', value: stats.custom, color: 'bg-purple-500' },
 ].map(s => (
 <div key={s.label} className="rounded-2xl bg-white border border-slate-200 p-4 shadow-elevation-sm relative overflow-hidden">
 <div className={cn('absolute top-0 left-0 right-0 h-0.5', s.color)}/>
 <p className="text-2xl font-bold text-slate-900">{s.value}</p>
 <p className="text-xs text-slate-400 mt-0.5">{s.label}</p>
 </div>
 ))}
 </div>

 {/* Filters + table */}
 <div className="rounded-2xl bg-white border border-slate-200 shadow-elevation-sm overflow-hidden">
 {/* Toolbar */}
 <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-100 flex-wrap">
 <div className="relative flex-1 min-w-48">
 <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"/>
 <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search cells…"
 className="w-full pl-8 pr-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-400 text-slate-800"/>
 </div>
 <select value={filterStatus} onChange={e => setFilterStatus(e.target.value as CellStatus | 'all')}
 className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-700 focus:outline-none focus:border-indigo-400">
 <option value="all">All Status</option>
 <option value="active">Active</option>
 <option value="inactive">Inactive</option>
 <option value="archived">Archived</option>
 </select>
 <button onClick={() => setSortKey(k => k === 'order' ? 'name' : k === 'name' ? 'status' : 'order')}
 className="flex items-center gap-1.5 px-3 py-2 text-xs text-slate-500 hover:text-slate-700 border border-slate-200 rounded-xl hover:bg-slate-50">
 <ArrowUpDown size={13}/> Sort: {sortKey}
 </button>
 </div>

 {/* Table */}
 <div className="overflow-x-auto">
 <table className="w-full text-sm">
 <thead>
 <tr className="bg-slate-50 border-b border-slate-100 text-xs text-slate-500">
 <th className="px-4 py-3 text-left font-semibold">Cell Name</th>
 <th className="px-4 py-3 text-left font-semibold hidden md:table-cell">Code</th>
 <th className="px-4 py-3 text-left font-semibold hidden lg:table-cell">Head</th>
 <th className="px-4 py-3 text-left font-semibold hidden sm:table-cell">Status</th>
 <th className="px-4 py-3 text-left font-semibold hidden xl:table-cell">Type</th>
 <th className="px-4 py-3 text-right font-semibold">Actions</th>
 </tr>
 </thead>
 <tbody className="divide-y divide-slate-50">
 {filtered.length === 0 ? (
 <tr>
 <td colSpan={6} className="px-4 py-10 text-center text-slate-400 text-sm">
 {search ? 'No cells match your search.' : 'No cells found.'}
 </td>
 </tr>
 ) : filtered.map(cell => {
 const sb = STATUS_BADGE[cell.status];
 const StatusIcon = sb.icon;
 return (
 <tr key={cell.id} className="hover:bg-slate-50/50 transition-colors group">
 <td className="px-4 py-3">
 <div className="flex items-center gap-3">
 <div className="w-8 h-8 rounded-lg bg-indigo-100 flex items-center justify-center shrink-0">
 <LayoutGrid size={14} className="text-indigo-600"/>
 </div>
 <div>
 <p className="font-semibold text-slate-900 text-sm">{cell.name}</p>
 <p className="text-[10px] text-slate-400 truncate max-w-48">{cell.description}</p>
 </div>
 </div>
 </td>
 <td className="px-4 py-3 hidden md:table-cell">
 <code className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md">{cell.code}</code>
 </td>
 <td className="px-4 py-3 hidden lg:table-cell text-xs text-slate-500">{cell.headDesignation || '—'}</td>
 <td className="px-4 py-3 hidden sm:table-cell">
 <span className={cn('inline-flex items-center gap-1 text-[10px] font-semibold border rounded-full px-2 py-0.5', sb.cls)}>
 <StatusIcon size={9}/> {sb.label}
 </span>
 </td>
 <td className="px-4 py-3 hidden xl:table-cell">
 <span className={cn('text-[10px] font-medium rounded-full px-2 py-0.5', cell.isBuiltin ? 'bg-blue-100 text-blue-700 ' : 'bg-purple-100 text-purple-700 ')}>
 {cell.isBuiltin ? 'Built-in' : 'Custom'}
 </span>
 </td>
 <td className="px-4 py-3">
 <div className="flex items-center gap-1 justify-end">
 <button onClick={() => router.push(`/dashboard/cell/${cell.slug}`)} title="Open cell"
 className="p-1.5 rounded-lg hover:bg-blue-100 text-slate-400 hover:text-blue-600 transition-colors">
 <Activity size={14}/>
 </button>
 <button onClick={() => { setEditCell(cell); setFormOpen(true); }} title="Edit"
 className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors">
 <Edit3 size={14}/>
 </button>
 <button
 onClick={() => {
 if (cell.status === 'active') setCellStatus(cell.id, 'inactive', user?.id);
 else setCellStatus(cell.id, 'active', user?.id);
 refresh();
 }}
 title={cell.status === 'active' ? 'Deactivate' : 'Activate'}
 className="p-1.5 rounded-lg hover:bg-amber-100 text-slate-400 hover:text-amber-600 transition-colors">
 {cell.status === 'active' ? <XCircle size={14}/> : <CheckCircle2 size={14}/>}
 </button>
 {!cell.isBuiltin && (
 <button onClick={() => setConfirmArchive(cell)} title="Archive (soft delete)"
 className="p-1.5 rounded-lg hover:bg-red-100 text-slate-400 hover:text-red-500 transition-colors">
 <Archive size={14}/>
 </button>
 )}
 {cell.status === 'archived' && (
 <button onClick={() => { setCellStatus(cell.id, 'active', user?.id); refresh(); }} title="Restore"
 className="p-1.5 rounded-lg hover:bg-emerald-100 text-slate-400 hover:text-emerald-600 transition-colors">
 <RotateCcw size={14}/>
 </button>
 )}
 </div>
 </td>
 </tr>
 );
 })}
 </tbody>
 </table>
 </div>

 <div className="px-4 py-2 border-t border-slate-100 text-[10px] text-slate-400">
 Showing {filtered.length} of {cells.length} cells
 </div>
 </div>

 {/* Form modal */}
 <AnimatePresence>
 {formOpen && (
 <CellFormModal
 cell={editCell}
 userId={user?.id}
 onClose={() => { setFormOpen(false); setEditCell(null); }}
 onSave={(data) => {
 if (editCell) {
 updateCell(editCell.id, data, user?.id);
 } else {
 createCell({
 name: data.name ?? '',
 code: data.code ?? '',
 description: data.description ?? '',
 headDesignation: data.headDesignation ?? '',
 iconKey: data.iconKey ?? 'Folder',
 }, user?.id);
 }
 refresh();
 }}
 />
 )}
 {confirmArchive && (
 <ConfirmDialog
 title={`Archive"${confirmArchive.name}"?`}
 message="This action will archive the cell and hide it from all users. All data is preserved and the cell can be restored at any time by an Administrator."
 onConfirm={() => { try { archiveCell(confirmArchive.id, user?.id); refresh(); } catch { /* builtin */ } setConfirmArchive(null); }}
 onCancel={() => setConfirmArchive(null)}
 />
 )}
 </AnimatePresence>
 </div>
 );
}
