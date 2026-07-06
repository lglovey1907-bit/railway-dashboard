'use client';
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Search, Download, Eye, X, Filter, RefreshCw,
  ChevronDown, Printer, FileDown,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// ─── Types (must match WidgetRenderer HD shape) ────────────────────────────────
type CounterHead = {
  name: string; total: string; M: string; E: string; N: string;
  mpSanctioned: string; mpOnRoll: string; mpActual: string;
  extraFields: { key: string; value: string }[];
};
type CommercialItem = { name: string; earning: string; status: string };
type HD = {
  stationCode: string; stationName: string; category: string;
  state: string; section: string; cmi: string;
  date: string; division: string;
  ff: string[][];
  platforms: string; fob: string; waitingRooms: string;
  trains: string[][];
  counterHeads: CounterHead[];
  sanitation: string;
  commercial: CommercialItem[];
  primes: string[][];
  stationEarning: string[][];
  earningBifurcation: string;
};

// Row from the overview sheet (all string columns)
type OvRow = Record<string, string>;

// ─── Key helpers ──────────────────────────────────────────────────────────────
const ovCacheKey = 'sheet_nsg_category_wise_cache';

function findCol(headers: string[], keyword: string): string {
  const kw = keyword.toLowerCase();
  return headers.find(h => h.toLowerCase().includes(kw)) ?? '';
}

