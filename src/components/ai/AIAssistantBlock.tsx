'use client';
import { useState, useRef, useEffect, useCallback } from 'react';
import { Bot, Send, Sparkles, User2, Trash2, ChevronDown, Loader2, Database, FileText, CheckSquare } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { TableDef } from '@/lib/cellData/types';
import { getKBStore, searchDocuments } from '@/lib/knowledge/knowledgeEngine';
import { getTaskStore } from '@/lib/tasks/taskEngine';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  sources?: string[];
  ts: number;
}

function gid() { return `msg_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`; }

// ── Context Builder ────────────────────────────────────────────────────────────
// Gathers relevant workspace context to answer user queries
function buildContext(
  cell: string,
  tables: TableDef[],
  query: string,
): { context: string; sources: string[] } {
  const lq = query.toLowerCase();
  const sources: string[] = [];
  const parts: string[] = [];

  // 1. Knowledge Base search
  const kb = getKBStore(cell);
  const kbDocs = searchDocuments(kb, query);
  if (kbDocs.length > 0) {
    parts.push('=== KNOWLEDGE BASE ===');
    kbDocs.slice(0, 5).forEach(doc => {
      parts.push(`[${doc.category.toUpperCase()}] ${doc.title} (Ref: ${doc.refNumber ?? 'N/A'})`);
      if (doc.summary) parts.push(`Summary: ${doc.summary}`);
      parts.push(doc.content.slice(0, 600) + (doc.content.length > 600 ? '…' : ''));
      sources.push(`KB: ${doc.title}`);
    });
  }

  // 2. Tables / Databases — search for relevant data
  tables.forEach(table => {
    if (table.rows.filter(r => !r.deletedAt).length === 0) return;

    const tableNameMatch = table.name.toLowerCase().includes(lq.split(' ')[0]) ||
      lq.includes(table.name.toLowerCase());

    const activeRows = table.rows.filter(r => !r.deletedAt);
    const matchingRows = activeRows.filter(row => {
      const label = table.values[`${row.id}:__label__`] ?? '';
      if (label.toLowerCase().includes(lq)) return true;
      return table.fields.some(f => {
        const val = table.values[`${row.id}:${f.id}`] ?? '';
        return val.toLowerCase().includes(lq);
      });
    });

    const rowsToShow = tableNameMatch ? activeRows.slice(0, 8) : matchingRows.slice(0, 5);
    if (rowsToShow.length === 0) return;

    parts.push(`\n=== DATABASE: ${table.name} (${activeRows.length} total records) ===`);
    sources.push(`Database: ${table.name}`);

    // Header
    const fieldLabels = table.fields.slice(0, 6).map(f => f.label).join(' | ');
    parts.push(`${table.firstColLabel} | ${fieldLabels}`);

    rowsToShow.forEach(row => {
      const label = table.values[`${row.id}:__label__`] ?? '—';
      const vals = table.fields.slice(0, 6).map(f => table.values[`${row.id}:${f.id}`] ?? '—').join(' | ');
      parts.push(`${label} | ${vals}`);
    });
  });

  // 3. Tasks
  const taskStore = getTaskStore(cell);
  const activeTasks = taskStore.tasks.filter(t => t.status !== 'done' && t.status !== 'cancelled');
  if (activeTasks.length > 0 && (lq.includes('task') || lq.includes('pending') || lq.includes('todo') || lq.includes('assign'))) {
    parts.push(`\n=== TASKS (${activeTasks.length} active) ===`);
    sources.push('Task Manager');
    activeTasks.slice(0, 10).forEach(t => {
      parts.push(`[${t.status.toUpperCase()}] ${t.title} — ${t.priority} priority${t.dueDate ? ` | Due: ${t.dueDate}` : ''}${t.assignedToName ? ` | Assigned: ${t.assignedToName}` : ''}`);
    });
  }

  return {
    context: parts.join('\n'),
    sources,
  };
}

