'use client';
import { useState } from 'react';
import { motion } from 'framer-motion';
import { GlassCard } from '@/components/ui/GlassCard';
import { mockStations } from '@/lib/data/mockData';
import { getAchievementColor, formatNumber } from '@/lib/utils';
import { MapPin, ChevronUp, ChevronDown, Search } from 'lucide-react';
import { cn } from '@/lib/utils';

type SortKey = 'station' | 'totalAmount' | 'achievement' | 'digiPct';

export function StationPerformanceTable() {
 const [sort, setSort] = useState<{ key: SortKey; dir: 'asc' | 'desc' }>({ key: 'totalAmount', dir: 'desc' });
 const [search, setSearch] = useState('');

 const filtered = mockStations
 .filter(s => s.station.toLowerCase().includes(search.toLowerCase()) ||
 s.code.toLowerCase().includes(search.toLowerCase()))
 .sort((a, b) => {
 const mul = sort.dir === 'asc' ? 1 : -1;
 if (sort.key === 'station') return mul * a.station.localeCompare(b.station);
 return mul * (a[sort.key] - b[sort.key]);
 });

 const toggle = (key: SortKey) => setSort(p => ({ key, dir: p.key === key && p.dir === 'desc' ? 'asc' : 'desc' }));
 const SortIcon = ({ k }: { k: SortKey }) => sort.key === k
 ? (sort.dir === 'asc' ? <ChevronUp className="w-3 h-3"/> : <ChevronDown className="w-3 h-3"/>)
 : <div className="w-3 h-3"/>;

 return (
 <GlassCard className="p-6"delay={0.3} animate>
 <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
 <div className="flex items-center gap-3">
 <div className="p-2 rounded-xl bg-blue-500/10 border border-blue-500/20">
 <MapPin className="w-5 h-5 text-blue-600"/>
 </div>
 <div>
 <h3 className="text-slate-900 font-semibold">Station Performance</h3>
 <p className="text-slate-800/40 text-xs">All stations · April 2025</p>
 </div>
 </div>
 <div className="relative">
 <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-800/30"/>
 <input value={search} onChange={e => setSearch(e.target.value)}
 placeholder="Search station..."
 className="pl-8 pr-3 py-2 bg-slate-900/5 border border-slate-900/10 rounded-xl text-slate-800/70 text-xs placeholder-slate-400/30 focus:outline-none focus:border-blue-500/50 w-44"/>
 </div>
 </div>

 <div className="overflow-x-auto -mx-2 px-2">
 <table className="w-full text-xs">
 <thead>
 <tr className="border-b border-slate-900/5">
 {[
 { key: 'station', label: 'Station' },
 { key: 'totalAmount', label: 'Total Rev (Cr)' },
 { key: 'digiPct', label: 'ATVM Txn' },
 { key: 'achievement', label: 'Achievement' },
 ].map(col => (
 <th key={col.key}
 onClick={() => toggle(col.key as SortKey)}
 className="text-left text-slate-800/40 font-medium py-2 px-2 cursor-pointer hover:text-slate-800/60 transition-colors">
 <span className="flex items-center gap-1">
 {col.label} <SortIcon k={col.key as SortKey} />
 </span>
 </th>
 ))}
 <th className="text-left text-slate-800/40 font-medium py-2 px-2">UTS / PRS</th>
 <th className="text-left text-slate-800/40 font-medium py-2 px-2">Progress</th>
 </tr>
 </thead>
 <tbody>
 {filtered.map((s, i) => (
 <motion.tr key={s.code}
 initial={{ opacity: 0, x: -10 }}
 animate={{ opacity: 1, x: 0 }}
 transition={{ delay: i * 0.04 }}
 className="border-b border-slate-900/5 hover:bg-slate-900/3 transition-colors group">
 <td className="py-2.5 px-2">
 <div>
 <p className="text-slate-800/80 font-medium">{s.station}</p>
 <p className="text-slate-800/30 text-[10px]">{s.code}</p>
 </div>
 </td>
 <td className="py-2.5 px-2 text-slate-800/70 font-semibold">₹{s.totalAmount.toFixed(2)}</td>
 <td className="py-2.5 px-2 text-slate-800/60">{formatNumber(s.digiPct)}</td>
 <td className="py-2.5 px-2">
 <span className={cn('font-semibold', getAchievementColor(s.achievement))}>
 {s.achievement}%
 </span>
 </td>
 <td className="py-2.5 px-2">
 <div className="text-slate-800/50 space-y-0.5">
 <div className="flex items-center gap-1">
 <span className="w-1.5 h-1.5 rounded-full bg-blue-400"/>
 <span>₹{s.totalAmount.toFixed(2)}</span>
 </div>
 <div className="flex items-center gap-1">
 <span className="w-1.5 h-1.5 rounded-full bg-violet-400"/>
 <span>₹{s.digiAmount.toFixed(2)}</span>
 </div>
 </div>
 </td>
 <td className="py-2.5 px-2 w-32">
 <div className="h-1.5 rounded-full bg-slate-900/5 overflow-hidden">
 <div
 className={cn('h-full rounded-full transition-all',
 s.achievement >= 105 ? 'bg-emerald-500' :
 s.achievement >= 100 ? 'bg-green-500' :
 s.achievement >= 90 ? 'bg-yellow-500' : 'bg-red-500')}
 style={{ width: `${Math.min(s.achievement, 110) / 110 * 100}%` }}
 />
 </div>
 </td>
 </motion.tr>
 ))}
 </tbody>
 </table>
 </div>
 </GlassCard>
 );
}
