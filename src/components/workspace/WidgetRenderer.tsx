'use client';
import React, { useState } from 'react';
import {
  Table2, BarChart3, FileText, Users2, Activity, UserCheck,
  ClipboardList, Share2, Megaphone, Link2, FileSpreadsheet,
  Globe, TrendingUp, ExternalLink, Edit3, Check, X, ChevronRight,
} from 'lucide-react';
import type { LayoutWidget, LayoutColumn } from '@/lib/workspace/layoutEngine';
import type { useWorkspace } from '@/lib/cellData/useWorkspace';
import { TableEngine } from '@/components/cell/TableEngine';
import { CellStaffRoster } from '@/components/cell/CellStaffRoster';
import { ApprovalQueue } from '@/components/staff/ApprovalQueue';
import { StaffRequestPanel } from '@/components/staff/StaffRequestPanel';
import { SharedTablesView } from '@/components/cell/SharedTablesView';
import { CellActivityDashboard } from '@/components/cell/CellActivityDashboard';
import { cn } from '@/lib/utils';

const ICON_MAP: Record<string, React.ElementType> = {
 Table2, BarChart3, FileText, Users2, Activity, UserCheck,
 ClipboardList, Share2, Megaphone, Link2, FileSpreadsheet,
 Globe, TrendingUp,
};

function EditableKPI({ widget, onUpdate, canManage }: {
 widget: LayoutWidget;
 onUpdate: (patch: Partial<LayoutWidget>) => void;
 canManage: boolean;
}) {
 const [editing, setEditing] = useState(false);
 const [label, setLabel] = useState(widget.kpiLabel ?? widget.title);
 const [value, setVal] = useState(widget.kpiValue ?? '0');
 const [suffix, setSuffix] = useState(widget.kpiSuffix ?? '');

 if (editing && canManage) {
 return (
 <div className="space-y-2 p-1">
 <input value={label} onChange={e => setLabel(e.target.value)} placeholder="Label"
 className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 focus:outline-none focus:border-blue-400"/>
 <div className="flex gap-2">
 <input value={value} onChange={e => setVal(e.target.value)} placeholder="Value"
 className="flex-1 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 focus:outline-none focus:border-blue-400"/>
 <input value={suffix} onChange={e => setSuffix(e.target.value)} placeholder="Unit"
 className="w-16 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 focus:outline-none focus:border-blue-400"/>
 </div>
 <div className="flex gap-1.5 justify-end">
 <button onClick={() => setEditing(false)} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400"><X size={12}/></button>
 <button onClick={() => { onUpdate({ kpiLabel: label, kpiValue: value, kpiSuffix: suffix, title: label }); setEditing(false); }}
 className="p-1.5 rounded-lg bg-blue-600 text-white hover:bg-blue-700"><Check size={12}/></button>
 </div>
 </div>
 );
 }
 return (
 <div className="flex items-center justify-between">
 <div>
 <p className="text-2xl font-bold text-slate-900">
 {widget.kpiValue ?? '—'}
 {widget.kpiSuffix && <span className="text-sm ml-1 text-slate-400">{widget.kpiSuffix}</span>}
 </p>
 <p className="text-xs text-slate-400 mt-0.5">{widget.kpiLabel ?? widget.title}</p>
 </div>
 {canManage && (
 <button onClick={() => setEditing(true)} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-300 hover:text-slate-600">
 <Edit3 size={12}/>
 </button>
 )}
 </div>
 );
}

function EditableText({ widget, onUpdate, canManage }: {
 widget: LayoutWidget; onUpdate: (p: Partial<LayoutWidget>) => void; canManage: boolean;
}) {
 const [editing, setEditing] = useState(false);
 const [draft, setDraft] = useState(widget.content ?? '');
 if (editing && canManage) {
 return (
 <div className="space-y-2">
 <textarea value={draft} onChange={e => setDraft(e.target.value)} rows={5} autoFocus
 className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-800 focus:outline-none focus:border-blue-400 resize-none"/>
 <div className="flex gap-1.5 justify-end">
 <button onClick={() => setEditing(false)} className="px-3 py-1.5 text-xs text-slate-500 hover:bg-slate-100 rounded-lg">Cancel</button>
 <button onClick={() => { onUpdate({ content: draft }); setEditing(false); }} className="px-3 py-1.5 text-xs bg-blue-600 text-white rounded-lg hover:bg-blue-700">Save</button>
 </div>
 </div>
 );
 }
 return (
 <div className="group relative">
 <div className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed min-h-[40px]">
 {widget.content || <span className="text-slate-300 italic">Click edit to add content…</span>}
 </div>
 {canManage && (
 <button onClick={() => setEditing(true)} className="absolute top-0 right-0 opacity-0 group-hover:opacity-100 p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 transition-opacity">
 <Edit3 size={12}/>
 </button>
 )}
 </div>
 );
}

