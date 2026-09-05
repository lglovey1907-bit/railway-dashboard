'use client';
import { useState, useMemo, useEffect } from 'react';
import { Pickaxe, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import Papa from 'papaparse';

const SHEET_ID = '1Cpt_xevyq8HlxTm_F5GdDLyWRk3YnR2lxoaPvCB-THY';
const SECTIONS = [
  'MTC section (MWC-TPZ)',
  'SPR Section',
  'DUK section',
  'DEE Section',
  'SMQL section ',
  'FDB Section',
  'Ring Rly',
  'Misc.',
  'Branch Line'
];

export function PlanHead53Widget({ canManage }: { canManage: boolean }) {
  const [selectedSection, setSelectedSection] = useState<string>(SECTIONS[0]);
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    const fetchSheet = async () => {
      try {
        const url = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(selectedSection)}`;
        const proxyUrl = `/api/gsheet-proxy?url=${encodeURIComponent(url)}`;
        const res = await fetch(proxyUrl);
        const csv = await res.text();
        
        if (mounted) {
          const parsed = Papa.parse(csv, { header: false, skipEmptyLines: true });
          
          if (parsed.data && parsed.data.length > 1) {
            // The first row often contains merged title. We need to find the actual header row.
            // Usually it's row 0 or 1. Let's find the row that has 'PROJECTID' or 'UWID'.
            const headerRowIdx = parsed.data.findIndex((row: any) => 
              row.some((c: string) => typeof c === 'string' && (c.includes('PROJECTID') || c.includes('UWID')))
            ) || 0;
            
            const rawHeaders = parsed.data[headerRowIdx] as string[];
            const headers = rawHeaders.map((h, i) => {
              const trimmed = h?.trim() || '';
              // The first column header is often mangled with the sheet title in CSV exports of merged sheets
              if (i === 0 && trimmed.includes('SN')) return 'SN';
              return trimmed;
            });
            
            const rowData = parsed.data.slice(headerRowIdx + 1).map((row: any) => {
              const obj: any = {};
              headers.forEach((h, i) => {
                if (h) obj[h] = row[i];
              });
              return obj;
            }).filter((row: any) => row['UWID'] || row['PROJECTID'] || row['SN'] || row['Station']);
            
            setData(rowData);
          } else {
            setData([]);
          }
          if (mounted) setLoading(false);
        }
      } catch (err) {
        console.error('Failed to fetch plan head data:', err);
        if (mounted) {
          setData([]);
          setLoading(false);
        }
      }
    };
    
    // Initial fetch
    fetchSheet();

    // Auto-refresh every 30 seconds
    const interval = setInterval(fetchSheet, 30000);
    return () => { 
      mounted = false; 
      clearInterval(interval);
    };
  }, [selectedSection]);

  const stats = useMemo(() => {
    let totalCost = 0;
    let totalExp = 0;
    let completed = 0;
    
    data.forEach(d => {
      const cost = Number(d['Current Cost']?.replace(/,/g, '') || 0);
      const exp = Number(d['Expenditure upto date']?.replace(/,/g, '') || 0);
      const prog = Number(d['%age Phy. Progress'] || 0);
      
      totalCost += isNaN(cost) ? 0 : cost;
      totalExp += isNaN(exp) ? 0 : exp;
      if (prog === 100) completed++;
    });

    return [
      { label: 'Total Works', value: data.length, color: 'text-indigo-600', bg: 'bg-indigo-50' },
      { label: 'Completed', value: completed, color: 'text-emerald-600', bg: 'bg-emerald-50' },
      { label: 'Total Cost (Cr)', value: '₹' + (totalCost / 10000).toFixed(2), color: 'text-amber-600', bg: 'bg-amber-50' },
      { label: 'Expenditure (Cr)', value: '₹' + (totalExp / 10000).toFixed(2), color: 'text-rose-600', bg: 'bg-rose-50' },
    ];
  }, [data]);

  const KNOWN_COLUMNS = [
    'SN', 'PROJECTID', 'UWID', 'Station', 'Short Name of Work',
    'Year of Sanction', 'Current Cost', 'Expenditure upto date',
    '%age Phy. Progress', 'Now Anticipated TDC', 'REMARKS', 'Progress Reported by'
  ];

  // Extract any dynamic/extra columns added in the Google Sheet
  const dynamicColumns = useMemo(() => {
    if (!data || data.length === 0) return [];
    const allKeys = Object.keys(data[0]);
    return allKeys.filter(k => k && !KNOWN_COLUMNS.includes(k));
  }, [data]);

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 flex flex-col w-full h-full min-h-[400px]">
      <div className="px-4 py-3 border-b border-slate-100 flex flex-wrap gap-4 items-center justify-between bg-slate-50/50">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-600 flex items-center justify-center">
            <Pickaxe size={16} />
          </div>
          <div>
            <h3 className="font-bold text-slate-800 text-sm">{selectedSection.trim()} Works Register</h3>
          </div>
        </div>
        <select 
          value={selectedSection}
          onChange={(e) => setSelectedSection(e.target.value)}
          className="text-xs bg-white border border-slate-200 text-slate-600 font-medium px-3 py-1.5 rounded-lg outline-none focus:border-indigo-400"
        >
          {SECTIONS.map(s => (
            <option key={s} value={s}>{s.trim()}</option>
          ))}
        </select>
      </div>

      <div className="p-4 flex-1 flex flex-col gap-4 overflow-hidden relative">
        {loading && (
          <div className="absolute inset-0 z-20 bg-white/70 backdrop-blur-[1px] flex items-center justify-center">
            <div className="flex flex-col items-center text-indigo-600">
              <Loader2 className="w-8 h-8 animate-spin mb-2" />
              <p className="text-xs font-semibold text-slate-600">Syncing live data...</p>
            </div>
          </div>
        )}

        {/* KPI Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 shrink-0">
          {stats.map((s, i) => (
            <div key={i} className={cn("rounded-xl p-3 border border-slate-100", s.bg)}>
              <p className="text-[10px] font-semibold text-slate-600 mb-1">{s.label}</p>
              <p className={cn("text-xl font-bold", s.color)}>{s.value}</p>
            </div>
          ))}
        </div>

        {/* Data Table */}
        <div className="flex-1 border border-slate-200 rounded-xl overflow-hidden flex flex-col">
          <div className="overflow-auto flex-1">
            <table className="w-full text-left text-xs whitespace-nowrap">
              <thead className="bg-slate-50 sticky top-0 z-10 shadow-sm">
                <tr>
                  <th className="px-3 py-2 font-semibold text-slate-600">SN</th>
                  <th className="px-3 py-2 font-semibold text-slate-600">Project ID / UWID</th>
                  <th className="px-3 py-2 font-semibold text-slate-600">Station</th>
                  <th className="px-3 py-2 font-semibold text-slate-600 w-full">Work Description</th>
                  <th className="px-3 py-2 font-semibold text-slate-600">Sanction Yr</th>
                  <th className="px-3 py-2 font-semibold text-slate-600 text-right">Cost (Th)</th>
                  <th className="px-3 py-2 font-semibold text-slate-600 text-right">Exp (Th)</th>
                  <th className="px-3 py-2 font-semibold text-slate-600 text-center">Progress</th>
                  <th className="px-3 py-2 font-semibold text-slate-600">Anticipated TDC</th>
                  <th className="px-3 py-2 font-semibold text-slate-600">Remarks</th>
                  <th className="px-3 py-2 font-semibold text-slate-600">Reported By</th>
                  {dynamicColumns.map(col => (
                    <th key={col} className="px-3 py-2 font-semibold text-indigo-600 bg-indigo-50/50">{col}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data.map((row, i) => (
                  <tr key={i} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-3 py-2 text-slate-500">{row['SN']}</td>
                    <td className="px-3 py-2 text-slate-500">
                      <div className="font-medium text-slate-700">{row['PROJECTID']}</div>
                      <div className="text-[10px] text-slate-400">{row['UWID']}</div>
                    </td>
                    <td className="px-3 py-2 font-medium text-slate-700">{row['Station']}</td>
                    <td className="px-3 py-2 text-slate-600 min-w-[200px] whitespace-normal">
                      {row['Short Name of Work']}
                    </td>
                    <td className="px-3 py-2 text-slate-500">{row['Year of Sanction']}</td>
                    <td className="px-3 py-2 text-slate-700 text-right">{row['Current Cost']}</td>
                    <td className="px-3 py-2 text-slate-700 text-right">{row['Expenditure upto date']}</td>
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-2 justify-center w-24">
                        <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                          <div 
                            className={cn("h-full rounded-full", Number(row['%age Phy. Progress']) === 100 ? 'bg-emerald-500' : 'bg-indigo-500')} 
                            style={{ width: `${row['%age Phy. Progress'] || 0}%` }} 
                          />
                        </div>
                        <span className="text-[10px] font-medium text-slate-500 w-6">
                          {row['%age Phy. Progress'] || 0}%
                        </span>
                      </div>
                    </td>
                    <td className="px-3 py-2 text-slate-500">{row['Now Anticipated TDC']}</td>
                    <td className="px-3 py-2 text-slate-500 min-w-[200px] whitespace-normal">{row['REMARKS']}</td>
                    <td className="px-3 py-2 text-slate-500">{row['Progress Reported by']}</td>
                    {dynamicColumns.map(col => (
                      <td key={col} className="px-3 py-2 text-indigo-700 font-medium bg-indigo-50/30 whitespace-normal min-w-[100px]">
                        {row[col]}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
