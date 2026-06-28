'use client';
import { useState, useEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Search, X, Database, FileText, CheckSquare, Command, ArrowRight, Hash, Table2, BookOpen, Bot } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { TableDef } from '@/lib/cellData/types';
import { getKBStore, searchDocuments, CATEGORY_LABELS } from '@/lib/knowledge/knowledgeEngine';
import { getTaskStore } from '@/lib/tasks/taskEngine';
import { getAllCells } from '@/lib/cells/cellRegistry';

interface SearchResult {
  id: string;
  type: 'table_record' | 'kb_doc' | 'task' | 'table' | 'window';
  title: string;
  subtitle?: string;
  meta?: string;
  cell?: string;
  href?: string;
  icon: React.ReactNode;
}

const TYPE_LABELS: Record<SearchResult['type'], string> = {
  table_record: 'Record',
  kb_doc: 'Document',
  task: 'Task',
  table: 'Database',
  window: 'Window',
};

const TYPE_COLORS: Record<SearchResult['type'], string> = {
  table_record: 'bg-blue-50 text-blue-600',
  kb_doc: 'bg-purple-50 text-purple-600',
  task: 'bg-emerald-50 text-emerald-600',
  table: 'bg-slate-50 text-slate-600',
  window: 'bg-amber-50 text-amber-600',
};

// ── Search function ────────────────────────────────────────────────────────────
function runSearch(
  query: string,
  cell: string,
  tables: TableDef[],
): SearchResult[] {
  if (!query.trim()) return [];
  const q = query.toLowerCase();
  const results: SearchResult[] = [];

  // 1. Search database records
  tables.forEach(table => {
    // Match table name itself
    if (table.name.toLowerCase().includes(q)) {
      results.push({
        id: `table__${table.id}`,
        type: 'table',
        title: table.name,
        subtitle: `${table.rows.filter(r => !r.deletedAt).length} records`,
        cell,
        icon: <Table2 size={13}/>,
      });
    }

    // Match records
    const activeRows = table.rows.filter(r => !r.deletedAt);
    activeRows.forEach(row => {
      const label = table.values[`${row.id}:__label__`] ?? '';
      if (!label) return;

      const matchesLabel = label.toLowerCase().includes(q);
      const matchesField = table.fields.some(f => (table.values[`${row.id}:${f.id}`] ?? '').toLowerCase().includes(q));

      if (matchesLabel || matchesField) {
        const matchedField = !matchesLabel && table.fields.find(f => (table.values[`${row.id}:${f.id}`] ?? '').toLowerCase().includes(q));
        results.push({
          id: `record__${table.id}__${row.id}`,
          type: 'table_record',
          title: label || 'Untitled',
          subtitle: table.name,
          meta: matchedField ? `${matchedField.label}: ${table.values[`${row.id}:${matchedField.id}`]}` : undefined,
          cell,
          icon: <Hash size={13}/>,
        });
      }
    });
  });

  // 2. Knowledge base
  const kb = getKBStore(cell);
  const kbDocs = searchDocuments(kb, query);
  kbDocs.slice(0, 8).forEach(doc => {
    results.push({
      id: `kb__${doc.id}`,
      type: 'kb_doc',
      title: doc.title,
      subtitle: `${CATEGORY_LABELS[doc.category]}${doc.refNumber ? ` · ${doc.refNumber}` : ''}`,
      meta: doc.summary,
      cell,
      icon: <FileText size={13}/>,
    });
  });

  // 3. Tasks
  const taskStore = getTaskStore(cell);
  taskStore.tasks.forEach(task => {
    if (
      task.title.toLowerCase().includes(q) ||
      (task.description ?? '').toLowerCase().includes(q) ||
      task.tags.some(t => t.toLowerCase().includes(q))
    ) {
      results.push({
        id: `task__${task.id}`,
        type: 'task',
        title: task.title,
        subtitle: `${task.status.replace('_', ' ')} · ${task.priority} priority`,
        meta: task.dueDate ? `Due: ${task.dueDate}` : undefined,
        cell,
        icon: <CheckSquare size={13}/>,
      });
    }
  });

  return results.slice(0, 24);
}