// ── Simple rule-based response generator ─────────────────────────────────────
// In production this would call a real AI endpoint. For now, uses deterministic
// keyword + context matching to generate meaningful answers from workspace data.
function generateResponse(
  query: string,
  context: string,
  sources: string[],
  cell: string,
  tables: TableDef[],
): string {
  const lq = query.toLowerCase().trim();

  if (!context && sources.length === 0) {
    // Fallback for general queries
    if (lq.includes('hello') || lq.includes('hi') || lq.includes('hey')) {
      return `Hello! I'm your ${cell} workspace AI assistant. I can help you find information from databases, knowledge base documents, policies, circulars, and tasks. What would you like to know?`;
    }
    if (lq.includes('help') || lq.includes('what can you do')) {
      return `I can help you with:\n\n**Finding Information**\n- Search across all databases in this workspace\n- Look up policies, circulars, and SOPs from the Knowledge Base\n- Find pending tasks and assignments\n\n**Answering Questions**\n- "How many records are in [table name]?"\n- "Show me all [status] items"\n- "What does the policy say about [topic]?"\n- "What tasks are pending?"\n\nTry asking me anything about your ${cell} workspace data!`;
    }
    return `I searched your ${cell} workspace but couldn't find relevant information for "${query}". Try asking about specific tables, policies, or tasks in this workspace.`;
  }

  // Count queries
  if (lq.match(/how many|count|total number/)) {
    const tableMatch = tables.find(t => lq.includes(t.name.toLowerCase()));
    if (tableMatch) {
      const count = tableMatch.rows.filter(r => !r.deletedAt).length;
      return `The **${tableMatch.name}** database currently has **${count} records**.${context ? '\n\nHere\'s a quick summary of the data:\n\n' + context.slice(0, 400) : ''}`;
    }
  }

  // Summary queries
  if (lq.match(/summary|overview|summarize|tell me about|what is/)) {
    if (sources.length > 0) {
      return `Here's what I found in your workspace:\n\n${context.slice(0, 800)}${context.length > 800 ? '\n\n*[Showing partial results — refine your search for more specific information]*' : ''}\n\n**Sources:** ${sources.join(', ')}`;
    }
  }

  // Status/pending queries
  if (lq.match(/pending|open|active|in progress|todo|not done/)) {
    const taskStore = getTaskStore(cell);
    const pending = taskStore.tasks.filter(t => ['todo', 'in_progress', 'blocked'].includes(t.status));
    if (pending.length > 0) {
      const taskList = pending.slice(0, 8).map(t =>
        `• **${t.title}** — ${t.status.replace('_', ' ')} | ${t.priority} priority${t.assignedToName ? ` | ${t.assignedToName}` : ''}`
      ).join('\n');
      return `Found **${pending.length} pending tasks** in this workspace:\n\n${taskList}${pending.length > 8 ? `\n\n*...and ${pending.length - 8} more*` : ''}`;
    }
  }

  // Default: return contextualized response
  if (context) {
    return `Based on your ${cell} workspace data:\n\n${context.slice(0, 900)}${context.length > 900 ? '\n\n*[Partial results shown]*' : ''}\n\n**Sources consulted:** ${sources.join(', ')}`;
  }

  return `I searched your ${cell} workspace for "${query}" but didn't find a direct match. Try different keywords or ask about specific database tables, policies, or tasks.`;
}

