'use client';
import { useState, useEffect, useCallback } from 'react';
import {
  BookOpen, Plus, Search, Tag, FileText, Clock, Eye, ChevronRight,
  X, Save, Archive, CheckCircle, AlertCircle, Trash2, Edit3,
  Filter, SortDesc, ExternalLink, History, Download,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  getKBStore, saveKBStore, createDocument, updateDocument, deleteDocument,
  searchDocuments, incrementViewCount,
  CATEGORY_LABELS, CATEGORY_COLORS, STATUS_COLORS,
  type KBDocument, type DocCategory, type DocStatus, type KBStore,
} from '@/lib/knowledge/knowledgeEngine';

const CATEGORIES: DocCategory[] = ['policy', 'circular', 'sop', 'faq', 'template', 'training', 'notification'];

// ── Document Viewer ───────────────────────────────────────────────────────────
function DocViewer({
  doc, canManage, store, onSave, onClose, onDelete, userId, userName,
}: {
  doc: KBDocument;
  canManage: boolean;
  store: KBStore;
  onSave: (store: KBStore) => void;
  onClose: () => void;
  onDelete: () => void;
  userId: string;
  userName: string;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState({ title: doc.title, content: doc.content, summary: doc.summary ?? '', tags: doc.tags.join(', '), status: doc.status });
  const [changeNote, setChangeNote] = useState('');
  const [showHistory, setShowHistory] = useState(false);

  const save = () => {
    const updated = updateDocument(
      store, doc.id,
      { title: draft.title, content: draft.content, summary: draft.summary, tags: draft.tags.split(',').map(t => t.trim()).filter(Boolean), status: draft.status as DocStatus },
      userId, userName, changeNote || 'Updated'
    );
    onSave(updated);
    setEditing(false);
    setChangeNote('');
  };

  const lines = (doc.content || '').split('\n');

  return (
    <div className="fixed inset-0 z-[2100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[88vh]" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-start gap-3 px-5 py-4 border-b border-slate-100">
          <div className="flex-1 min-w-0">
            {editing ? (
              <input
                value={draft.title}
                onChange={e => setDraft(d => ({ ...d, title: e.target.value }))}
                className="w-full text-sm font-bold text-slate-900 border-b-2 border-rail-400 focus:outline-none pb-0.5 mb-1"
              />
            ) : (
              <h2 className="text-sm font-bold text-slate-900 truncate">{doc.title}</h2>
            )}
            <div className="flex items-center gap-2 mt-1.5 flex-wrap">
              <span className={cn('text-[9px] font-bold px-2 py-0.5 rounded-full border', CATEGORY_COLORS[doc.category])}>
                {CATEGORY_LABELS[doc.category]}
              </span>
              {editing ? (
                <select value={draft.status} onChange={e => setDraft(d => ({ ...d, status: e.target.value as DocStatus }))}
                  className="text-[9px] border border-slate-200 rounded-full px-2 py-0.5 focus:outline-none">
                  {(['draft','active','archived','pending_approval'] as DocStatus[]).map(s => (
                    <option key={s} value={s}>{s.replace('_', ' ')}</option>
                  ))}
                </select>
              ) : (
                <span className={cn('text-[9px] font-semibold px-2 py-0.5 rounded-full', STATUS_COLORS[doc.status])}>
                  {doc.status.replace('_', ' ')}
                </span>
              )}
              {doc.refNumber && <span className="text-[9px] text-slate-400">Ref: {doc.refNumber}</span>}
              <span className="text-[9px] text-slate-300">v{doc.version}</span>
              <span className="text-[9px] text-slate-300 flex items-center gap-0.5"><Eye size={8}/> {doc.viewCount}</span>
            </div>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            {canManage && !editing && (
              <>
                <button onClick={() => setShowHistory(!showHistory)} title="History"
                  className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400">
                  <History size={13}/>
                </button>
                <button onClick={() => setEditing(true)}
                  className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400">
                  <Edit3 size={13}/>
                </button>
                <button onClick={onDelete} className="p-1.5 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-500">
                  <Trash2 size={13}/>
                </button>
              </>
            )}
            {editing && (
              <>
                <input
                  value={changeNote}
                  onChange={e => setChangeNote(e.target.value)}
                  placeholder="Change note…"
                  className="text-xs border border-slate-200 rounded-lg px-2 py-1 focus:outline-none w-36"
                />
                <button onClick={save} className="px-3 py-1.5 bg-rail-600 text-white text-xs font-bold rounded-lg hover:bg-rail-700">
                  Save
                </button>
                <button onClick={() => setEditing(false)} className="px-3 py-1.5 bg-slate-100 text-slate-600 text-xs font-bold rounded-lg hover:bg-slate-200">
                  Cancel
                </button>
              </>
            )}
            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400"><X size={14}/></button>
          </div>
        </div>

        {/* Meta */}
        <div className="flex gap-4 px-5 py-2 bg-slate-50 border-b border-slate-100 flex-wrap text-[10px] text-slate-500">
          {doc.issuedBy && <span>Issued by: <strong>{doc.issuedBy}</strong></span>}
          {doc.issuedDate && <span>Issued: <strong>{doc.issuedDate}</strong></span>}
          {doc.effectiveDate && <span>Effective: <strong>{doc.effectiveDate}</strong></span>}
          {doc.expiryDate && <span>Expires: <strong className="text-amber-600">{doc.expiryDate}</strong></span>}
          <span>Owner: <strong>{doc.ownerName}</strong></span>
          <span>Updated: <strong>{new Date(doc.updatedAt).toLocaleDateString()}</strong></span>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5">
          {showHistory && doc.versions.length > 0 && (
            <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-xl">
              <p className="text-[10px] font-bold text-amber-700 mb-2">Version History</p>
              {doc.versions.map(v => (
                <div key={v.version} className="flex items-center gap-2 text-[10px] text-slate-600 py-1 border-b border-amber-100 last:border-0">
                  <span className="font-bold text-slate-700">v{v.version}</span>
                  <span>{v.changeNote}</span>
                  <span className="text-slate-400">by {v.changedByName}</span>
                  <span className="text-slate-400 ml-auto">{new Date(v.changedAt).toLocaleDateString()}</span>
                </div>
              ))}
            </div>
          )}

          {editing ? (
            <div className="space-y-3">
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">Summary</label>
                <input value={draft.summary} onChange={e => setDraft(d => ({ ...d, summary: e.target.value }))}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-rail-400"/>
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">Content</label>
                <textarea value={draft.content} onChange={e => setDraft(d => ({ ...d, content: e.target.value }))}
                  rows={14}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono focus:outline-none focus:border-rail-400 resize-none"/>
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">Tags (comma-separated)</label>
                <input value={draft.tags} onChange={e => setDraft(d => ({ ...d, tags: e.target.value }))}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-rail-400"/>
              </div>
            </div>
          ) : (
            <div className="prose prose-sm max-w-none">
              {doc.summary && (
                <div className="bg-rail-50 border border-rail-100 rounded-xl p-3 mb-4 text-xs text-rail-800 font-medium">
                  {doc.summary}
                </div>
              )}
              <div className="text-xs text-slate-700 leading-relaxed whitespace-pre-wrap font-mono bg-slate-50 rounded-xl p-4 border border-slate-100">
                {doc.content || <span className="text-slate-400 italic">No content</span>}
              </div>
            </div>
          )}
        </div>

        {/* Tags footer */}
        {doc.tags.length > 0 && !editing && (
          <div className="flex gap-1.5 flex-wrap px-5 py-3 border-t border-slate-100">
            <Tag size={10} className="text-slate-300 mt-0.5"/>
            {doc.tags.map(tag => (
              <span key={tag} className="text-[9px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full">{tag}</span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Add Document Form ─────────────────────────────────────────────────────────
function AddDocForm({ store, onSave, onClose, userId, userName }: {
  store: KBStore; onSave: (s: KBStore) => void; onClose: () => void;
  userId: string; userName: string;
}) {
  const [form, setForm] = useState({
    title: '', category: 'policy' as DocCategory, status: 'draft' as DocStatus,
    content: '', summary: '', tags: '', refNumber: '', issuedBy: '', issuedDate: '', effectiveDate: '', expiryDate: '',
  });

  const submit = () => {
    if (!form.title.trim()) return;
    const updated = createDocument(store, {
      title: form.title, category: form.category, status: form.status,
      content: form.content, summary: form.summary,
      tags: form.tags.split(',').map(t => t.trim()).filter(Boolean),
      refNumber: form.refNumber || undefined, issuedBy: form.issuedBy || undefined,
      issuedDate: form.issuedDate || undefined, effectiveDate: form.effectiveDate || undefined,
      expiryDate: form.expiryDate || undefined,
    }, userId, userName);
    onSave(updated);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[2100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white rounded-2xl w-full max-w-xl shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <p className="text-sm font-bold text-slate-900">Add Document</p>
          <button onClick={onClose} className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400"><X size={14}/></button>
        </div>
        <div className="p-5 space-y-3 max-h-[65vh] overflow-y-auto">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="label">Title *</label>
              <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                className="input" placeholder="Document title"/>
            </div>
            <div>
              <label className="label">Category</label>
              <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value as DocCategory }))} className="input">
                {CATEGORIES.map(c => <option key={c} value={c}>{CATEGORY_LABELS[c]}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Status</label>
              <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value as DocStatus }))} className="input">
                {(['draft','active','pending_approval'] as DocStatus[]).map(s => <option key={s} value={s}>{s.replace('_',' ')}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Ref No.</label>
              <input value={form.refNumber} onChange={e => setForm(f => ({ ...f, refNumber: e.target.value }))} className="input" placeholder="e.g. Cir/2024/01"/>
            </div>
            <div>
              <label className="label">Issued By</label>
              <input value={form.issuedBy} onChange={e => setForm(f => ({ ...f, issuedBy: e.target.value }))} className="input" placeholder="Issuing authority"/>
            </div>
            <div>
              <label className="label">Issue Date</label>
              <input type="date" value={form.issuedDate} onChange={e => setForm(f => ({ ...f, issuedDate: e.target.value }))} className="input"/>
            </div>
            <div>
              <label className="label">Effective Date</label>
              <input type="date" value={form.effectiveDate} onChange={e => setForm(f => ({ ...f, effectiveDate: e.target.value }))} className="input"/>
            </div>
            <div className="col-span-2">
              <label className="label">Summary</label>
              <input value={form.summary} onChange={e => setForm(f => ({ ...f, summary: e.target.value }))} className="input" placeholder="Brief summary"/>
            </div>
            <div className="col-span-2">
              <label className="label">Content</label>
              <textarea value={form.content} onChange={e => setForm(f => ({ ...f, content: e.target.value }))}
                rows={6} className="input resize-none font-mono text-[11px]" placeholder="Full document content…"/>
            </div>
            <div className="col-span-2">
              <label className="label">Tags (comma-separated)</label>
              <input value={form.tags} onChange={e => setForm(f => ({ ...f, tags: e.target.value }))} className="input" placeholder="railway, ticket, policy"/>
            </div>
          </div>
        </div>
        <div className="flex gap-2 px-5 py-4 border-t border-slate-100 bg-slate-50">
          <button onClick={onClose} className="px-4 py-2 text-xs text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50">Cancel</button>
          <button onClick={submit} className="ml-auto px-5 py-2 bg-rail-600 text-white text-xs font-bold rounded-lg hover:bg-rail-700">Add Document</button>
        </div>
      </div>
    </div>
  );
}

// ── Document Card ─────────────────────────────────────────────────────────────
function DocCard({ doc, onClick }: { doc: KBDocument; onClick: () => void }) {
  return (
    <div
      onClick={onClick}
      className="flex items-start gap-3 p-3 bg-white border border-slate-200 rounded-xl hover:shadow-md hover:border-rail-200 transition-all cursor-pointer group"
    >
      <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center shrink-0 text-[10px] font-black border', CATEGORY_COLORS[doc.category])}>
        {CATEGORY_LABELS[doc.category].slice(0, 3).toUpperCase()}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-bold text-slate-800 truncate group-hover:text-rail-700 transition-colors">{doc.title}</p>
        {doc.summary && <p className="text-[10px] text-slate-400 truncate mt-0.5">{doc.summary}</p>}
        <div className="flex items-center gap-2 mt-1.5 flex-wrap">
          <span className={cn('text-[9px] px-1.5 py-0.5 rounded-full font-semibold', STATUS_COLORS[doc.status])}>
            {doc.status.replace('_', ' ')}
          </span>
          {doc.refNumber && <span className="text-[9px] text-slate-400">{doc.refNumber}</span>}
          <span className="text-[9px] text-slate-300 flex items-center gap-0.5"><Eye size={7}/>{doc.viewCount}</span>
          <span className="text-[9px] text-slate-300 ml-auto flex items-center gap-0.5">
            <Clock size={7}/>{new Date(doc.updatedAt).toLocaleDateString()}
          </span>
        </div>
      </div>
      <ChevronRight size={12} className="text-slate-200 group-hover:text-rail-400 transition-colors shrink-0 mt-1"/>
    </div>
  );
}

// ── Main Knowledge Base Block ─────────────────────────────────────────────────
export function KnowledgeBaseBlock({
  cell, canManage, userId, userName,
}: {
  cell: string;
  canManage: boolean;
  userId: string;
  userName: string;
}) {
  const [store, setStore] = useState<KBStore>(() => getKBStore(cell));
  const [query, setQuery] = useState('');
  const [filterCat, setFilterCat] = useState<DocCategory | 'all'>('all');
  const [filterStatus, setFilterStatus] = useState<DocStatus | 'all'>('all');
  const [viewDoc, setViewDoc] = useState<KBDocument | null>(null);
  const [addOpen, setAddOpen] = useState(false);

  const save = useCallback((s: KBStore) => { saveKBStore(s); setStore(s); }, []);

  let docs = query ? searchDocuments(store, query) : store.documents.filter(d => d.status !== 'archived');
  if (filterCat !== 'all') docs = docs.filter(d => d.category === filterCat);
  if (filterStatus !== 'all') docs = docs.filter(d => d.status === filterStatus);

  const openDoc = (doc: KBDocument) => {
    const updated = incrementViewCount(store, doc.id);
    save(updated);
    setViewDoc(updated.documents.find(d => d.id === doc.id) ?? doc);
  };

  const stats = {
    total: store.documents.filter(d => d.status !== 'archived').length,
    active: store.documents.filter(d => d.status === 'active').length,
    pending: store.documents.filter(d => d.status === 'pending_approval').length,
  };

  return (
    <div className="flex flex-col gap-3">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 bg-blue-600 rounded-lg flex items-center justify-center">
            <BookOpen size={14} className="text-white"/>
          </div>
          <div>
            <p className="text-xs font-bold text-slate-800">{cell} Knowledge Base</p>
            <p className="text-[10px] text-slate-400">{stats.total} documents · {stats.active} active · {stats.pending} pending</p>
          </div>
        </div>
        {canManage && (
          <button
            onClick={() => setAddOpen(true)}
            className="ml-auto flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition-colors"
          >
            <Plus size={12}/> Add Document
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="relative flex-1 min-w-[160px] max-w-xs">
          <Search size={11} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-300 pointer-events-none"/>
          <input value={query} onChange={e => setQuery(e.target.value)}
            placeholder="Search policies, circulars, SOPs…"
            className="w-full pl-7 pr-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-rail-400"/>
        </div>

        <select value={filterCat} onChange={e => setFilterCat(e.target.value as DocCategory | 'all')}
          className="text-xs bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none text-slate-600">
          <option value="all">All categories</option>
          {CATEGORIES.map(c => <option key={c} value={c}>{CATEGORY_LABELS[c]}</option>)}
        </select>

        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value as DocStatus | 'all')}
          className="text-xs bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none text-slate-600">
          <option value="all">All statuses</option>
          {(['draft','active','pending_approval','archived'] as DocStatus[]).map(s => (
            <option key={s} value={s}>{s.replace('_', ' ')}</option>
          ))}
        </select>
      </div>

      {/* Category quick filters */}
      <div className="flex gap-1.5 flex-wrap">
        <button onClick={() => setFilterCat('all')}
          className={cn('text-[10px] font-bold px-2.5 py-1 rounded-full border transition-colors',
            filterCat === 'all' ? 'bg-slate-800 text-white border-slate-800' : 'bg-white text-slate-500 border-slate-200 hover:border-slate-400')}>
          All
        </button>
        {CATEGORIES.map(c => (
          <button key={c} onClick={() => setFilterCat(c)}
            className={cn('text-[10px] font-bold px-2.5 py-1 rounded-full border transition-colors',
              filterCat === c ? CATEGORY_COLORS[c] + ' border-current' : 'bg-white text-slate-500 border-slate-200 hover:border-slate-400')}>
            {CATEGORY_LABELS[c]}
          </button>
        ))}
      </div>

      {/* Document list */}
      {docs.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-10 gap-2 text-center">
          <BookOpen size={28} className="text-slate-200"/>
          <p className="text-xs font-semibold text-slate-500">No documents found</p>
          {canManage && <button onClick={() => setAddOpen(true)} className="text-xs text-rail-600 hover:underline">Add the first document</button>}
        </div>
      ) : (
        <div className="space-y-2">
          {docs.map(doc => <DocCard key={doc.id} doc={doc} onClick={() => openDoc(doc)}/>)}
        </div>
      )}

      {/* Modals */}
      {viewDoc && (
        <DocViewer
          doc={viewDoc} canManage={canManage} store={store}
          onSave={s => { save(s); setViewDoc(s.documents.find(d => d.id === viewDoc.id) ?? null); }}
          onClose={() => setViewDoc(null)}
          onDelete={() => { save(deleteDocument(store, viewDoc.id)); setViewDoc(null); }}
          userId={userId} userName={userName}
        />
      )}
      {addOpen && (
        <AddDocForm store={store} onSave={save} onClose={() => setAddOpen(false)} userId={userId} userName={userName}/>
      )}
    </div>
  );
}

// Inline CSS helper classes (Tailwind utilities via className - these need to be real tailwind classes below)
// Adding pseudo-classes for the form inputs via style injecting method
const style = typeof document !== 'undefined' ? (() => {
  if (document.getElementById('kb-styles')) return;
  const el = document.createElement('style');
  el.id = 'kb-styles';
  el.textContent = `.label { display:block; font-size:10px; font-weight:700; color:#64748b; text-transform:uppercase; letter-spacing:.05em; margin-bottom:4px; } .input { display:block; width:100%; background:#f8fafc; border:1px solid #e2e8f0; border-radius:8px; padding:6px 12px; font-size:12px; color:#1e293b; outline:none; } .input:focus { border-color:#818cf8; }`;
  document.head.appendChild(el);
})() : null;
