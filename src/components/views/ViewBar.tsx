'use client';
/**
 * ViewBar — Notion-style view tabs with rename/create/delete/duplicate (req 105, 109, 110, 115)
 */
import { useState, useRef, useEffect } from 'react';
import {
  Plus, ChevronDown, Edit3, Copy, Trash2, Star, Check, X,
  Table2, LayoutGrid, List, Columns, Image as ImageIcon,
  RefreshCw, Clock, Settings2, Filter,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ViewStore, View, ViewLayout } from '@/lib/views/viewEngine';
import { LAYOUT_OPTIONS } from '@/lib/views/viewEngine';

const LAYOUT_ICONS: Record<ViewLayout, React.ElementType> = {
  table: Table2, card: LayoutGrid, list: List, board: Columns, gallery: ImageIcon,
};

interface ViewBarProps {
  store: ViewStore;
  canEdit: boolean;
  userId: string;
  sheetRows: number;
  fetchedAt: string | null;
  loading: boolean;
  onSetActive: (id: string) => void;
  onCreate: (label: string, layout: ViewLayout, templateId?: string) => void;
  onRename: (id: string, label: string) => void;
  onDuplicate: (id: string) => void;
  onDelete: (id: string) => void;
  onSetDefault: (id: string) => void;
  onRefetch: () => void;
  onSyncIntervalChange: (minutes: number) => void;
  syncInterval: number;
}

function timeAgo(iso: string | null) {
  if (!iso) return '—';
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 10) return 'just now';
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  return `${Math.floor(m / 60)}h ago`;
}

function ViewMenu({ view, onRename, onDuplicate, onDelete, onSetDefault, onClose }: {
  view: View; onRename: () => void; onDuplicate: () => void;
  onDelete: () => void; onSetDefault: () => void; onClose: () => void;
}) {
  return (
    <div className="absolute top-full left-0 mt-1 z-[200] w-44 bg-white border border-slate-200 rounded-xl shadow-lg overflow-hidden"
      onClick={e => e.stopPropagation()}>
      <button onClick={() => { onRename(); onClose(); }}
        className="flex items-center gap-2.5 px-3 py-2 text-xs text-slate-700 hover:bg-slate-50 w-full">
        <Edit3 size={11} className="text-slate-400"/> Rename
      </button>
      <button onClick={() => { onDuplicate(); onClose(); }}
        className="flex items-center gap-2.5 px-3 py-2 text-xs text-slate-700 hover:bg-slate-50 w-full">
        <Copy size={11} className="text-slate-400"/> Duplicate
      </button>
      <button onClick={() => { onSetDefault(); onClose(); }}
        className="flex items-center gap-2.5 px-3 py-2 text-xs text-slate-700 hover:bg-slate-50 w-full">
        <Star size={11} className="text-slate-400"/> Set as default
      </button>
      <div className="border-t border-slate-100"/>
      <button onClick={() => { onDelete(); onClose(); }}
        className="flex items-center gap-2.5 px-3 py-2 text-xs text-red-600 hover:bg-red-50 w-full">
        <Trash2 size={11}/> Delete view
      </button>
    </div>
  );
}

