'use client';
// ─────────────────────────────────────────────────────────────────────────────
// Overview Access Control Modal
// Admin / Maintenance can configure who can View and Edit the Overview page.
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Shield, Eye, PencilLine, Users, Check, Loader2, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  getOverviewAccess, saveOverviewAccess,
  type OverviewAccess, type ViewMode,
} from '@/lib/overview/overviewAccess';

interface UserRecord {
  id: string;
  name: string;
  email: string;
  role: string;
  cell?: string;
  designation?: string;
  approved?: boolean;
}

const ROLE_LABELS: Record<string, string> = {
  incharge:    'Cell In-Charge',
  user:        'Regular User',
  admin:       'Admin',
  maintenance: 'Maintenance',
};

const ROLE_COLORS: Record<string, string> = {
  incharge:    'bg-indigo-100 text-indigo-700',
  user:        'bg-slate-100 text-slate-600',
  admin:       'bg-red-100 text-red-700',
  maintenance: 'bg-violet-100 text-violet-700',
};

// ── Tiny chip ────────────────────────────────────────────────────────────────

function UserChip({ u, onRemove }: { u: UserRecord; onRemove: () => void }) {
  return (
    <span className="inline-flex items-center gap-1.5 pl-2 pr-1 py-0.5 rounded-full bg-rail-50 border border-rail-200 text-[11px] text-rail-800 font-medium">
      {u.name}
      <span className={cn('text-[9px] px-1 py-0.5 rounded-full font-bold', ROLE_COLORS[u.role] ?? 'bg-slate-100 text-slate-600')}>
        {ROLE_LABELS[u.role] ?? u.role}
      </span>
      <button onClick={onRemove} className="w-4 h-4 flex items-center justify-center rounded-full text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors">
        <X size={9}/>
      </button>
    </span>
  );
}

// ── User picker dropdown ──────────────────────────────────────────────────────