// ── Result item ───────────────────────────────────────────────────────────────
function ResultItem({
  result, active, onClick,
}: {
  result: SearchResult;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <div
      onClick={onClick}
      className={cn(
        'flex items-center gap-3 px-4 py-3 cursor-pointer transition-colors',
        active ? 'bg-rail-50' : 'hover:bg-slate-50'
      )}
    >
      <div className={cn('w-7 h-7 rounded-lg flex items-center justify-center shrink-0', TYPE_COLORS[result.type])}>
        {result.icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold text-slate-800 truncate">{result.title}</p>
        {result.subtitle && (
          <p className="text-[10px] text-slate-400 truncate">{result.subtitle}</p>
        )}
        {result.meta && (
          <p className="text-[10px] text-slate-300 truncate">{result.meta}</p>
        )}
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <span className={cn('text-[9px] font-bold px-1.5 py-0.5 rounded-full', TYPE_COLORS[result.type])}>
          {TYPE_LABELS[result.type]}
        </span>
        {active && <ArrowRight size={10} className="text-rail-400"/>}
      </div>
    </div>
  );
}

// ── Main Universal Search ─────────────────────────────────────────────────────
export function UniversalSearch({
  cell, tables, open, onClose,
}: {
  cell: string;
  tables: TableDef[];
  open: boolean;
  onClose: () => void;
}) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [activeIdx, setActiveIdx] = useState(0);
  const [mounted, setMounted] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    if (open) {
      setQuery('');
      setResults([]);
      setActiveIdx(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  useEffect(() => {
    if (!query.trim()) { setResults([]); return; }
    const timer = setTimeout(() => {
      setResults(runSearch(query, cell, tables));
      setActiveIdx(0);
    }, 120);
    return () => clearTimeout(timer);
  }, [query, cell, tables]);

  const handleKey = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setActiveIdx(i => Math.min(i + 1, results.length - 1)); }
    if (e.key === 'ArrowUp') { e.preventDefault(); setActiveIdx(i => Math.max(i - 1, 0)); }
    if (e.key === 'Escape') onClose();
    if (e.key === 'Enter' && results[activeIdx]) {
      // Navigate to result (in future: deep link)
      onClose();
    }
  }, [results, activeIdx, onClose]);

  if (!mounted || !open) return null;

  // Group results by type
  const grouped: Record<string, SearchResult[]> = {};
  results.forEach(r => {
    const key = TYPE_LABELS[r.type];
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(r);
  });

  return createPortal(
    <div
      className="fixed inset-0 z-[3000] flex items-start justify-center pt-20 px-4"
      onClick={onClose}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm"/>

      {/* Dialog */}
      <div
        className="relative bg-white rounded-2xl w-full max-w-xl shadow-2xl overflow-hidden flex flex-col"
        onClick={e => e.stopPropagation()}
        style={{ maxHeight: '65vh' }}
      >
        {/* Search Input */}
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-slate-100">
          <Search size={16} className="text-slate-400 shrink-0"/>
          <input
            ref={inputRef}
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={handleKey}
            placeholder={`Search ${cell} workspace…`}
            className="flex-1 text-sm text-slate-800 outline-none placeholder:text-slate-300"
          />
          <div className="flex items-center gap-2 shrink-0">
            {query && (
              <button onClick={() => setQuery('')} className="p-1 text-slate-300 hover:text-slate-500">
                <X size={13}/>
              </button>
            )}
            <kbd className="text-[9px] font-bold text-slate-300 border border-slate-200 rounded-md px-1.5 py-0.5">ESC</kbd>
          </div>
        </div>

        {/* Results */}
        <div className="overflow-y-auto">
          {query && results.length === 0 && (
            <div className="flex flex-col items-center justify-center py-10 gap-2 text-slate-400">
              <Search size={24} className="text-slate-200"/>
              <p className="text-xs">No results for "{query}"</p>
              <p className="text-[10px] text-slate-300">Try different keywords</p>
            </div>
          )}

          {!query && (
            <div className="px-4 py-4">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-3">Quick Actions</p>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { icon: <Database size={14} className="text-blue-500"/>, label: 'Browse Databases', sub: `${tables.length} tables` },
                  { icon: <BookOpen size={14} className="text-purple-500"/>, label: 'Knowledge Base', sub: `${getKBStore(cell).documents.length} docs` },
                  { icon: <CheckSquare size={14} className="text-emerald-500"/>, label: 'View Tasks', sub: `${getTaskStore(cell).tasks.filter(t=>t.status!=='done').length} active` },
                  { icon: <Bot size={14} className="text-rail-500"/>, label: 'Ask AI Assistant', sub: 'Search with AI' },
                ].map(action => (
                  <div key={action.label} className="flex items-center gap-2.5 p-3 bg-slate-50 hover:bg-rail-50 rounded-xl cursor-pointer transition-colors border border-transparent hover:border-rail-100">
                    <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center shadow-sm shrink-0">{action.icon}</div>
                    <div>
                      <p className="text-[10px] font-bold text-slate-700">{action.label}</p>
                      <p className="text-[9px] text-slate-400">{action.sub}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {Object.entries(grouped).map(([groupName, items]) => {
            let flatIdx = 0;
            results.forEach((r, i) => { if (i < results.indexOf(items[0])) flatIdx = i; });

            return (
              <div key={groupName}>
                <div className="px-4 py-2 bg-slate-50 border-y border-slate-100">
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{groupName}s</p>
                </div>
                {items.map((result, localIdx) => {
                  const globalIdx = results.indexOf(result);
                  return (
                    <ResultItem
                      key={result.id}
                      result={result}
                      active={globalIdx === activeIdx}
                      onClick={onClose}
                    />
                  );
                })}
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="flex items-center gap-4 px-4 py-2.5 border-t border-slate-100 bg-slate-50">
          <div className="flex items-center gap-1.5 text-[9px] text-slate-400">
            <kbd className="border border-slate-200 bg-white rounded px-1 py-0.5 font-bold">↑↓</kbd> Navigate
          </div>
          <div className="flex items-center gap-1.5 text-[9px] text-slate-400">
            <kbd className="border border-slate-200 bg-white rounded px-1 py-0.5 font-bold">↵</kbd> Open
          </div>
          <div className="flex items-center gap-1.5 text-[9px] text-slate-400">
            <kbd className="border border-slate-200 bg-white rounded px-1 py-0.5 font-bold">ESC</kbd> Close
          </div>
          <div className="ml-auto text-[9px] text-slate-300">
            {results.length > 0 && `${results.length} results`}
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}

// ── Trigger Button ────────────────────────────────────────────────────────────
export function SearchTrigger({ cell, tables }: { cell: string; tables: TableDef[] }) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') { e.preventDefault(); setOpen(true); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 px-3 py-1.5 bg-white/80 hover:bg-white border border-slate-200 hover:border-slate-300 rounded-xl transition-all text-slate-400 hover:text-slate-600 shadow-sm"
      >
        <Search size={12}/>
        <span className="text-xs text-slate-400 hidden sm:block">Search…</span>
        <kbd className="hidden sm:flex items-center gap-0.5 text-[9px] text-slate-300 border border-slate-200 rounded-md px-1 py-0.5 ml-1">
          <Command size={8}/> K
        </kbd>
      </button>
      <UniversalSearch cell={cell} tables={tables} open={open} onClose={() => setOpen(false)}/>
    </>
  );
}