function NewViewPanel({ store, onCreate, onClose }: {
  store: ViewStore; onCreate: (label: string, layout: ViewLayout, tpl?: string) => void; onClose: () => void;
}) {
  const [label, setLabel] = useState('New View');
  const [layout, setLayout] = useState<ViewLayout>('table');
  const [template, setTemplate] = useState('');
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => { ref.current?.focus(); ref.current?.select(); }, []);

  return (
    <div className="absolute top-full right-0 mt-1 z-[200] w-64 bg-white border border-slate-200 rounded-xl shadow-lg overflow-hidden p-4 space-y-3"
      onClick={e => e.stopPropagation()}>
      <div>
        <p className="text-xs font-semibold text-slate-700 mb-1.5">View name</p>
        <input ref={ref} value={label} onChange={e => setLabel(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && label.trim()) { onCreate(label.trim(), layout, template || undefined); onClose(); }}}
          className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 focus:outline-none focus:border-rail-400"/>
      </div>
      <div>
        <p className="text-xs font-semibold text-slate-700 mb-1.5">Layout</p>
        <div className="grid grid-cols-3 gap-1.5">
          {LAYOUT_OPTIONS.map(opt => {
            const Icon = LAYOUT_ICONS[opt.id];
            return (
              <button key={opt.id} onClick={() => setLayout(opt.id)}
                className={cn('flex flex-col items-center gap-1 p-2 rounded-lg border text-[10px] font-medium transition-all',
                  layout === opt.id
                    ? 'bg-rail-50 border-rail-300 text-rail-700'
                    : 'border-slate-200 text-slate-500 hover:bg-slate-50')}>
                <Icon size={14}/>
                {opt.label}
              </button>
            );
          })}
        </div>
      </div>
      {store.views.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-slate-700 mb-1.5">Start from (optional)</p>
          <select value={template} onChange={e => setTemplate(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-700 focus:outline-none focus:border-rail-400">
            <option value="">Blank view</option>
            {store.views.map(v => <option key={v.id} value={v.id}>{v.label}</option>)}
          </select>
        </div>
      )}
      <div className="flex gap-2 justify-end">
        <button onClick={onClose} className="px-3 py-1.5 text-xs text-slate-500 hover:bg-slate-100 rounded-lg">Cancel</button>
        <button onClick={() => { if (label.trim()) { onCreate(label.trim(), layout, template || undefined); onClose(); }}}
          disabled={!label.trim()}
          className="px-3 py-1.5 text-xs bg-rail-600 text-white rounded-lg hover:bg-rail-700 disabled:opacity-40">
          Create View
        </button>
      </div>
    </div>
  );
}