function AnnouncementsWidget({ widget, onUpdate, canManage }: {
 widget: LayoutWidget; onUpdate: (p: Partial<LayoutWidget>) => void; canManage: boolean;
}) {
 const [editing, setEditing] = useState(false);
 const [draft, setDraft] = useState(widget.content ?? '');
 const items = (widget.content ?? '').split('\n').filter(Boolean);
 return editing && canManage ? (
 <div className="space-y-2">
 <textarea value={draft} onChange={e => setDraft(e.target.value)} rows={6} autoFocus placeholder="One announcement per line…"
 className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-800 focus:outline-none focus:border-blue-400 resize-none"/>
 <div className="flex gap-1.5 justify-end">
 <button onClick={() => setEditing(false)} className="px-3 py-1.5 text-xs text-slate-500 hover:bg-slate-100 rounded-lg">Cancel</button>
 <button onClick={() => { onUpdate({ content: draft }); setEditing(false); }} className="px-3 py-1.5 text-xs bg-blue-600 text-white rounded-lg hover:bg-blue-700">Save</button>
 </div>
 </div>
 ) : (
 <div className="space-y-1.5 group relative">
 {items.length === 0
 ? <p className="text-xs text-slate-300 italic">No announcements yet</p>
 : items.map((item, i) => (
 <div key={i} className="flex items-start gap-2 py-1.5 border-b border-slate-50 last:border-0">
 <div className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-1.5 shrink-0"/>
 <p className="text-xs text-slate-700">{item}</p>
 </div>
 ))
 }
 {canManage && (
 <button onClick={() => setEditing(true)} className="absolute top-0 right-0 opacity-0 group-hover:opacity-100 p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 transition-opacity">
 <Edit3 size={12}/>
 </button>
 )}
 </div>
 );
}

function QuickLinksWidget({ widget, onUpdate, canManage }: {
 widget: LayoutWidget; onUpdate: (p: Partial<LayoutWidget>) => void; canManage: boolean;
}) {
 const links = widget.links ?? [];
 const [editing, setEditing] = useState(false);
 const [draft, setDraft] = useState(links.map(l => `${l.label}|${l.url}`).join('\n'));
 return editing && canManage ? (
 <div className="space-y-2">
 <p className="text-[10px] text-slate-400">One link per line: Label|URL</p>
 <textarea value={draft} onChange={e => setDraft(e.target.value)} rows={5} autoFocus placeholder="IRCTC|https://irctc.co.in"
 className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-800 focus:outline-none focus:border-blue-400 resize-none font-mono"/>
 <div className="flex gap-1.5 justify-end">
 <button onClick={() => setEditing(false)} className="px-3 py-1.5 text-xs text-slate-500 hover:bg-slate-100 rounded-lg">Cancel</button>
 <button onClick={() => {
 const parsed = draft.split('\n').filter(Boolean).map(line => {
 const [label, ...rest] = line.split('|');
 return { label: label.trim(), url: rest.join('|').trim() };
 }).filter(l => l.label && l.url);
 onUpdate({ links: parsed });
 setEditing(false);
 }} className="px-3 py-1.5 text-xs bg-blue-600 text-white rounded-lg hover:bg-blue-700">Save</button>
 </div>
 </div>
 ) : (
 <div className="space-y-1 group relative">
 {links.length === 0
 ? <p className="text-xs text-slate-300 italic">No links added</p>
 : links.map((l, i) => (
 <a key={i} href={l.url} target="_blank"rel="noreferrer"
 className="flex items-center gap-2 py-1.5 px-2 rounded-lg hover:bg-slate-100 transition-colors group/link">
 <ExternalLink size={11} className="text-blue-500 shrink-0"/>
 <span className="text-xs text-blue-600 hover:underline truncate">{l.label}</span>
 </a>
 ))
 }
 {canManage && (
 <button onClick={() => setEditing(true)} className="absolute top-0 right-0 opacity-0 group-hover:opacity-100 p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 transition-opacity">
 <Edit3 size={12}/>
 </button>
 )}
 </div>
 );
}

