'use client';
import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BarChart3, Link2, X, AlertCircle, ExternalLink,
  Maximize2, Minimize2, RefreshCw, GripHorizontal,
  Cloud, Monitor, ClipboardPaste, CheckCircle2, Settings,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useCloudConfig } from '@/lib/config/useCloudConfig';
import { useAuthStore } from '@/store/authStore';

interface PowerBIEmbedProps {
  storageKey: string;
  title: string;
  canEdit: boolean;
}

interface PBIConfig {
  reportName: string;
  embedUrl: string;
  workspaceId?: string;
  reportId?: string;
  refreshMinutes: number;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

function toEmbedUrl(url: string): string {
  if (!url) return '';
  if (url.includes('app.powerbi.com') && !url.includes('reportEmbed')) {
    return url.includes('?') ? `${url}&actionBarEnabled=true` : `${url}?actionBarEnabled=true`;
  }
  return url;
}

// ── Inline modal — no createPortal, no mounted guard ─────────────────────────
function ConnectModal({
  title, config, onSave, onClose, onDisconnect, isSaving,
}: {
  title: string;
  config: PBIConfig | null;
  onSave: (cfg: PBIConfig) => void;
  onClose: () => void;
  onDisconnect?: () => void;
  isSaving: boolean;
}) {
  const [reportName,      setReportName]      = useState(config?.reportName ?? title);
  const [embedUrl,        setEmbedUrl]        = useState(config?.embedUrl ?? '');
  const [workspaceId,     setWorkspaceId]     = useState(config?.workspaceId ?? '');
  const [reportId,        setReportId]        = useState(config?.reportId ?? '');
  const [refreshMinutes,  setRefreshMinutes]  = useState(config?.refreshMinutes ?? 30);
  const [urlValidation,   setUrlValidation]   = useState<'none'|'ok'|'warn'>('none');

  useEffect(() => {
    if (!embedUrl) { setUrlValidation('none'); return; }
    if (embedUrl.includes('powerbi.com')) setUrlValidation('ok');
    else setUrlValidation('warn');
  }, [embedUrl]);

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text.trim()) setEmbedUrl(text.trim());
    } catch { /* permission denied */ }
  };

  const handleSave = () => {
    if (!embedUrl.trim()) return;
    const { user } = useAuthStore.getState();
    onSave({
      reportName: reportName.trim() || title,
      embedUrl: embedUrl.trim(),
      workspaceId: workspaceId.trim() || undefined,
      reportId: reportId.trim() || undefined,
      refreshMinutes,
      createdBy: config?.createdBy ?? (user?.name ?? 'Admin'),
      createdAt: config?.createdAt ?? new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  };

  const isValid = embedUrl.trim().length > 0;

  const REFRESH_OPTIONS = [
    { v: 5, l: '5 minutes' }, { v: 15, l: '15 minutes' },
    { v: 30, l: '30 minutes' }, { v: 60, l: 'Hourly' },
  ];

  return (
    // Fullscreen overlay — rendered inline in component tree, no portal needed
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)' }}
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden"
        style={{ boxShadow: '0 25px 60px rgba(0,0,0,0.3)' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-100 flex items-center justify-center shrink-0">
              <BarChart3 size={18} className="text-amber-600"/>
            </div>
            <div>
              <p className="text-sm font-bold text-slate-900">Connect Power BI Report</p>
              <p className="text-[10px] text-slate-400">Configuration saved to Upstash · syncs across all devices</p>
            </div>
          </div>
          <button onClick={onClose}
            className="p-2 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors">
            <X size={16}/>
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4 max-h-[70vh] overflow-y-auto">
          {/* Report name */}
          <div>
            <label className="text-xs font-semibold text-slate-600 block mb-1.5">Report Name</label>
            <input value={reportName} onChange={e => setReportName(e.target.value)}
              placeholder="e.g. PRS Revenue Dashboard"
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-800 focus:outline-none focus:border-amber-400 focus:bg-white transition-colors"/>
          </div>

          {/* Embed URL — primary field */}
          <div>
            <label className="text-xs font-semibold text-slate-600 block mb-1.5">
              Power BI Embed URL <span className="text-red-500">*</span>
            </label>
            <div className="flex gap-2">
              <input value={embedUrl} onChange={e => setEmbedUrl(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && isValid) handleSave(); }}
                placeholder="https://app.powerbi.com/view?r=eyJ..."
                className={cn(
                  'flex-1 bg-slate-50 border rounded-xl px-3 py-2.5 text-sm text-slate-800 focus:outline-none focus:bg-white transition-colors font-mono',
                  urlValidation === 'ok'   && 'border-emerald-400 focus:border-emerald-500',
                  urlValidation === 'warn' && 'border-amber-400 focus:border-amber-500',
                  urlValidation === 'none' && 'border-slate-200 focus:border-amber-400',
                )}
              />
              <button onClick={handlePaste} title="Paste from clipboard"
                className="px-3 py-2.5 rounded-xl border border-slate-200 hover:bg-amber-50 hover:border-amber-300 text-slate-400 hover:text-amber-600 transition-all shrink-0">
                <ClipboardPaste size={15}/>
              </button>
            </div>
            {urlValidation === 'ok' && (
              <p className="text-[10px] text-emerald-600 mt-1.5 flex items-center gap-1">
                <CheckCircle2 size={10}/> Power BI URL detected
              </p>
            )}
            {urlValidation === 'warn' && (
              <p className="text-[10px] text-amber-600 mt-1.5 flex items-center gap-1">
                <AlertCircle size={10}/> This doesn't look like a Power BI URL — please verify
              </p>
            )}
          </div>

          {/* Optional fields */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-500 block mb-1.5">Workspace ID <span className="font-normal">(optional)</span></label>
              <input value={workspaceId} onChange={e => setWorkspaceId(e.target.value)}
                placeholder="xxxxxxxx-xxxx-..."
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-700 focus:outline-none focus:border-amber-400 focus:bg-white transition-colors font-mono"/>
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-500 block mb-1.5">Report ID <span className="font-normal">(optional)</span></label>
              <input value={reportId} onChange={e => setReportId(e.target.value)}
                placeholder="xxxxxxxx-xxxx-..."
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-700 focus:outline-none focus:border-amber-400 focus:bg-white transition-colors font-mono"/>
            </div>
          </div>

          {/* Auto refresh */}
          <div>
            <label className="text-xs font-semibold text-slate-600 block mb-1.5">Auto Refresh</label>
            <div className="grid grid-cols-4 gap-2">
              {REFRESH_OPTIONS.map(opt => (
                <button key={opt.v} onClick={() => setRefreshMinutes(opt.v)}
                  className={cn(
                    'py-2 rounded-xl text-xs font-semibold border transition-all',
                    refreshMinutes === opt.v
                      ? 'bg-amber-600 text-white border-amber-600'
                      : 'bg-white text-slate-500 border-slate-200 hover:border-amber-300 hover:text-amber-600'
                  )}>
                  {opt.l}
                </button>
              ))}
            </div>
          </div>

          {/* How to guide */}
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-3.5">
            <p className="text-[11px] font-bold text-amber-800 mb-2">How to get the embed URL:</p>
            <ol className="text-[11px] text-amber-700 space-y-1 list-decimal list-inside leading-relaxed">
              <li>Open your report in <strong>Power BI Service</strong> (app.powerbi.com)</li>
              <li>Click <strong>File → Embed report → Publish to web (public)</strong></li>
              <li>Copy the <strong>link URL</strong> (not the full iframe HTML)</li>
              <li>Paste it in the field above</li>
            </ol>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-5 py-3.5 border-t border-slate-100 bg-slate-50">
          <div>
            {onDisconnect && (
              <button onClick={() => { if (confirm('Remove this Power BI connection?')) onDisconnect(); }}
                className="text-xs text-red-500 hover:text-red-700 font-semibold transition-colors">
                Remove Report
              </button>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button onClick={onClose}
              className="px-4 py-2 text-xs text-slate-600 hover:bg-slate-200 rounded-xl transition-colors font-medium">
              Cancel
            </button>
            <button onClick={handleSave} disabled={!isValid || isSaving}
              className={cn(
                'flex items-center gap-1.5 px-5 py-2 text-xs font-bold rounded-xl transition-all',
                isValid && !isSaving
                  ? 'bg-amber-600 hover:bg-amber-700 text-white shadow-sm hover:shadow-md cursor-pointer'
                  : 'bg-slate-200 text-slate-400 cursor-not-allowed'
              )}>
              {isSaving
                ? <><RefreshCw size={12} className="animate-spin"/> Saving…</>
                : <><CheckCircle2 size={12}/> Save & Embed</>
              }
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Main PowerBIEmbed ─────────────────────────────────────────────────────────
export function PowerBIEmbed({ storageKey, title, canEdit }: PowerBIEmbedProps) {
  const { user } = useAuthStore();
  const [modalOpen,  setModalOpen]  = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [iframeKey,  setIframeKey]  = useState(0);
  const [loadError,  setLoadError]  = useState(false);
  const [isSaving,   setIsSaving]   = useState(false);
  const [savedOk,    setSavedOk]    = useState(false);

  // Cloud config — userId passed directly (not in useState)
  const cloud = useCloudConfig<PBIConfig>(storageKey, user?.id);
  const appliedRef = useRef<string>('');

  // Local config state — initialised from localStorage
  const [config, setConfig] = useState<PBIConfig | null>(() => {
    if (typeof window === 'undefined') return null;
    const raw = localStorage.getItem(storageKey);
    if (!raw) return null;
    try { return JSON.parse(raw) as PBIConfig; } catch { return null; }
  });

  // Apply Upstash value when it arrives (cross-device sync)
  useEffect(() => {
    if (!cloud.value || !user?.id) return;
    if (appliedRef.current === user.id) return;
    appliedRef.current = user.id;
    setConfig(cloud.value);
    if (typeof window !== 'undefined') {
      localStorage.setItem(storageKey, JSON.stringify(cloud.value));
    }
  }, [cloud.value, user?.id, storageKey]);

  useEffect(() => { appliedRef.current = ''; }, [user?.id]);

  // Resizable height
  const heightKey = `${storageKey}_height`;
  const [embedHeight, setEmbedHeight] = useState(720);
  useEffect(() => {
    const saved = typeof window !== 'undefined' ? localStorage.getItem(heightKey) : null;
    if (saved) setEmbedHeight(Number(saved));
  }, [heightKey]);

  const startResize = (e: React.MouseEvent) => {
    e.preventDefault();
    const startY = e.clientY, startH = embedHeight;
    const onMove = (ev: MouseEvent) => setEmbedHeight(Math.max(360, Math.min(1600, startH + ev.clientY - startY)));
    const onUp = () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
      setEmbedHeight(curr => { localStorage.setItem(heightKey, String(curr)); return curr; });
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  };

  const handleSave = useCallback(async (cfg: PBIConfig) => {
    setIsSaving(true);
    setConfig(cfg);
    if (typeof window !== 'undefined') localStorage.setItem(storageKey, JSON.stringify(cfg));
    try { await cloud.set(cfg); } catch (e) { console.error('PowerBI cloud.set error:', e); }
    // Write to shared namespace so all users see admin-configured Power BI URLs
    import('@/lib/config/sharedSync').then(({ sharedWrite }) => { sharedWrite(storageKey, cfg); });
    setIsSaving(false);
    setModalOpen(false);
    setSavedOk(true);
    setTimeout(() => setSavedOk(false), 3000);
  }, [storageKey, cloud]);

  const handleDisconnect = useCallback(async () => {
    setConfig(null);
    if (typeof window !== 'undefined') localStorage.removeItem(storageKey);
    try { await cloud.set(null); } catch { /* ignore */ }
    import('@/lib/config/sharedSync').then(({ sharedWrite }) => { sharedWrite(storageKey, null); });
    setModalOpen(false);
  }, [storageKey, cloud]);

  const SyncBadge = () => cloud.kvAvailable ? (
    <span className="inline-flex items-center gap-1 text-[9px] text-emerald-600 bg-emerald-50 border border-emerald-200 rounded-full px-1.5 py-0.5 font-semibold">
      <Cloud size={8}/> Cross-device
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 text-[9px] text-amber-600 bg-amber-50 border border-amber-200 rounded-full px-1.5 py-0.5 font-semibold">
      <Monitor size={8}/> Device only
    </span>
  );

  const url = config?.embedUrl ?? '';

  // ── No report — empty state ───────────────────────────────────────────────
  if (!url) {
    return (
      <>
        <div className="rounded-xl border-2 border-dashed border-slate-200 bg-white flex flex-col items-center justify-center gap-4 py-20 hover:border-amber-300 hover:bg-amber-50/20 transition-all">
          <div className="w-14 h-14 rounded-2xl bg-amber-100 flex items-center justify-center">
            <BarChart3 size={26} className="text-amber-500"/>
          </div>
          <div className="text-center">
            <p className="text-sm font-bold text-slate-700">{title}</p>
            <p className="text-xs text-slate-400 mt-1">No Power BI report connected yet</p>
          </div>
          {canEdit ? (
            <button
              type="button"
              onClick={() => { console.log('PowerBI modal open'); setModalOpen(true); }}
              className="flex items-center gap-2 px-6 py-3 rounded-xl bg-amber-600 hover:bg-amber-700 active:bg-amber-800 text-white text-sm font-bold transition-all shadow-md hover:shadow-lg cursor-pointer select-none"
              style={{ WebkitTapHighlightColor: 'transparent' }}
            >
              <Link2 size={15}/> Connect Power BI Report
            </button>
          ) : (
            <p className="text-xs text-slate-300 italic">Contact admin to connect a report</p>
          )}
          <SyncBadge/>
        </div>

        {/* Modal rendered inline — no portal, no mounted guard */}
        {modalOpen && (
          <ConnectModal
            title={title}
            config={null}
            onSave={handleSave}
            onClose={() => setModalOpen(false)}
            isSaving={isSaving}
          />
        )}
      </>
    );
  }

  // ── Report connected ──────────────────────────────────────────────────────
  const embedSrc = toEmbedUrl(url);
  const lastUpdated = config?.updatedAt
    ? new Date(config.updatedAt).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
    : '';

  return (
    <>
      {/* Success toast */}
      {savedOk && (
        <div className="fixed top-4 right-4 z-[9999] bg-emerald-600 text-white px-4 py-3 rounded-xl shadow-lg flex items-center gap-2 text-sm font-semibold">
          <CheckCircle2 size={16}/> Power BI Report connected successfully
        </div>
      )}

      <div className={cn(
        'relative rounded-xl overflow-hidden border border-slate-200 bg-white',
        fullscreen && 'fixed inset-0 z-[200] rounded-none border-0'
      )}>
        {/* Toolbar */}
        <div className="flex items-center justify-between px-4 py-2.5 bg-white border-b border-slate-100">
          <div className="flex items-center gap-2.5 min-w-0">
            <BarChart3 size={14} className="text-amber-500 shrink-0"/>
            <div className="min-w-0">
              <p className="text-xs font-bold text-slate-800 truncate">{config?.reportName || title}</p>
              {lastUpdated && <p className="text-[9px] text-slate-400">Updated {lastUpdated}</p>}
            </div>
            <SyncBadge/>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <button onClick={() => { setIframeKey(k => k + 1); setLoadError(false); }} title="Reload"
              className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors">
              <RefreshCw size={12}/>
            </button>
            <a href={url} target="_blank" rel="noreferrer" title="Open in Power BI"
              className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors">
              <ExternalLink size={12}/>
            </a>
            {canEdit && (
              <button onClick={() => setModalOpen(true)} title="Edit connection"
                className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors">
                <Settings size={12}/>
              </button>
            )}
            <button onClick={() => setFullscreen(f => !f)} title={fullscreen ? 'Exit fullscreen' : 'Fullscreen'}
              className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors">
              {fullscreen ? <Minimize2 size={12}/> : <Maximize2 size={12}/>}
            </button>
          </div>
        </div>

        {/* iframe */}
        <div className="relative bg-slate-100"
          style={fullscreen ? { height: 'calc(100vh - 44px)' } : { height: embedHeight }}>
          {loadError ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-white">
              <AlertCircle size={28} className="text-red-400"/>
              <p className="text-sm font-semibold text-slate-600">Could not load the report</p>
              <p className="text-xs text-slate-400">Check the URL or Power BI sharing permissions</p>
              <button onClick={() => { setIframeKey(k => k + 1); setLoadError(false); }}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-amber-600 text-white text-xs font-semibold hover:bg-amber-700">
                <RefreshCw size={12}/> Try again
              </button>
            </div>
          ) : (
            <iframe key={iframeKey} src={embedSrc} title={config?.reportName || title}
              className="w-full h-full border-0" onError={() => setLoadError(true)}
              allowFullScreen
              sandbox="allow-scripts allow-same-origin allow-popups allow-forms allow-presentation"/>
          )}
        </div>

        {/* Resize handle */}
        {!fullscreen && (
          <div className="flex items-center justify-center py-1.5 bg-slate-50 border-t border-slate-100 gap-2 cursor-row-resize select-none"
            onMouseDown={startResize}>
            <GripHorizontal size={14} className="text-slate-300"/>
            <span className="text-[10px] text-slate-300">{embedHeight}px — drag to resize</span>
          </div>
        )}
      </div>

      {/* Edit modal — inline, no portal */}
      {modalOpen && (
        <ConnectModal
          title={title}
          config={config}
          onSave={handleSave}
          onClose={() => setModalOpen(false)}
          onDisconnect={handleDisconnect}
          isSaving={isSaving}
        />
      )}
    </>
  );
}
