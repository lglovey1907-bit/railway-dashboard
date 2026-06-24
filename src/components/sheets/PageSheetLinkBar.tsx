'use client';
import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
 FileSpreadsheet, Link2, RefreshCw, X, AlertCircle,
 CheckCircle2, Unlink, ChevronDown, ChevronUp
} from 'lucide-react';
import type { PageSheetState } from '@/lib/sheets/usePageSheet';
import { cn } from '@/lib/utils';

function timeAgo(iso: string | null): string {
 if (!iso) return '';
 const diff = Date.now() - new Date(iso).getTime();
 const s = Math.floor(diff / 1000);
 if (s < 10) return 'just now';
 if (s < 60) return `${s}s ago`;
 const m = Math.floor(s / 60);
 if (m < 60) return `${m}m ago`;
 const h = Math.floor(m / 60);
 return `${h}h ago`;
}

export function PageSheetLinkBar({
 sheet, canEdit, pageLabel, expectedFields,
}: {
 sheet: PageSheetState;
 canEdit: boolean;
 pageLabel: string;
 expectedFields: string[];
}) {
 const [modalOpen, setModalOpen] = useState(false);
 const [draftUrl, setDraftUrl] = useState(sheet.url);
 const [showFields, setShowFields] = useState(false);
 const [mounted, setMounted] = useState(false);

 useEffect(() => { setMounted(true); }, []);

 const openModal = () => { setDraftUrl(sheet.url); setModalOpen(true); };
 const save = () => { sheet.setUrl(draftUrl.trim()); setModalOpen(false); };
 const disconnect = () => { sheet.clear(); setModalOpen(false); };

 return (
 <>
 <div className="rounded-xl border border-slate-900/8 bg-white backdrop-blur-sm overflow-hidden mb-3"style={{ boxShadow: 'var(--shadow-sm)' }}>
 <div className="flex items-center justify-between px-3.5 py-2 flex-wrap gap-2">
 <div className="flex items-center gap-2.5 min-w-0">
 <div className={cn('w-6 h-6 rounded-lg flex items-center justify-center border shrink-0',
 sheet.url ? 'bg-emerald-500/15 border-emerald-500/30' : 'bg-slate-900/5 border-slate-900/10 ')}>
 <FileSpreadsheet size={12} className={sheet.url ? 'text-emerald-600 ' : 'text-slate-800/30 '}/>
 </div>
 <div className="flex items-center gap-2 min-w-0">
 <p className="text-slate-800/60 text-xs font-medium whitespace-nowrap">
 {sheet.url ? 'Google Sheet connected' : 'No data source connected'}
 </p>
 {sheet.url ? (
 <>
 {sheet.loading ? (
 <span className="text-amber-600 text-[10px] flex items-center gap-1 shrink-0"><RefreshCw size={9} className="animate-spin"/> Syncing…</span>
 ) : sheet.error ? (
 <span className="text-red-600 text-[10px] flex items-center gap-1 truncate"><AlertCircle size={9} className="shrink-0"/> {sheet.error}</span>
 ) : (
 <span className="text-emerald-600 text-[10px] flex items-center gap-1 shrink-0"><CheckCircle2 size={9}/> {sheet.rows.length} rows · {timeAgo(sheet.fetchedAt)}</span>
 )}
 </>
 ) : (
 <span className="text-slate-800/25 text-[10px] shrink-0">— cards show"NA"until linked</span>
 )}
 </div>
 </div>

 <div className="flex items-center gap-1.5 shrink-0">
 {sheet.url && (
 <button onClick={sheet.refetch} disabled={sheet.loading}
 className="p-1.5 rounded-lg hover:bg-slate-900/10 text-slate-800/30 hover:text-slate-800/60 transition-colors disabled:opacity-40">
 <RefreshCw size={12} className={sheet.loading ? 'animate-spin' : ''}/>
 </button>
 )}
 {canEdit && (
 <button onClick={openModal}
 className={cn('flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-medium transition-colors border',
 sheet.url
 ? 'bg-slate-900/5 border-slate-900/10 text-slate-800/40 hover:bg-slate-900/10 hover:text-slate-800/60 '
 : 'bg-emerald-600/20 border-emerald-500/30 text-emerald-700 hover:bg-emerald-600/30')}>
 <Link2 size={10}/> {sheet.url ? 'Manage' : 'Connect Sheet'}
 </button>
 )}
 </div>
 </div>

 {/* Expected fields reference — collapsed by default, subtle */}
 <button onClick={() => setShowFields(s => !s)}
 className="w-full flex items-center justify-between px-3.5 py-1 border-t border-slate-900/5 text-slate-800/20 text-[9px] hover:bg-slate-900/3 transition-colors">
 <span>Expected columns ({expectedFields.length})</span>
 {showFields ? <ChevronUp size={9}/> : <ChevronDown size={9}/>}
 </button>
 {showFields && (
 <div className="px-3.5 pb-2.5 pt-1 flex flex-wrap gap-1.5 border-t border-slate-900/5">
 {expectedFields.map(f => (
 <span key={f} className="text-[9px] bg-slate-900/5 border border-slate-900/8 rounded px-1.5 py-0.5 text-slate-800/40 font-mono">{f}</span>
 ))}
 </div>
 )}
 </div>

 {/* Connect/manage modal — rendered via portal to escape transformed ancestors (e.g. animated tab panels) */}
 {mounted && createPortal(
 <AnimatePresence>
 {modalOpen && (
 <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
 className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
 onClick={() => setModalOpen(false)}>
 <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
 className="bg-slate-900 border border-slate-900/10 rounded-2xl p-6 w-full max-w-lg shadow-2xl"
 onClick={e => e.stopPropagation()}>
 <div className="flex items-center justify-between mb-1">
 <h3 className="text-slate-900 font-semibold flex items-center gap-2">
 <FileSpreadsheet size={16} className="text-emerald-600"/> Connect Page Data Source
 </h3>
 <button onClick={() => setModalOpen(false)} className="text-slate-800/30 hover:text-slate-800/60">
 <X size={16}/>
 </button>
 </div>
 <p className="text-slate-800/40 text-xs mb-4">
 One Google Sheet powers the entire <strong className="text-slate-800/60">{pageLabel}</strong> page — every card, table, and view reads from this single source.
 </p>

 <input value={draftUrl} onChange={e => setDraftUrl(e.target.value)}
 placeholder="https://docs.google.com/spreadsheets/d/..."
 className="w-full bg-slate-900/5 border border-slate-900/15 rounded-lg px-3 py-2.5 text-sm text-slate-800/80 focus:outline-none focus:border-blue-400/60 mb-4"/>

 <div className="rounded-xl border border-blue-500/20 bg-blue-500/5 p-3 mb-4 space-y-2">
 <p className="text-blue-700 text-[11px] font-semibold flex items-center gap-1.5">
 <AlertCircle size={11}/> Sheet format requirements
 </p>
 <ul className="text-slate-800/40 text-[10px] leading-relaxed space-y-1 list-disc list-inside">
 <li>Sharing set to <strong className="text-slate-800/60">"Anyone with the link → Viewer"</strong></li>
 <li>First row = column headers</li>
 <li>One column must be <strong className="text-slate-800/60">"Code"</strong> or <strong className="text-slate-800/60">"Station Code"</strong> — used to match each row to its station</li>
 <li>Any column the dashboard expects but the sheet doesn't have will simply show <strong className="text-slate-800/60">NA</strong> — no errors</li>
 <li>Updates in the sheet sync automatically (polling every 30s) — no need to re-paste the link</li>
 <li>If your sheet has multiple tabs, paste the URL while that <strong className="text-slate-800/60">specific tab is open</strong> — the link's <code className="bg-slate-900/10 px-1 rounded">#gid=...</code> tells the dashboard which tab to read</li>
 <li>Uploaded Excel (.xlsx) files: open the file in Drive at least once before connecting, so Google finishes indexing it as a Sheet</li>
 </ul>
 </div>

 <div className="flex items-center justify-between">
 {sheet.url ? (
 <button onClick={disconnect}
 className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-red-600 hover:bg-red-500/10 hover:text-red-600 transition-colors">
 <Unlink size={11}/> Disconnect
 </button>
 ) : <div/>}
 <div className="flex gap-2">
 <button onClick={() => setModalOpen(false)} className="px-4 py-1.5 rounded-lg text-xs text-slate-800/50 hover:bg-slate-900/5">Cancel</button>
 <button onClick={save} disabled={!draftUrl.trim()}
 className="px-4 py-1.5 rounded-lg text-xs bg-emerald-600/30 text-emerald-700 border border-emerald-500/30 hover:bg-emerald-600/50 disabled:opacity-40 disabled:cursor-not-allowed">
 Save & Sync
 </button>
 </div>
 </div>
 </motion.div>
 </motion.div>
 )}
 </AnimatePresence>,
 document.body
 )}
 </>
 );
}
