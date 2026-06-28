// ─────────────────────────────────────────────────────────────────────────────
// Knowledge Base Engine — Policies, Circulars, SOPs, FAQs, Training
// Per-cell, stored in localStorage under rly_kb_[cell]
// ─────────────────────────────────────────────────────────────────────────────

export type DocCategory = 'policy' | 'circular' | 'sop' | 'faq' | 'template' | 'training' | 'notification';
export type DocStatus = 'draft' | 'active' | 'archived' | 'pending_approval';

export interface KBDocument {
  id: string;
  title: string;
  category: DocCategory;
  status: DocStatus;
  content: string;          // Rich text / markdown content
  summary?: string;         // Short summary
  tags: string[];
  fileUrl?: string;         // Link to external doc (Google Drive, etc.)
  refNumber?: string;       // Circular/Policy reference number
  issuedBy?: string;        // Issuing authority
  issuedDate?: string;      // Date issued
  effectiveDate?: string;   // Effective from
  expiryDate?: string;      // Expires on (null = permanent)
  version: number;
  versions: KBVersion[];
  ownerId: string;
  ownerName: string;
  approvedBy?: string;
  approvedAt?: string;
  createdAt: string;
  updatedAt: string;
  viewCount: number;
  cell: string;
}

export interface KBVersion {
  version: number;
  content: string;
  changedBy: string;
  changedByName: string;
  changedAt: string;
  changeNote: string;
}

export interface KBStore {
  cell: string;
  documents: KBDocument[];
  updatedAt: string;
}

const KEY = (cell: string) => `rly_kb_${cell.replace(/[^a-zA-Z0-9]/g, '_')}`;
function gid() { return `kb_${Date.now()}_${Math.floor(Math.random() * 9999)}`; }

export const CATEGORY_LABELS: Record<DocCategory, string> = {
  policy: 'Policy', circular: 'Circular', sop: 'SOP', faq: 'FAQ',
  template: 'Template', training: 'Training Material', notification: 'Notification',
};

export const CATEGORY_COLORS: Record<DocCategory, string> = {
  policy: 'bg-blue-100 text-blue-700 border-blue-200',
  circular: 'bg-purple-100 text-purple-700 border-purple-200',
  sop: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  faq: 'bg-amber-100 text-amber-700 border-amber-200',
  template: 'bg-slate-100 text-slate-700 border-slate-200',
  training: 'bg-orange-100 text-orange-700 border-orange-200',
  notification: 'bg-red-100 text-red-700 border-red-200',
};

export const STATUS_COLORS: Record<DocStatus, string> = {
  draft: 'bg-slate-100 text-slate-600',
  active: 'bg-green-100 text-green-700',
  archived: 'bg-gray-100 text-gray-500',
  pending_approval: 'bg-amber-100 text-amber-700',
};

export function getKBStore(cell: string): KBStore {
  if (typeof window === 'undefined') return { cell, documents: [], updatedAt: new Date().toISOString() };
  try {
    const raw = localStorage.getItem(KEY(cell));
    if (raw) return JSON.parse(raw) as KBStore;
  } catch {}
  return { cell, documents: [], updatedAt: new Date().toISOString() };
}

export function saveKBStore(store: KBStore): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(KEY(store.cell), JSON.stringify({ ...store, updatedAt: new Date().toISOString() }));
}

export function createDocument(
  store: KBStore,
  data: Pick<KBDocument, 'title' | 'category' | 'content' | 'tags'> & Partial<KBDocument>,
  userId: string,
  userName: string,
): KBStore {
  const now = new Date().toISOString();
  const doc: KBDocument = {
    id: gid(),
    title: data.title,
    category: data.category,
    status: data.status ?? 'draft',
    content: data.content,
    summary: data.summary,
    tags: data.tags ?? [],
    fileUrl: data.fileUrl,
    refNumber: data.refNumber,
    issuedBy: data.issuedBy,
    issuedDate: data.issuedDate,
    effectiveDate: data.effectiveDate,
    expiryDate: data.expiryDate,
    version: 1,
    versions: [],
    ownerId: userId,
    ownerName: userName,
    createdAt: now,
    updatedAt: now,
    viewCount: 0,
    cell: store.cell,
  };
  return { ...store, documents: [doc, ...store.documents] };
}

export function updateDocument(
  store: KBStore,
  id: string,
  patch: Partial<KBDocument>,
  userId: string,
  userName: string,
  changeNote = 'Updated',
): KBStore {
  return {
    ...store,
    documents: store.documents.map(doc => {
      if (doc.id !== id) return doc;
      const newVersion: KBVersion = {
        version: doc.version,
        content: doc.content,
        changedBy: userId,
        changedByName: userName,
        changedAt: new Date().toISOString(),
        changeNote,
      };
      return {
        ...doc, ...patch,
        version: doc.version + 1,
        versions: [newVersion, ...doc.versions].slice(0, 10),
        updatedAt: new Date().toISOString(),
      };
    }),
  };
}

export function deleteDocument(store: KBStore, id: string): KBStore {
  return { ...store, documents: store.documents.filter(d => d.id !== id) };
}

export function searchDocuments(store: KBStore, query: string): KBDocument[] {
  if (!query.trim()) return store.documents.filter(d => d.status !== 'archived');
  const q = query.toLowerCase();
  return store.documents.filter(d =>
    d.title.toLowerCase().includes(q) ||
    d.content.toLowerCase().includes(q) ||
    d.summary?.toLowerCase().includes(q) ||
    d.tags.some(t => t.toLowerCase().includes(q)) ||
    d.refNumber?.toLowerCase().includes(q) ||
    d.category.includes(q)
  );
}

export function incrementViewCount(store: KBStore, id: string): KBStore {
  return {
    ...store,
    documents: store.documents.map(d => d.id !== id ? d : { ...d, viewCount: d.viewCount + 1 }),
  };
}
