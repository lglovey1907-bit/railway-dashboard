'use client';
import { useState, useEffect, useCallback, useRef } from 'react';
import { Link2, Plus, Trash2, ExternalLink, Tag, Edit3, Check, X, Search, Cloud, Monitor } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { canManageCellStructure } from '@/lib/cellData/useCellDataStructure';
import { useCloudConfig } from '@/lib/config/useCloudConfig';
import { cn } from '@/lib/utils';

export interface GoogleLink {
  id: string;
  title: string;
  url: string;
  description?: string;
  category: string;
  addedBy: string;
  addedAt: string;
}

const CATEGORIES = ['Google Sheets', 'Google Docs', 'Google Forms', 'Google Drive', 'Power BI', 'Railway Portal', 'Other'];

const CAT_COLORS: Record<string, string> = {
  'Google Sheets':  'bg-emerald-50 text-emerald-700 border-emerald-200',
  'Google Docs':    'bg-blue-50 text-blue-700 border-blue-200',
  'Google Forms':   'bg-violet-50 text-violet-700 border-violet-200',
  'Google Drive':   'bg-amber-50 text-amber-700 border-amber-200',
  'Power BI':       'bg-yellow-50 text-yellow-700 border-yellow-200',
  'Railway Portal': 'bg-rail-50 text-rail-700 border-rail-200',
  'Other':          'bg-slate-50 text-slate-600 border-slate-200',
};

// localStorage cache key (fast local read)
function lsKey(cell: string) {
  return `rly_links_${cell.replace(/[^a-zA-Z0-9]/g, '_')}`;
}

// Upstash namespace key
function nsKey(cell: string) {
  return `links_${cell.replace(/[^a-zA-Z0-9]/g, '_')}`;
}

interface AddLinkForm { title: string; url: string; description: string; category: string; }
const EMPTY: AddLinkForm = { title: '', url: '', description: '', category: 'Google Sheets' };

