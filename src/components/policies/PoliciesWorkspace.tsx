'use client';
import { useState, useEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FileText, Building2, Layers, ClipboardList, Shield,
  BookOpen, Info, Stamp, Scale, Plus, ChevronDown, ChevronUp,
  Settings2, Trash2, GripVertical, ArrowUp, ArrowDown,
  Edit3, Check, X, Table2, AlignLeft, Link2, StickyNote,
  BarChart3, FileSpreadsheet, CheckSquare, TrendingUp, Search, ExternalLink, Cloud,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/store/authStore';
import {
  POLICY_SUBHEADS, COLUMN_PRESETS, WIDGET_TYPES,
  getPolicyWorkspace, savePolicyWorkspace, loadPolicyWorkspaceFromCloud,
  addSection, updateSection, removeSection, moveSection,
  setSectionLayout, addWidget, updateWidget, removeWidget, addRowToSection,
  type PolicySubHeadWorkspace, type PolicySection,
} from '@/lib/policies/policyWorkspace';

const ICON_MAP: Record<string, React.ElementType> = {
  FileText, Building2, Layers, ClipboardList, Shield,
  BookOpen, Info, Stamp, Scale,
};
const WIDGET_ICONS: Record<string, React.ElementType> = {
  table: Table2, richtext: AlignLeft, links: Link2, notes: StickyNote,
  powerbi: BarChart3, googlesheet: FileSpreadsheet, checklist: CheckSquare, kpi: TrendingUp,
};


// ── Self-contained Links Widget — all data stored in widget.links[] ───────────
// CRITICAL: No shared state. Each widget instance owns its own links array.
// Data stored in policyWorkspace object → localStorage + Upstash per sub-head.
const LINK_CATEGORIES = ['Google Docs', 'Google Sheets', 'Google Drive', 'Google Forms', 'Power BI', 'Railway Portal', 'Circular', 'Other'];
const CAT_COLORS: Record<string, string> = {
  'Google Docs': 'bg-blue-50 text-blue-700 border-blue-200',
  'Google Sheets': 'bg-emerald-50 text-emerald-700 border-emerald-200',
  'Google Drive': 'bg-amber-50 text-amber-700 border-amber-200',
  'Google Forms': 'bg-violet-50 text-violet-700 border-violet-200',
  'Power BI': 'bg-yellow-50 text-yellow-700 border-yellow-200',
  'Railway Portal': 'bg-rail-50 text-rail-700 border-rail-200',
  'Circular': 'bg-cyan-50 text-cyan-700 border-cyan-200',
  'Other': 'bg-slate-50 text-slate-600 border-slate-200',
};

interface PolicyLink { id: string; title: string; url: string; description?: string; category: string; addedBy: string; addedAt: string; }
interface PLWProps { links: PolicyLink[]; onChange: (links: PolicyLink[]) => void; canEdit: boolean; addedBy: string; }

function PolicyLinksWidget({ links, onChange, canEdit, addedBy }: PLWProps) {
  const [showAdd, setShowAdd] = useState(false);
  const [search, setSearch] = useState('');
  const [form, setForm] = useState({ title: '', url: '', description: '', category: 'Google Drive' });

  const handleAdd = () => {
    if (!form.title.trim() || !form.url.trim()) return;
    const newLink: PolicyLink = {
      id: `lnk_${Date.now()}_${Math.random().toString(36).slice(2,6)}`,
      title: form.title.trim(),
      url: form.url.startsWith('http') ? form.url.trim() : `https://${form.url.trim()}`,
      description: form.description.trim() || undefined,
      category: form.category,
      addedBy, addedAt: new Date().toISOString(),
    };
    onChange([...links, newLink]);
    setForm({ title: '', url: '', description: '', category: 'Google Drive' });
    setShowAdd(false);
  };

  const handleDelete = (id: string) => onChange(links.filter(l => l.id !== id));

  const filtered = links.filter(l =>
    !search || l.title.toLowerCase().includes(search.toLowerCase()) ||
    (l.description ?? '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-2">
      {/* Header controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Cloud size={11} className="text-emerald-500"/>
          <span className="text-[10px] text-emerald-600 font-semibold">Stored in workspace · cross-device</span>
        </div>
        {canEdit && (
          <button onClick={() => setShowAdd(s => !s)}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-rail-600 hover:bg-rail-700 text-white text-[11px] font-semibold transition-colors">
            <Plus size={11}/> Add link
          </button>
        )}
      </div>

      {/* Add form */}
      {showAdd && canEdit && (
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 space-y-2">
          <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
            placeholder="Title (e.g. Circular No. 45/2026)"
            className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-rail-400"/>
          <input value={form.url} onChange={e => setForm(f => ({ ...f, url: e.target.value }))}
            placeholder="https://docs.google.com/…" onKeyDown={e => e.key === 'Enter' && handleAdd()}
            className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs font-mono focus:outline-none focus:border-rail-400"/>
          <div className="flex gap-2">
            <input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              placeholder="Description (optional)"
              className="flex-1 bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-rail-400"/>
            <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
              className="bg-white border border-slate-200 rounded-lg px-2.5 py-2 text-xs text-slate-700 focus:outline-none">
              {LINK_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div className="flex justify-end gap-2">
            <button onClick={() => setShowAdd(false)} className="px-3 py-1.5 text-xs text-slate-500 hover:bg-white rounded-lg">Cancel</button>
            <button onClick={handleAdd} disabled={!form.title.trim() || !form.url.trim()}
              className="flex items-center gap-1 px-3 py-1.5 text-xs bg-rail-600 text-white rounded-lg hover:bg-rail-700 disabled:opacity-40 font-semibold">
              <Check size={11}/> Save Link
            </button>
          </div>
        </div>
      )}

      {/* Search */}
      {links.length > 3 && (
        <div className="relative">
          <Search size={11} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400"/>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search links…"
            className="w-full pl-7 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-[11px] focus:outline-none focus:border-rail-400"/>
        </div>
      )}

      {/* Links list */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-6">
          <Link2 size={18} className="text-slate-200"/>
          <p className="text-[11px] text-slate-400">{links.length === 0 ? 'No links saved yet' : 'No links match'}</p>
          {canEdit && links.length === 0 && (
            <button onClick={() => setShowAdd(true)} className="text-[11px] text-rail-600 font-medium">+ Add first link</button>
          )}
        </div>
      ) : (
        <div className="divide-y divide-slate-50">
          {filtered.map(link => {
            const catCls = CAT_COLORS[link.category] ?? CAT_COLORS['Other'];
            return (
              <div key={link.id} className="flex items-start gap-2.5 py-2.5 group">
                <div className="w-6 h-6 rounded-lg bg-slate-100 flex items-center justify-center shrink-0 mt-0.5">
                  <Link2 size={11} className="text-slate-400"/>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <a href={link.url} target="_blank" rel="noreferrer"
                      className="text-[12px] font-semibold text-slate-800 hover:text-rail-600 hover:underline flex items-center gap-1">
                      {link.title}<ExternalLink size={9} className="shrink-0"/>
                    </a>
                    <span className={cn('text-[9px] font-semibold px-1.5 py-0.5 rounded-full border', catCls)}>{link.category}</span>
                  </div>
                  {link.description && <p className="text-[10px] text-slate-400 leading-snug mt-0.5">{link.description}</p>}
                  <p className="text-[9px] text-slate-300 mt-0.5">Added by {link.addedBy}</p>
                </div>
                {canEdit && (
                  <button onClick={() => handleDelete(link.id)}
                    className="opacity-0 group-hover:opacity-100 p-1 rounded-lg hover:bg-red-50 text-slate-300 hover:text-red-500 transition-all shrink-0">
                    <Trash2 size={11}/>
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Portal-based Widget Picker ─────────────────────────────────────────────────
// Renders to document.body — never clipped by parent overflow:hidden
function WidgetPicker({ triggerRef, onAdd, onClose }: {
  triggerRef: React.RefObject<HTMLButtonElement>;
  onAdd: (type: string, title: string) => void;
  onClose: () => void;
}) {
  const [pos, setPos] = useState({ top: 0, left: 0 });
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    if (triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      const pickerH = 320;
      const top = spaceBelow >= pickerH
        ? rect.bottom + 4 + window.scrollY
        : rect.top - pickerH - 4 + window.scrollY;
      const left = Math.min(rect.left + window.scrollX, window.innerWidth - 280);
      setPos({ top, left });
    }
  }, [triggerRef]);

  if (!mounted) return null;

  return createPortal(
    <>
      {/* Backdrop — click outside to close */}
      <div className="fixed inset-0 z-[998]" onClick={onClose}/>
      {/* Picker */}
      <div
        className="fixed z-[999] w-64 bg-white border border-slate-200 rounded-xl shadow-2xl overflow-hidden"
        style={{ top: pos.top, left: pos.left }}
        onClick={e => e.stopPropagation()}
      >
        <div className="px-3 py-2.5 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
          <p className="text-xs font-bold text-slate-700">Add Block</p>
          <button onClick={onClose} className="p-1 rounded text-slate-400 hover:text-slate-600 transition-colors">
            <X size={12}/>
          </button>
        </div>
        <div className="p-2 grid grid-cols-2 gap-1.5 max-h-72 overflow-y-auto">
          {WIDGET_TYPES.map(w => {
            const Icon = WIDGET_ICONS[w.type] ?? FileText;
            return (
              <button key={w.type}
                onClick={() => { onAdd(w.type, w.label); onClose(); }}
                className="flex items-start gap-2 p-2.5 rounded-lg hover:bg-rail-50 border border-transparent hover:border-rail-200 transition-all text-left"
              >
                <Icon size={13} className="text-rail-500 shrink-0 mt-0.5"/>
                <div>
                  <p className="text-xs font-semibold text-slate-800">{w.label}</p>
                  <p className="text-[9px] text-slate-400 leading-tight">{w.description}</p>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </>,
    document.body
  );
}

// ── Add Block Button with Portal Picker ──────────────────────────────────────
function AddBlockButton({ onAdd }: { onAdd: (type: string, title: string) => void }) {
  const [open, setOpen] = useState(false);
  const btnRef = useRef<HTMLButtonElement>(null!);

  return (
    <div className="relative">
      <button ref={btnRef} onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-center gap-1 py-2 rounded-xl border border-dashed border-slate-200 text-slate-300 hover:border-rail-400 hover:text-rail-600 hover:bg-rail-50 transition-all text-xs font-medium">
        <Plus size={11}/> Add block
      </button>
      {open && (
        <WidgetPicker
          triggerRef={btnRef}
          onAdd={onAdd}
          onClose={() => setOpen(false)}
        />
      )}
    </div>
  );
}

// ── Inline widgets ────────────────────────────────────────────────────────────
function RichText({ value, onChange, canEdit }: { value: string; onChange: (v: string) => void; canEdit: boolean }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  if (editing && canEdit) return (
    <div className="space-y-2">
      <textarea value={draft} onChange={e => setDraft(e.target.value)} rows={5} autoFocus
        className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-800 focus:outline-none focus:border-rail-400 resize-y"/>
      <div className="flex gap-2 justify-end">
        <button onClick={() => setEditing(false)} className="px-3 py-1.5 text-xs text-slate-500 hover:bg-slate-100 rounded-lg">Cancel</button>
        <button onClick={() => { onChange(draft); setEditing(false); }} className="px-3 py-1.5 text-xs bg-rail-600 text-white rounded-lg">Save</button>
      </div>
    </div>
  );
  return (
    <div onClick={() => canEdit && setEditing(true)}
      className={cn('min-h-[48px] rounded-lg p-2.5 text-sm text-slate-700 whitespace-pre-wrap leading-relaxed',
        canEdit && 'cursor-text hover:bg-slate-50 transition-colors', !value && 'text-slate-300 italic text-xs')}>
      {value || (canEdit ? 'Click to add text…' : 'Empty')}
    </div>
  );
}

function Checklist({ items, onChange, canEdit }: { items: any[]; onChange: (i: any[]) => void; canEdit: boolean }) {
  const [newText, setNewText] = useState('');
  const add = () => {
    if (!newText.trim()) return;
    onChange([...items, { id: `c${Date.now()}`, text: newText.trim(), done: false }]);
    setNewText('');
  };
  return (
    <div className="space-y-1.5">
      {items.map(item => (
        <div key={item.id} className="flex items-center gap-2 group">
          <button onClick={() => onChange(items.map(i => i.id !== item.id ? i : { ...i, done: !i.done }))}
            className={cn('w-4 h-4 rounded border shrink-0 flex items-center justify-center transition-colors',
              item.done ? 'bg-emerald-500 border-emerald-500' : 'border-slate-300 hover:border-rail-400')}>
            {item.done && <Check size={10} className="text-white"/>}
          </button>
          <span className={cn('flex-1 text-sm', item.done && 'line-through text-slate-400')}>{item.text}</span>
          {canEdit && <button onClick={() => onChange(items.filter(i => i.id !== item.id))} className="opacity-0 group-hover:opacity-100 p-1 text-slate-300 hover:text-red-500"><X size={11}/></button>}
        </div>
      ))}
      {canEdit && (
        <div className="flex gap-2 mt-2">
          <input value={newText} onChange={e => setNewText(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && add()}
            placeholder="Add item…" className="flex-1 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:border-rail-400"/>
          <button onClick={add} disabled={!newText.trim()} className="px-3 py-1.5 text-xs bg-rail-600 text-white rounded-lg disabled:opacity-40">Add</button>
        </div>
      )}
    </div>
  );
}

// ── Policy Widget Card ────────────────────────────────────────────────────────
function PolicyWidget({ widget, sectionId, rowId, colId, ws, canEdit, onCommit, onRemove }: any) {
  const { user } = useAuthStore();
  const [renaming, setRenaming] = useState(false);
  const [draftName, setDraftName] = useState(widget.title);
  const [collapsed, setCollapsed] = useState(false);
  const patch = (p: any) => onCommit(updateWidget(ws, sectionId, rowId, colId, widget.id, p));
  const Icon = WIDGET_ICONS[widget.type] ?? FileText;

  return (
    // NO overflow:hidden here — that was clipping the picker
    <div className="bg-white border border-slate-200 rounded-xl" style={{ boxShadow: '0 1px 3px rgba(15,23,42,0.06)' }}>
      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-slate-100 bg-slate-50 rounded-t-xl">
        <Icon size={12} className="text-slate-400 shrink-0"/>
        {renaming && canEdit
          ? <input value={draftName} onChange={e => setDraftName(e.target.value)} autoFocus
              className="flex-1 text-xs font-semibold bg-white border border-rail-300 rounded px-1.5 py-0.5 focus:outline-none"
              onBlur={() => { patch({ title: draftName }); setRenaming(false); }}
              onKeyDown={e => { if (e.key === 'Enter') { patch({ title: draftName }); setRenaming(false); } if (e.key === 'Escape') setRenaming(false); }}/>
          : <p className="text-xs font-semibold text-slate-700 flex-1 truncate" onDoubleClick={() => canEdit && setRenaming(true)}>{widget.title}</p>
        }
        <div className="flex gap-0.5">
          {canEdit && <button onClick={() => setRenaming(true)} className="p-1 rounded hover:bg-white text-slate-300 hover:text-slate-600"><Edit3 size={10}/></button>}
          {canEdit && <button onClick={onRemove} className="p-1 rounded hover:bg-white text-slate-300 hover:text-red-500"><Trash2 size={10}/></button>}
          <button onClick={() => setCollapsed(c => !c)} className="p-1 rounded hover:bg-white text-slate-300 hover:text-slate-600">
            {collapsed ? <ChevronDown size={11}/> : <ChevronUp size={11}/>}
          </button>
        </div>
      </div>

      {/* Body */}
      {!collapsed && (
        <div className="p-3">
          {widget.type === 'richtext'   && <RichText value={widget.richText ?? ''} onChange={v => patch({ richText: v })} canEdit={canEdit}/>}
          {widget.type === 'notes'      && (
            <textarea value={widget.notes ?? ''} onChange={e => canEdit && patch({ notes: e.target.value })}
              readOnly={!canEdit} rows={3} placeholder={canEdit ? 'Quick notes…' : ''}
              className="w-full bg-amber-50 border border-amber-100 rounded-lg px-3 py-2 text-sm text-slate-700 focus:outline-none resize-y"/>
          )}
          {widget.type === 'checklist' && <Checklist items={widget.checklistItems ?? []} onChange={items => patch({ checklistItems: items })} canEdit={canEdit}/>}
          {widget.type === 'links'     && (
            <PolicyLinksWidget
              links={widget.links ?? []}
              onChange={links => patch({ links })}
              canEdit={canEdit}
              addedBy={user?.name ?? 'Admin'}
            />
          )}
          {widget.type === 'powerbi'   && (
            <div className="space-y-2">
              <input value={widget.powerBiUrl ?? ''} onChange={e => patch({ powerBiUrl: e.target.value })}
                placeholder="Power BI embed URL" className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-amber-400"/>
              {widget.powerBiUrl && (
                <iframe src={widget.powerBiUrl} className="w-full rounded-lg border" style={{ height: 280 }}
                  allowFullScreen sandbox="allow-scripts allow-same-origin allow-popups allow-forms allow-presentation"/>
              )}
            </div>
          )}
          {widget.type === 'googlesheet' && (
            <div className="space-y-2">
              <input value={widget.sheetUrl ?? ''} onChange={e => patch({ sheetUrl: e.target.value })}
                placeholder="Google Sheet CSV URL" className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-emerald-400"/>
              {widget.sheetUrl && <p className="text-[10px] text-emerald-600 font-medium flex items-center gap-1"><Check size={10}/> Sheet linked</p>}
            </div>
          )}
          {widget.type === 'kpi' && (
            <div className="text-center py-3"><p className="text-2xl font-bold text-rail-600">—</p><p className="text-xs text-slate-400 mt-0.5">KPI value</p></div>
          )}
          {widget.type === 'table' && (
            <p className="text-xs text-slate-400 italic py-3 text-center">Link to a Cell workspace table above</p>
          )}
        </div>
      )}
    </div>
  );
}

// ── Section Block ─────────────────────────────────────────────────────────────
function SectionBlock({ section, idx, total, ws, canEdit, onCommit }: any) {
  const [collapsed, setCollapsed]   = useState(section.collapsed ?? false);
  const [renaming, setRenaming]     = useState(false);
  const [draft, setDraft]           = useState(section.title);
  const [isEditing, setIsEditing]   = useState(false);

  const commit = onCommit;

  const saveTitle = () => {
    commit(updateSection(ws, section.id, { title: draft }));
    setRenaming(false);
  };

  return (
    // NO overflow:hidden — allows picker portal to render correctly
    <div className="bg-white border border-slate-200 rounded-xl" style={{ boxShadow: '0 1px 3px rgba(15,23,42,0.06)' }}>
      {/* Section header */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-slate-100 bg-slate-50 rounded-t-xl group">
        {canEdit && <GripVertical size={13} className="text-slate-300 shrink-0 cursor-grab"/>}
        <button className="shrink-0 p-0.5" onClick={() => {
          const c = !collapsed;
          setCollapsed(c);
          commit(updateSection(ws, section.id, { collapsed: c }));
        }}>
          {collapsed ? <ChevronDown size={14} className="text-slate-400"/> : <ChevronUp size={14} className="text-slate-400"/>}
        </button>

        {renaming && canEdit ? (
          <input value={draft} onChange={e => setDraft(e.target.value)} autoFocus
            className="flex-1 text-sm font-bold bg-white border border-rail-300 rounded-lg px-2 py-1 focus:outline-none"
            onBlur={saveTitle}
            onKeyDown={e => { if (e.key === 'Enter') saveTitle(); if (e.key === 'Escape') { setDraft(section.title); setRenaming(false); }}}/>
        ) : (
          <span className="flex-1 text-sm font-bold text-slate-800">{section.title}</span>
        )}

        {canEdit && (
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <button onClick={() => setRenaming(true)} title="Rename" className="p-1.5 rounded-lg hover:bg-white text-slate-400 hover:text-slate-700"><Edit3 size={12}/></button>
            <button onClick={() => setIsEditing(e => !e)} title="Layout"
              className={cn('p-1.5 rounded-lg text-slate-400', isEditing ? 'bg-rail-100 text-rail-600' : 'hover:bg-white hover:text-slate-700')}>
              <Settings2 size={12}/>
            </button>
            <button onClick={() => commit(moveSection(ws, section.id, 'up'))} disabled={idx === 0} className="p-1.5 rounded-lg hover:bg-white text-slate-400 hover:text-slate-700 disabled:opacity-20"><ArrowUp size={12}/></button>
            <button onClick={() => commit(moveSection(ws, section.id, 'down'))} disabled={idx === total - 1} className="p-1.5 rounded-lg hover:bg-white text-slate-400 hover:text-slate-700 disabled:opacity-20"><ArrowDown size={12}/></button>
            <button onClick={() => { if (confirm(`Delete "${section.title}"?`)) commit(removeSection(ws, section.id)); }}
              className="p-1.5 rounded-lg hover:bg-white text-slate-300 hover:text-red-500"><Trash2 size={12}/></button>
          </div>
        )}
      </div>

      {/* Layout toolbar — shown only in edit mode */}
      {isEditing && !collapsed && canEdit && (
        <div className="px-4 py-3 border-b border-slate-100 bg-blue-50/30">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider shrink-0">LAYOUT:</p>
            {COLUMN_PRESETS.map(p => (
              <button key={p.label}
                onClick={() => commit(setSectionLayout(ws, section.id, p.widths))}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white hover:border-rail-300 hover:bg-rail-50 text-xs text-slate-600 font-medium transition-all">
                <div className="flex gap-0.5 h-3">
                  {p.widths.map((w, i) => <div key={i} className="bg-rail-400 rounded-sm" style={{ flex: w }}/>)}
                </div>
                {p.label}
              </button>
            ))}
            <button onClick={() => commit(addRowToSection(ws, section.id))}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-dashed border-slate-300 text-xs text-slate-400 hover:border-rail-400 hover:text-rail-600 transition-all">
              <Plus size={10}/> Row
            </button>
          </div>
        </div>
      )}

      {/* Rows and columns — only when not collapsed */}
      {!collapsed && (
        <div className="p-4 space-y-3">
          {section.rows.map((row: any) => (
            <div key={row.id} className="flex gap-3">
              {row.columns.map((col: any) => (
                <div key={col.id} className="flex flex-col gap-2 min-w-0" style={{ width: `${col.widthPercent}%` }}>
                  {/* Widgets */}
                  {col.widgets.map((widget: any) => (
                    <PolicyWidget
                      key={widget.id}
                      widget={widget} sectionId={section.id} rowId={row.id} colId={col.id}
                      ws={ws} canEdit={canEdit} onCommit={commit}
                      onRemove={() => commit(removeWidget(ws, section.id, row.id, col.id, widget.id))}
                    />
                  ))}

                  {/* Add block — uses portal, not affected by overflow */}
                  {canEdit && (
                    <AddBlockButton
                      onAdd={(type, title) => commit(addWidget(ws, section.id, row.id, col.id, type as any, title))}
                    />
                  )}
                </div>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Main PoliciesWorkspace ────────────────────────────────────────────────────
export function PoliciesWorkspace() {
  const { user } = useAuthStore();
  const canEdit = user?.role === 'maintenance' || user?.role === 'admin' || user?.role === 'incharge';

  const [activeSubHead, setActiveSubHead] = useState('commercial-circulars');
  const [ws, setWs]     = useState<PolicySubHeadWorkspace | null>(null);
  const [search, setSearch] = useState('');
  const [adding, setAdding] = useState(false);
  const [newTitle, setNewTitle] = useState('');

  useEffect(() => {
    // Step 1: Show localStorage data immediately (instant, no flash)
    const local = getPolicyWorkspace(activeSubHead);
    setWs(local);

    // Step 2: Load from Upstash directly (cross-device sync)
    // This runs every time subHead changes OR user changes
    // Does not depend on useAppSync event timing
    if (user?.id) {
      loadPolicyWorkspaceFromCloud(activeSubHead, user.id).then(cloud => {
        if (!cloud) return;
        // Apply if cloud is newer (or local has no data)
        const cloudTime = cloud.updatedAt ?? '';
        const localTime = local.updatedAt ?? '';
        if (!local || !local.updatedAt || cloudTime > localTime) {
          setWs(cloud);
        }
      });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeSubHead, user?.id]);

  // Also update when bulk useAppSync completes (belt-and-suspenders)
  useEffect(() => {
    const handler = () => {
      const fresh = getPolicyWorkspace(activeSubHead);
      setWs(fresh);
    };
    window.addEventListener('rly_cloud_sync_complete', handler);
    return () => window.removeEventListener('rly_cloud_sync_complete', handler);
  }, [activeSubHead]);

  const commit = useCallback((next: PolicySubHeadWorkspace) => {
    setWs(next);
    savePolicyWorkspace(next, user?.id);
  }, [user?.id]);

  const handleAdd = () => {
    if (!newTitle.trim() || !ws) return;
    commit(addSection(ws, newTitle.trim()));
    setNewTitle(''); setAdding(false);
  };

  const sections = (ws?.sections ?? [])
    .filter(s => !search || s.title.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => a.order - b.order);

  const meta = POLICY_SUBHEADS.find(s => s.id === activeSubHead);
  const Icon = meta ? (ICON_MAP[meta.icon] ?? FileText) : FileText;

  return (
    <div className="flex gap-4 min-h-0">
      {/* ── Left sidebar ─────────────────────────────────────────────────── */}
      <aside className="w-52 shrink-0 bg-white border border-slate-200 rounded-xl self-start sticky top-0"
        style={{ boxShadow: '0 1px 3px rgba(15,23,42,0.06)' }}>
        <div className="px-4 py-3 border-b border-slate-100 bg-slate-50 rounded-t-xl">
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Sub-Heads</p>
        </div>
        <nav className="p-2 space-y-0.5">
          {POLICY_SUBHEADS.map(sub => {
            const I = ICON_MAP[sub.icon] ?? FileText;
            return (
              <button key={sub.id} onClick={() => { setActiveSubHead(sub.id); setSearch(''); }}
                className={cn('w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-all text-left',
                  activeSubHead === sub.id
                    ? 'bg-rail-50 text-rail-700 font-semibold border border-rail-200'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900')}>
                <I size={13} className={activeSubHead === sub.id ? 'text-rail-500' : 'text-slate-400'}/>
                <span className="truncate">{sub.label}</span>
              </button>
            );
          })}
        </nav>
      </aside>

      {/* ── Main content ─────────────────────────────────────────────────── */}
      <div className="flex-1 min-w-0 space-y-3">
        {/* Header */}
        <div className="bg-white border border-slate-200 rounded-xl px-5 py-3.5 flex items-center justify-between gap-4"
          style={{ boxShadow: '0 1px 3px rgba(15,23,42,0.06)' }}>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-rail-50 border border-rail-100 flex items-center justify-center">
              <Icon size={15} className="text-rail-600"/>
            </div>
            <div>
              <p className="text-sm font-bold text-slate-900">{meta?.label}</p>
              <p className="text-[10px] text-slate-400">{sections.length} section{sections.length !== 1 ? 's' : ''}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400"/>
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search sections…"
                className="pl-7 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700 focus:outline-none focus:border-rail-400 w-40"/>
            </div>
            {canEdit && (
              <button onClick={() => setAdding(true)}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-rail-600 hover:bg-rail-700 text-white text-xs font-semibold shadow-sm transition-all">
                <Plus size={13}/> Add Section
              </button>
            )}
          </div>
        </div>

        {/* Add section form */}
        {adding && canEdit && (
          <div className="bg-white border border-rail-200 rounded-xl px-5 py-4 flex gap-3"
            style={{ boxShadow: '0 1px 3px rgba(37,99,235,0.1)' }}>
            <input value={newTitle} onChange={e => setNewTitle(e.target.value)} autoFocus
              onKeyDown={e => { if (e.key === 'Enter') handleAdd(); if (e.key === 'Escape') { setAdding(false); setNewTitle(''); }}}
              placeholder="Section name e.g. UTS Circulars, Ticket Checking SOPs"
              className="flex-1 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-800 focus:outline-none focus:border-rail-400"/>
            <button onClick={handleAdd} disabled={!newTitle.trim()}
              className="flex items-center gap-1.5 px-4 py-2 text-sm bg-rail-600 text-white rounded-lg hover:bg-rail-700 disabled:opacity-40 font-semibold">
              <Check size={14}/> Create
            </button>
            <button onClick={() => { setAdding(false); setNewTitle(''); }}
              className="p-2 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors">
              <X size={14}/>
            </button>
          </div>
        )}

        {/* Section list */}
        {!ws ? (
          <div className="flex justify-center py-12">
            <div className="w-6 h-6 border-2 border-rail-300 border-t-rail-600 rounded-full animate-spin"/>
          </div>
        ) : sections.length === 0 ? (
          <div className="bg-white border-2 border-dashed border-slate-200 rounded-xl py-16 flex flex-col items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center">
              <Icon size={22} className="text-slate-300"/>
            </div>
            <div className="text-center">
              <p className="text-sm font-bold text-slate-500">{search ? 'No sections match your search' : `${meta?.label} is empty`}</p>
              <p className="text-xs text-slate-400 mt-1">{search ? 'Try a different keyword' : 'Create your first section to get started'}</p>
            </div>
            {!search && canEdit && (
              <button onClick={() => setAdding(true)}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-rail-600 hover:bg-rail-700 text-white text-sm font-semibold">
                <Plus size={15}/> Add First Section
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {sections.map((s, i) => (
              <SectionBlock key={s.id} section={s} idx={i} total={sections.length}
                ws={ws} canEdit={canEdit} onCommit={commit}/>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
