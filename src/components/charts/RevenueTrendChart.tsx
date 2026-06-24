'use client';
import { useState } from 'react';
import {
 LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid,
 Tooltip, Legend, ResponsiveContainer, ReferenceLine, Area, AreaChart
} from 'recharts';
import { GlassCard } from '@/components/ui/GlassCard';
import { mockRevenue } from '@/lib/data/mockData';
import { cn } from '@/lib/utils';
import { useChartTheme } from '@/lib/theme/useIsDark';
import { TrendingUp } from 'lucide-react';

const CUSTOM_TOOLTIP = ({ active, payload, label }: any) => {
 if (!active || !payload?.length) return null;
 return (
 <div className="bg-white/95 backdrop-blur-xl border border-slate-900/10 rounded-xl p-3 shadow-2xl text-xs">
 <p className="text-slate-800/70 font-medium mb-2">{label}</p>
 {payload.map((entry: any) => (
 <div key={entry.name} className="flex items-center gap-2 mb-1">
 <span className="w-2 h-2 rounded-full"style={{ background: entry.color }} />
 <span className="text-slate-800/60 capitalize">{entry.name}:</span>
 <span className="text-slate-900 font-semibold">₹{entry.value.toFixed(2)} Cr</span>
 </div>
 ))}
 </div>
 );
};

type ViewMode = 'area' | 'bar' | 'line';

export function RevenueTrendChart() {
 const [viewMode, setViewMode] = useState<ViewMode>('area');
 const ct = useChartTheme();

 return (
 <GlassCard className="p-6"delay={0.1}>
 <div className="flex items-center justify-between mb-6">
 <div className="flex items-center gap-3">
 <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
 <TrendingUp className="w-5 h-5 text-emerald-600"/>
 </div>
 <div>
 <h3 className="text-slate-900 font-semibold text-base">Revenue Trend</h3>
 <p className="text-slate-800/40 text-xs">May 2024 – Apr 2025 · Delhi Division</p>
 </div>
 </div>
 <div className="flex gap-1 bg-slate-900/5 rounded-xl p-1">
 {(['area', 'bar', 'line'] as ViewMode[]).map(mode => (
 <button key={mode} onClick={() => setViewMode(mode)}
 className={cn('px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-all',
 viewMode === mode ? 'bg-slate-900/15 text-slate-900 ' : 'text-slate-800/40 hover:text-slate-800/60 ')}>
 {mode}
 </button>
 ))}
 </div>
 </div>

 <ResponsiveContainer width="100%"height={280}>
 {viewMode === 'area' ? (
 <AreaChart data={mockRevenue} margin={{ top: 5, right: 5, bottom: 5, left: 0 }}>
 <defs>
 {[
 { id: 'prs', color: '#8b5cf6' },
 { id: 'uts', color: '#3b82f6' },
 { id: 'catering', color: '#f97316' },
 { id: 'atvm', color: '#f59e0b' },
 ].map(g => (
 <linearGradient key={g.id} id={`grad-${g.id}`} x1="0"y1="0"x2="0"y2="1">
 <stop offset="5%"stopColor={g.color} stopOpacity={0.3} />
 <stop offset="95%"stopColor={g.color} stopOpacity={0} />
 </linearGradient>
 ))}
 </defs>
 <CartesianGrid strokeDasharray="3 3"stroke={ct.grid} />
 <XAxis dataKey="month"tick={{ fill: ct.tick, fontSize: 11 }} axisLine={false} tickLine={false} />
 <YAxis tick={{ fill: ct.tick, fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v) => `₹${v}`} />
 <Tooltip content={<CUSTOM_TOOLTIP />} />
 <Legend wrapperStyle={{ fontSize: 11, color: ct.legend }} />
 <ReferenceLine y={175} stroke={ct.reference} strokeDasharray="4 4"label={{ value: 'Target', fill: ct.referenceLabel, fontSize: 10 }} />
 <Area type="monotone"dataKey="jtbs"stroke="#8b5cf6"fill="url(#grad-prs)"strokeWidth={2} name="PRS"dot={false} />
 <Area type="monotone"dataKey="utsprs"stroke="#3b82f6"fill="url(#grad-uts)"strokeWidth={2} name="UTS"dot={false} />
 <Area type="monotone"dataKey="catering"stroke="#f97316"fill="url(#grad-catering)"strokeWidth={2} name="Catering"dot={false} />
 </AreaChart>
 ) : viewMode === 'bar' ? (
 <BarChart data={mockRevenue} margin={{ top: 5, right: 5, bottom: 5, left: 0 }}>
 <CartesianGrid strokeDasharray="3 3"stroke={ct.grid} vertical={false} />
 <XAxis dataKey="month"tick={{ fill: ct.tick, fontSize: 11 }} axisLine={false} tickLine={false} />
 <YAxis tick={{ fill: ct.tick, fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v) => `${v}`} />
 <Tooltip content={<CUSTOM_TOOLTIP />} />
 <Legend wrapperStyle={{ fontSize: 11, color: ct.legend }} />
 <Bar dataKey="jtbs"stackId="a"fill="#8b5cf6"name="PRS"radius={[0, 0, 0, 0]} />
 <Bar dataKey="utsprs"stackId="a"fill="#3b82f6"name="UTS"/>
 <Bar dataKey="catering"stackId="a"fill="#f97316"name="Catering"/>
 <Bar dataKey="ticketchecking"stackId="a"fill="#f59e0b"name="ATVM"radius={[4, 4, 0, 0]} />
 </BarChart>
 ) : (
 <LineChart data={mockRevenue} margin={{ top: 5, right: 5, bottom: 5, left: 0 }}>
 <CartesianGrid strokeDasharray="3 3"stroke={ct.grid} />
 <XAxis dataKey="month"tick={{ fill: ct.tick, fontSize: 11 }} axisLine={false} tickLine={false} />
 <YAxis tick={{ fill: ct.tick, fontSize: 11 }} axisLine={false} tickLine={false} />
 <Tooltip content={<CUSTOM_TOOLTIP />} />
 <Legend wrapperStyle={{ fontSize: 11, color: ct.legend }} />
 <ReferenceLine y={175} stroke={ct.reference} strokeDasharray="4 4"/>
 <Line type="monotone"dataKey="total"stroke="#10b981"strokeWidth={2.5} dot={{ fill: '#10b981', strokeWidth: 0, r: 3 }} name="Total"/>
 <Line type="monotone"dataKey="target"stroke={ct.target} strokeWidth={1.5} strokeDasharray="5 5"dot={false} name="Target"/>
 </LineChart>
 )}
 </ResponsiveContainer>
 </GlassCard>
 );
}