export function ViewBar({
  store, canEdit, userId, sheetRows, fetchedAt, loading,
  onSetActive, onCreate, onRename, onDuplicate, onDelete, onSetDefault, onRefetch,
  onSyncIntervalChange, syncInterval,
}: ViewBarProps) {
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [showNew, setShowNew] = useState(false);
  const [renaming, setRenaming] = useState<string | null>(null);
  const [draftName, setDraftName] = useState('');
  const [showSyncSettings, setShowSyncSettings] = useState(false);

  const activeView = store.views.find(v => v.id === store.activeViewId);

  const SYNC_OPTIONS = [5, 15, 30, 60];

  return (
    <div className="bg-white border border-slate-200 rounded-xl overflow-visible" style={{ boxShadow: '0 1px 3px rgba(15,23,42,0.06)' }}>
      {/* Tab bar */}
      <div className="flex items-center gap-0 border-b border-slate-100 overflow-x-auto scrollbar-none px-2">
        {store.views.map(view => {
          const Icon = LAYOUT_ICONS[view.layout];
          const isActive = view.id === store.activeViewId;
          return (
            <div key={view.id} className="relative flex-shrink-0">
              {renaming === view.id ? (
                <div className="flex items-center gap-1.5 px-3 py-2.5">
                  <Icon size={12} className="text-rail-500 shrink-0"/>
                  <input value={draftName} onChange={e => setDraftName(e.target.value)} autoFocus
                    className="text-xs font-medium bg-white border border-rail-300 rounded px-1.5 py-0.5 focus:outline-none w-32"
                    onBlur={() => { if (draftName.trim()) onRename(view.id, draftName.trim()); setRenaming(null); }}
                    onKeyDown={e => {
                      if (e.key === 'Enter') { if (draftName.trim()) onRename(view.id, draftName.trim()); setRenaming(null); }
                      if (e.key === 'Escape') setRenaming(null);
                    }}/>
                  <button onClick={() => setRenaming(null)} className="p-0.5 text-slate-400 hover:text-slate-600"><X size={10}/></button>
                </div>
              ) : (
                <button
                  onClick={() => onSetActive(view.id)}
                  onDoubleClick={() => { setDraftName(view.label); setRenaming(view.id); }}
                  className={cn(
                    'flex items-center gap-1.5 px-3 py-2.5 text-xs font-medium transition-all border-b-2 whitespace-nowrap',
                    isActive
                      ? 'text-rail-600 border-b-rail-600 border-rail-600'
                      : 'text-slate-500 border-transparent hover:text-slate-700 hover:bg-slate-50',
                  )}>
                  <Icon size={12} className={isActive ? 'text-rail-500' : 'text-slate-400'}/>
                  {view.label}
                  {view.isDefault && <Star size={9} className="text-amber-400 fill-amber-400"/>}
                  {canEdit && isActive && (
                    <span onClick={e => { e.stopPropagation(); setOpenMenu(m => m === view.id ? null : view.id); }}
                      className="ml-0.5 p-0.5 rounded hover:bg-slate-100 text-slate-300 hover:text-slate-500 transition-colors">
                      <ChevronDown size={10}/>
                    </span>
                  )}
                </button>
              )}
              {openMenu === view.id && canEdit && (
                <ViewMenu view={view}
                  onRename={() => { setDraftName(view.label); setRenaming(view.id); }}
                  onDuplicate={() => onDuplicate(view.id)}
                  onDelete={() => onDelete(view.id)}
                  onSetDefault={() => onSetDefault(view.id)}
                  onClose={() => setOpenMenu(null)}/>
              )}
            </div>
          );
        })}

        {/* New view button */}
        {canEdit && (
          <div className="relative ml-1 flex-shrink-0">
            <button onClick={() => setShowNew(s => !s)}
              className="flex items-center gap-1 px-2.5 py-2.5 text-[11px] font-medium text-slate-400 hover:text-rail-600 hover:bg-slate-50 transition-colors rounded-lg">
              <Plus size={12}/> Add view
            </button>
            {showNew && (
              <NewViewPanel store={store} onCreate={onCreate} onClose={() => setShowNew(false)}/>
            )}
          </div>
        )}
      </div>

      {/* Sync status bar */}
      <div className="flex items-center justify-between px-4 py-2">
        <div className="flex items-center gap-2 text-[10px] text-slate-400">
          <span className={cn('w-1.5 h-1.5 rounded-full', sheetRows > 0 ? 'bg-emerald-500' : 'bg-slate-300')}/>
          {sheetRows > 0 ? (
            <span>{sheetRows.toLocaleString()} rows · synced {timeAgo(fetchedAt)}</span>
          ) : (
            <span>No data connected</span>
          )}
        </div>
        <div className="flex items-center gap-1.5">
          {/* Sync interval picker */}
          <div className="relative">
            <button onClick={() => setShowSyncSettings(s => !s)}
              className="flex items-center gap-1 text-[10px] text-slate-400 hover:text-slate-600 px-2 py-1 rounded-lg hover:bg-slate-100 transition-colors">
              <Clock size={11}/> Every {syncInterval}m
            </button>
            {showSyncSettings && (
              <div className="absolute right-0 top-full mt-1 z-50 bg-white border border-slate-200 rounded-xl shadow-lg p-2 w-36"
                onClick={e => e.stopPropagation()}>
                <p className="text-[10px] font-semibold text-slate-500 px-2 py-1">Sync every</p>
                {SYNC_OPTIONS.map(m => (
                  <button key={m} onClick={() => { onSyncIntervalChange(m); setShowSyncSettings(false); }}
                    className={cn('flex items-center justify-between w-full px-2 py-1.5 text-xs rounded-lg transition-colors',
                      syncInterval === m ? 'bg-rail-50 text-rail-700 font-semibold' : 'text-slate-600 hover:bg-slate-50')}>
                    {m} minutes {syncInterval === m && <Check size={11}/>}
                  </button>
                ))}
              </div>
            )}
          </div>
          <button onClick={onRefetch} disabled={loading}
            className="flex items-center gap-1 text-[10px] text-slate-400 hover:text-slate-600 px-2 py-1 rounded-lg hover:bg-slate-100 transition-colors disabled:opacity-40">
            <RefreshCw size={11} className={loading ? 'animate-spin' : ''}/> Sync now
          </button>
        </div>
      </div>
    </div>
  );
}
