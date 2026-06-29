'use client';
import { useState } from 'react';
import { motion } from 'framer-motion';
import {
 X, ExternalLink, RefreshCw, CheckCircle2, AlertTriangle,
 Table2, Link2, Settings2, ChevronRight, Unlink, Clock,
 ArrowRight, Info, FileSpreadsheet, Share2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
 getGSheetConfig, saveGSheetConfig, clearGSheetConfig,
 fetchSheetData, normaliseSheetUrl, autoDetectColumns,
 syncGoogleSheet, clearImportHistory,
 type GSheetConfig, type GSheetColumnMap, type SyncResult,
} from '@/lib/integrations/googleSheets';

type Step = 'url' | 'map' | 'settings';

const REQUIRED_FIELDS: (keyof GSheetColumnMap)[] = ['name', 'email'];
const ALL_FIELDS: { key: keyof GSheetColumnMap; label: string; required?: boolean }[] = [
 { key: 'name', label: 'Full Name', required: true },
 { key: 'email', label: 'Email Address', required: true },
 { key: 'hrmsId', label: 'HRMS / Employee ID' },
 { key: 'mobile', label: 'Mobile Number' },
 { key: 'designation', label: 'Designation' },
 { key: 'workingAs', label: 'Working As' },
 { key: 'cell', label: 'Department / Cell' },
 { key: 'role', label: 'Role (user/incharge/admin)' },
];

function fmtTime(iso?: string) {
 if (!iso) return 'Never';
 return new Date(iso).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
}

