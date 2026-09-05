'use client';
import { useState, useMemo, useEffect } from 'react';
import { Pickaxe, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import Papa from 'papaparse';

const SHEET_ID = '1Cpt_xevyq8HlxTm_F5GdDLyWRk3YnR2lxoaPvCB-THY';

export function PlanHead53Widget({ canManage }: { canManage: boolean }) {
  const [sections, setSections] = useState<string[]>([]);
  const [selectedSection, setSelectedSection] = useState<string>('');
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingSections, setLoadingSections] = useState(true);

  const [selectedStations, setSelectedStations] = useState<string[]>([]);
  const [isStationMenuOpen, setIsStationMenuOpen] = useState(false);

  // 1. Fetch available sections dynamically
  useEffect(() => {
    let mounted = true;
    
    const fetchSections = async () => {
      try {
        const res = await fetch(`/api/gsheet-sheets?id=${SHEET_ID}`);
        if (!res.ok) throw new Error('Failed to fetch sections');
        const json = await res.json();
        if (mounted && json.sheets && json.sheets.length > 0) {
          setSections(json.sheets);
          
          // If no section is selected, or the currently selected section was deleted, switch to the first available section
          setSelectedSection(current => {
            if (!current || !json.sheets.includes(current)) {
              return json.sheets[0];
            }
            return current;
          });
        }
      } catch (err) {
        console.error(err);
      } finally {
        if (mounted) setLoadingSections(false);
      }
    };

    fetchSections();
    const interval = setInterval(fetchSections, 60000); // Check for added/deleted sheets every 60s
    return () => { mounted = false; clearInterval(interval); };
  }, []);

  // 2. Fetch data for the currently selected section
  useEffect(() => {
    if (!selectedSection) return;
    
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
            // Find header row
            const headerRowIdx = parsed.data.findIndex((row: any) => 
              row.some((c: string) => typeof c === 'string' && (c.includes('PROJECTID') || c.includes('UWID')))
            ) || 0;
            
            const rawHeaders = parsed.data[headerRowIdx] as string[];
            const headers = rawHeaders.map((h, i) => {
              const trimmed = h?.trim() || '';
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
    
    fetchSheet();
    const interval = setInterval(fetchSheet, 30000);
    return () => { 
      mounted = false; 
      clearInterval(interval);
    };
  }, [selectedSection]);

  // When changing sections, reset the station filter
  useEffect(() => {
    setSelectedStations([]);
  }, [selectedSection]);

  const uniqueStations = useMemo(() => {
    const stations = new Set<string>();
    data.forEach(d => {
      const s = d['Station']?.trim();
      if (s) stations.add(s);
    });
    return Array.from(stations).sort();
  }, [data]);

  const filteredData = useMemo(() => {
    if (selectedStations.length === 0) return data;
    return data.filter(d => selectedStations.includes(d['Station']?.trim()));
  }, [data, selectedStations]);

  const stats = useMemo(() => {
    let totalCost = 0;
    let totalExp = 0;
    let completed = 0;
    
    filteredData.forEach(d => {
      const cost = Number(d['Current Cost']?.replace(/,/g, '') || 0);
      const exp = Number(d['Expenditure upto date']?.replace(/,/g, '') || 0);
      const prog = Number(d['%age Phy. Progress'] || 0);
      
      totalCost += isNaN(cost) ? 0 : cost;
      totalExp += isNaN(exp) ? 0 : exp;
      if (prog === 100) completed++;
    });

    return [
      { label: 'Total Works', value: filteredData.length, color: 'text-indigo-600', bg: 'bg-indigo-50' },
      { label: 'Completed', value: completed, color: 'text-emerald-600', bg: 'bg-emerald-50' },
      { label: 'Total Cost (Cr)', value: '₹' + (totalCost / 10000).toFixed(2), color: 'text-amber-600', bg: 'bg-amber-50' },
      { label: 'Expenditure (Cr)', value: '₹' + (totalExp / 10000).toFixed(2), color: 'text-rose-600', bg: 'bg-rose-50' },
    ];
  }, [filteredData]);

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

  if (loadingSections) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 flex flex-col w-full h-full min-h-[400px] items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600 mb-2" />
        <p className="text-sm font-medium text-slate-500">Loading Configuration...</p>
      </div>
    );
  }

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
        
        <div className="flex items-center gap-2 relative">
          <div className="relative">
            <button 
              onClick={() => setIsStationMenuOpen(!isStationMenuOpen)}
              className="text-xs bg-white border border-slate-200 text-slate-600 font-medium px-3 py-1.5 rounded-lg outline-none hover:border-indigo-400 flex items-center gap-2"
            >
              {selectedStations.length === 0 
                ? 'All Stations' 
                : `${selectedStations.length} Station${selectedStations.length > 1 ? 's' : ''} Selected`}
            </button>
            {isStationMenuOpen && (
              <div className="absolute top-full right-0 mt-1 w-64 bg-white border border-slate-200 rounded-xl shadow-xl z-50 overflow-hidden flex flex-col max-h-64">
                <div className="px-3 py-2 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                  <span className="text-xs font-semibold text-slate-700">Filter Stations</span>
                  <button 
                    onClick={() => { setSelectedStations([]); setIsStationMenuOpen(false); }}
                    className="text-[10px] font-medium text-indigo-600 hover:text-indigo-800"
                  >
                    Clear All
                  </button>
                </div>
                <div className="overflow-y-auto flex-1 p-2 flex flex-col gap-1">
                  {uniqueStations.map(s => (
                    <label key={s} className="flex items-center gap-2 px-2 py-1.5 hover:bg-slate-50 rounded cursor-pointer">
                      <input 
                        type="checkbox" 
                        className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                        checked={selectedStations.includes(s)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedStations([...selectedStations, s]);
                          } else {
                            setSelectedStations(selectedStations.filter(st => st !== s));
                          }
                        }}
                      />
                      <span className="text-xs text-slate-700">{s}</span>
                    </label>
                  ))}
                  {uniqueStations.length === 0 && (
                    <div className="text-xs text-slate-500 p-2 text-center">No stations found</div>
                  )}
                </div>
              </div>
            )}
          </div>
          
          <select 
            value={selectedSection}
            onChange={(e) => setSelectedSection(e.target.value)}
            className="text-xs bg-white border border-slate-200 text-slate-600 font-medium px-3 py-1.5 rounded-lg outline-none focus:border-indigo-400"
          >
            {sections.map(s => (
              <option key={s} value={s}>{s.trim()}</option>
            ))}
          </select>
        </div>
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
                {filteredData.map((row, i) => (
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