// ── Message bubble ─────────────────────────────────────────────────────────────
function MessageBubble({ msg }: { msg: Message }) {
  const isUser = msg.role === 'user';
  // Convert **bold** and \n to HTML-ish rendering
  const lines = msg.content.split('\n');

  return (
    <div className={cn('flex gap-2.5', isUser ? 'flex-row-reverse' : 'flex-row')}>
      {/* Avatar */}
      <div className={cn(
        'w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5',
        isUser ? 'bg-rail-600 text-white' : 'bg-gradient-to-br from-indigo-500 to-rail-600 text-white'
      )}>
        {isUser ? <User2 size={13}/> : <Bot size={13}/>}
      </div>

      <div className={cn(
        'max-w-[80%] rounded-xl px-3.5 py-2.5',
        isUser ? 'bg-rail-600 text-white rounded-tr-sm' : 'bg-white border border-slate-200 text-slate-800 rounded-tl-sm shadow-sm'
      )}>
        <div className="text-xs leading-relaxed space-y-1">
          {lines.map((line, i) => {
            if (!line.trim()) return <div key={i} className="h-1"/>;
            // Handle **bold** markers
            const parts = line.split(/\*\*(.*?)\*\*/g);
            return (
              <p key={i} className={cn(isUser ? 'text-white' : 'text-slate-700', line.startsWith('•') && 'ml-2')}>
                {parts.map((part, j) =>
                  j % 2 === 1 ? <strong key={j}>{part}</strong> : part
                )}
              </p>
            );
          })}
        </div>
        {msg.sources && msg.sources.length > 0 && !isUser && (
          <div className="mt-2 pt-2 border-t border-slate-100 flex items-center gap-1 flex-wrap">
            <span className="text-[9px] text-slate-300 font-medium">Sources:</span>
            {msg.sources.map(s => (
              <span key={s} className="text-[9px] bg-slate-50 border border-slate-200 text-slate-500 px-1.5 py-0.5 rounded-full">{s}</span>
            ))}
          </div>
        )}
        <p className={cn('text-[9px] mt-1', isUser ? 'text-white/50' : 'text-slate-300')}>
          {new Date(msg.ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </p>
      </div>
    </div>
  );
}

// ── Suggested prompts ─────────────────────────────────────────────────────────
const SUGGESTIONS = [
  'What tasks are pending?',
  'Show me a summary of all databases',
  'What policies are in the knowledge base?',
  'How many records are in each table?',
];

// ── Main AI Assistant ─────────────────────────────────────────────────────────
export function AIAssistantBlock({
  cell, tables,
}: {
  cell: string;
  tables: TableDef[];
}) {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: gid(),
      role: 'assistant',
      content: `Hello! I'm your **${cell}** workspace AI assistant.\n\nI can search across your databases, knowledge base documents, policies, circulars, and tasks to answer your questions.\n\nWhat would you like to know?`,
      ts: Date.now(),
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const send = useCallback(async (text?: string) => {
    const q = (text ?? input).trim();
    if (!q || loading) return;
    setInput('');

    const userMsg: Message = { id: gid(), role: 'user', content: q, ts: Date.now() };
    setMessages(prev => [...prev, userMsg]);
    setLoading(true);

    // Simulate network delay (in production: real AI API call)
    await new Promise(r => setTimeout(r, 600 + Math.random() * 500));

    const { context, sources } = buildContext(cell, tables, q);
    const response = generateResponse(q, context, sources, cell, tables);

    const aiMsg: Message = {
      id: gid(),
      role: 'assistant',
      content: response,
      sources,
      ts: Date.now(),
    };
    setMessages(prev => [...prev, aiMsg]);
    setLoading(false);
  }, [input, loading, cell, tables]);

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); }
  };

  const clearChat = () => {
    setMessages([{
      id: gid(),
      role: 'assistant',
      content: `Chat cleared. I'm ready to help with your **${cell}** workspace. What would you like to know?`,
      ts: Date.now(),
    }]);
  };

  // Context stats
  const kbCount = getKBStore(cell).documents.filter(d => d.status !== 'archived').length;
  const taskCount = getTaskStore(cell).tasks.filter(t => t.status !== 'done').length;

  return (
    <div className="flex flex-col h-[520px] bg-gradient-to-b from-slate-50 to-white rounded-xl border border-slate-200 overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-2.5 px-4 py-3 border-b border-slate-100 bg-white">
        <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-indigo-500 to-rail-600 flex items-center justify-center">
          <Bot size={14} className="text-white"/>
        </div>
        <div className="flex-1">
          <p className="text-xs font-bold text-slate-800">{cell} AI Assistant</p>
          <p className="text-[10px] text-slate-400">Searches your workspace data</p>
        </div>
        {/* Context badges */}
        <div className="flex items-center gap-1.5">
          <span className="flex items-center gap-1 text-[9px] text-slate-500 bg-slate-100 px-2 py-1 rounded-full">
            <Database size={8}/> {tables.length} DB
          </span>
          <span className="flex items-center gap-1 text-[9px] text-slate-500 bg-slate-100 px-2 py-1 rounded-full">
            <FileText size={8}/> {kbCount} Docs
          </span>
          <span className="flex items-center gap-1 text-[9px] text-slate-500 bg-slate-100 px-2 py-1 rounded-full">
            <CheckSquare size={8}/> {taskCount} Tasks
          </span>
          <button onClick={clearChat} className="p-1.5 text-slate-300 hover:text-slate-500 transition-colors" title="Clear chat">
            <Trash2 size={11}/>
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map(msg => <MessageBubble key={msg.id} msg={msg}/>)}
        {loading && (
          <div className="flex gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-indigo-500 to-rail-600 flex items-center justify-center shrink-0">
              <Bot size={13} className="text-white"/>
            </div>
            <div className="bg-white border border-slate-200 rounded-xl rounded-tl-sm px-4 py-3 shadow-sm">
              <div className="flex gap-1 items-center">
                <div className="w-1.5 h-1.5 bg-rail-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}/>
                <div className="w-1.5 h-1.5 bg-rail-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}/>
                <div className="w-1.5 h-1.5 bg-rail-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}/>
                <span className="text-[10px] text-slate-400 ml-1">Searching workspace…</span>
              </div>
            </div>
          </div>
        )}
        <div ref={bottomRef}/>
      </div>

      {/* Suggestions */}
      {messages.length < 2 && !loading && (
        <div className="px-4 pb-2 flex gap-1.5 flex-wrap">
          {SUGGESTIONS.map(s => (
            <button
              key={s}
              onClick={() => send(s)}
              className="text-[10px] text-rail-600 bg-rail-50 border border-rail-200 hover:bg-rail-100 px-2.5 py-1 rounded-full transition-colors font-medium"
            >
              {s}
            </button>
          ))}
        </div>
      )}

      {/* Input */}
      <div className="px-3 py-3 border-t border-slate-100 bg-white">
        <div className="flex items-end gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 focus-within:border-rail-400 transition-colors">
          <textarea
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKey}
            placeholder="Ask anything about your workspace…"
            rows={1}
            className="flex-1 bg-transparent text-xs text-slate-800 resize-none outline-none min-h-[20px] max-h-[80px] placeholder:text-slate-300"
            style={{ lineHeight: '1.5' }}
          />
          <button
            onClick={() => send()}
            disabled={!input.trim() || loading}
            className={cn(
              'p-1.5 rounded-lg transition-all shrink-0',
              input.trim() && !loading
                ? 'bg-rail-600 text-white hover:bg-rail-700 shadow-sm'
                : 'bg-slate-200 text-slate-300 cursor-not-allowed'
            )}
          >
            {loading ? <Loader2 size={13} className="animate-spin"/> : <Send size={13}/>}
          </button>
        </div>
        <p className="text-[9px] text-slate-300 mt-1.5 text-center">
          Shift+Enter for new line • Enter to send • Searches only data you can access
        </p>
      </div>
    </div>
  );
}