function EmbedWidget({ widget, onUpdate, canManage }: {
 widget: LayoutWidget; onUpdate: (p: Partial<LayoutWidget>) => void; canManage: boolean;
}) {
 const [editing, setEditing] = useState(!widget.content);
 const [draft, setDraft] = useState(widget.content ?? '');
 if (editing && canManage) {
 return (
 <div className="space-y-2">
 <p className="text-xs text-slate-500">Paste an embed URL (Power BI, Google Sheets, reports, dashboards…)</p>
 <input value={draft} onChange={e => setDraft(e.target.value)} placeholder="https://app.powerbi.com/…"
 className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-800 focus:outline-none focus:border-blue-400"/>
 <div className="flex gap-1.5 justify-end">
 <button onClick={() => setEditing(false)} className="px-3 py-1.5 text-xs text-slate-500 hover:bg-slate-100 rounded-lg">Cancel</button>
 <button onClick={() => { onUpdate({ content: draft }); setEditing(false); }} className="px-3 py-1.5 text-xs bg-blue-600 text-white rounded-lg hover:bg-blue-700">Embed</button>
 </div>
 </div>
 );
 }
 if (!widget.content) return <div className="text-xs text-slate-300 italic">No URL configured</div>;
 return (
 <div className="group relative">
 <iframe src={widget.content} className="w-full h-64 rounded-xl border border-slate-200"title={widget.title} sandbox="allow-scripts allow-same-origin allow-popups"/>
 {canManage && (
 <button onClick={() => setEditing(true)} className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 p-1.5 rounded-lg bg-white shadow text-slate-400 transition-opacity">
 <Edit3 size={12}/>
 </button>
 )}
 </div>
 );
}

