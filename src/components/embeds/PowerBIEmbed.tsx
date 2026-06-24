'use client';
import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { BarChart3, Link2, X, AlertCircle, ExternalLink, Maximize2, Minimize2, RefreshCw, GripHorizontal } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PowerBIEmbedProps {
 storageKey: string; // unique localStorage key, e.g. 'powerbi_revenue_prs'
 title: string; // shown in the connect modal, e.g."PRS Revenue Report"
 canEdit: boolean;
}

function toEmbedUrl(url: string): string {
 // Power BI"Publish to web"links already work directly in an iframe.
 // Regular"Share report"links need the embed parameter appended.
 if (url.includes('app.powerbi.com') && !url.includes('/reportEmbed')) {
 // Convert a standard report URL into its embed form where possible
 return url.includes('?') ? `${url}&actionBarEnabled=true` : `${url}?actionBarEnabled=true`;
 }
 return url;
}

export function PowerBIEmbed({ storageKey, title, canEdit }: PowerBIEmbedProps) {
 const [url, setUrl] = useState('');
 const [modalOpen, setModalOpen] = useState(false);
 const [draftUrl, setDraftUrl] = useState('');
 const [mounted, setMounted] = useState(false);
 const [fullscreen, setFullscreen] = useState(false);
 const [iframeKey, setIframeKey] = useState(0);
 const [loadError, setLoadError] = useState(false);

 // Resizable embed height — persisted per report so each tab remembers its own size
 const heightKey = `${storageKey}_height`;
 const [embedHeight, setEmbedHeight] = useState(720);
 const [resizing, setResizing] = useState(false);

 useEffect(() => {
 const saved = typeof window !== 'undefined' ? localStorage.getItem(heightKey) : null;
 if (saved) setEmbedHeight(Number(saved));
 }, [heightKey]);

 const startResize = (e: React.MouseEvent) => {
 e.preventDefault();
 setResizing(true);
 const startY = e.clientY;
 const startHeight = embedHeight;

 const onMove = (ev: MouseEvent) => {
 const next = Math.max(360, Math.min(1600, startHeight + (ev.clientY - startY)));
 setEmbedHeight(next);
 };
 const onUp = () => {
 setResizing(false);
 window.removeEventListener('mousemove', onMove);
 window.removeEventListener('mouseup', onUp);
 setEmbedHeight(curr => {
 if (typeof window !== 'undefined') localStorage.setItem(heightKey, String(curr));
 return curr;
 });
 };
 window.addEventListener('mousemove', onMove);
 window.addEventListener('mouseup', onUp);
 };

 const resetHeight = () => {
 setEmbedHeight(720);
 if (typeof window !== 'undefined') localStorage.setItem(heightKey, '720');
 };

 useEffect(() => { setMounted(true); }, []);

 useEffect(() => {
 const saved = typeof window !== 'undefined' ? localStorage.getItem(storageKey) : null;
 if (saved) setUrl(saved);
 }, [storageKey]);

 const save = () => {
 const trimmed = draftUrl.trim();
 setUrl(trimmed);
 setLoadError(false);
 if (typeof window !== 'undefined') {
 if (trimmed) localStorage.setItem(storageKey, trimmed);
 else localStorage.removeItem(storageKey);
 }
 setModalOpen(false);
 };

 const disconnect = () => {
 setUrl('');
 if (typeof window !== 'undefined') localStorage.removeItem(storageKey);
 setModalOpen(false);
 };

 const refresh = () => { setIframeKey(k => k + 1); setLoadError(false); };

 if (!url) {
 return (
 <>
 <div className="rounded-2xl border border-slate-900/8 bg-slate-900/3 flex flex-col items-center justify-center gap-3 py-16">
 <BarChart3 size={36} className="text-blue-600"/>
 <p className="text-slate-800/50 text-sm font-medium">No Power BI report connected</p>
 <p className="text-slate-800/25 text-xs max-w-md text-center leading-relaxed">
 {canEdit
 ? 'Embed a Power BI report here using its"Publish to web"or"Embed"link.'
 : 'Contact a Planning cell member or Admin to connect this report.'}
 </p>
 {canEdit && (
 <button onClick={() => { setDraftUrl(''); setModalOpen(true); }}
 className="flex items-center gap-1.5 px-4 py-2 mt-1 rounded-xl text-xs font-medium bg-blue-600/20 border border-blue-500/30 text-blue-700 hover:bg-blue-600/30 transition-colors">
 <Link2 size={12}/> Connect Power BI Report
 </button>
 )}
 </div>
 {mounted && canEdit && createPortal(
 <ConnectModal open={modalOpen} title={title} draftUrl={draftUrl} setDraftUrl={setDraftUrl}
 onSave={save} onClose={() => setModalOpen(false)} onDisconnect={undefined}/>,
 document.body
 )}
 </>
 );
 }

 return (
 <div className={cn(fullscreen ? 'fixed inset-0 z-[150] bg-slate-950 p-4' : 'relative')}>
 <div className="flex items-center justify-between mb-2">
 <div className="flex items-center gap-2">
 <BarChart3 size={14} className="text-blue-600"/>
 <span className="text-slate-800/60 text-xs font-medium">{title}</span>
 {!fullscreen && (
 <span className="text-slate-800/20 text-[10px]">{embedHeight}px tall · drag bottom edge or corner to resize</span>
 )}
 </div>
 <div className="flex items-center gap-1.5">
 {!fullscreen && (
 <button onClick={resetHeight} className="px-2 py-1.5 rounded-lg text-[10px] font-medium text-slate-800/30 hover:bg-slate-900/10 hover:text-slate-800/60 transition-colors">
 Reset size
 </button>
 )}
 <button onClick={refresh} className="p-1.5 rounded-lg hover:bg-slate-900/10 text-slate-800/30 hover:text-slate-800/60 transition-colors">
 <RefreshCw size={12}/>
 </button>
 <a href={url} target="_blank"rel="noreferrer"className="p-1.5 rounded-lg hover:bg-slate-900/10 text-slate-800/30 hover:text-slate-800/60 transition-colors">
 <ExternalLink size={12}/>
 </a>
 {canEdit && (
 <button onClick={() => { setDraftUrl(url); setModalOpen(true); }}
 className="px-2.5 py-1.5 rounded-lg text-[11px] font-medium bg-slate-900/5 border border-slate-900/10 text-slate-800/40 hover:bg-slate-900/10 hover:text-slate-800/60 transition-colors">
 Manage
 </button>
 )}
 <button onClick={() => setFullscreen(f => !f)} className="p-1.5 rounded-lg hover:bg-slate-900/10 text-slate-800/30 hover:text-slate-800/60 transition-colors">
 {fullscreen ? <Minimize2 size={12}/> : <Maximize2 size={12}/>}
 </button>
 </div>
 </div>

 <div
 className={cn(
 'rounded-2xl border border-slate-900/8 overflow-hidden bg-slate-50 relative',
 fullscreen ? 'h-[calc(100%-2.5rem)] w-full' : 'w-full',
 resizing && 'select-none'
 )}
 style={fullscreen ? undefined : { height: embedHeight, minWidth: 320, resize: 'both', maxWidth: '100%' }}
 >
 {loadError ? (
 <div className="w-full h-full flex flex-col items-center justify-center gap-2 bg-slate-100">
 <AlertCircle size={28} className="text-red-600"/>
 <p className="text-slate-500 text-sm">Report failed to load</p>
 <p className="text-slate-400 text-xs max-w-sm text-center px-4">
 Make sure the link is a Power BI"Publish to web"embed URL, and that your organization allows embedding.
 </p>
 </div>
 ) : (
 <iframe key={iframeKey} src={toEmbedUrl(url)} title={title}
 className="w-full h-full border-0"allowFullScreen
 onError={() => setLoadError(true)} />
 )}

 {/* Custom drag handle for vertical resize — more discoverable than the native corner-only resize */}
 {!fullscreen && (
 <div onMouseDown={startResize}
 className={cn(
 'absolute bottom-0 left-0 right-0 h-3 flex items-center justify-center cursor-ns-resize group',
 'bg-gradient-to-t from-black/10 to-transparent hover:from-blue-500/20'
 )}>
 <GripHorizontal size={14} className="text-slate-400 group-hover:text-blue-500 transition-colors"/>
 </div>
 )}
 </div>

 {mounted && canEdit && createPortal(
 <ConnectModal open={modalOpen} title={title} draftUrl={draftUrl} setDraftUrl={setDraftUrl}
 onSave={save} onClose={() => setModalOpen(false)} onDisconnect={disconnect}/>,
 document.body
 )}
 </div>
 );
}

