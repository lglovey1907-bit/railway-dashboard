'use client';
import { useState, useMemo } from 'react';
import { Pickaxe, IndianRupee, MapPin, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import data from './planHead53Data.json';

export function PlanHead53Widget({ canManage }: { canManage: boolean }) {
  const [stationFilter, setStationFilter] = useState<string>('All');

  const stations = useMemo(() => {
    const s = new Set(data.map(d => d.Station));
    return ['All', ...Array.from(s)];
  }, []);

  const filteredData = useMemo(() => {
    if (stationFilter === 'All') return data;
    return data.filter(d => d.Station === stationFilter);
  }, [stationFilter]);

  const stats = useMemo(() => {
    let totalCost = 0;
    let totalExp = 0;
    let completed = 0;
    
    filteredData.forEach(d => {
      totalCost += Number(d['Current Cost'] || 0);
      totalExp += Number(d['Expenditure upto date'] || 0);
      if (Number(d['%age Phy. Progress'] || 0) === 100) completed++;
    });

    return [
      { label: 'Total Works', value: filteredData.length, color: 'text-indigo-600', bg: 'bg-indigo-50' },
      { label: 'Completed', value: completed, color: 'text-emerald-600', bg: 'bg-emerald-50' },
      { label: 'Total Cost (Cr)', value: '₹' + (totalCost / 10000).toFixed(2), color: 'text-amber-600', bg: 'bg-amber-50' },
      { label: 'Expenditure (Cr)', value: '₹' + (totalExp / 10000).toFixed(2), color: 'text-rose-600', bg: 'bg-rose-50' },
    ];
  }, [filteredData]);

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 flex flex-col w-full h-full min-h-[400px]">
      <div className="px-4 py-3 border-b border-slate-100 flex flex-wrap gap-4 items-center justify-between bg-slate-50/50">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-600 flex items-center justify-center">
            <Pickaxe size={16} />
          </div>
          <div>
            <h3 className="font-bold text-slate-800 text-sm">Plan Head 53</h3>
            <p className="text-[10px] text-slate-500">MTC Section (MWC-TPZ) Works Register</p>
          </div>
        </div>
        <select 
          value={stationFilter}
          onChange={(e) => setStationFilter(e.target.value)}
          className="text-xs bg-white border border-slate-200 text-slate-600 font-medium px-3 py-1.5 rounded-lg outline-none focus:border-indigo-400"
        >
          {stations.map(s => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </div>

      <div className="p-4 flex-1 flex flex-col gap-4 overflow-hidden">
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
                  <th className="px-3 py-2 font-semibold text-slate-600">ID</th>
                  <th className="px-3 py-2 font-semibold text-slate-600">Station</th>
                  <th className="px-3 py-2 font-semibold text-slate-600 w-full">Work Description</th>
                  <th className="px-3 py-2 font-semibold text-slate-600">Sanction Yr</th>
                  <th className="px-3 py-2 font-semibold text-slate-600 text-right">Cost (Th)</th>
                  <th className="px-3 py-2 font-semibold text-slate-600 text-right">Exp (Th)</th>
                  <th className="px-3 py-2 font-semibold text-slate-600 text-center">Progress</th>
                  <th className="px-3 py-2 font-semibold text-slate-600">Reported By</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredData.map((row, i) => (
                  <tr key={i} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-3 py-2 text-slate-500">{row.UWID}</td>
                    <td className="px-3 py-2 font-medium text-slate-700">{row.Station}</td>
                    <td className="px-3 py-2 text-slate-600 max-w-[300px] truncate" title={row['Short Name of Work']}>
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
                          {row['%age Phy. Progress']}%
                        </span>
                      </div>
                    </td>
                    <td className="px-3 py-2 text-slate-500">{row['Progress Reported by']}</td>
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