// ── Main WidgetRenderer ───────────────────────────────────────────────────────
export function WidgetRenderer({
 widget, col, cell, canManage, userId, userName,
 workspaceHook, onUpdate,
}: {
 widget: LayoutWidget;
 col: LayoutColumn;
 cell: string;
 canManage: boolean;
 userId?: string;
 userName?: string;
 workspaceHook?: ReturnType<typeof useWorkspace>;
 onUpdate: (patch: Partial<LayoutWidget>) => void;
}) {
 switch (widget.type) {
 case 'kpi':
 return <EditableKPI widget={widget} onUpdate={onUpdate} canManage={canManage}/>;

 case 'text':
 return <EditableText widget={widget} onUpdate={onUpdate} canManage={canManage}/>;

 case 'announcements':
 return <AnnouncementsWidget widget={widget} onUpdate={onUpdate} canManage={canManage}/>;

 case 'quick_links':
 return <QuickLinksWidget widget={widget} onUpdate={onUpdate} canManage={canManage}/>;

 case 'embed':
 case 'google_sheet':
 return <EmbedWidget widget={widget} onUpdate={onUpdate} canManage={canManage}/>;

 case 'staff':
 return <CellStaffRoster cell={cell}/>;

 case 'approval_queue':
 return <ApprovalQueue cell={cell}/>;

 case 'staff_requests':
 return <StaffRequestPanel cell={cell}/>;

 case 'shared_table':
 return <SharedTablesView cell={cell}/>;

 case 'activity':
 return <CellActivityDashboard cell={cell}/>;

    case 'table': {
      if (!workspaceHook) return <p className="text-xs text-slate-400">Workspace not loaded</p>;
      if (!widget.tableId) {
        const available = workspaceHook.ws.tables.filter((t: any) => !t.deletedAt);
        if (available.length === 0) return (
          <div className="flex flex-col items-center gap-2 py-6 text-center">
            <Table2 size={20} className="text-slate-300"/>
            <p className="text-xs font-semibold text-slate-500">No tables yet</p>
            <p className="text-[10px] text-slate-400">Open "Tables & Data" below to create your first table</p>
          </div>
        );
        return (
          <div className="space-y-2">
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Select table to display:</p>
            <div className="space-y-1.5">
              {available.map((t: any) => (
                <button key={t.id} onClick={() => onUpdate({ tableId: t.id, title: t.name })}
                  className="w-full flex items-center gap-2.5 px-3 py-2.5 bg-slate-50 hover:bg-rail-50 border border-slate-200 hover:border-rail-300 rounded-xl text-left transition-all group">
                  <Table2 size={14} className="text-rail-500 shrink-0"/>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold text-slate-800 truncate">{t.name}</p>
                    <p className="text-[10px] text-slate-400">{t.rows?.length ?? 0} rows · {t.fields?.length ?? 0} cols</p>
                  </div>
                  <span className="text-[10px] text-rail-600 font-bold opacity-0 group-hover:opacity-100 transition-opacity">Select →</span>
                </button>
              ))}
            </div>
          </div>
        );
      }
      const tbl = workspaceHook.ws.tables.find((t: any) => t.id === widget.tableId);
      if (!tbl) return (
        <div className="space-y-1.5">
          <p className="text-xs text-amber-600">Table not found — it may have been deleted.</p>
          <button onClick={() => onUpdate({ tableId: undefined })} className="text-xs text-rail-600 hover:underline">← Choose a different table</button>
        </div>
      );
      return (
        <div>
          {canManage && (
            <div className="flex justify-end mb-2">
              <button onClick={() => onUpdate({ tableId: undefined })} className="text-[10px] text-slate-400 hover:text-slate-600 flex items-center gap-1 hover:underline">
                <Table2 size={9}/> Change table
              </button>
            </div>
          )}
          <TableEngine table={tbl} hook={workspaceHook} cell={cell} canManage={canManage} userId={userId} userName={userName}/>
        </div>
      );
    }

 case 'chart':
 return (
 <div className="rounded-xl border border-dashed border-slate-200 flex items-center justify-center py-10 gap-2 text-slate-300">
 <TrendingUp size={16}/>
 <span className="text-xs">Connect a data source to show charts</span>
 </div>
 );

    case 'heading': {
      const level = (widget as any).headingLevel ?? 2;
      const sizes: Record<number, string> = { 1: 'text-2xl font-black', 2: 'text-xl font-bold', 3: 'text-lg font-semibold' };
      return (
        <div onClick={() => canManage && undefined} className="py-1">
          {level === 1 && <h1 className="text-2xl font-black text-slate-900">{(widget as any).richText ?? widget.title}</h1>}
          {level === 2 && <h2 className="text-xl font-bold text-slate-900">{(widget as any).richText ?? widget.title}</h2>}
          {level === 3 && <h3 className="text-lg font-semibold text-slate-900">{(widget as any).richText ?? widget.title}</h3>}
        </div>
      );
    }

    case 'divider':
      return <div className="border-t border-slate-200 my-2"/>;

    case 'callout': {
      const col = (widget as any).calloutColor ?? 'amber';
      const colors: Record<string, string> = {
        blue: 'bg-blue-50 border-blue-200', amber: 'bg-amber-50 border-amber-200',
        emerald: 'bg-emerald-50 border-emerald-200', red: 'bg-red-50 border-red-200',
      };
      return (
        <div className={`flex gap-3 p-3.5 rounded-xl border \${colors[col] ?? colors.amber}`}>
          <span className="text-xl shrink-0">{(widget as any).calloutIcon ?? '💡'}</span>
          <p className="text-sm text-slate-700 leading-relaxed flex-1">{(widget as any).richText ?? widget.title}</p>
        </div>
      );
    }

    case 'toggle': {
      const ToggleW = () => {
        const [open, setOpen] = React.useState<boolean>((widget as any).toggleOpen ?? true);
        return (
          <div>
            <button onClick={() => setOpen(o => !o)} className="flex items-center gap-2 text-sm font-semibold text-slate-800 w-full text-left hover:bg-slate-50 rounded-lg px-2 py-1.5 -mx-2">
              <ChevronRight size={14} className={`text-slate-400 transition-transform \${open ? 'rotate-90' : ''}`}/>
              {widget.title}
            </button>
            {open && <div className="pl-5 mt-1.5 text-sm text-slate-600 leading-relaxed">{(widget as any).richText || <span className="text-slate-300 italic">Click ⚙ Edit to add content</span>}</div>}
          </div>
        );
      };
      return <ToggleW/>;
    }

    case 'checklist': {
      const CLW = () => {
        const [items, setItems] = React.useState<Array<{id:string;text:string;done:boolean}>>((widget as any).checklistItems ?? []);
        const [newText, setNewText] = React.useState('');
        const save = (next: typeof items) => { setItems(next); if (onUpdate) onUpdate({ checklistItems: next } as any); };
        return (
          <div className="space-y-2">
            {items.map(item => (
              <div key={item.id} className="flex items-center gap-2 group">
                <button onClick={() => save(items.map(i => i.id !== item.id ? i : { ...i, done: !i.done }))}
                  className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-colors \${item.done ? 'bg-emerald-500 border-emerald-500' : 'border-slate-300 hover:border-rail-400'}`}>
                  {item.done && <Check size={10} className="text-white"/>}
                </button>
                <span className={`flex-1 text-sm \${item.done ? 'line-through text-slate-400' : 'text-slate-700'}`}>{item.text}</span>
                {canManage && <button onClick={() => save(items.filter(i => i.id !== item.id))} className="opacity-0 group-hover:opacity-100 p-1 text-slate-300 hover:text-red-500">✕</button>}
              </div>
            ))}
            {canManage && (
              <div className="flex gap-2 mt-2">
                <input value={newText} onChange={e => setNewText(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && newText.trim()) { save([...items, { id: `c\${Date.now()}`, text: newText.trim(), done: false }]); setNewText(''); }}}
                  placeholder="Add item…" className="flex-1 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:border-rail-400"/>
                <button onClick={() => { if (newText.trim()) { save([...items, { id: `c\${Date.now()}`, text: newText.trim(), done: false }]); setNewText(''); }}} disabled={!newText.trim()} className="px-3 py-1.5 text-xs bg-rail-600 text-white rounded-lg disabled:opacity-40">Add</button>
              </div>
            )}
          </div>
        );
      };
      return <CLW/>;
    }

    case 'google_links': {
      const { GoogleLinksRepo } = require('@/components/cell/GoogleLinksRepo');
      return <GoogleLinksRepo cell={widget.tableId ?? cell ?? 'default'}/>;
    }

    case 'powerbi': {
      const PBIW = () => {
        const [url, setUrl] = React.useState<string>((widget as any).embedUrl ?? '');
        const [editing, setEditing] = React.useState<boolean>(!(widget as any).embedUrl);
        if (editing) return (
          <div className="space-y-2">
            <input value={url} onChange={e => setUrl(e.target.value)} placeholder="Power BI embed URL"
              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-mono focus:outline-none focus:border-amber-400"/>
            <button onClick={() => { if (onUpdate) onUpdate({ embedUrl: url } as any); setEditing(false); }} disabled={!url.trim()}
              className="px-3 py-1.5 text-xs bg-amber-600 text-white rounded-lg disabled:opacity-40">Connect</button>
          </div>
        );
        return (
          <div className="space-y-2">
            <iframe src={url} className="w-full rounded-lg border" style={{ height: 320 }} allowFullScreen sandbox="allow-scripts allow-same-origin allow-popups allow-forms allow-presentation"/>
            {canManage && <button onClick={() => setEditing(true)} className="text-[10px] text-slate-400 hover:text-amber-600">Change URL</button>}
          </div>
        );
      };
      return <PBIW/>;
    }

    case 'embed': {
      const EBW = () => {
        const [url, setUrl] = React.useState<string>((widget as any).embedUrl ?? '');
        const [live, setLive] = React.useState<boolean>(!!(widget as any).embedUrl);
        if (!live) return (
          <div className="space-y-2">
            <input value={url} onChange={e => setUrl(e.target.value)} placeholder="https://..."
              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-mono focus:outline-none focus:border-rail-400"/>
            <button onClick={() => { if (onUpdate) onUpdate({ embedUrl: url } as any); setLive(true); }} disabled={!url.trim()}
              className="px-3 py-1.5 text-xs bg-rail-600 text-white rounded-lg disabled:opacity-40">Embed</button>
          </div>
        );
        return <iframe src={url} className="w-full rounded-lg border" style={{ height: 400 }} allowFullScreen/>;
      };
      return <EBW/>;
    }

 default:
 return <p className="text-xs text-slate-300 italic">Unknown widget type: {widget.type}</p>;
 }
}