// ─── ViewModal ────────────────────────────────────────────────────────────────
function ViewModal({ hd, onClose }: { hd: HD; onClose: () => void }) {
  const FF_ROWS = ['UTS', 'PRS', 'Total'];
  const FF_COLS = ['Outward', 'Inward', 'PF', 'Total'];
  const TR_ROWS = ['Mail / Exp', 'Passenger', 'Total'];
  const TR_COLS = ['Orig.', 'Term.', 'Passing', 'Total'];
  const PR_ROWS = ['UTS', 'PRS', 'Total'];
  const PR_COLS = ['Tickets/day', 'Pax/day', 'Earning/day'];

  const TH = ({ cols }: { cols: string[] }) => (
    <tr className="bg-amber-600 text-white">
      {cols.map((c, i) => <th key={i} className="px-2 py-1 text-[10px] font-bold border border-amber-500 text-center whitespace-nowrap">{c}</th>)}
    </tr>
  );
  const TRow = ({ label, cells, hi }: { label: string; cells: string[]; hi?: boolean }) => (
    <tr className={hi ? 'bg-amber-50 font-semibold' : 'hover:bg-amber-50/40'}>
      <td className="px-2 py-1 text-[10px] border border-amber-200 font-medium text-slate-700 whitespace-nowrap">{label}</td>
      {cells.map((c, i) => <td key={i} className="px-2 py-1 text-[10px] text-center border border-amber-200 text-slate-700">{c || '—'}</td>)}
    </tr>
  );

  const handlePrint = () => {
    const win = window.open('', '_blank', 'width=900,height=700');
    if (!win) return;
    win.document.write(`<!DOCTYPE html><html><head><title>Handout - ${hd.stationName || hd.stationCode}</title>
<style>
  body{font-family:Arial,sans-serif;font-size:11px;padding:20px;color:#1e293b;}
  h2{font-size:12px;font-weight:bold;margin:12px 0 4px;text-transform:uppercase;letter-spacing:.05em;color:#64748b;}
  table{border-collapse:collapse;width:100%;margin-bottom:8px;}
  th{background:#d97706;color:#fff;padding:4px 6px;border:1px solid #b45309;font-size:10px;}
  td{padding:4px 6px;border:1px solid #d1d5db;font-size:10px;}
  .header{background:#d97706;color:#fff;padding:10px 14px;border-radius:8px;margin-bottom:12px;}
  .header h1{color:#fff;font-size:16px;margin:0 0 4px;}
  .header p{color:#fde68a;margin:2px 0;font-size:10px;}
  .counters{display:flex;border:1px solid #d1d5db;border-radius:6px;overflow:hidden;}
  .ch{flex:1;padding:6px 8px;border-right:1px solid #d1d5db;}
  .ch:last-child{border-right:none;}
  .ch-name{font-weight:bold;color:#b45309;font-size:10px;}
  @media print{body{padding:10px;}}
</style></head><body>
<div class="header">
  <h1>${hd.stationName}${hd.stationCode ? ` (${hd.stationCode})` : ''}</h1>
  <p>${[hd.category, hd.state, hd.section, hd.cmi ? `CMI: ${hd.cmi}` : ''].filter(Boolean).join(' · ')}</p>
  <p>${hd.division}${hd.date ? ` · As on ${hd.date}` : ''}</p>
</div>
${hd.ff.some(r => r.some(v => v)) ? `
<h2>Footfall / Day</h2>
<table><thead><tr><th></th>${FF_COLS.map(c => `<th>${c}</th>`).join('')}</tr></thead>
<tbody>${FF_ROWS.map((r, i) => `<tr><td>${r}</td>${hd.ff[i].map(v => `<td>${v || '—'}</td>`).join('')}</tr>`).join('')}</tbody></table>` : ''}
${hd.counterHeads.filter(ch => ch.name).length > 0 ? `
<h2>Counters & Manpower</h2>
<div class="counters">
${hd.counterHeads.filter(ch => ch.name).map(ch => `
  <div class="ch">
    <p class="ch-name">${ch.name}${ch.total ? ` - ${ch.total}` : ''}</p>
    ${ch.M ? `<p>M - ${ch.M}</p>` : ''}${ch.E ? `<p>E - ${ch.E}</p>` : ''}${ch.N ? `<p>N - ${ch.N}</p>` : ''}
    ${(ch.mpSanctioned || ch.mpOnRoll || ch.mpActual) ? `<p style="margin-top:4px;font-size:9px;color:#94a3b8">MANPOWER</p>
    ${ch.mpSanctioned ? `<p>S: ${ch.mpSanctioned}</p>` : ''}${ch.mpOnRoll ? `<p>OR: ${ch.mpOnRoll}</p>` : ''}${ch.mpActual ? `<p>AW: ${ch.mpActual}</p>` : ''}` : ''}
    ${ch.extraFields?.filter(ef => ef.key || ef.value).map(ef => `<p>${ef.key ? `${ef.key}: ` : ''}${ef.value}</p>`).join('') ?? ''}
  </div>`).join('')}
</div>` : ''}
${hd.sanitation ? `<h2>Sanitation</h2><p>${hd.sanitation}</p>` : ''}
${hd.commercial.some(c => c.name || c.earning) ? `
<h2>Commercial Earnings (₹ lakhs PA)</h2>
<table><thead><tr><th>Item</th><th>Earning</th><th>Status</th></tr></thead>
<tbody>${hd.commercial.filter(c => c.name || c.earning).map(c => `<tr><td>${c.name}</td><td>${c.earning ? `₹ ${c.earning}` : '—'}</td><td>${c.status || '—'}</td></tr>`).join('')}</tbody></table>` : ''}
${hd.primes.some(r => r.some(v => v)) ? `
<h2>PRIMES Data</h2>
<table><thead><tr><th></th>${PR_COLS.map(c => `<th>${c}</th>`).join('')}</tr></thead>
<tbody>${PR_ROWS.map((r, i) => `<tr><td>${r}</td>${hd.primes[i].map(v => `<td>${v || '—'}</td>`).join('')}</tr>`).join('')}</tbody></table>` : ''}
${hd.earningBifurcation ? `<h2>Earning Bifurcation</h2><p>${hd.earningBifurcation.replace(/\n/g, '<br>')}</p>` : ''}
<script>window.onload=()=>{window.print();window.close();}</script>
</body></html>`);
    win.document.close();
  };

  const handleExportCSV = () => {
    const rows: string[][] = [
      ['Station Handout', hd.stationName, hd.stationCode],
      ['Category', hd.category, 'State', hd.state, 'Section', hd.section, 'CMI', hd.cmi],
      ['Division', hd.division, 'As on', hd.date],
      [],
      ['--- FOOTFALL ---'],
      ['Type', 'Outward', 'Inward', 'PF', 'Total'],
      ['UTS', ...hd.ff[0]], ['PRS', ...hd.ff[1]], ['Total', ...hd.ff[2]],
      [],
      ['--- TRAINS ---'],
      ['Type', 'Orig', 'Term', 'Passing', 'Total'],
      ['Mail/Exp', ...hd.trains[0]], ['Passenger', ...hd.trains[1]], ['Total', ...hd.trains[2]],
      [],
      ['--- COUNTERS ---'],
      ['Head', 'Total', 'M', 'E', 'N', 'MP-Sanctioned', 'MP-OnRoll', 'MP-Actual'],
      ...hd.counterHeads.map(ch => [ch.name, ch.total, ch.M, ch.E, ch.N, ch.mpSanctioned, ch.mpOnRoll, ch.mpActual]),
      [],
      ['--- COMMERCIAL EARNINGS (₹ lakhs PA) ---'],
      ['Item', 'Earning', 'Status'],
      ...hd.commercial.map(ci => [ci.name, ci.earning, ci.status]),
    ];
    const csv = rows.map(r => r.map(c => `"${String(c ?? '').replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url; a.download = `handout_${hd.stationCode || 'station'}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
        {/* Modal header */}
        <div className="bg-amber-600 text-white px-5 py-4 flex items-start justify-between shrink-0">
          <div>
            <p className="font-bold text-base leading-tight">
              {hd.stationName}{hd.stationCode ? ` (${hd.stationCode})` : ''}
            </p>
            <p className="text-amber-100 text-xs mt-0.5">
              {[hd.category, hd.state, hd.section, hd.cmi ? `CMI: ${hd.cmi}` : '', hd.division].filter(Boolean).join(' · ')}
            </p>
            {hd.date && <p className="text-amber-200 text-[10px] mt-0.5">As on {hd.date}</p>}
          </div>
          <div className="flex items-center gap-1 shrink-0 ml-3">
            <button onClick={handlePrint} title="Print / PDF"
              className="p-1.5 rounded-lg bg-amber-700/50 hover:bg-amber-700 transition-colors">
              <Printer size={14}/>
            </button>
            <button onClick={handleExportCSV} title="Export CSV"
              className="p-1.5 rounded-lg bg-amber-700/50 hover:bg-amber-700 transition-colors">
              <FileDown size={14}/>
            </button>
            <button onClick={onClose} className="p-1.5 rounded-lg bg-amber-700/50 hover:bg-amber-700 transition-colors ml-1">
              <X size={14}/>
            </button>
          </div>
        </div>

        {/* Modal body */}
        <div className="overflow-y-auto p-4 space-y-3 text-xs">
          {/* Footfall */}
          {hd.ff.some(row => row.some(v => v)) && (
            <div>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1">Footfall / Day</p>
              <div className="overflow-x-auto rounded-lg border border-amber-200">
                <table className="text-[10px] w-full border-collapse">
                  <thead><TH cols={['', ...FF_COLS]}/></thead>
                  <tbody>{FF_ROWS.map((r, i) => <TRow key={r} label={r} cells={hd.ff[i]} hi={i === 2}/>)}</tbody>
                </table>
              </div>
            </div>
          )}
          {/* Infrastructure */}
          {(hd.platforms || hd.fob || hd.waitingRooms) && (
            <div>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1">Infrastructure</p>
              <div className="space-y-1">
                {[['Platforms', hd.platforms], ['FOB', hd.fob], ['Waiting Rooms', hd.waitingRooms]]
                  .filter(([, v]) => v).map(([l, v]) => (
                    <div key={l} className="bg-slate-50 rounded px-2.5 py-1.5 text-[11px]">
                      <span className="text-slate-400">{l}: </span>
                      <span className="font-semibold text-slate-700">{v}</span>
                    </div>
                  ))}
              </div>
            </div>
          )}
          {/* Trains */}
          {hd.trains.some(row => row.some(v => v)) && (
            <div>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1">Trains / Day</p>
              <div className="overflow-x-auto rounded-lg border border-amber-200">
                <table className="text-[10px] w-full border-collapse">
                  <thead><TH cols={['', ...TR_COLS]}/></thead>
                  <tbody>{TR_ROWS.map((r, i) => <TRow key={r} label={r} cells={hd.trains[i]} hi={i === 2}/>)}</tbody>
                </table>
              </div>
            </div>
          )}
          {/* Counters */}
          {hd.counterHeads.filter(ch => ch.name).length > 0 && (
            <div>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1">Counters & Manpower</p>
              <div className="overflow-x-auto">
                <div className="inline-flex border border-amber-200 rounded-lg overflow-hidden min-w-full">
                  {hd.counterHeads.filter(ch => ch.name).map((ch, i, arr) => (
                    <div key={i} className={`flex-1 min-w-[90px] p-2 ${i < arr.length - 1 ? 'border-r border-amber-200' : ''}`}>
                      <p className="text-[10px] font-bold text-amber-700 whitespace-nowrap">{ch.name}{ch.total ? ` - ${ch.total}` : ''}</p>
                      <div className="mt-0.5">
                        {ch.M && <p className="text-[10px] text-slate-600 leading-snug">M - {ch.M}</p>}
                        {ch.E && <p className="text-[10px] text-slate-600 leading-snug">E - {ch.E}</p>}
                        {ch.N && <p className="text-[10px] text-slate-600 leading-snug">N - {ch.N}</p>}
                      </div>
                      {(ch.mpSanctioned || ch.mpOnRoll || ch.mpActual) && (
                        <div className="mt-1 pt-1 border-t border-amber-100">
                          <p className="text-[9px] text-slate-400 uppercase tracking-wide mb-0.5">MP</p>
                          {ch.mpSanctioned && <p className="text-[9px] text-slate-500">S: <b>{ch.mpSanctioned}</b></p>}
                          {ch.mpOnRoll     && <p className="text-[9px] text-slate-500">OR: <b>{ch.mpOnRoll}</b></p>}
                          {ch.mpActual     && <p className="text-[9px] text-slate-500">AW: <b>{ch.mpActual}</b></p>}
                        </div>
                      )}
                      {Array.isArray(ch.extraFields) && ch.extraFields.filter(ef => ef.key || ef.value).map((ef, fi) => (
                        <p key={fi} className="text-[9px] text-slate-500 leading-snug mt-0.5">
                          {ef.key && <span className="font-medium">{ef.key}: </span>}{ef.value}
                        </p>
                      ))}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
          {/* Sanitation */}
          {hd.sanitation && (
            <div>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1">Sanitation</p>
              <div className="bg-slate-50 rounded px-2.5 py-2 text-[11px] text-slate-700 whitespace-pre-wrap">{hd.sanitation}</div>
            </div>
          )}
          {/* Commercial */}
          {hd.commercial.some(ci => ci.name || ci.earning || ci.status) && (
            <div>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1">Commercial Earnings (₹ lakhs PA)</p>
              <div className="rounded-lg border border-amber-200 overflow-hidden">
                <table className="text-[10px] w-full border-collapse">
                  <thead>
                    <tr className="bg-amber-50">
                      <th className="px-2 py-1 border border-amber-200 text-left font-semibold text-slate-600">Item</th>
                      <th className="px-2 py-1 border border-amber-200 text-center font-semibold text-slate-600">Earning</th>
                      <th className="px-2 py-1 border border-amber-200 text-left font-semibold text-slate-600">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {hd.commercial.filter(ci => ci.name || ci.earning || ci.status).map((ci, i) => (
                      <tr key={i} className="hover:bg-amber-50/40">
                        <td className="px-2 py-1 border border-amber-200 font-medium text-slate-700">{ci.name || '—'}</td>
                        <td className="px-2 py-1 border border-amber-200 text-center text-slate-700">{ci.earning ? `₹ ${ci.earning}` : '—'}</td>
                        <td className="px-2 py-1 border border-amber-200 text-slate-600">{ci.status || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
          {/* PRIMES */}
          {hd.primes.some(row => row.some(v => v)) && (
            <div>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1">PRIMES Data</p>
              <div className="overflow-x-auto rounded-lg border border-amber-200">
                <table className="text-[10px] w-full border-collapse">
                  <thead><TH cols={['', ...PR_COLS]}/></thead>
                  <tbody>{PR_ROWS.map((r, i) => <TRow key={r} label={r} cells={hd.primes[i]} hi={i === 2}/>)}</tbody>
                </table>
              </div>
            </div>
          )}
          {/* Station Earning */}
          {hd.stationEarning.some(row => row.some(v => v)) && (
            <div>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1">Counter / Station Earning</p>
              <div className="overflow-x-auto rounded-lg border border-amber-200">
                <table className="text-[10px] w-full border-collapse">
                  <thead><TH cols={['', ...PR_COLS]}/></thead>
                  <tbody>{PR_ROWS.map((r, i) => <TRow key={r} label={r} cells={hd.stationEarning[i]} hi={i === 2}/>)}</tbody>
                </table>
              </div>
            </div>
          )}
          {/* Earning Bifurcation */}
          {hd.earningBifurcation && (
            <div>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1">Earning Bifurcation</p>
              <div className="bg-slate-50 rounded px-2.5 py-2 text-[11px] text-slate-700 whitespace-pre-wrap font-mono">{hd.earningBifurcation}</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Main HandoutDirectoryTab ──────────────────────────────────────────────────
export function HandoutDirectoryTab({ initialCode }: { initialCode?: string }) {
  const [ovRows,    setOvRows]    = useState<OvRow[]>([]);
  const [ovHeaders, setOvHeaders] = useState<string[]>([]);
  const [handouts,  setHandouts]  = useState<Record<string, HD>>({});
  const [search,    setSearch]    = useState('');
  const [filterSec, setFilterSec] = useState('');
  const [filterCMI, setFilterCMI] = useState('');
  const [viewHD,    setViewHD]    = useState<HD | null>(null);

  // ── Load overview sheet cache (localStorage → Upstash fallback) ───────────
  const loadOvCache = useCallback(() => {
    if (typeof window === 'undefined') return;
    // Try localStorage first
    try {
      const raw = localStorage.getItem(ovCacheKey);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed?.rows?.length) {
          setOvRows(parsed.rows);
          setOvHeaders(parsed.headers ?? []);
          return;
        }
      }
    } catch { /* ignore */ }
    // Fallback: read from Upstash (cross-device — fresh Windows device)
    import('@/lib/config/sharedSync').then(({ sharedRead }) => {
      sharedRead(ovCacheKey).then((val: unknown) => {
        if (!val || typeof val !== 'object') return;
        const cached = val as { rows: OvRow[]; headers: string[] };
        if (!Array.isArray(cached.rows) || cached.rows.length === 0) return;
        setOvRows(cached.rows);
        setOvHeaders(cached.headers ?? []);
        try { localStorage.setItem(ovCacheKey, JSON.stringify(cached)); } catch { /* quota */ }
      }).catch(() => {});
    }).catch(() => {});
  }, []);

  // ── Load all handout data from Upstash (server-side, cross-device) ─────────
  const loadHandouts = useCallback(() => {
    if (typeof window === 'undefined') return;
    import('@/lib/config/sharedSync').then(({ sharedRead }) => {
      // Read the codes index first, then fetch each handout
      sharedRead('handout_codes').then((codesVal: unknown) => {
        const codes: string[] = Array.isArray(codesVal) ? codesVal : [];
        if (codes.length === 0) return;
        const result: Record<string, HD> = {};
        let remaining = codes.length;
        codes.forEach(code => {
          sharedRead(`handout_${code}`).then((val: unknown) => {
            if (val && typeof val === 'object') {
              const hd = val as HD;
              const c = (hd.stationCode ?? code).toUpperCase().trim();
              if (c) result[c] = hd;
            }
          }).catch(() => {}).finally(() => {
            remaining--;
            if (remaining === 0) setHandouts({ ...result });
          });
        });
      }).catch(() => {});
    }).catch(() => {});
  }, []);

  useEffect(() => { loadOvCache(); loadHandouts(); }, [loadOvCache, loadHandouts]);

  // ── Column detection ───────────────────────────────────────────────────────
  const colCode  = useMemo(() => findCol(ovHeaders, 'code'),    [ovHeaders]);
  const colName  = useMemo(() => findCol(ovHeaders, 'name'),    [ovHeaders]);
  const colCat   = useMemo(() => findCol(ovHeaders, 'categor'), [ovHeaders]);
  const colState = useMemo(() => findCol(ovHeaders, 'state'),   [ovHeaders]);
  const colSec   = useMemo(() => findCol(ovHeaders, 'section'), [ovHeaders]);
  const colCMI   = useMemo(() => findCol(ovHeaders, 'cmi'),     [ovHeaders]);

  // ── Build skeleton HD from an Overview row ────────────────────────────────
  const buildHDFromRow = useCallback((key: string, row: OvRow): HD => ({
    stationCode:  String(row[colCode]  ?? key),
    stationName:  colName  ? String(row[colName]  ?? '') : '',
    category:     colCat   ? String(row[colCat]   ?? '') : '',
    state:        colState ? String(row[colState] ?? '') : '',
    section:      colSec   ? String(row[colSec]   ?? '') : '',
    cmi:          colCMI   ? String(row[colCMI]   ?? '') : '',
    date: '', division: 'Delhi Division',
    ff: [['','','',''],['','','',''],['','','','']],
    platforms: '', fob: '', waitingRooms: '',
    trains: [['','','',''],['','','',''],['','','','']],
    counterHeads: [], sanitation: '', commercial: [],
    primes: [], stationEarning: [], earningBifurcation: '',
  }), [colCode, colName, colCat, colState, colSec, colCMI]);

  // ── Enrich an HD with header fields from the Overview row if stationName is blank ──
  const enrichFromOv = useCallback((hd: HD, key: string): HD => {
    if (hd.stationName?.trim() || !colCode || !ovRows.length) return hd;
    const row = ovRows.find(r => String(r[colCode] ?? '').trim().toUpperCase() === key);
    if (!row) return hd;
    const h = buildHDFromRow(key, row);
    return { ...hd, stationName: h.stationName, category: h.category,
             state: h.state, section: h.section, cmi: h.cmi };
  }, [colCode, ovRows, buildHDFromRow]);

  // ── Auto-open by initialCode (from Overview click) ────────────────────────
  useEffect(() => {
    if (!initialCode) return;
    const key = initialCode.toUpperCase().trim();
    // 1. Handout already in state
    const found = handouts[key];
    if (found) { setViewHD(enrichFromOv(found, key)); return; }
    // 2. Try Upstash
    import('@/lib/config/sharedSync').then(({ sharedRead }) => {
      sharedRead(`handout_${key}`).then((val: unknown) => {
        if (val && typeof val === 'object') {
          setViewHD(enrichFromOv(val as HD, key)); return;
        }
        // 3. No saved handout — build skeleton from Overview
        if (!colCode || !ovRows.length) return;
        const row = ovRows.find(r => String(r[colCode] ?? '').trim().toUpperCase() === key);
        if (row) setViewHD(buildHDFromRow(key, row));
      }).catch(() => {});
    }).catch(() => {});
  }, [initialCode, handouts, ovRows, colCode, buildHDFromRow, enrichFromOv]);

  // ── Build merged station list ──────────────────────────────────────────────
  // Merge: overview rows (source of truth for station list) + handout data
  const allStations = useMemo(() => {
    const seen = new Set<string>();
    const list: {
      code: string; name: string; category: string; state: string;
      section: string; cmi: string; hasHandout: boolean;
    }[] = [];

    // From overview rows (all stations visible in the system)
    for (const row of ovRows) {
      const code = colCode ? String(row[colCode] ?? '').trim().toUpperCase() : '';
      if (!code || seen.has(code)) continue;
      seen.add(code);
      list.push({
        code,
        name:     colName  ? String(row[colName]  ?? '') : '',
        category: colCat   ? String(row[colCat]   ?? '') : '',
        state:    colState ? String(row[colState]  ?? '') : '',
        section:  colSec   ? String(row[colSec]   ?? '') : '',
        cmi:      colCMI   ? String(row[colCMI]   ?? '') : '',
        hasHandout: !!handouts[code],
      });
    }

    // Add any handout-only entries (not in overview)
    for (const [code, hd] of Object.entries(handouts)) {
      if (seen.has(code)) continue;
      seen.add(code);
      list.push({
        code,
        name: hd.stationName ?? '',
        category: hd.category ?? '',
        state: hd.state ?? '',
        section: hd.section ?? '',
        cmi: hd.cmi ?? '',
        hasHandout: true,
      });
    }
    return list;
  }, [ovRows, handouts, colCode, colName, colCat, colState, colSec, colCMI]);

  // ── Unique values for filters ──────────────────────────────────────────────
  const sections = useMemo(() => [...new Set(allStations.map(s => s.section).filter(Boolean))].sort(), [allStations]);
  const cmis     = useMemo(() => [...new Set(allStations.map(s => s.cmi).filter(Boolean))].sort(), [allStations]);

  // ── Filtered list ──────────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return allStations.filter(s => {
      if (filterSec && s.section !== filterSec) return false;
      if (filterCMI && s.cmi    !== filterCMI) return false;
      if (!q) return true;
      return s.code.toLowerCase().includes(q) ||
             s.name.toLowerCase().includes(q) ||
             s.category.toLowerCase().includes(q) ||
             s.state.toLowerCase().includes(q) ||
             s.section.toLowerCase().includes(q) ||
             s.cmi.toLowerCase().includes(q);
    });
  }, [allStations, search, filterSec, filterCMI]);

  // ── Bulk CSV export ────────────────────────────────────────────────────────
  const handleBulkCSV = () => {
    const hdList = filtered.map(s => handouts[s.code]).filter(Boolean);
    if (!hdList.length) { alert('No handout data found for the selected stations.'); return; }
    const rows: string[][] = [
      ['Code', 'Name', 'Category', 'State', 'Section', 'CMI', 'Division', 'Date',
       'UTS-Outward','UTS-Inward','UTS-PF','UTS-Total',
       'PRS-Outward','PRS-Inward','PRS-PF','PRS-Total',
       'Sanitation', 'Commercial-Total'],
      ...hdList.map(hd => [
        hd.stationCode, hd.stationName, hd.category, hd.state, hd.section, hd.cmi,
        hd.division, hd.date,
        ...hd.ff[0], ...hd.ff[1],
        hd.sanitation,
        hd.commercial.map(c => `${c.name}:${c.earning}`).join('; '),
      ]),
    ];
    const csv = rows.map(r => r.map(c => `"${String(c ?? '').replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url; a.download = 'handouts_bulk.csv'; a.click();
    URL.revokeObjectURL(url);
  };

  const viewStation = (code: string) => {
    const key = code.toUpperCase().trim();
    // 1. Handout already loaded in state
    const hd = handouts[key];
    if (hd) { setViewHD(enrichFromOv(hd, key)); return; }
    // 2. Try Upstash (cross-device)
    import('@/lib/config/sharedSync').then(({ sharedRead }) => {
      sharedRead(`handout_${key}`).then((val: unknown) => {
        if (val && typeof val === 'object') {
          const loaded = val as HD;
          setHandouts(prev => ({ ...prev, [key]: loaded }));
          setViewHD(enrichFromOv(loaded, key));
          return;
        }
        // 3. No saved handout — build skeleton from Overview
        if (colCode && ovRows.length) {
          const row = ovRows.find(r => String(r[colCode] ?? '').trim().toUpperCase() === key);
          if (row) { setViewHD(buildHDFromRow(key, row)); return; }
        }
        alert('No handout data found for this station. Fill it in via the Handout widget.');
      }).catch(() => {
        alert('No handout data found for this station. Fill it in via the Handout widget.');
      });
    }).catch(() => {});
  };

  // ── Category colour (matches dashboard) ───────────────────────────────────
  const catDot: Record<string, string> = {
    'NSG-1': 'bg-blue-400', 'NSG-2': 'bg-violet-400', 'NSG-3': 'bg-cyan-400',
    'NSG-4': 'bg-emerald-400', 'NSG-5': 'bg-amber-400', 'NSG-6': 'bg-slate-400',
    'HG-1': 'bg-rose-400', 'HG-2': 'bg-orange-400', 'HG-3': 'bg-fuchsia-400',
  };

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="bg-white border border-slate-200 rounded-xl px-4 py-3 flex flex-wrap items-center gap-3"
        style={{ boxShadow: '0 1px 3px rgba(15,23,42,0.06)' }}>
        {/* Search */}
        <div className="relative flex-1 min-w-48">
          <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400"/>
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search station code, name, section…"
            className="w-full pl-8 pr-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:border-amber-400 bg-slate-50"/>
        </div>

        {/* Section filter */}
        <div className="relative">
          <select value={filterSec} onChange={e => setFilterSec(e.target.value)}
            className="pl-3 pr-7 py-2 text-xs border border-slate-200 rounded-lg bg-slate-50 focus:outline-none focus:border-amber-400 appearance-none">
            <option value="">All Sections</option>
            {sections.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <ChevronDown size={11} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"/>
        </div>

        {/* CMI filter */}
        <div className="relative">
          <select value={filterCMI} onChange={e => setFilterCMI(e.target.value)}
            className="pl-3 pr-7 py-2 text-xs border border-slate-200 rounded-lg bg-slate-50 focus:outline-none focus:border-amber-400 appearance-none">
            <option value="">All CMIs</option>
            {cmis.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <ChevronDown size={11} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"/>
        </div>

        {/* Refresh */}
        <button onClick={() => { loadOvCache(); loadHandouts(); }}
          className="flex items-center gap-1 px-2.5 py-2 text-xs text-slate-500 border border-slate-200 rounded-lg hover:bg-slate-50">
          <RefreshCw size={12}/>
        </button>

        {/* Bulk export */}
        <button onClick={handleBulkCSV}
          className="flex items-center gap-1.5 px-3 py-2 text-xs bg-amber-600 text-white rounded-lg hover:bg-amber-700 ml-auto">
          <Download size={12}/> Bulk CSV ({filtered.filter(s => handouts[s.code]).length})
        </button>
      </div>

      {/* Stats bar */}
      <div className="flex gap-4 text-xs text-slate-500">
        <span>{allStations.length} stations total</span>
        <span>·</span>
        <span className="text-amber-700 font-medium">{Object.keys(handouts).length} with handout data</span>
        {(search || filterSec || filterCMI) && (
          <>
            <span>·</span>
            <span className="text-slate-700">{filtered.length} shown</span>
          </>
        )}
      </div>

      {/* Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden"
        style={{ boxShadow: '0 1px 3px rgba(15,23,42,0.06)' }}>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="px-4 py-3 text-left font-semibold text-slate-600 whitespace-nowrap">Code</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-600">Station Name</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-600">Category</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-600">State</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-600">Section</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-600">CMI</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-600">Handout</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-600">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-slate-400 italic">
                    {allStations.length === 0
                      ? 'No station data — connect a Google Sheet in the Overview tab first.'
                      : 'No stations match the current filter.'}
                  </td>
                </tr>
              )}
              {filtered.map((s, i) => (
                <tr key={s.code} className={cn('border-b border-slate-100 hover:bg-amber-50/30 transition-colors', i % 2 === 0 ? '' : 'bg-slate-50/30')}>
                  <td className="px-4 py-2.5 font-mono font-bold text-slate-800">{s.code}</td>
                  <td className="px-4 py-2.5 text-slate-700 font-medium">{s.name || '—'}</td>
                  <td className="px-4 py-2.5">
                    {s.category ? (
                      <span className="inline-flex items-center gap-1.5">
                        <span className={cn('w-1.5 h-1.5 rounded-full', catDot[s.category] ?? 'bg-slate-300')}/>
                        <span className="text-slate-600">{s.category}</span>
                      </span>
                    ) : <span className="text-slate-300">—</span>}
                  </td>
                  <td className="px-4 py-2.5 text-slate-600">{s.state || '—'}</td>
                  <td className="px-4 py-2.5 text-slate-600">{s.section || '—'}</td>
                  <td className="px-4 py-2.5 text-slate-600">{s.cmi || '—'}</td>
                  <td className="px-4 py-2.5">
                    {s.hasHandout
                      ? <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-semibold bg-amber-100 text-amber-700 rounded-full">● Filled</span>
                      : <span className="text-[10px] text-slate-300 italic">Empty</span>}
                  </td>
                  <td className="px-4 py-2.5">
                    <button onClick={() => viewStation(s.code)}
                      className="flex items-center gap-1 px-2.5 py-1 text-[10px] font-semibold bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors">
                      <Eye size={10}/> View
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* View modal */}
      {viewHD && <ViewModal hd={viewHD} onClose={() => setViewHD(null)}/>}
    </div>
  );
}