function UserPicker({
  label, placeholder, selectedIds, allUsers, loading, onAdd,
}: {
  label: string;
  placeholder: string;
  selectedIds: string[];
  allUsers: UserRecord[];
  loading: boolean;
  onAdd: (id: string) => void;
}) {
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(false);

  const available = allUsers.filter(u =>
    !selectedIds.includes(u.id) &&
    u.role !== 'admin' &&
    u.role !== 'maintenance' &&
    (
      u.name.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase()) ||
      (u.cell ?? '').toLowerCase().includes(search.toLowerCase())
    ),
  );

  return (
    <div className="relative">
      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1 block">{label}</label>
      <div className="relative">
        <input
          value={search}
          onChange={e => { setSearch(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          placeholder={loading ? 'Loading users…' : placeholder}
          disabled={loading}
          className="w-full border border-slate-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-rail-400 pr-8"
        />
        {loading
          ? <Loader2 size={12} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 animate-spin"/>
          : <Users size={12} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"/>
        }
      </div>
      {open && available.length > 0 && (
        <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-slate-200 rounded-xl shadow-xl z-20 max-h-48 overflow-y-auto">
          {available.slice(0, 20).map(u => (
            <button
              key={u.id}
              onMouseDown={() => { onAdd(u.id); setSearch(''); }}
              className="flex items-center gap-2.5 w-full px-3 py-2 hover:bg-slate-50 text-left"
            >
              <div className="w-6 h-6 rounded-full bg-gradient-to-br from-rail-500 to-rail-700 flex items-center justify-center text-[9px] font-bold text-white shrink-0">
                {u.name.slice(0, 2).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[11px] font-semibold text-slate-800 truncate">{u.name}</p>
                <p className="text-[9px] text-slate-400 truncate">{u.cell ?? ''} · {u.email}</p>
              </div>
              <span className={cn('text-[9px] px-1.5 py-0.5 rounded-full font-bold shrink-0', ROLE_COLORS[u.role] ?? 'bg-slate-100 text-slate-600')}>
                {ROLE_LABELS[u.role] ?? u.role}
              </span>
            </button>
          ))}
        </div>
      )}
      {open && !loading && available.length === 0 && search && (
        <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-slate-200 rounded-xl shadow-xl z-20 px-3 py-3 text-[11px] text-slate-400">
          No matching users
        </div>
      )}
    </div>
  );
}

// ── Main modal ────────────────────────────────────────────────────────────────

export function OverviewAccessModal({ onClose, onSave }: {
  onClose: () => void;
  onSave: (access: OverviewAccess) => void;
}) {
  const [access, setAccess] = useState<OverviewAccess>(getOverviewAccess);
  const [allUsers, setAllUsers] = useState<UserRecord[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [userError, setUserError] = useState(false);
  const [saved, setSaved] = useState(false);

  // Fetch all users from API
  useEffect(() => {
    fetch('/api/users?all=true')
      .then(r => r.json())
      .then((data: UserRecord[]) => {
        setAllUsers(Array.isArray(data) ? data.filter(u => u.approved !== false) : []);
        setLoadingUsers(false);
      })
      .catch(() => { setUserError(true); setLoadingUsers(false); });
  }, []);

  const getUserById = (id: string) => allUsers.find(u => u.id === id);

  const setViewMode = (m: ViewMode) => setAccess(a => ({ ...a, viewMode: m }));
  const toggleViewRole = (role: string) => setAccess(a => ({
    ...a,
    viewRoles: a.viewRoles.includes(role)
      ? a.viewRoles.filter(r => r !== role)
      : [...a.viewRoles, role],
  }));
  const addViewUser = (id: string) => setAccess(a => ({
    ...a, viewUserIds: a.viewUserIds.includes(id) ? a.viewUserIds : [...a.viewUserIds, id],
  }));
  const removeViewUser = (id: string) => setAccess(a => ({
    ...a, viewUserIds: a.viewUserIds.filter(i => i !== id),
  }));
  const addEditUser = (id: string) => setAccess(a => ({
    ...a, editUserIds: a.editUserIds.includes(id) ? a.editUserIds : [...a.editUserIds, id],
  }));
  const removeEditUser = (id: string) => setAccess(a => ({
    ...a, editUserIds: a.editUserIds.filter(i => i !== id),
  }));

  const handleSave = () => {
    saveOverviewAccess(access);
    onSave(access);
    setSaved(true);
    setTimeout(onClose, 700);
  };

  const extraRoles = ['incharge', 'user'];

  return createPortal(
    <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}
      onClick={onClose}>
      <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden"
        onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="flex items-center gap-3 px-5 py-4 bg-slate-900 text-white">
          <Shield size={17} className="text-rail-400 shrink-0"/>
          <div>
            <p className="font-bold text-sm">Overview Page — Access Control</p>
            <p className="text-[10px] text-slate-400 mt-0.5">Admin and Maintenance always have full access</p>
          </div>
          <button onClick={onClose} className="ml-auto text-slate-400 hover:text-white"><X size={16}/></button>
        </div>

        <div className="p-5 space-y-6 max-h-[70vh] overflow-y-auto custom-scroll">

          {/* ── VIEW ACCESS ─────────────────────────────────────────────── */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Eye size={13} className="text-blue-500"/>
              <p className="text-[11px] font-bold text-slate-700 uppercase tracking-widest">Who can View</p>
            </div>

            {/* Radio: all vs selected */}
            <div className="flex gap-3">
              {(['all', 'selected'] as ViewMode[]).map(m => (
                <label key={m} className={cn(
                  'flex-1 flex items-center gap-2.5 border rounded-xl p-3 cursor-pointer transition-all',
                  access.viewMode === m ? 'border-rail-400 bg-rail-50' : 'border-slate-200 hover:border-slate-300',
                )}>
                  <div className={cn(
                    'w-4 h-4 rounded-full border-2 flex items-center justify-center transition-all shrink-0',
                    access.viewMode === m ? 'border-rail-600 bg-rail-600' : 'border-slate-300',
                  )}>
                    {access.viewMode === m && <div className="w-1.5 h-1.5 rounded-full bg-white"/>}
                  </div>
                  <div>
                    <p className="text-[11px] font-bold text-slate-800">
                      {m === 'all' ? 'All logged-in users' : 'Selected roles / users'}
                    </p>
                    <p className="text-[9px] text-slate-400 mt-0.5">
                      {m === 'all' ? 'Anyone with an account can view' : 'Only chosen roles and people'}
                    </p>
                  </div>
                  <input type="radio" className="sr-only" checked={access.viewMode === m} onChange={() => setViewMode(m)}/>
                </label>
              ))}
            </div>

            {/* Selected mode options */}
            {access.viewMode === 'selected' && (
              <div className="border border-slate-200 rounded-xl p-4 space-y-4 bg-slate-50">
                {/* Role toggles */}
                <div>
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">By Role</p>
                  <div className="flex gap-2 flex-wrap">
                    {extraRoles.map(role => (
                      <button key={role}
                        onClick={() => toggleViewRole(role)}
                        className={cn(
                          'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold border transition-all',
                          access.viewRoles.includes(role)
                            ? 'bg-rail-600 border-rail-600 text-white'
                            : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300',
                        )}>
                        {access.viewRoles.includes(role) && <Check size={10}/>}
                        {ROLE_LABELS[role]}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Specific user picker */}
                <div>
                  {userError && (
                    <div className="flex items-center gap-1.5 text-[11px] text-amber-600 mb-2">
                      <AlertCircle size={11}/> Could not load users. Enter IDs manually or retry.
                    </div>
                  )}
                  <UserPicker
                    label="By Specific User"
                    placeholder="Search by name, email or cell…"
                    selectedIds={access.viewUserIds}
                    allUsers={allUsers}
                    loading={loadingUsers}
                    onAdd={addViewUser}
                  />
                  {access.viewUserIds.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {access.viewUserIds.map(id => {
                        const u = getUserById(id);
                        return u
                          ? <UserChip key={id} u={u} onRemove={() => removeViewUser(id)}/>
                          : <span key={id} className="text-[10px] text-slate-400 italic">{id}</span>;
                      })}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* ── EDIT ACCESS ─────────────────────────────────────────────── */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <PencilLine size={13} className="text-emerald-500"/>
              <p className="text-[11px] font-bold text-slate-700 uppercase tracking-widest">Who can Edit</p>
            </div>
            <div className="border border-slate-200 rounded-xl p-4 space-y-3 bg-slate-50">
              <div className="flex items-center gap-2 text-[11px] text-slate-500 bg-slate-100 rounded-lg px-3 py-2">
                <Shield size={11} className="text-slate-400 shrink-0"/>
                Admin and Maintenance always have edit access — add extra users below
              </div>
              {userError && (
                <div className="flex items-center gap-1.5 text-[11px] text-amber-600">
                  <AlertCircle size={11}/> Could not load users.
                </div>
              )}
              <UserPicker
                label="Additional Editors"
                placeholder="Search by name, email or cell…"
                selectedIds={access.editUserIds}
                allUsers={allUsers}
                loading={loadingUsers}
                onAdd={addEditUser}
              />
              {access.editUserIds.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {access.editUserIds.map(id => {
                    const u = getUserById(id);
                    return u
                      ? <UserChip key={id} u={u} onRemove={() => removeEditUser(id)}/>
                      : <span key={id} className="text-[10px] text-slate-400 italic">{id}</span>;
                  })}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-slate-100 flex items-center justify-between">
          <p className="text-[10px] text-slate-400">Settings saved to this device and synced to all users</p>
          <div className="flex gap-2">
            <button onClick={onClose}
              className="px-4 py-2 text-xs text-slate-500 hover:bg-slate-100 rounded-lg">Cancel</button>
            <button onClick={handleSave}
              className={cn(
                'px-4 py-2 text-xs rounded-lg font-semibold flex items-center gap-1.5 transition-all',
                saved
                  ? 'bg-emerald-600 text-white'
                  : 'bg-rail-600 hover:bg-rail-700 text-white',
              )}>
              {saved ? <><Check size={11}/> Saved!</> : <><Shield size={11}/> Save Access Rules</>}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
