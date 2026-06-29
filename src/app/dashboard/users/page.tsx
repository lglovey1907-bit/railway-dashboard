'use client';
import { useState, useEffect, useMemo, useCallback } from 'react';
import { useAuthStore } from '@/store/authStore';
import { mockUsers } from '@/lib/data/mockData';
import { getAllStaff, getAllMemberships, getAudit, addAudit, updateStaffRecord, approveMembership, type StaffMember } from '@/lib/staff/staffDB';
import {
 createRequest, setUserStatus, getUserStatus, getAllRequests,
 adminAddUser,
 USER_STATUS_LABELS, USER_STATUS_COLORS, REQUEST_TYPE_LABELS,
 type UserStatus, type UserRequest,
} from '@/lib/staff/userRequests';
import { deactivateMasterStaff, restoreMasterStaff, notifyStaffChanged } from '@/lib/staff/masterStaff';
import { generateDefaultPassword, getUserPassword } from '@/lib/auth/passwordStore';
import { getActiveCells } from '@/lib/cells/cellRegistry';
import { getGSheetConfig, syncGoogleSheet, type SyncResult } from '@/lib/integrations/googleSheets';
import { GoogleSheetsModal } from '@/components/users/GoogleSheetsModal';
import {
 Users, Search, Filter, Plus, Trash2, ChevronDown, ChevronUp,
 Check, X, CheckSquare, Square, MoreHorizontal, ArrowUpDown,
 Download, Upload, Shield, ShieldCheck, Crown, AlertTriangle,
 Clock, CheckCircle2, XCircle, Eye, EyeOff, Edit3, UserMinus, UserPlus,
 ArrowRight, Activity, Mail, Phone, Briefcase, Building2,
 RefreshCw, History, FileText, RotateCcw, Copy, FileSpreadsheet, Link2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { AnimatePresence, motion } from 'framer-motion';

// ── Types ──────────────────────────────────────────────────────────────────────
type DisplayUser = {
 id: string; name: string; email: string; designation: string;
 cell: string; role: string; hrmsId?: string; mobile?: string;
 workingAs?: string; status: UserStatus; source: 'mock' | 'staff_db';
 registeredAt?: string;
};

const ROLE_BADGE: Record<string, { cls: string; label: string; icon: React.ElementType }> = {
 maintenance: { cls: 'bg-purple-100 text-purple-700 border-purple-300 ', label: 'Maintenance', icon: Crown },
 admin: { cls: 'bg-blue-100 text-blue-700 border-blue-300 ', label: 'Admin', icon: ShieldCheck },
 incharge: { cls: 'bg-emerald-100 text-emerald-700 border-emerald-300 ', label: 'Incharge', icon: ShieldCheck },
 user: { cls: 'bg-slate-100 text-slate-600 border-slate-300 ', label: 'User', icon: Shield },
};

// ── Confirm dialog ─────────────────────────────────────────────────────────────
function ConfirmDialog({ title, message, onConfirm, onCancel, danger = true, confirmLabel = 'Confirm' }: {
 title: string; message: string; onConfirm: () => void; onCancel: () => void; danger?: boolean; confirmLabel?: string;
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
 <button onClick={onConfirm} className={cn('px-4 py-2 text-sm text-white rounded-xl', danger ? 'bg-red-600 hover:bg-red-700' : 'bg-amber-600 hover:bg-amber-700')}>{confirmLabel}</button>
 </div>
 </motion.div>
 </div>
 );
}

// ── Add/Edit User Modal ────────────────────────────────────────────────────────
function AddUserModal({ user, onClose, onSave, cells, currentUser }: {
 user?: DisplayUser | null;
 onClose: () => void;
 onSave: (data: Record<string, string>, autoApprove: boolean) => void;
 cells: string[];
 currentUser: { id: string; name: string } | null;
}) {
 const isEdit = !!user;
 const [form, setForm] = useState({
 name: user?.name ?? '', email: user?.email ?? '', mobile: user?.mobile ?? '',
 designation: user?.designation ?? '', cell: user?.cell ?? '', hrmsId: user?.hrmsId ?? '',
 workingAs: user?.workingAs ?? '', role: user?.role ?? 'user', status: user?.status ?? 'active',
 reportingOfficer: '',
 });
 const set = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }));
 const valid = form.name.trim() && form.email.trim() && form.designation.trim() && form.cell;

 return (
 <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"onClick={onClose}>
 <motion.div initial={{ scale: 0.96, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
 className="bg-white border border-slate-200 rounded-2xl w-full max-w-2xl shadow-2xl overflow-y-auto max-h-[90vh]"
 onClick={e => e.stopPropagation()}>
 <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100">
 <h2 className="font-bold text-slate-900 text-lg flex items-center gap-2">
 <UserPlus size={18} className="text-blue-500"/> {isEdit ? 'Edit User' : 'Add New Staff'}
 </h2>
 <button onClick={onClose}><X size={18} className="text-slate-400"/></button>
 </div>

 <div className="p-6 grid grid-cols-2 gap-4">
 {[
 { k: 'name', label: 'Full Name *', placeholder: 'e.g. Satyarth Kumar' },
 { k: 'hrmsId', label: 'HRMS / Employee ID', placeholder: 'e.g. NR12345' },
 { k: 'designation', label: 'Designation *', placeholder: 'e.g. Chief Commercial Clerk' },
 { k: 'workingAs', label: 'Working As', placeholder: 'e.g. CMI, COS, OS, Dealer' },
 { k: 'email', label: 'Email Address *', placeholder: 'name@delhi.nr.in' },
 { k: 'mobile', label: 'Mobile Number', placeholder: '9XXXXXXXXX' },
 { k: 'reportingOfficer', label: 'Reporting Officer', placeholder: 'Name of supervisor' },
 ].map(({ k, label, placeholder }) => (
 <div key={k}>
 <label className="text-xs font-semibold text-slate-500 block mb-1.5">{label}</label>
 <input value={(form as any)[k]} onChange={e => set(k, e.target.value)} placeholder={placeholder}
 className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2.5 text-sm text-slate-800 focus:outline-none focus:border-blue-400"/>
 </div>
 ))}

 <div>
 <label className="text-xs font-semibold text-slate-500 block mb-1.5">Role</label>
 <select value={form.role}
 onChange={e => {
 const r = e.target.value;
 set('role', r);
 if (r === 'admin' || r === 'maintenance') set('cell', 'All');
 }}
 className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2.5 text-sm text-slate-800 focus:outline-none focus:border-blue-400">
 <option value="user">User</option>
 <option value="incharge">Incharge</option>
 <option value="admin">Admin</option>
 <option value="maintenance">Maintenance</option>
 </select>
 </div>

 <div>
 <label className="text-xs font-semibold text-slate-500 block mb-1.5">Department / Cell *</label>
 <select value={form.cell} onChange={e => set('cell', e.target.value)}
 className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2.5 text-sm text-slate-800 focus:outline-none focus:border-blue-400">
 <option value="">— Select Cell —</option>
 {(form.role === 'admin' || form.role === 'maintenance') && (
 <option value="All">All (System-wide)</option>
 )}
 {cells.map(c => <option key={c} value={c}>{c}</option>)}
 </select>
 </div>

 {isEdit && (
 <div>
 <label className="text-xs font-semibold text-slate-500 block mb-1.5">Status</label>
 <select value={form.status} onChange={e => set('status', e.target.value)}
 className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2.5 text-sm text-slate-800 focus:outline-none focus:border-blue-400">
 {Object.entries(USER_STATUS_LABELS).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
 </select>
 </div>
 )}
 </div>

 <div className="flex justify-between items-center px-6 py-4 border-t border-slate-100 gap-2 flex-wrap">
 <button onClick={onClose} className="px-4 py-2 text-sm text-slate-500 hover:bg-slate-100 rounded-xl">Cancel</button>
 <div className="flex gap-2">
 {!isEdit && (
 <button onClick={() => { if (valid) { onSave(form, false); onClose(); } }} disabled={!valid}
 className="px-4 py-2 text-sm border border-slate-300 text-slate-600 hover:bg-slate-100 rounded-xl disabled:opacity-40">
 Save (Pending)
 </button>
 )}
 <button onClick={() => { if (valid) { onSave(form, true); onClose(); } }} disabled={!valid}
 className="px-4 py-2 text-sm bg-blue-600 text-white hover:bg-blue-700 rounded-xl disabled:opacity-40">
 {isEdit ? 'Save Changes' : 'Save & Approve'}
 </button>
 </div>
 </div>
 </motion.div>
 </div>
 );
}

// ── User detail drawer ─────────────────────────────────────────────────────────
function UserDetailPanel({ user, onClose, onStatusChange, onTransfer, cells, currentUser }: {
 user: DisplayUser; onClose: () => void;
 onStatusChange: (userId: string, status: UserStatus) => void;
 onTransfer: (userId: string, toCell: string) => void;
 cells: string[]; currentUser: { id: string; name: string } | null;
}) {
 const [audit, setAudit] = useState<any[]>([]);
 const [requests, setRequests] = useState<UserRequest[]>([]);
 const [transferCell, setTransferCell] = useState('');
 const [showTransfer, setShowTransfer] = useState(false);

 useEffect(() => {
 setAudit(getAudit(user.id));
 setRequests(getAllRequests().filter(r => r.targetEmployeeId === user.id));
 }, [user.id]);

 const rb = ROLE_BADGE[user.role] ?? ROLE_BADGE.user;
 const RoleIcon = rb.icon;
 const statusCls = USER_STATUS_COLORS[user.status] ?? USER_STATUS_COLORS.inactive;

 return (
 <div className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center sm:justify-end bg-black/40 backdrop-blur-sm"onClick={onClose}>
 <motion.div initial={{ x: '100%', opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: '100%', opacity: 0 }}
 className="bg-white border-l border-slate-200 w-full sm:w-[420px] h-full overflow-y-auto shadow-2xl"
 onClick={e => e.stopPropagation()}>
 {/* Header */}
 <div className="flex items-start justify-between p-5 border-b border-slate-100 sticky top-0 bg-white z-10">
 <div className="flex items-start gap-3">
 <div className="w-12 h-12 rounded-2xl bg-blue-100 flex items-center justify-center text-base font-bold text-blue-700 shrink-0">
 {user.name[0]}
 </div>
 <div>
 <h3 className="font-bold text-slate-900">{user.name}</h3>
 <p className="text-xs text-slate-400">{user.designation}</p>
 <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
 <span className={cn('inline-flex items-center gap-1 text-[9px] font-bold border rounded-full px-2 py-0.5', rb.cls)}>
 <RoleIcon size={8}/> {rb.label}
 </span>
 <span className={cn('inline-flex items-center text-[9px] font-semibold border rounded-full px-2 py-0.5', statusCls)}>
 {USER_STATUS_LABELS[user.status]}
 </span>
 </div>
 </div>
 </div>
 <button onClick={onClose}><X size={16} className="text-slate-400"/></button>
 </div>

 <div className="p-5 space-y-5">
 {/* Details */}
 <div className="grid grid-cols-2 gap-3">
 {[
 { icon: Building2, label: 'Cell', value: user.cell },
 { icon: Briefcase, label: 'Working As', value: user.workingAs || '—' },
 { icon: Mail, label: 'Email', value: user.email },
 { icon: Phone, label: 'Mobile', value: user.mobile || '—' },
 { icon: FileText, label: 'HRMS ID', value: user.hrmsId || '—' },
 ].map(({ icon: Icon, label, value }) => (
 <div key={label}>
 <p className="text-[9px] uppercase tracking-wider font-semibold text-slate-400 flex items-center gap-1 mb-0.5"><Icon size={8}/>{label}</p>
 <p className="text-xs text-slate-700 truncate">{value}</p>
 </div>
 ))}
 </div>

 {/* Status change */}
 <div className="rounded-xl border border-slate-200 p-3">
 <p className="text-xs font-semibold text-slate-600 mb-2">Change Status</p>
 <div className="flex flex-wrap gap-1.5">
 {(['active','inactive','suspended','transferred','retired'] as UserStatus[]).map(s => (
 <button key={s} onClick={() => onStatusChange(user.id, s)}
 className={cn('text-[10px] font-medium border rounded-full px-2.5 py-1 transition-all',
 user.status === s ? USER_STATUS_COLORS[s] : 'border-slate-200 text-slate-500 hover:border-slate-400 ')}>
 {USER_STATUS_LABELS[s]}
 </button>
 ))}
 </div>
 </div>

 {/* Transfer */}
 <div className="rounded-xl border border-slate-200 p-3">
 <button onClick={() => setShowTransfer(s => !s)}
 className="flex items-center justify-between w-full text-xs font-semibold text-slate-600">
 <span className="flex items-center gap-1.5"><ArrowRight size={12}/>Transfer to Another Cell</span>
 {showTransfer ? <ChevronUp size={12}/> : <ChevronDown size={12}/>}
 </button>
 {showTransfer && (
 <div className="mt-3 flex gap-2">
 <select value={transferCell} onChange={e => setTransferCell(e.target.value)}
 className="flex-1 bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-2 text-sm text-slate-800 focus:outline-none focus:border-blue-400">
 <option value="">— Select Cell —</option>
 {cells.filter(c => c !== user.cell).map(c => <option key={c} value={c}>{c}</option>)}
 </select>
 <button onClick={() => { if (transferCell) { onTransfer(user.id, transferCell); setShowTransfer(false); setTransferCell(''); } }}
 disabled={!transferCell} className="px-3 py-2 rounded-lg text-xs bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-40">
 Transfer
 </button>
 </div>
 )}
 </div>

 {/* Audit trail */}
 {audit.length > 0 && (
 <div>
 <p className="text-xs font-semibold text-slate-500 mb-2 flex items-center gap-1.5"><History size={12}/>Audit Trail</p>
 <div className="space-y-2 max-h-48 overflow-y-auto">
 {audit.map((e, i) => (
 <div key={e.id} className="flex items-start gap-2">
 <div className="flex flex-col items-center mt-0.5">
 <div className="w-1.5 h-1.5 rounded-full bg-blue-400 shrink-0"/>
 {i < audit.length - 1 && <div className="w-px h-full bg-slate-200 mt-1"/>}
 </div>
 <div className="pb-2">
 <p className="text-[11px] text-slate-700">{e.action}</p>
 {e.detail && <p className="text-[10px] text-slate-400">{e.detail}</p>}
 <p className="text-[9px] text-slate-400 mt-0.5">
 {new Date(e.timestamp).toLocaleString('en-IN')}
 {e.performedByName ? ` · ${e.performedByName}` : ''}
 </p>
 </div>
 </div>
 ))}
 </div>
 </div>
 )}

 {/* Requests history */}
 {requests.length > 0 && (
 <div>
 <p className="text-xs font-semibold text-slate-500 mb-2 flex items-center gap-1.5"><FileText size={12}/>Requests</p>
 {requests.map(r => (
 <div key={r.id} className="flex items-center justify-between py-1.5 text-xs border-b border-slate-50 last:border-0">
 <span className="text-slate-600">{REQUEST_TYPE_LABELS[r.type]}</span>
 <span className={cn('text-[9px] font-semibold border rounded-full px-2 py-0.5', {
 pending: 'bg-amber-100 text-amber-700 border-amber-300',
 approved: 'bg-emerald-100 text-emerald-700 border-emerald-300',
 rejected: 'bg-red-100 text-red-700 border-red-300',
 clarification_needed: 'bg-blue-100 text-blue-700 border-blue-300',
 }[r.status] ?? '')}>{r.status}</span>
 </div>
 ))}
 </div>
 )}
 </div>
 </motion.div>
 </div>
 );
}

// ── Bulk Import Modal ─────────────────────────────────────────────────────────
const BULK_TEMPLATE_COLS = ['name','hrmsId','email','mobile','designation','workingAs','cell','role'];
const BULK_TEMPLATE_SAMPLE = [
 ['Ramesh Kumar','NR12345','ramesh.kumar@nr.in','9876543210','Chief Comm. Clerk','COS','New Delhi','user'],
 ['Sunita Sharma','NR67890','sunita.sharma@nr.in','9812345678','Commercial Clerk','Dealer','Hazrat Nizamuddin','user'],
];

function BulkImportModal({ onClose, cells, currentUser, onImportDone }: {
 onClose: () => void;
 cells: string[];
 currentUser: { id: string; name: string } | null;
 onImportDone: (result: { created: number; updated: number; skipped: number; errors: number }) => void;
}) {
 type Row = { _line: number; name: string; hrmsId: string; email: string; mobile: string;
  designation: string; workingAs: string; cell: string; role: string; _error?: string };
 const [step, setStep] = useState<'upload'|'preview'|'done'>('upload');
 const [rows, setRows] = useState<Row[]>([]);
 const [result, setResult] = useState({ created: 0, updated: 0, skipped: 0, errors: 0 });
 const [importing, setImporting] = useState(false);
 const fileRef = useState<HTMLInputElement | null>(null);

 const downloadTemplate = () => {
  const csv = [BULK_TEMPLATE_COLS, ...BULK_TEMPLATE_SAMPLE]
   .map(r => r.map(v => `"${v}"`).join(',')).join('\n');
  const a = document.createElement('a');
  a.href = 'data:text/csv,' + encodeURIComponent(csv);
  a.download = 'staff_import_template.csv';
  a.click();
 };

 const parseCSV = (text: string): Row[] => {
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
  if (lines.length < 2) return [];
  const headerLine = lines[0].replace(/"/g, '').split(',').map(h => h.trim().toLowerCase());
  const colIdx = (name: string) => headerLine.indexOf(name);
  const parsed: Row[] = [];
  for (let i = 1; i < lines.length; i++) {
   const cols = lines[i].match(/("([^"]*)"|(,[^,]*))/g)?.map(c => c.replace(/^,|^"|"$/g, ''))
    ?? lines[i].split(',').map(c => c.trim().replace(/^"|"$/g, ''));
   const get = (n: string) => cols[colIdx(n)]?.trim() ?? '';
   const name = get('name'); const email = get('email'); const cell = get('cell');
   const role = get('role') || 'user';
   let _error: string | undefined;
   if (!name) _error = 'Name is required';
   else if (!email) _error = 'Email is required';
   else if (!cell) _error = 'Cell is required';
   else if (!['user','incharge','admin','maintenance'].includes(role)) _error = `Invalid role "${role}"`;
   parsed.push({ _line: i, name, hrmsId: get('hrmsId'), email, mobile: get('mobile'),
    designation: get('designation'), workingAs: get('workingAs'), cell, role, _error });
  }
  return parsed;
 };

 const handleFile = (file: File) => {
  const reader = new FileReader();
  reader.onload = e => {
   const text = e.target?.result as string;
   const parsed = parseCSV(text);
   setRows(parsed);
   setStep('preview');
  };
  reader.readAsText(file);
 };

 const handleImport = () => {
  setImporting(true);
  let created = 0, skipped = 0, errors = 0;
  const validRows = rows.filter(r => !r._error);
  const errorRows = rows.filter(r => !!r._error);
  errors = errorRows.length;

  // Build existing email set to prevent duplicate imports and password overwrites
  const existingEmails = new Set<string>((() => {
   try {
    const staff = JSON.parse(localStorage.getItem('rly_staff_master') ?? '[]') as any[];
    return staff.map((s: any) => s.email?.toLowerCase() ?? '');
   } catch { return []; }
  })());

  validRows.forEach(r => {
   const emailLower = r.email.toLowerCase();
   if (existingEmails.has(emailLower)) {
    skipped++;  // Already exists — skip to avoid overwriting changed passwords
    return;
   }
   try {
    adminAddUser({ name: r.name, email: r.email, mobile: r.mobile, designation: r.designation,
     cell: r.cell, hrmsId: r.hrmsId, workingAs: r.workingAs, role: r.role },
     currentUser?.id ?? '', currentUser?.name ?? '', true);
    existingEmails.add(emailLower); // Prevent same email twice in file
    created++;
   } catch {
    errors++;
   }
  });
  const res = { created, updated: 0, skipped, errors };
  setResult(res);
  setImporting(false);
  setStep('done');
  onImportDone(res);
 };

 return (
  <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={onClose}>
   <motion.div initial={{ scale: 0.96, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
    className="bg-white border border-slate-200 rounded-2xl w-full max-w-3xl shadow-2xl max-h-[90vh] overflow-hidden flex flex-col"
    onClick={e => e.stopPropagation()}>
    {/* Header */}
    <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
     <div>
      <h2 className="font-bold text-slate-900 flex items-center gap-2"><Upload size={16} className="text-emerald-500"/> Bulk Import Staff</h2>
      <p className="text-xs text-slate-400 mt-0.5">Upload a CSV file to add multiple staff members at once</p>
     </div>
     <button onClick={onClose}><X size={18} className="text-slate-400"/></button>
    </div>

    <div className="flex-1 overflow-y-auto p-6">
     {step === 'upload' && (
      <div className="space-y-5">
       {/* Template download */}
       <div className="rounded-xl border border-blue-100 bg-blue-50 p-4 flex items-center justify-between">
        <div>
         <p className="text-sm font-semibold text-blue-800">Step 1 — Download the template</p>
         <p className="text-xs text-blue-600 mt-0.5">Columns: {BULK_TEMPLATE_COLS.join(' · ')}</p>
        </div>
        <button onClick={downloadTemplate}
         className="flex items-center gap-1.5 px-3 py-2 bg-blue-600 text-white text-xs font-semibold rounded-xl hover:bg-blue-700">
         <Download size={12}/> Download Template
        </button>
       </div>
       {/* Upload zone */}
       <div
        className="border-2 border-dashed border-slate-300 rounded-2xl p-10 text-center hover:border-blue-400 hover:bg-blue-50/30 transition-colors cursor-pointer"
        onDragOver={e => e.preventDefault()}
        onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) handleFile(f); }}
        onClick={() => { const inp = document.createElement('input'); inp.type='file'; inp.accept='.csv,text/csv';
         inp.onchange = () => { if (inp.files?.[0]) handleFile(inp.files[0]); }; inp.click(); }}>
        <Upload size={28} className="text-slate-300 mx-auto mb-3"/>
        <p className="text-sm font-semibold text-slate-600">Click to upload or drag &amp; drop</p>
        <p className="text-xs text-slate-400 mt-1">CSV files only · First row must be header</p>
       </div>
       {/* Required fields note */}
       <div className="rounded-xl border border-amber-100 bg-amber-50 p-3">
        <p className="text-[11px] text-amber-700 font-semibold mb-1">Required columns: <code>name</code>, <code>email</code>, <code>cell</code></p>
        <p className="text-[10px] text-amber-600">Role must be one of: <code>user</code>, <code>incharge</code>, <code>admin</code>, <code>maintenance</code></p>
       </div>
      </div>
     )}

     {step === 'preview' && (
      <div className="space-y-4">
       <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-slate-700">
         {rows.length} rows parsed
         {rows.some(r => r._error) && (
          <span className="ml-2 text-[10px] text-red-600 bg-red-50 border border-red-200 px-2 py-0.5 rounded-full">
           {rows.filter(r => r._error).length} errors — will be skipped
          </span>
         )}
        </p>
        <button onClick={() => setStep('upload')} className="text-xs text-slate-400 hover:text-slate-600">← Back</button>
       </div>
       <div className="overflow-x-auto rounded-xl border border-slate-200">
        <table className="w-full text-xs">
         <thead>
          <tr className="bg-slate-50 text-[9px] uppercase tracking-wider text-slate-400 border-b border-slate-200">
           <th className="px-3 py-2 text-left">Row</th>
           <th className="px-3 py-2 text-left">Name</th>
           <th className="px-3 py-2 text-left">HRMS ID</th>
           <th className="px-3 py-2 text-left">Email</th>
           <th className="px-3 py-2 text-left">Cell</th>
           <th className="px-3 py-2 text-left">Designation</th>
           <th className="px-3 py-2 text-left">Role</th>
           <th className="px-3 py-2 text-left">Status</th>
          </tr>
         </thead>
         <tbody className="divide-y divide-slate-50">
          {rows.map(r => (
           <tr key={r._line} className={cn(r._error ? 'bg-red-50' : 'hover:bg-slate-50/50')}>
            <td className="px-3 py-2 text-slate-400">{r._line}</td>
            <td className="px-3 py-2 text-slate-800 font-medium">{r.name || <span className="text-red-400">—</span>}</td>
            <td className="px-3 py-2 text-slate-500 font-mono">{r.hrmsId || '—'}</td>
            <td className="px-3 py-2 text-slate-500">{r.email || <span className="text-red-400">—</span>}</td>
            <td className="px-3 py-2 text-slate-600">{r.cell || <span className="text-red-400">—</span>}</td>
            <td className="px-3 py-2 text-slate-500">{r.designation || '—'}</td>
            <td className="px-3 py-2">
             <span className={cn('text-[9px] font-bold px-1.5 py-0.5 rounded-full border',
              r.role === 'admin' ? 'bg-blue-100 text-blue-700 border-blue-200' :
              r.role === 'incharge' ? 'bg-emerald-100 text-emerald-700 border-emerald-200' :
              r.role === 'maintenance' ? 'bg-purple-100 text-purple-700 border-purple-200' :
              'bg-slate-100 text-slate-600 border-slate-200')}>
              {r.role}
             </span>
            </td>
            <td className="px-3 py-2">
             {r._error
              ? <span className="text-[9px] text-red-600 bg-red-50 border border-red-200 px-1.5 py-0.5 rounded-full">{r._error}</span>
              : <span className="text-[9px] text-emerald-600 flex items-center gap-0.5"><Check size={9}/> Ready</span>}
            </td>
           </tr>
          ))}
         </tbody>
        </table>
       </div>
      </div>
     )}

     {step === 'done' && (
      <div className="text-center py-6 space-y-4">
       <div className="w-14 h-14 rounded-2xl bg-emerald-100 flex items-center justify-center mx-auto">
        <CheckCircle2 size={28} className="text-emerald-600"/>
       </div>
       <h3 className="font-bold text-slate-900 text-lg">Import Complete</h3>
       <div className="grid grid-cols-3 gap-3 max-w-xs mx-auto">
        {[
         { label: 'Created', value: result.created, cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
         { label: 'Skipped', value: result.skipped, cls: 'bg-slate-50 text-slate-600 border-slate-200' },
         { label: 'Errors', value: result.errors, cls: result.errors > 0 ? 'bg-red-50 text-red-700 border-red-200' : 'bg-slate-50 text-slate-400 border-slate-200' },
        ].map(s => (
         <div key={s.label} className={cn('rounded-xl border p-3 text-center', s.cls)}>
          <p className="text-2xl font-bold">{s.value}</p>
          <p className="text-[10px] mt-0.5">{s.label}</p>
         </div>
        ))}
       </div>
       <p className="text-xs text-slate-400">New staff are active and visible in User Management.</p>
      </div>
     )}
    </div>

    {/* Footer */}
    <div className="flex justify-between items-center px-6 py-4 border-t border-slate-100">
     <button onClick={onClose} className="px-4 py-2 text-sm text-slate-500 hover:bg-slate-100 rounded-xl">
      {step === 'done' ? 'Close' : 'Cancel'}
     </button>
     {step === 'preview' && (
      <button onClick={handleImport} disabled={importing || rows.filter(r => !r._error).length === 0}
       className="px-5 py-2 text-sm bg-emerald-600 text-white hover:bg-emerald-700 rounded-xl flex items-center gap-1.5 disabled:opacity-40">
       {importing ? <RefreshCw size={13} className="animate-spin"/> : <Upload size={13}/>}
       Import {rows.filter(r => !r._error).length} Staff
      </button>
     )}
    </div>
   </motion.div>
  </div>
 );
}

// ── Main Page ──────────────────────────────────────────────────────────────────
// ── Password cell — shows default/current password with reveal toggle ──────────
function PasswordCell({ email, cell, designation }: { email: string; cell: string; designation: string }) {
 const [revealed, setRevealed] = useState(false);
 const [copied, setCopied] = useState(false);

 // Prefer stored password (may have been changed by user); fall back to default
 const stored = typeof window !== 'undefined' ? getUserPassword(email) : null;
 const defPwd = generateDefaultPassword(cell, designation);
 const password = stored ?? defPwd;
 const isDefault = !stored || stored === defPwd;

 const copy = () => {
 navigator.clipboard.writeText(password).then(() => {
 setCopied(true);
 setTimeout(() => setCopied(false), 1500);
 });
 };

 return (
 <td className="px-3 py-3">
 <div className="flex items-center gap-1.5">
 <code className={cn(
 'text-[10px] font-mono rounded px-1.5 py-0.5 select-all',
 isDefault
 ? 'bg-amber-50 text-amber-700 border border-amber-200 '
 : 'bg-emerald-50 text-emerald-700 border border-emerald-200 '
 )}>
 {revealed ? password : '••••••••'}
 </code>
 <button onClick={() => setRevealed(v => !v)} title={revealed ? 'Hide' : 'Reveal password'}
 className="p-1 rounded text-slate-300 hover:text-slate-500">
 {revealed ? <EyeOff size={11}/> : <Eye size={11}/>}
 </button>
 <button onClick={copy} title="Copy password"
 className="p-1 rounded text-slate-300 hover:text-blue-500">
 {copied ? <Check size={11} className="text-emerald-500"/> : <Copy size={11}/>}
 </button>
 </div>
 {isDefault && (
 <p className="text-[9px] text-amber-500/70 mt-0.5">Default · not yet changed</p>
 )}
 </td>
 );
}

// ── Cell-grouped section component ────────────────────────────────────────────
function CellGroup({
 cellName, users, activeCount, pendingCount, isAdmin, selected,
 toggleSelect, setDetailUser, setEditUser, setShowAdd,
 handleRestore, setConfirmDelete, setConfirmHardDelete,
}: {
 cellName: string;
 users: DisplayUser[];
 activeCount: number;
 pendingCount: number;
 isAdmin: boolean;
 selected: Set<string>;
 toggleSelect: (id: string) => void;
 setDetailUser: (u: DisplayUser) => void;
 setEditUser: (u: DisplayUser | null) => void;
 setShowAdd: (v: boolean) => void;
 handleRestore: (u: DisplayUser) => void;
 setConfirmDelete: (u: DisplayUser) => void;
 setConfirmHardDelete: (u: DisplayUser) => void;
}) {
 const [collapsed, setCollapsed] = useState(false);

 // Try to get the imported emails badge list once
 const importedEmails = (() => {
  try { return new Set<string>(JSON.parse(localStorage.getItem('rly_gsheet_imported_emails') ?? '[]')); }
  catch { return new Set<string>(); }
 })();

 return (
  <div>
   {/* Cell header */}
   <button
    onClick={() => setCollapsed(c => !c)}
    className="w-full flex items-center justify-between px-4 py-3 bg-slate-50 hover:bg-slate-100 transition-colors text-left">
    <div className="flex items-center gap-3">
     <div className="w-7 h-7 rounded-lg bg-blue-500/15 border border-blue-500/30 flex items-center justify-center shrink-0">
      <Building2 size={13} className="text-blue-600"/>
     </div>
     <div>
      <p className="text-sm font-bold text-slate-800">{cellName}</p>
      <div className="flex items-center gap-2 mt-0.5">
       <span className="text-[10px] text-emerald-600 font-semibold">{activeCount} Active</span>
       {pendingCount > 0 && (
        <span className="text-[10px] text-amber-600 font-semibold">{pendingCount} Pending</span>
       )}
       <span className="text-[10px] text-slate-400">{users.length} total</span>
      </div>
     </div>
    </div>
    {collapsed ? <ChevronDown size={14} className="text-slate-400"/> : <ChevronUp size={14} className="text-slate-400"/>}
   </button>

   {/* Users table within this cell */}
   {!collapsed && (
    <table className="w-full text-sm">
     <thead>
      <tr className="border-b border-slate-100 text-[9px] text-slate-400 font-semibold uppercase tracking-wider bg-white">
       <th className="px-3 py-2 w-8"/>
       <th className="px-3 py-2 text-left">Employee</th>
       <th className="px-3 py-2 text-left">Designation</th>
       <th className="px-3 py-2 text-left">Role</th>
       <th className="px-3 py-2 text-left">Status</th>
       {isAdmin && <th className="px-3 py-2 text-left text-amber-600">Password</th>}
       <th className="px-3 py-2 text-right">Actions</th>
      </tr>
     </thead>
     <tbody className="divide-y divide-slate-50">
      {users.map(u => {
       const rb   = ROLE_BADGE[u.role] ?? ROLE_BADGE.user;
       const RoleIcon = rb.icon;
       const sc   = USER_STATUS_COLORS[u.status] ?? '';
       const isSel = selected.has(u.id);
       const isSheet = importedEmails.has(u.email.toLowerCase());

       return (
        <tr key={u.id}
         className={cn('group hover:bg-slate-50/50 transition-colors', isSel && 'bg-blue-50/30')}>
         <td className="px-3 py-2.5">
          <button onClick={() => toggleSelect(u.id)}>
           {isSel
            ? <CheckSquare size={14} className="text-blue-500"/>
            : <Square size={14} className="text-slate-300"/>}
          </button>
         </td>
         <td className="px-3 py-2.5">
          <div className="flex items-center gap-2.5">
           <div className="w-8 h-8 rounded-xl bg-blue-100 flex items-center justify-center text-xs font-bold text-blue-700 shrink-0">
            {u.name[0]}
           </div>
           <div>
            <p className="font-semibold text-slate-900 text-sm">{u.name}</p>
            <p className="text-[10px] text-slate-400">{u.email}</p>
            <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
             {u.hrmsId && <code className="text-[9px] text-slate-400">{u.hrmsId}</code>}
             {u.mobile && <span className="text-[9px] text-slate-400">{u.mobile}</span>}
             {isSheet && (
              <span className="inline-flex items-center gap-0.5 text-[8px] font-bold px-1.5 py-0.5 rounded-full border bg-emerald-50 text-emerald-700 border-emerald-200">
               <FileSpreadsheet size={7}/> Sheet
              </span>
             )}
            </div>
           </div>
          </div>
         </td>
         <td className="px-3 py-2.5">
          <p className="text-xs text-slate-600 font-medium">{u.designation}</p>
          {u.workingAs && <p className="text-[10px] text-slate-400">{u.workingAs}</p>}
         </td>
         <td className="px-3 py-2.5">
          <span className={cn('inline-flex items-center gap-1 text-[10px] font-semibold border rounded-full px-2 py-0.5', rb.cls)}>
           <RoleIcon size={9}/> {rb.label}
          </span>
         </td>
         <td className="px-3 py-2.5">
          <span className={cn('inline-flex items-center text-[10px] font-semibold border rounded-full px-2 py-0.5', sc)}>
           {USER_STATUS_LABELS[u.status]}
          </span>
         </td>
         {isAdmin && (
          <PasswordCell email={u.email} cell={u.cell} designation={u.designation}/>
         )}
         <td className="px-3 py-2.5">
          <div className="flex items-center gap-1 justify-end">
           <button onClick={() => setDetailUser(u)} title="View details"
            className="p-1.5 rounded-lg hover:bg-blue-100 text-slate-400 hover:text-blue-600">
            <Eye size={14}/>
           </button>
           {isAdmin && (
            <>
             <button onClick={() => { setEditUser(u); setShowAdd(true); }} title="Edit"
              className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700">
              <Edit3 size={14}/>
             </button>
             {u.status === 'inactive' || u.status === 'suspended' ? (
              <button onClick={() => handleRestore(u)} title="Restore to active"
               className="p-1.5 rounded-lg hover:bg-emerald-100 text-slate-400 hover:text-emerald-600">
               <RotateCcw size={14}/>
              </button>
             ) : (
              <button onClick={() => setConfirmDelete(u)} title="Deactivate"
               className="p-1.5 rounded-lg hover:bg-amber-100 text-slate-400 hover:text-amber-600">
               <UserMinus size={14}/>
              </button>
             )}
             <button onClick={() => setConfirmHardDelete(u)} title="Delete permanently"
              className="p-1.5 rounded-lg hover:bg-red-100 text-slate-400 hover:text-red-600">
              <Trash2 size={14}/>
             </button>
            </>
           )}
          </div>
         </td>
        </tr>
       );
      })}
     </tbody>
    </table>
   )}
  </div>
 );
}

export default function UsersPage() {
 const { user: currentUser } = useAuthStore();
 const isAdmin = currentUser?.role === 'admin' || currentUser?.role === 'maintenance';

 const [search, setSearch] = useState('');
 const [filterCell, setFilterCell] = useState('all');
 const [filterRole, setFilterRole] = useState('all');
 const [filterStatus, setFilterStatus] = useState('all');
 const [sortKey, setSortKey] = useState<'name'|'cell'|'role'|'status'>('name');
 const [sortDir, setSortDir] = useState<'asc'|'desc'>('asc');
 const [selected, setSelected] = useState<Set<string>>(new Set());
 const [showAdd, setShowAdd] = useState(false);
  const [showBulk, setShowBulk] = useState(false);
  const [bulkResult, setBulkResult] = useState<{created:number;updated:number;skipped:number;errors:number}|null>(null);
 const [showGSheet, setShowGSheet] = useState(false);
 const [gsheetSyncResult, setGsheetSyncResult] = useState<SyncResult | null>(null);
 const [gsheetConnected, setGsheetConnected] = useState(false);
 const [syncingToServer, setSyncingToServer] = useState(false);
 const [serverSyncResult, setServerSyncResult] = useState<string | null>(null);
 const [editUser, setEditUser] = useState<DisplayUser | null>(null);
 const [detailUser, setDetailUser] = useState<DisplayUser | null>(null);
 const [confirmDelete, setConfirmDelete] = useState<DisplayUser | null>(null);
 const [confirmHardDelete, setConfirmHardDelete] = useState<DisplayUser | null>(null);
 const [bulkAction, setBulkAction] = useState('');
 const [refreshKey, setRefreshKey] = useState(0);

 const refresh = () => setRefreshKey(k => k + 1);

 const cells = useMemo(() => getActiveCells().map(c => c.name), []);

 // ── Google Sheets: check connection + auto-sync on mount ─────────────────────
 const handleGSheetAddUser = useCallback((row: Record<string, string>) => {
  adminAddUser(
   { name: row.name, email: row.email, mobile: row.mobile, designation: row.designation,
     cell: row.cell, hrmsId: row.hrmsId, workingAs: row.workingAs, role: row.role },
   currentUser?.id ?? 'system', currentUser?.name ?? 'Google Sheets Sync',
   false, // autoApprove = false → added as Pending
  );
 }, [currentUser]);

 // ── Pull users registered on other devices from KV ───────────────────────
 // Employees sign up on their own browser → their data is in KV but NOT in
 // the admin's localStorage. This function fetches all KV records and merges
 // any missing users into the admin's localStorage so they appear in this page.
 const mergeUsersFromServer = async () => {
  try {
   const res = await fetch('/api/users?all=true', { cache: 'no-store' });
   if (!res.ok) return;
   const kvUsers: any[] = await res.json();
   if (!Array.isArray(kvUsers) || !kvUsers.length) return;

   const staffList: any[] = JSON.parse(localStorage.getItem('rly_staff_master') ?? '[]');
   const memberships: any[] = JSON.parse(localStorage.getItem('rly_cell_memberships') ?? '[]');
   const existingEmails = new Set(staffList.map((s: any) => s.email?.toLowerCase() ?? ''));
   const existingMemberEmployeeIds = new Set(memberships.map((m: any) => m.employeeId));

   let changed = false;
   for (const u of kvUsers) {
    if (!u?.staffRecord?.email) continue;
    const email = (u.staffRecord.email as string).toLowerCase();
    if (existingEmails.has(email)) {
     // User already present — sync status override if admin approved on another device
     if (u.status && u.status !== 'pending') {
      const staffIdx = staffList.findIndex((s: any) => s.email?.toLowerCase() === email);
      if (staffIdx >= 0 && staffList[staffIdx].status !== u.status) {
       staffList[staffIdx] = { ...staffList[staffIdx], status: u.status, lastUpdatedAt: new Date().toISOString() };
       changed = true;
      }
     }
     continue;
    }
    // New user — but skip permanently deleted users (they're in the blocklist)
    const deletedIds: string[] = JSON.parse(localStorage.getItem('rly_deleted_users') ?? '[]');
    if (u.staffRecord.id && deletedIds.includes(u.staffRecord.id as string)) continue;
    staffList.push(u.staffRecord);
    existingEmails.add(email);
    // Create a pending membership so they show in the approval queue
    if (u.staffRecord.cell && !existingMemberEmployeeIds.has(u.staffRecord.id)) {
     memberships.push({
      id: `mem_kv_${u.staffRecord.id}`,
      employeeId: u.staffRecord.id,
      cellName: u.staffRecord.cell,
      cellRole: 'viewer',
      approvalStatus: 'pending',
      appliedAt: u.staffRecord.registeredAt ?? new Date().toISOString(),
     });
     existingMemberEmployeeIds.add(u.staffRecord.id);
    }
    changed = true;
   }

   if (changed) {
    localStorage.setItem('rly_staff_master', JSON.stringify(staffList));
    localStorage.setItem('rly_cell_memberships', JSON.stringify(memberships));
    refresh();
   }
  } catch { /* KV unavailable — silently continue with localStorage only */ }
 };

 useEffect(() => {
  const cfg = getGSheetConfig();
  setGsheetConnected(!!cfg);
  if (cfg?.autoSync) {
   // Build existing email set from current allUsers (run after first render)
   const emails = new Set(
    mockUsers.map(u => u.email.toLowerCase()).concat(
     (() => { try { return (JSON.parse(localStorage.getItem('rly_staff_master') ?? '[]') as any[]).map((s: any) => s.email?.toLowerCase() ?? ''); } catch { return []; } })()
    )
   );
   syncGoogleSheet(cfg, emails, handleGSheetAddUser).then(result => {
    setGsheetSyncResult(result);
    refresh();
    setGsheetConnected(true);
   });
  } else {
   // No auto-sync: still refresh so client-side localStorage data is loaded
   // (SSR renders with empty data; this ensures real data appears after hydration)
   refresh();
  }
  // Merge any users who signed up on another device from KV
  mergeUsersFromServer();
 // eslint-disable-next-line react-hooks/exhaustive-deps
 }, []);

 // Build unified user list from mockUsers + staffDB
 const allUsers = useMemo((): DisplayUser[] => {
 const statusOverrides = (() => {
 if (typeof window === 'undefined') return {};
 try { return JSON.parse(localStorage.getItem('rly_user_status_overrides') ?? '{}'); } catch { return {}; }
 })();
 const deletedIds: Set<string> = (() => {
 if (typeof window === 'undefined') return new Set<string>();
 try { return new Set<string>(JSON.parse(localStorage.getItem('rly_deleted_users') ?? '[]')); } catch { return new Set<string>(); }
 })();

 const mockOverrides: Record<string, any> = (() => {
 if (typeof window === 'undefined') return {};
 try { return JSON.parse(localStorage.getItem('rly_mock_user_overrides') ?? '{}'); } catch { return {}; }
 })();

 const mockMapped: DisplayUser[] = mockUsers
 .filter(u => !deletedIds.has(u.id))
 .map(u => {
 const ov = mockOverrides[u.id] ?? {};
 return {
 id: u.id,
 name: ov.name ?? u.name,
 email: ov.email ?? u.email,
 designation: ov.designation ?? u.designation,
 cell: ov.cell ?? u.cell,
 role: ov.role ?? u.role,
 hrmsId: ov.hrmsId ?? u.hrmsId,
 mobile: ov.mobile ?? u.mobileNumber,
 workingAs: ov.workingAs ?? u.workingAs,
 status: (statusOverrides[u.id] ?? (u.approved ? 'active' : 'pending')) as UserStatus,
 source: 'mock' as const,
 registeredAt: u.createdAt,
 };
 });

 const staffDB = getAllStaff();
 const dbMapped: DisplayUser[] = staffDB
 .filter(s => !mockMapped.find(m => m.id === s.id)) // dedup
 .map(s => ({
 id: s.id, name: s.name, email: s.email, designation: s.designation,
 cell: s.role === 'user' ? getMembershipsForStaff(s.id, s.cell) : 'All',
 role: s.role, hrmsId: s.hrmsId, mobile: s.mobile, workingAs: s.workingAs,
 status: (statusOverrides[s.id] ?? (['pending','rejected'].includes(s.status) ? s.status : 'active')) as UserStatus,
 source: 'staff_db', registeredAt: s.registeredAt,
 }));

 return [...mockMapped, ...dbMapped];
 // eslint-disable-next-line
 }, [refreshKey]);

 function getMembershipsForStaff(id: string, fallbackCell?: string): string {
  const all = getAllMemberships().filter(m => m.employeeId === id);
  const approved = all.filter(m => m.approvalStatus === 'approved');
  const used = approved.length > 0 ? approved : all;
  const fromMembership = used.map(x => x.cellName).filter(Boolean).join(', ');
  // Fall back to the cell stored directly on the staff record
  return fromMembership || fallbackCell || 'Unassigned';
 }

 const filtered = useMemo(() => {
 return allUsers
 .filter(u => filterCell === 'all' || u.cell === filterCell || u.cell.includes(filterCell))
 .filter(u => filterRole === 'all' || u.role === filterRole)
 .filter(u => filterStatus === 'all' || u.status === filterStatus)
 .filter(u => !search || u.name.toLowerCase().includes(search.toLowerCase())
 || u.email.toLowerCase().includes(search.toLowerCase())
 || u.designation.toLowerCase().includes(search.toLowerCase())
 || (u.hrmsId ?? '').toLowerCase().includes(search.toLowerCase()))
 .sort((a, b) => {
 const mul = sortDir === 'asc' ? 1 : -1;
 const va = String((a as any)[sortKey] ?? '');
 const vb = String((b as any)[sortKey] ?? '');
 return va.localeCompare(vb) * mul;
 });
 }, [allUsers, search, filterCell, filterRole, filterStatus, sortKey, sortDir]);

 const stats = useMemo(() => ({
 total: allUsers.length,
 active: allUsers.filter(u => u.status === 'active').length,
 pending: allUsers.filter(u => u.status === 'pending').length,
 inactive: allUsers.filter(u => ['inactive','suspended','rejected'].includes(u.status)).length,
 }), [allUsers]);

 const toggleSort = (key: typeof sortKey) => {
 if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
 else { setSortKey(key); setSortDir('asc'); }
 };

 const toggleSelect = (id: string) => setSelected(s => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });
 const allSelected = filtered.length > 0 && filtered.every(u => selected.has(u.id));
 const toggleAll = () => setSelected(allSelected ? new Set() : new Set(filtered.map(u => u.id)));

 // ── Helper: build a complete staffRecord payload for a KV POST ───────────────
 // Reads the raw rly_staff_master entry first (most complete); falls back to
 // building from DisplayUser fields so cross-device login can always reconstruct
 // the full user object even if the record was approved before KV syncing existed.
 const buildStaffRecordForKV = (u: DisplayUser, newStatus?: string): Record<string, unknown> => {
   const rawStaff: any[] = JSON.parse(localStorage.getItem('rly_staff_master') ?? '[]');
   const raw = rawStaff.find((s: any) => s.id === u.id);
   // staffRecord.status uses 'approved' (not 'active') to match the signup/staffDB layer
   const staffStatus = newStatus === 'active' ? 'approved' : (newStatus ?? (raw?.status ?? 'approved'));
   if (raw) {
     return { ...raw, status: staffStatus, lastUpdatedAt: new Date().toISOString() };
   }
   return {
     id: u.id, name: u.name, email: u.email,
     mobile: u.mobile ?? '', designation: u.designation ?? '',
     cell: u.cell ?? '', division: 'Delhi Division',
     hrmsId: u.hrmsId ?? '', workingAs: u.workingAs ?? '',
     role: u.role, status: staffStatus,
     registeredAt: u.registeredAt ?? new Date().toISOString(),
     lastUpdatedAt: new Date().toISOString(),
   };
 };

 const handleBulkAction = () => {
 if (!bulkAction || selected.size === 0) return;
 const ids = Array.from(selected);
 ids.forEach(id => {
 if (['active','inactive','suspended','retired'].includes(bulkAction)) {
  setUserStatus(id, bulkAction as UserStatus);
  addAudit(id, `Status changed to ${bulkAction} (bulk action)`, currentUser?.id, currentUser?.name);
  // Sync to KV — include staffRecord so cross-device login can reconstruct the user
  const target = allUsers.find(u => u.id === id);
  if (target?.email) {
   fetch('/api/users', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: target.email, status: bulkAction, staffRecord: buildStaffRecordForKV(target, bulkAction) }),
   }).catch(() => {});
  }
 }
 });
 notifyStaffChanged();
 setSelected(new Set()); setBulkAction(''); refresh();
 };

 const handleStatusChange = (userId: string, status: UserStatus) => {
 setUserStatus(userId, status);
 addAudit(userId, `Status changed to ${status}`, currentUser?.id, currentUser?.name);
 notifyStaffChanged();
 refresh();
 if (detailUser?.id === userId) setDetailUser(d => d ? { ...d, status } : d);
 // Sync to KV — include staffRecord so cross-device login can reconstruct the user
 const target = allUsers.find(u => u.id === userId);
 if (target?.email) {
  fetch('/api/users', {
   method: 'POST',
   headers: { 'Content-Type': 'application/json' },
   body: JSON.stringify({ email: target.email, status, staffRecord: buildStaffRecordForKV(target, status) }),
  }).catch(() => {});
 }
 };

 const handleTransfer = (userId: string, toCell: string) => {
 const u = allUsers.find(x => x.id === userId);
 createRequest({
 type: 'transfer', requestedBy: currentUser?.id ?? '', requestedByName: currentUser?.name ?? '',
 targetEmployeeId: userId, targetName: u?.name ?? userId,
 fromCell: u?.cell, toCell, reason: 'Admin transfer',
 });
 addAudit(userId, `Transfer request to ${toCell} submitted`, currentUser?.id, currentUser?.name);
 refresh();
 };

 const handleDelete = (u: DisplayUser) => {
 // Write status override directly — no external dependencies that could silently fail
 try {
 const key = 'rly_user_status_overrides';
 const overrides = JSON.parse(localStorage.getItem(key) ?? '{}');
 overrides[u.id] = 'inactive';
 localStorage.setItem(key, JSON.stringify(overrides));

 // Also update staffDB master if this is a DB record
 const staffKey = 'rly_staff_master';
 const staff = JSON.parse(localStorage.getItem(staffKey) ?? '[]');
 const idx = staff.findIndex((s: any) => s.id === u.id);
 if (idx >= 0) {
 staff[idx] = { ...staff[idx], status: 'rejected', lastUpdatedAt: new Date().toISOString() };
 localStorage.setItem(staffKey, JSON.stringify(staff));
 }

 // Audit entry
 const auditKey = 'rly_staff_audit';
 const audit = JSON.parse(localStorage.getItem(auditKey) ?? '[]');
 audit.push({
 id: `a${Date.now()}`, employeeId: u.id,
 timestamp: new Date().toISOString(),
 action: 'User deactivated',
 performedBy: currentUser?.id, performedByName: currentUser?.name,
 });
 localStorage.setItem(auditKey, JSON.stringify(audit.slice(-2000)));

 // Fire event so CellStaffRoster updates live
 window.dispatchEvent(new CustomEvent('rly_staff_changed'));

 // Sync deactivation to KV — include staffRecord so the record stays complete
 if (u.email) {
  fetch('/api/users', {
   method: 'POST',
   headers: { 'Content-Type': 'application/json' },
   body: JSON.stringify({ email: u.email, status: 'inactive', staffRecord: buildStaffRecordForKV(u, 'inactive') }),
  }).catch(() => {});
 }
 } catch (err) {
 console.error('Delete failed:', err);
 }
 setConfirmDelete(null);
 refresh();
 };

 const handleRestore = (u: DisplayUser) => {
 try {
 const key = 'rly_user_status_overrides';
 const overrides = JSON.parse(localStorage.getItem(key) ?? '{}');
 overrides[u.id] = 'active';
 localStorage.setItem(key, JSON.stringify(overrides));

 const staffKey = 'rly_staff_master';
 const staff = JSON.parse(localStorage.getItem(staffKey) ?? '[]');
 const idx = staff.findIndex((s: any) => s.id === u.id);
 if (idx >= 0) {
 staff[idx] = { ...staff[idx], status: 'approved', lastUpdatedAt: new Date().toISOString() };
 localStorage.setItem(staffKey, JSON.stringify(staff));
 }

 const auditKey = 'rly_staff_audit';
 const audit = JSON.parse(localStorage.getItem(auditKey) ?? '[]');
 audit.push({
 id: `a${Date.now()}`, employeeId: u.id,
 timestamp: new Date().toISOString(),
 action: 'User restored to active',
 performedBy: currentUser?.id, performedByName: currentUser?.name,
 });
 localStorage.setItem(auditKey, JSON.stringify(audit.slice(-2000)));

 window.dispatchEvent(new CustomEvent('rly_staff_changed'));

 // Sync to KV — include staffRecord so cross-device login works after restore
 if (u.email) {
  fetch('/api/users', {
   method: 'POST',
   headers: { 'Content-Type': 'application/json' },
   body: JSON.stringify({ email: u.email, status: 'active', staffRecord: buildStaffRecordForKV(u, 'active') }),
  }).catch(() => {});
 }
 } catch (err) {
 console.error('Restore failed:', err);
 }
 refresh();
 };

 const handleEditUser = (form: Record<string, string>) => {
 if (!editUser) return;
 // Always update status
 setUserStatus(editUser.id, form.status as UserStatus);
 if (editUser.source === 'staff_db') {
 // Persist all field changes to staffDB (including cell)
 updateStaffRecord(editUser.id, {
 name: form.name.trim(),
 email: form.email.trim(),
 mobile: form.mobile || undefined,
 designation: form.designation.trim(),
 hrmsId: form.hrmsId || undefined,
 workingAs: form.workingAs || undefined,
 role: form.role as any,
 cell: form.cell || editUser.cell || undefined,
 status: (form.status === 'active' ? 'approved' : form.status) as any,
 });
 // When admin approves (sets active), approve all pending memberships too
 if (form.status === 'active') {
  const mems = getAllMemberships().filter(m => m.employeeId === editUser.id && m.approvalStatus !== 'approved');
  mems.forEach(m => approveMembership(m.id, currentUser?.id ?? 'system', currentUser?.name ?? 'Admin'));
 }
 } else {
 // Mock user — persist field overrides in localStorage
 const key = 'rly_mock_user_overrides';
 const all = JSON.parse(localStorage.getItem(key) ?? '{}');
 all[editUser.id] = {
 name: form.name.trim(),
 email: form.email.trim(),
 mobile: form.mobile || undefined,
 designation: form.designation.trim(),
 cell: form.cell || editUser.cell,
 hrmsId: form.hrmsId || undefined,
 workingAs: form.workingAs || undefined,
 role: form.role,
 };
 localStorage.setItem(key, JSON.stringify(all));
 }
 addAudit(editUser.id, 'Profile updated by admin', currentUser?.id, currentUser?.name);
 notifyStaffChanged();
 refresh();

 // ── Sync to KV — include full staffRecord so cross-device login can
 //    reconstruct the user object even from a device that never had this user.
 if (editUser.email) {
   // Build the staffRecord from rly_staff_master (post-updateStaffRecord call above)
   // so KV gets the freshest version including any field changes made in this dialog.
   const freshStaff: any[] = JSON.parse(localStorage.getItem('rly_staff_master') ?? '[]');
   const rawRecord = freshStaff.find((s: any) => s.id === editUser.id);
   const staffRecordForKV: Record<string, unknown> = rawRecord
     ? { ...rawRecord, lastUpdatedAt: new Date().toISOString() }
     : {
         id: editUser.id, name: form.name?.trim() ?? editUser.name, email: editUser.email,
         mobile: form.mobile ?? editUser.mobile ?? '',
         designation: form.designation?.trim() ?? editUser.designation ?? '',
         cell: form.cell ?? editUser.cell ?? '',
         division: 'Delhi Division',
         hrmsId: form.hrmsId ?? editUser.hrmsId ?? '',
         workingAs: form.workingAs ?? editUser.workingAs ?? '',
         role: form.role ?? editUser.role,
         status: form.status === 'active' ? 'approved' : form.status,
         registeredAt: editUser.registeredAt ?? new Date().toISOString(),
         lastUpdatedAt: new Date().toISOString(),
       };
   // Ensure staffRecord.status uses 'approved' (not 'active') for consistency
   if (staffRecordForKV.status === 'active') staffRecordForKV.status = 'approved';
   fetch('/api/users', {
     method: 'POST',
     headers: { 'Content-Type': 'application/json' },
     body: JSON.stringify({ email: editUser.email, status: form.status, staffRecord: staffRecordForKV }),
   }).catch(() => {}); // non-blocking
 }
 };

 const handleAddUser = (form: Record<string, string>, autoApprove: boolean) => {
 adminAddUser({ name: form.name, email: form.email, mobile: form.mobile, designation: form.designation,
 cell: form.cell, hrmsId: form.hrmsId, workingAs: form.workingAs, reportingOfficer: form.reportingOfficer, role: form.role },
 currentUser?.id ?? '', currentUser?.name ?? '', autoApprove);
 refresh();
 };

 // ── Sync ALL existing staff to Vercel KV (one-time admin action) ─────────
 const handleSyncAllToServer = async () => {
   setSyncingToServer(true);
   setServerSyncResult(null);
   try {
     const staffList: any[] = JSON.parse(localStorage.getItem('rly_staff_master') ?? '[]');
     const pwdMap: Record<string, string> = JSON.parse(localStorage.getItem('rly_user_passwords') ?? '{}');
     const statusOv: Record<string, string> = JSON.parse(localStorage.getItem('rly_user_status_overrides') ?? '{}');
     let ok = 0, failed = 0;
     await Promise.all(staffList.map(async (s: any) => {
       if (!s.email) return;
       const email = s.email.toLowerCase();
       const pwd = pwdMap[email];
       const status = statusOv[s.id] ?? s.status ?? 'pending';
       try {
         const res = await fetch('/api/users', {
           method: 'POST',
           headers: { 'Content-Type': 'application/json' },
           body: JSON.stringify({ email, staffRecord: s, password: pwd, mustChange: false, status }),
         });
         const data = await res.json();
         if (data?.ok) ok++; else failed++;
       } catch { failed++; }
     }));
     setServerSyncResult(`✓ Synced ${ok} users to server${failed ? ` (${failed} failed)` : ''}`);
   } catch {
     setServerSyncResult('✗ Sync failed — check KV connection');
   }
   setSyncingToServer(false);
 };

 const handleHardDelete = (u: DisplayUser) => {
 try {
 // 1. Remove from staffDB master (works for staff_db users)
 const staffKey = 'rly_staff_master';
 const staff = JSON.parse(localStorage.getItem(staffKey) ?? '[]');
 localStorage.setItem(staffKey, JSON.stringify(staff.filter((s: any) => s.id !== u.id)));

 // 2. For mock (seed) users who aren't in staffDB, add to permanent deleted blocklist
 // so getAllMasterStaff() skips them on every future load
 const deletedKey = 'rly_deleted_users';
 const deletedIds: string[] = JSON.parse(localStorage.getItem(deletedKey) ?? '[]');
 if (!deletedIds.includes(u.id)) {
 deletedIds.push(u.id);
 localStorage.setItem(deletedKey, JSON.stringify(deletedIds));
 }

 // 3. Remove all cell memberships
 const memberKey = 'rly_cell_memberships';
 const members = JSON.parse(localStorage.getItem(memberKey) ?? '[]');
 localStorage.setItem(memberKey, JSON.stringify(members.filter((m: any) => m.employeeId !== u.id)));

 // 4. Remove status override
 const overrideKey = 'rly_user_status_overrides';
 const overrides = JSON.parse(localStorage.getItem(overrideKey) ?? '{}');
 delete overrides[u.id];
 localStorage.setItem(overrideKey, JSON.stringify(overrides));

 // 5. Audit entry
 const auditKey = 'rly_staff_audit';
 const audit = JSON.parse(localStorage.getItem(auditKey) ?? '[]');
 audit.push({
 id: `a${Date.now()}`, employeeId: u.id,
 timestamp: new Date().toISOString(),
 action: `Permanently deleted: ${u.name} (${u.designation}, ${u.cell}) [source: ${u.source}]`,
 performedBy: currentUser?.id, performedByName: currentUser?.name,
 });
 localStorage.setItem(auditKey, JSON.stringify(audit.slice(-2000)));

 // 6. Notify live staff rosters
 window.dispatchEvent(new CustomEvent('rly_staff_changed'));

 // 7. Remove from KV so mergeUsersFromServer can't re-add them on next page load
 if (u.email) {
  fetch('/api/users', {
   method: 'DELETE',
   headers: { 'Content-Type': 'application/json' },
   body: JSON.stringify({ email: u.email }),
  }).catch(() => {});
 }
 } catch (err) {
 console.error('Hard delete failed:', err);
 }
 setConfirmHardDelete(null);
 refresh();
 };

 // Export CSV
 const handleExport = () => {
 const rows = [
 ['HRMS ID','Name','Designation','Cell','Role','Status','Email','Mobile'],
 ...filtered.map(u => [u.hrmsId??'',u.name,u.designation,u.cell,u.role,u.status,u.email,u.mobile??'']),
 ];
 const csv = rows.map(r => r.map(v => `"${v}"`).join(',')).join('\n');
 const a = document.createElement('a');
 a.href = 'data:text/csv,' + encodeURIComponent(csv);
 a.download = 'drm_staff_directory.csv';
 a.click();
 };

 return (
 <div className="space-y-5 pb-8">
 {/* Header */}
 <div className="flex items-center justify-between flex-wrap gap-3">
 <div>
 <h1 className="text-xl font-bold text-slate-900">User Management</h1>
 <p className="text-sm text-slate-400 mt-0.5">Central authority for all staff across all cells · Delhi Division</p>
 </div>
 <div className="flex items-center gap-2 flex-wrap">
 <button onClick={handleExport} className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 text-slate-500 hover:bg-slate-100 text-xs transition-colors">
 <Download size={13}/> Export CSV
 </button>
          {isAdmin && (
            <>
              <button
               onClick={() => setShowGSheet(true)}
               className={cn(
                'flex items-center gap-1.5 px-3 py-2 rounded-xl border text-xs font-semibold transition-colors',
                gsheetConnected
                 ? 'border-emerald-300 bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                 : 'border-slate-300 bg-white text-slate-600 hover:bg-slate-50'
               )}>
               <FileSpreadsheet size={13}/>
               {gsheetConnected ? (
                <span className="flex items-center gap-1">
                 <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"/> Sheet Synced
                </span>
               ) : 'Connect Sheet'}
              </button>
              <button onClick={() => setShowBulk(true)} className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-700 text-xs font-semibold hover:bg-emerald-100 transition-colors"><Upload size={13}/> Bulk Import</button>
              <button
                onClick={handleSyncAllToServer}
                disabled={syncingToServer}
                title="Push all users to server so they can log in from any device"
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-violet-200 bg-violet-50 text-violet-700 text-xs font-semibold hover:bg-violet-100 transition-colors disabled:opacity-50">
                {syncingToServer ? <RefreshCw size={13} className="animate-spin"/> : <RefreshCw size={13}/>}
                Sync to Server
              </button>
              <button onClick={() => { setEditUser(null); setShowAdd(true); }} className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition-colors shadow-elevation-sm">
                <Plus size={15}/> Add Staff
              </button>
            </>
          )}
 </div>
 </div>

 {/* Server sync result banner */}
 {serverSyncResult && (
  <div className={`rounded-xl border px-4 py-3 flex items-center justify-between ${serverSyncResult.startsWith('✓') ? 'border-violet-200 bg-violet-50' : 'border-red-200 bg-red-50'}`}>
   <p className={`text-sm font-semibold ${serverSyncResult.startsWith('✓') ? 'text-violet-800' : 'text-red-700'}`}>{serverSyncResult}</p>
   <button onClick={() => setServerSyncResult(null)} className="text-slate-400 hover:text-slate-600"><X size={14}/></button>
  </div>
 )}

 {/* Google Sheets auto-sync banner */}
 {gsheetSyncResult && gsheetSyncResult.added > 0 && (
  <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 flex items-center justify-between">
   <div className="flex items-center gap-2">
    <FileSpreadsheet size={15} className="text-emerald-600"/>
    <p className="text-sm text-emerald-800 font-semibold">
     Google Sheets synced — <span className="font-bold">{gsheetSyncResult.added}</span> new {gsheetSyncResult.added === 1 ? 'user' : 'users'} added as <span className="text-amber-600">Pending Approval</span>
    </p>
   </div>
   <button onClick={() => setGsheetSyncResult(null)} className="text-emerald-400 hover:text-emerald-600">
    <X size={14}/>
   </button>
  </div>
 )}

 {/* KPI strip */}
 <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
 {[
 { label: 'Total Users', value: stats.total, color: 'bg-indigo-500' },
 { label: 'Active', value: stats.active, color: 'bg-emerald-500' },
 { label: 'Pending Approval', value: stats.pending, color: 'bg-amber-500' },
 { label: 'Inactive / Suspended', value: stats.inactive, color: 'bg-red-500' },
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
 <div className="p-3 border-b border-slate-100 space-y-2">
 <div className="flex items-center gap-2 flex-wrap">
 <div className="relative flex-1 min-w-48">
 <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"/>
 <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search name, email, designation, HRMS ID…"
 className="w-full pl-8 pr-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-blue-400 text-slate-800"/>
 </div>
 <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
 className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-600 focus:outline-none">
 <option value="all">All Status</option>
 {Object.entries(USER_STATUS_LABELS).map(([k,l]) => <option key={k} value={k}>{l}</option>)}
 </select>
          <select value={filterRole} onChange={e => setFilterRole(e.target.value)}
          className="bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-600 focus:outline-none focus:border-rail-400">
          <option value="all">All Roles</option>
          {Array.from(new Set(allUsers.map(u => u.role).filter(Boolean))).sort()
            .map(role => (
              <option key={role} value={role}>
                {role.charAt(0).toUpperCase() + role.slice(1).replace(/_/g, ' ')}
              </option>
            ))}
          </select>
 <select value={filterCell} onChange={e => setFilterCell(e.target.value)}
 className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-600 focus:outline-none">
 <option value="all">All Cells</option>
 {cells.map(c => <option key={c} value={c}>{c}</option>)}
 </select>
 <button onClick={refresh} className="p-2 rounded-xl border border-slate-200 text-slate-400 hover:bg-slate-100">
 <RefreshCw size={14}/>
 </button>
 </div>

 {/* Bulk actions */}
 {isAdmin && selected.size > 0 && (
 <div className="flex items-center gap-2 bg-blue-50 border border-blue-200 rounded-xl px-3 py-2">
 <span className="text-xs font-medium text-blue-700">{selected.size} selected</span>
 <select value={bulkAction} onChange={e => setBulkAction(e.target.value)}
 className="flex-1 bg-white border border-blue-300 rounded-lg px-2 py-1 text-xs text-slate-700 focus:outline-none">
 <option value="">— Bulk Action —</option>
 <option value="active">Set Active</option>
 <option value="inactive">Set Inactive</option>
 <option value="suspended">Suspend</option>
 <option value="retired">Mark Retired</option>
 </select>
 <button onClick={handleBulkAction} disabled={!bulkAction}
 className="px-3 py-1 text-xs bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-40">Apply</button>
 <button onClick={() => setSelected(new Set())} className="text-blue-400 hover:text-blue-600"><X size={14}/></button>
 </div>
 )}
 </div>

 {/* ── User list: Pending queue at top, then cell groups ── */}
 {(() => {
  if (filtered.length === 0) {
   return (
    <div className="text-center py-14 text-slate-300 text-sm">
     No users match your filters.
    </div>
   );
  }

  // Separate pending from active/other
  const pendingUsers = filtered.filter(u => u.status === 'pending');

  // Group ALL users by cell (pending users appear both here AND in the amber queue above)
  const groups = new Map<string, DisplayUser[]>();
  for (const u of filtered) {
   const key = u.cell || 'Unassigned';
   if (!groups.has(key)) groups.set(key, []);
   groups.get(key)!.push(u);
  }
  const sortedKeys = Array.from(groups.keys()).sort((a, b) => {
   if (a === 'Unassigned') return 1;
   if (b === 'Unassigned') return -1;
   return a.localeCompare(b);
  });

  const importedEmails = (() => {
   try { return new Set<string>(JSON.parse(localStorage.getItem('rly_gsheet_imported_emails') ?? '[]')); }
   catch { return new Set<string>(); }
  })();

  return (
   <div className="divide-y divide-slate-100">

    {/* ── Pending Approval Queue (always at top) ── */}
    {pendingUsers.length > 0 && (
     <div>
      {/* Pending header */}
      <div className="flex items-center gap-3 px-4 py-3 bg-amber-50 border-b border-amber-100">
       <div className="w-7 h-7 rounded-lg bg-amber-400/20 border border-amber-400/40 flex items-center justify-center shrink-0">
        <Clock size={13} className="text-amber-600"/>
       </div>
       <div>
        <p className="text-sm font-bold text-amber-800">Pending Approval</p>
        <p className="text-[10px] text-amber-600">
         {pendingUsers.length} user{pendingUsers.length !== 1 ? 's' : ''} waiting — review, assign cell, and approve
        </p>
       </div>
       {isAdmin && (
        <span className="ml-auto text-[9px] text-amber-600 bg-amber-100 border border-amber-200 rounded-full px-2 py-0.5 font-semibold">
         Action Required
        </span>
       )}
      </div>

      {/* Pending users table */}
      <table className="w-full text-sm">
       <thead>
        <tr className="border-b border-amber-100 text-[9px] text-amber-700 font-semibold uppercase tracking-wider bg-amber-50/60">
         <th className="px-3 py-2 w-8"/>
         <th className="px-3 py-2 text-left">Employee</th>
         <th className="px-3 py-2 text-left">Cell / Designation</th>
         <th className="px-3 py-2 text-left">Source</th>
         {isAdmin && <th className="px-3 py-2 text-right">Actions</th>}
        </tr>
       </thead>
       <tbody className="divide-y divide-amber-50">
        {pendingUsers.map(u => {
         const isSel    = selected.has(u.id);
         const isSheet  = importedEmails.has(u.email.toLowerCase());
         return (
          <tr key={u.id} className={cn('hover:bg-amber-50/40 transition-colors', isSel && 'bg-blue-50/30')}>
           <td className="px-3 py-2.5">
            <button onClick={() => toggleSelect(u.id)}>
             {isSel ? <CheckSquare size={14} className="text-blue-500"/> : <Square size={14} className="text-slate-300"/>}
            </button>
           </td>
           <td className="px-3 py-2.5">
            <div className="flex items-center gap-2.5">
             <div className="w-8 h-8 rounded-xl bg-amber-100 flex items-center justify-center text-xs font-bold text-amber-700 shrink-0">
              {u.name[0]}
             </div>
             <div>
              <p className="font-semibold text-slate-900 text-sm">{u.name}</p>
              <p className="text-[10px] text-slate-400">{u.email}</p>
              {u.hrmsId && <code className="text-[9px] text-slate-400">{u.hrmsId}</code>}
             </div>
            </div>
           </td>
           <td className="px-3 py-2.5">
            <p className="text-xs text-slate-700 font-medium">{u.cell !== 'Unassigned' ? u.cell : <span className="text-amber-500 italic">No cell assigned</span>}</p>
            <p className="text-[10px] text-slate-400">{u.designation}</p>
           </td>
           <td className="px-3 py-2.5">
            {isSheet ? (
             <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border bg-emerald-50 text-emerald-700 border-emerald-200">
              <FileSpreadsheet size={9}/> Google Sheet
             </span>
            ) : (
             <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border bg-slate-50 text-slate-500 border-slate-200">
              <UserPlus size={9}/> Manual
             </span>
            )}
           </td>
           {isAdmin && (
            <td className="px-3 py-2.5">
             <div className="flex items-center gap-1.5 justify-end">
              {/* Approve = open edit modal pre-filled so admin can set cell + activate */}
              <button
               onClick={() => { setEditUser(u); setShowAdd(true); }}
               title="Review & Approve"
               className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-emerald-600 text-white text-[10px] font-semibold hover:bg-emerald-700">
               <CheckCircle2 size={11}/> Approve
              </button>
              <button
               onClick={() => setDetailUser(u)}
               title="View details"
               className="p-1.5 rounded-lg hover:bg-blue-100 text-slate-400 hover:text-blue-600">
               <Eye size={14}/>
              </button>
              <button
               onClick={() => setConfirmDelete(u)}
               title="Reject / Deactivate"
               className="p-1.5 rounded-lg hover:bg-red-100 text-slate-400 hover:text-red-500">
               <XCircle size={14}/>
              </button>
             </div>
            </td>
           )}
          </tr>
         );
        })}
       </tbody>
      </table>
     </div>
    )}

    {/* ── Active users grouped by cell ── */}
    {sortedKeys.map(cellName => {
     const cellUsers    = groups.get(cellName)!;
     const activeCount  = cellUsers.filter(u => u.status === 'active').length;
     const pendingCount = cellUsers.filter(u => u.status === 'pending').length;
     return (
      <CellGroup
       key={cellName}
       cellName={cellName}
       users={cellUsers}
       activeCount={activeCount}
       pendingCount={pendingCount}
       isAdmin={isAdmin}
       selected={selected}
       toggleSelect={toggleSelect}
       setDetailUser={setDetailUser}
       setEditUser={setEditUser}
       setShowAdd={setShowAdd}
       handleRestore={handleRestore}
       setConfirmDelete={setConfirmDelete}
       setConfirmHardDelete={setConfirmHardDelete}
      />
     );
    })}

    <div className="px-4 py-2 text-[10px] text-slate-400">
     Showing {filtered.length} of {allUsers.length} users
     {pendingUsers.length > 0 && ` · ${pendingUsers.length} pending`}
     {selected.size > 0 && ` · ${selected.size} selected`}
    </div>
   </div>
  );
 })()}
 </div>

 {/* Modals */}
 <AnimatePresence>
 {showGSheet && (
  <GoogleSheetsModal
   existingEmails={new Set(allUsers.map(u => u.email.toLowerCase()))}
   onAddUser={handleGSheetAddUser}
   onClose={() => { setShowGSheet(false); setGsheetConnected(!!getGSheetConfig()); }}
   onSyncDone={(result) => { setGsheetSyncResult(result); refresh(); }}
  />
 )}
 {showBulk && (
  <BulkImportModal
   cells={cells}
   currentUser={currentUser ? { id: currentUser.id, name: currentUser.name } : null}
   onClose={() => setShowBulk(false)}
   onImportDone={(res) => { setBulkResult(res); setShowBulk(false); refresh(); }}
  />
 )}
 {showAdd && (
 <AddUserModal
 user={editUser}
 cells={cells}
 currentUser={currentUser ? { id: currentUser.id, name: currentUser.name } : null}
 onClose={() => { setShowAdd(false); setEditUser(null); }}
 onSave={(form, autoApprove) => {
 if (editUser) {
 handleEditUser(form);
 } else {
 handleAddUser(form, autoApprove);
 }
 }}
 />
 )}
 {detailUser && (
 <UserDetailPanel user={detailUser} cells={cells}
 currentUser={currentUser ? { id: currentUser.id, name: currentUser.name } : null}
 onClose={() => setDetailUser(null)}
 onStatusChange={handleStatusChange}
 onTransfer={handleTransfer}
 />
 )}
 {confirmDelete && (
 <ConfirmDialog
 title="Deactivate User?"
 message={`"${confirmDelete.name}"will lose system access. All historical records, audit trails, and cell memberships are preserved and the account can be reactivated at any time using the Restore button.`}
 confirmLabel="Deactivate User"
 onConfirm={() => handleDelete(confirmDelete)}
 onCancel={() => setConfirmDelete(null)}
 />
 )}
 {confirmHardDelete && (
 <ConfirmDialog
 title="Permanently Delete User?"
 message={`"${confirmHardDelete.name}"will be permanently removed from the system. This action cannot be undone. All cell memberships will be deleted. Audit logs will retain a record of this deletion.`}
 confirmLabel="Delete Permanently"
 onConfirm={() => handleHardDelete(confirmHardDelete)}
 onCancel={() => setConfirmHardDelete(null)}
 />
 )}
 </AnimatePresence>
 </div>
 );
}