export function GoogleLinksRepo({ cell }: { cell: string }) {
  const { user } = useAuthStore();
  const canManage = canManageCellStructure(user, cell);
  const [links, setLinks] = useState<GoogleLink[]>([]);
  const [search, setSearch] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState<AddLinkForm>(EMPTY);

  // ── FIXED: pass user?.id directly so Upstash re-fetches when user hydrates ─
  const cloud = useCloudConfig<GoogleLink[]>(nsKey(cell), user?.id);
  const appliedRef = useRef<string>('');

  // Step 1: Load from localStorage immediately on mount
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const raw = localStorage.getItem(lsKey(cell));
      if (raw) setLinks(JSON.parse(raw));
    } catch { /* ignore */ }
  }, [cell]);

  // Step 2: Apply Upstash value when it arrives (cross-device sync)
  useEffect(() => {
    if (!cloud.value) return;
    if (!user?.id) return;
    if (appliedRef.current === `${user.id}:${cell}`) return; // already applied
    appliedRef.current = `${user.id}:${cell}`;
    if (Array.isArray(cloud.value) && cloud.value.length > 0) {
      setLinks(cloud.value);
      if (typeof window !== 'undefined') {
        localStorage.setItem(lsKey(cell), JSON.stringify(cloud.value));
      }
    }
  }, [cloud.value, user?.id, cell]);

  // Reset when user or cell changes
  useEffect(() => { appliedRef.current = ''; }, [user?.id, cell]);

  const persist = useCallback((next: GoogleLink[]) => {
    setLinks(next);
    if (typeof window !== 'undefined') localStorage.setItem(lsKey(cell), JSON.stringify(next));
    cloud.set(next.length > 0 ? next : null);
  }, [cell, cloud]);

  const handleAdd = () => {
    if (!form.title.trim() || !form.url.trim()) return;
    const newLink: GoogleLink = {
      id: `lnk_${Date.now()}`,
      title: form.title.trim(),
      url: form.url.startsWith('http') ? form.url.trim() : `https://${form.url.trim()}`,
      description: form.description.trim() || undefined,
      category: form.category,
      addedBy: user?.name ?? 'Admin',
      addedAt: new Date().toISOString(),
    };
    persist([...links, newLink]);
    setForm(EMPTY); setShowAdd(false);
  };

  const handleDelete = (id: string) => persist(links.filter(l => l.id !== id));

  const filtered = links.filter(l =>
    !search || l.title.toLowerCase().includes(search.toLowerCase()) ||
    (l.description ?? '').toLowerCase().includes(search.toLowerCase()) ||
    l.category.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden" style={{ boxShadow: '0 1px 3px rgba(15,23,42,0.06)' }}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-blue-50 border border-blue-100 flex items-center justify-center">
            <Link2 size={13} className="text-blue-600"/>
          </div>
          <div>
            <p className="text-xs font-bold text-slate-900">Links Repository</p>
            <div className="flex items-center gap-1.5">
              <p className="text-[10px] text-slate-400">{links.length} link{links.length !== 1 ? 's' : ''}</p>
              {cloud.kvAvailable ? (
                <span className="inline-flex items-center gap-0.5 text-[9px] text-emerald-600 bg-emerald-50 border border-emerald-200 rounded-full px-1 py-0.5">
                  <Cloud size={7}/> Synced
                </span>
              ) : (
                <span className="inline-flex items-center gap-0.5 text-[9px] text-amber-600 bg-amber-50 border border-amber-200 rounded-full px-1 py-0.5">
                  <Monitor size={7}/> Local
                </span>
              )}
            </div>
          </div>
        </div>
        {canManage && (
          <button onClick={() => setShowAdd(s => !s)}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-rail-600 hover:bg-rail-700 text-white text-[11px] font-semibold transition-colors">
            <Plus size={11}/> Add
          </button>
        )}
      </div>

      {/* Add form */}
      {showAdd && (
        <div className="px-4 py-3 border-b border-slate-100 bg-slate-50 space-y-2">
          <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
            placeholder="Title (e.g. Staff Data Sheet)"
            className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-rail-400"/>
          <input value={form.url} onChange={e => setForm(f => ({ ...f, url: e.target.value }))}
            placeholder="https://docs.google.com/…"
            className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-rail-400"/>
          <input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
            placeholder="Description (optional)"
            className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-rail-400"/>
          <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
            className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-700 focus:outline-none focus:border-rail-400">
            {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <div className="flex gap-2 justify-end">
            <button onClick={() => { setShowAdd(false); setForm(EMPTY); }}
              className="px-3 py-1.5 text-xs text-slate-500 hover:bg-slate-100 rounded-lg">Cancel</button>
            <button onClick={handleAdd} disabled={!form.title.trim() || !form.url.trim()}
              className="px-3 py-1.5 text-xs bg-rail-600 text-white rounded-lg hover:bg-rail-700 disabled:opacity-40">Save Link</button>
          </div>
        </div>
      )}

      {/* Search */}
      {links.length > 3 && (
        <div className="px-4 py-2 border-b border-slate-100">
          <div className="relative">
            <Search size={11} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400"/>
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search links…"
              className="w-full pl-7 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-[11px] text-slate-700 focus:outline-none focus:border-rail-400"/>
          </div>
        </div>
      )}

      {/* Links list */}
      <div className="divide-y divide-slate-50 max-h-[320px] overflow-y-auto">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-8">
            <Link2 size={20} className="text-slate-200"/>
            <p className="text-[11px] text-slate-400">{links.length === 0 ? 'No links saved yet' : 'No links match'}</p>
            {canManage && links.length === 0 && (
              <button onClick={() => setShowAdd(true)} className="text-[11px] text-rail-600 hover:text-rail-700 font-medium">+ Add first link</button>
            )}
          </div>
        ) : filtered.map(link => {
          const catCls = CAT_COLORS[link.category] ?? CAT_COLORS['Other'];
          return (
            <div key={link.id} className="flex items-start gap-3 px-4 py-3 hover:bg-slate-50 transition-colors group">
              <div className="w-7 h-7 rounded-lg bg-slate-100 flex items-center justify-center shrink-0 mt-0.5">
                <Link2 size={12} className="text-slate-400"/>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-0.5">
                  <a href={link.url} target="_blank" rel="noreferrer"
                    className="text-[12px] font-semibold text-slate-800 hover:text-rail-600 hover:underline transition-colors flex items-center gap-1">
                    {link.title} <ExternalLink size={9} className="shrink-0"/>
                  </a>
                  <span className={cn('text-[9px] font-semibold px-1.5 py-0.5 rounded-full border', catCls)}>
                    {link.category}
                  </span>
                </div>
                {link.description && <p className="text-[10px] text-slate-400 leading-snug">{link.description}</p>}
                <p className="text-[9px] text-slate-300 mt-0.5">Added by {link.addedBy}</p>
              </div>
              {canManage && (
                <button onClick={() => handleDelete(link.id)}
                  className="opacity-0 group-hover:opacity-100 p-1 rounded-lg hover:bg-red-50 text-slate-300 hover:text-red-500 transition-all shrink-0">
                  <Trash2 size={11}/>
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