function ConnectModal({
 open, title, draftUrl, setDraftUrl, onSave, onClose, onDisconnect,
}: {
 open: boolean; title: string; draftUrl: string; setDraftUrl: (v: string) => void;
 onSave: () => void; onClose: () => void; onDisconnect?: () => void;
}) {
 return (
 <AnimatePresence>
 {open && (
 <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
 className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
 onClick={onClose}>
 <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
 className="bg-slate-900 border border-slate-900/10 rounded-2xl p-6 w-full max-w-lg shadow-2xl"
 onClick={e => e.stopPropagation()}>
 <div className="flex items-center justify-between mb-1">
 <h3 className="text-slate-900 font-semibold flex items-center gap-2">
 <BarChart3 size={16} className="text-blue-600"/> Connect Power BI Report
 </h3>
 <button onClick={onClose} className="text-slate-800/30 hover:text-slate-800/60"><X size={16}/></button>
 </div>
 <p className="text-slate-800/40 text-xs mb-4">
 Paste the embed link for <strong className="text-slate-800/60">{title}</strong>.
 </p>

 <input value={draftUrl} onChange={e => setDraftUrl(e.target.value)}
 placeholder="https://app.powerbi.com/view?r=..."
 className="w-full bg-slate-900/5 border border-slate-900/15 rounded-lg px-3 py-2.5 text-sm text-slate-800/80 focus:outline-none focus:border-blue-400/60 mb-4"/>

 <div className="rounded-xl border border-blue-500/20 bg-blue-500/5 p-3 mb-4 space-y-2">
 <p className="text-blue-700 text-[11px] font-semibold flex items-center gap-1.5">
 <AlertCircle size={11}/> How to get the right link
 </p>
 <ul className="text-slate-800/40 text-[10px] leading-relaxed space-y-1 list-disc list-inside">
 <li>In Power BI: open the report → <strong className="text-slate-800/60">File → Embed report → Publish to web (public)</strong>, or use your organization's secure embed link</li>
 <li>Copy the generated link (it looks like <span className="font-mono">https://app.powerbi.com/view?r=...</span>)</li>
 <li>Paste it above — the report stays live and updates automatically whenever the underlying Power BI dataset refreshes</li>
 <li>"Publish to web"makes the report visible to anyone with the link — only use it for non-sensitive reports, or use a secure org embed link instead for confidential data</li>
 </ul>
 </div>

 <div className="flex items-center justify-between">
 {onDisconnect ? (
 <button onClick={onDisconnect} className="px-3 py-1.5 rounded-lg text-xs text-red-600 hover:bg-red-500/10 hover:text-red-600 transition-colors">
 Disconnect
 </button>
 ) : <div/>}
 <div className="flex gap-2">
 <button onClick={onClose} className="px-4 py-1.5 rounded-lg text-xs text-slate-800/50 hover:bg-slate-900/5">Cancel</button>
 <button onClick={onSave} disabled={!draftUrl.trim()}
 className="px-4 py-1.5 rounded-lg text-xs bg-blue-600/30 text-blue-700 border border-blue-500/30 hover:bg-blue-600/50 disabled:opacity-40 disabled:cursor-not-allowed">
 Save & Embed
 </button>
 </div>
 </div>
 </motion.div>
 </motion.div>
 )}
 </AnimatePresence>
 );
}