export function GoogleSheetsModal({
 onClose,
 existingEmails,
 onAddUser,
 onSyncDone,
}: {
 onClose: () => void;
 existingEmails: Set<string>;
 onAddUser: (row: Record<string, string>) => void;
 onSyncDone: (result: SyncResult) => void;
}) {
 const saved = getGSheetConfig();
 const [step, setStep] = useState<Step>(saved ? 'settings' : 'url');

 // Step 1
 const [rawUrl, setRawUrl] = useState(saved?.sheetUrl ?? '');
 const [testing, setTesting] = useState(false);
 const [testError, setTestError] = useState<string>();

 // Step 2
 const [headers, setHeaders] = useState<string[]>(saved?.detectedHeaders ?? []);
 const [previewRows, setPreviewRows] = useState<string[][]>([]);
 const [colMap, setColMap] = useState<Partial<GSheetColumnMap>>(saved?.columnMap ?? {});

 // Step 3
 const [config, setConfig] = useState<GSheetConfig | null>(saved);
 const [syncing, setSyncing] = useState(false);
 const [syncResult, setSyncResult] = useState<SyncResult | null>(null);

 // ── Step 1: Test connection ────────────────────────────────────────────────
 const handleTest = async () => {
  if (!rawUrl.trim()) return;
  setTesting(true);
  setTestError(undefined);
  const gvizUrl = normaliseSheetUrl(rawUrl);
  const { headers: h, rows, error } = await fetchSheetData(gvizUrl);
  setTesting(false);
  if (error) {
   setTestError(error);
   return;
  }
  if (h.length === 0) {
   setTestError('Sheet appears to be empty or has no header row.');
   return;
  }
  setHeaders(h);
  setPreviewRows(rows.slice(0, 3));
  const detected = autoDetectColumns(h);
  setColMap(prev => ({ ...detected, ...prev }));
  setStep('map');
 };

 // ── Step 2: Save column mapping ───────────────────────────────────────────
 const handleSaveMap = () => {
  const gvizUrl = normaliseSheetUrl(rawUrl);
  const cfg: GSheetConfig = {
   sheetUrl:        rawUrl.trim(),
   gvizUrl,
   columnMap:       colMap as GSheetColumnMap,
   autoSync:        saved?.autoSync ?? true,
   detectedHeaders: headers,
   connectedAt:     saved?.connectedAt ?? new Date().toISOString(),
   lastSyncAt:      saved?.lastSyncAt,
   lastRowCount:    saved?.lastRowCount,
  };
  saveGSheetConfig(cfg);
  setConfig(cfg);
  setStep('settings');
 };

 // ── Step 3: Sync ──────────────────────────────────────────────────────────
 const handleSync = async () => {
  if (!config) return;
  setSyncing(true);
  setSyncResult(null);
  const result = await syncGoogleSheet(config, existingEmails, onAddUser);
  setSyncing(false);
  setSyncResult(result);
  setConfig(getGSheetConfig());
  onSyncDone(result);
 };

 const handleDisconnect = () => {
  clearGSheetConfig();
  setConfig(null);
  setRawUrl('');
  setHeaders([]);
  setColMap({});
  setStep('url');
  setSyncResult(null);
 };

 const mapValid = REQUIRED_FIELDS.every(f => colMap[f] !== undefined);

 return (
  <div
   className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
   onClick={onClose}>
   <motion.div
    initial={{ scale: 0.96, opacity: 0 }}
    animate={{ scale: 1, opacity: 1 }}
    className="bg-white border border-slate-200 rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
    onClick={e => e.stopPropagation()}>

    {/* ── Header ── */}
    <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 shrink-0">
     <div className="flex items-center gap-3">
      <div className="w-9 h-9 rounded-xl bg-emerald-100 border border-emerald-200 flex items-center justify-center">
       <FileSpreadsheet size={16} className="text-emerald-600"/>
      </div>
      <div>
       <h2 className="font-bold text-slate-900 text-sm">Google Sheets Integration</h2>
       <p className="text-xs text-slate-400">Sync new staff entries from a Google Sheet</p>
      </div>
     </div>
     <button onClick={onClose}><X size={18} className="text-slate-400"/></button>
    </div>

    {/* ── Step pills ── */}
    <div className="flex items-center gap-1 px-6 py-3 border-b border-slate-50 bg-slate-50/50 shrink-0">
     {([
      { id: 'url' as Step, label: 'Connect' },
      { id: 'map' as Step, label: 'Map Columns' },
      { id: 'settings' as Step, label: 'Sync' },
     ]).map((s, i) => {
      const disabled = (s.id === 'settings' && !config) || (s.id === 'map' && !headers.length);
      return (
       <div key={s.id} className="flex items-center gap-1">
        {i > 0 && <ChevronRight size={12} className="text-slate-300"/>}
        <button
         onClick={() => { if (!disabled) setStep(s.id); }}
         className={cn(
          'text-[10px] font-semibold px-2.5 py-1 rounded-full border transition-all',
          step === s.id
           ? 'bg-blue-600 text-white border-blue-600'
           : disabled
            ? 'text-slate-300 border-slate-200 cursor-default'
            : 'text-slate-500 border-slate-200 hover:border-slate-400 cursor-pointer',
         )}>
         {s.label}
        </button>
       </div>
      );
     })}
     {config && (
      <div className="ml-auto flex items-center gap-1.5 text-[10px] text-emerald-600 font-semibold">
       <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"/>
       Connected
      </div>
     )}
    </div>

    {/* ── Body ── */}
    <div className="flex-1 overflow-y-auto p-6">

     {/* ═══ STEP 1: URL ═══ */}
     {step === 'url' && (
      <div className="space-y-5">

       {/* NEW instructions — no publishing needed */}
       <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 space-y-3">
        <p className="text-sm font-bold text-emerald-900 flex items-center gap-2">
         <Share2 size={14}/> How to share your Google Sheet
        </p>
        <ol className="text-xs text-emerald-800 space-y-2 ml-1">
         <li className="flex items-start gap-2">
          <span className="w-5 h-5 rounded-full bg-emerald-200 text-emerald-800 text-[9px] font-bold flex items-center justify-center shrink-0 mt-0.5">1</span>
          Open your Google Sheet
         </li>
         <li className="flex items-start gap-2">
          <span className="w-5 h-5 rounded-full bg-emerald-200 text-emerald-800 text-[9px] font-bold flex items-center justify-center shrink-0 mt-0.5">2</span>
          Click <strong>Share</strong> (top-right corner)
         </li>
         <li className="flex items-start gap-2">
          <span className="w-5 h-5 rounded-full bg-emerald-200 text-emerald-800 text-[9px] font-bold flex items-center justify-center shrink-0 mt-0.5">3</span>
          Under "General access", change <em>Restricted</em> → <strong>Anyone with the link</strong>
         </li>
         <li className="flex items-start gap-2">
          <span className="w-5 h-5 rounded-full bg-emerald-200 text-emerald-800 text-[9px] font-bold flex items-center justify-center shrink-0 mt-0.5">4</span>
          Click <strong>Copy link</strong> → paste it below. That's it — no publishing needed!
         </li>
        </ol>
        <div className="rounded-lg border border-emerald-300 bg-white/60 px-3 py-2 flex items-start gap-2">
         <Info size={12} className="text-emerald-600 shrink-0 mt-0.5"/>
         <p className="text-[10px] text-emerald-700">
          No API key, no publishing required. Works with the standard share link.
         </p>
        </div>
       </div>

       {/* URL input */}
       <div>
        <label className="text-xs font-semibold text-slate-500 block mb-1.5 flex items-center gap-1">
         <Link2 size={10}/> Paste your Google Sheet link
        </label>
        <input
         value={rawUrl}
         onChange={e => { setRawUrl(e.target.value); setTestError(undefined); }}
         onKeyDown={e => { if (e.key === 'Enter' && rawUrl.trim()) handleTest(); }}
         placeholder="https://docs.google.com/spreadsheets/d/…"
         className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2.5 text-sm text-slate-800 focus:outline-none focus:border-blue-400 font-mono text-xs"
        />
        <p className="text-[10px] text-slate-400 mt-1">
         Any Google Sheets URL works — share link, edit link, or view link.
        </p>
       </div>

       {testError && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-3 flex items-start gap-2">
         <AlertTriangle size={14} className="text-red-500 shrink-0 mt-0.5"/>
         <div>
          <p className="text-xs font-semibold text-red-700">Connection failed</p>
          <p className="text-[11px] text-red-600 mt-0.5">{testError}</p>
          <p className="text-[10px] text-red-400 mt-1.5">
           Make sure you changed the sharing to <strong>"Anyone with the link can view"</strong>.
          </p>
         </div>
        </div>
       )}

       {/* Supported columns hint */}
       <div className="rounded-xl border border-slate-200 p-3">
        <p className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold mb-2 flex items-center gap-1">
         <Table2 size={9}/> Expected column headers
        </p>
        <div className="flex flex-wrap gap-1.5">
         {['name', 'email', 'hrmsId', 'mobile', 'designation', 'workingAs', 'cell', 'role'].map(f => (
          <code key={f} className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded">{f}</code>
         ))}
        </div>
        <p className="text-[10px] text-slate-400 mt-2">
         Headers are auto-detected (case-insensitive). You can also map columns manually in the next step.
        </p>
       </div>
      </div>
     )}

     {/* ═══ STEP 2: Map Columns ═══ */}
     {step === 'map' && (
      <div className="space-y-4">
       <p className="text-sm text-slate-600">
        Map your sheet columns to staff fields.
        <span className="text-emerald-600 font-semibold ml-1">
         {Object.values(colMap).filter(v => v !== undefined).length} of {headers.length} columns mapped.
        </span>
       </p>

       <div className="space-y-2">
        {ALL_FIELDS.map(({ key, label, required }) => (
         <div key={key} className="flex items-center gap-3">
          <div className="w-40 shrink-0">
           <p className="text-xs font-medium text-slate-700">{label}</p>
           {required && <p className="text-[9px] text-red-500">Required</p>}
          </div>
          <ArrowRight size={12} className="text-slate-300 shrink-0"/>
          <select
           value={colMap[key] !== undefined ? String(colMap[key]) : ''}
           onChange={e => setColMap(p => ({
            ...p,
            [key]: e.target.value === '' ? undefined : Number(e.target.value),
           }))}
           className={cn(
            'flex-1 bg-slate-50 border rounded-lg px-2.5 py-1.5 text-xs text-slate-700 focus:outline-none',
            required && colMap[key] === undefined
             ? 'border-red-300'
             : 'border-slate-300 focus:border-blue-400',
           )}>
           <option value="">— Not mapped —</option>
           {headers.map((h, i) => (
            <option key={i} value={i}>{String.fromCharCode(65 + i)}: {h}</option>
           ))}
          </select>
         </div>
        ))}
       </div>

       {previewRows.length > 0 && (
        <div>
         <p className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold mb-2">Sheet Preview (first 3 rows)</p>
         <div className="overflow-x-auto rounded-xl border border-slate-200">
          <table className="w-full text-[10px]">
           <thead>
            <tr className="bg-slate-50 border-b border-slate-200">
             {headers.map((h, i) => (
              <th key={i} className="px-2.5 py-2 text-left text-slate-500 font-semibold whitespace-nowrap">
               {String.fromCharCode(65 + i)}: {h}
              </th>
             ))}
            </tr>
           </thead>
           <tbody className="divide-y divide-slate-50">
            {previewRows.map((row, ri) => (
             <tr key={ri} className="hover:bg-slate-50/50">
              {headers.map((_, ci) => (
               <td key={ci} className="px-2.5 py-1.5 text-slate-600">{row[ci] ?? '—'}</td>
              ))}
             </tr>
            ))}
           </tbody>
          </table>
         </div>
        </div>
       )}
      </div>
     )}

     {/* ═══ STEP 3: Settings + Sync ═══ */}
     {step === 'settings' && config && (
      <div className="space-y-4">

       {/* Connection banner */}
       <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
        <div className="flex items-start justify-between">
         <div className="min-w-0">
          <p className="text-xs font-bold text-emerald-800 flex items-center gap-1.5">
           <CheckCircle2 size={13}/> Sheet Connected
          </p>
          <p className="text-[10px] text-emerald-600 mt-1 font-mono break-all line-clamp-2">
           {config.sheetUrl}
          </p>
         </div>
         <button
          onClick={handleDisconnect}
          className="text-[10px] text-red-500 hover:text-red-700 flex items-center gap-1 ml-3 shrink-0">
          <Unlink size={10}/> Disconnect
         </button>
        </div>
        <div className="grid grid-cols-2 gap-3 mt-3">
         <div>
          <p className="text-[9px] text-emerald-600 uppercase tracking-wider">Connected</p>
          <p className="text-[11px] text-emerald-800 font-semibold">{fmtTime(config.connectedAt)}</p>
         </div>
         <div>
          <p className="text-[9px] text-emerald-600 uppercase tracking-wider">Last Synced</p>
          <p className="text-[11px] text-emerald-800 font-semibold">{fmtTime(config.lastSyncAt)}</p>
         </div>
         {config.lastRowCount !== undefined && (
          <div>
           <p className="text-[9px] text-emerald-600 uppercase tracking-wider">Rows in Sheet</p>
           <p className="text-[11px] text-emerald-800 font-semibold">{config.lastRowCount}</p>
          </div>
         )}
        </div>
       </div>

       {/* Approval flow */}
       <div className="rounded-xl border border-blue-100 bg-blue-50/60 p-4">
        <p className="text-xs font-bold text-blue-800 mb-2 flex items-center gap-1.5">
         <Info size={12}/> How Approval Works
        </p>
        <div className="space-y-1.5">
         {[
          'New rows in the sheet → imported as Pending users',
          'Admin / Incharge reviews in User Management → assigns cell + approves',
          'User becomes Active and appears in the cell roster',
          'Already-imported emails are skipped on future syncs',
         ].map((t, i) => (
          <p key={i} className="text-[11px] text-blue-700 flex items-start gap-1.5">
           <span className="w-4 h-4 rounded-full bg-blue-200 text-blue-700 text-[9px] font-bold flex items-center justify-center shrink-0 mt-0.5">
            {i + 1}
           </span>
           {t}
          </p>
         ))}
        </div>
       </div>

       {/* Auto-sync toggle */}
       <div className="rounded-xl border border-slate-200 p-3 flex items-center justify-between">
        <div>
         <p className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
          <Clock size={12}/> Auto-sync on page load
         </p>
         <p className="text-[10px] text-slate-400">
          Automatically check for new rows when you visit User Management
         </p>
        </div>
        <button
         onClick={() => {
          const updated = { ...config, autoSync: !config.autoSync };
          saveGSheetConfig(updated);
          setConfig(updated);
         }}
         className={cn('relative w-10 h-5 rounded-full transition-colors shrink-0', config.autoSync ? 'bg-blue-600' : 'bg-slate-300')}>
         <div className={cn('absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all', config.autoSync ? 'left-5' : 'left-0.5')}/>
        </button>
       </div>

       {/* Column mapping summary */}
       <div className="rounded-xl border border-slate-200 p-3">
        <div className="flex items-center justify-between mb-2">
         <p className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold flex items-center gap-1">
          <Table2 size={9}/> Column Mapping
         </p>
         <button onClick={() => setStep('map')} className="text-[10px] text-blue-500 hover:text-blue-700">
          Edit
         </button>
        </div>
        <div className="grid grid-cols-2 gap-1.5">
         {ALL_FIELDS.filter(f => config.columnMap[f.key] !== undefined).map(({ key, label }) => {
          const idx = config.columnMap[key]!;
          const header = config.detectedHeaders?.[idx] ?? `Col ${String.fromCharCode(65 + idx)}`;
          return (
           <div key={key} className="flex items-center gap-1 text-[10px]">
            <span className="text-slate-500 w-24 shrink-0">{label}</span>
            <ArrowRight size={9} className="text-slate-300 shrink-0"/>
            <code className="text-slate-600 bg-slate-100 px-1 rounded text-[9px]">{header}</code>
           </div>
          );
         })}
        </div>
       </div>

       {/* Sync result */}
       {syncResult && (
        <div className={cn('rounded-xl border p-3', syncResult.error ? 'border-red-200 bg-red-50' : syncResult.added > 0 ? 'border-emerald-200 bg-emerald-50' : 'border-amber-200 bg-amber-50')}>
         {syncResult.error ? (
          <p className="text-xs text-red-700 flex items-center gap-1.5">
           <AlertTriangle size={12}/> {syncResult.error}
          </p>
         ) : (
          <div className="space-y-2">
           <div className="flex items-center gap-3">
            <CheckCircle2 size={15} className={syncResult.added > 0 ? 'text-emerald-500 shrink-0' : 'text-amber-500 shrink-0'}/>
            <p className="text-xs text-slate-800 flex-1">
             <span className="font-bold">{syncResult.added}</span> new user{syncResult.added !== 1 ? 's' : ''} added as Pending ·{' '}
             <span className="font-semibold">{syncResult.skipped}</span> already in system
            </p>
           </div>
           {syncResult.skipped > 0 && syncResult.added === 0 && (
            <p className="text-[10px] text-amber-700">
             All rows were previously imported. If users are not visible in User Management, use{' '}
             <button
              onClick={async () => {
               clearImportHistory();
               setSyncResult(null);
              }}
              className="underline font-semibold hover:text-amber-900">
              Re-import All
             </button>
             {' '}to reset and sync again.
            </p>
           )}
          </div>
         )}
        </div>
       )}
      </div>
     )}
    </div>

    {/* ── Footer ── */}
    <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100 shrink-0">
     <button onClick={onClose} className="px-4 py-2 text-sm text-slate-500 hover:bg-slate-100 rounded-xl">
      {step === 'settings' ? 'Close' : 'Cancel'}
     </button>

     <div className="flex items-center gap-2">
      {step === 'url' && (
       <button
        onClick={handleTest}
        disabled={!rawUrl.trim() || testing}
        className="px-4 py-2 text-sm bg-blue-600 text-white hover:bg-blue-700 rounded-xl flex items-center gap-1.5 disabled:opacity-40">
        {testing ? <RefreshCw size={13} className="animate-spin"/> : <Link2 size={13}/>}
        {testing ? 'Connecting…' : 'Test Connection'}
       </button>
      )}
      {step === 'map' && (
       <button
        onClick={handleSaveMap}
        disabled={!mapValid}
        className="px-4 py-2 text-sm bg-blue-600 text-white hover:bg-blue-700 rounded-xl flex items-center gap-1.5 disabled:opacity-40">
        <Settings2 size={13}/> Save & Continue
       </button>
      )}
      {step === 'settings' && (
       <button
        onClick={handleSync}
        disabled={syncing}
        className="px-4 py-2 text-sm bg-emerald-600 text-white hover:bg-emerald-700 rounded-xl flex items-center gap-1.5 disabled:opacity-40">
        {syncing ? <RefreshCw size={13} className="animate-spin"/> : <RefreshCw size={13}/>}
        {syncing ? 'Syncing…' : 'Sync Now'}
       </button>
      )}
     </div>
    </div>
   </motion.div>
  </div>
 );
}
