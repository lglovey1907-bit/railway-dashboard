'use client';
import { CellStaffRoster } from '@/components/cell/CellStaffRoster';
import { CellDataManager } from '@/components/cell/CellDataManager';
import { SharedTablesView } from '@/components/cell/SharedTablesView';
import { motion } from 'framer-motion';
import { GlassCard } from '@/components/ui/GlassCard';
import { Ticket } from 'lucide-react';
import { mockKPIs, mockRevenue, mockStations } from '@/lib/data/mockData';
import { KPICard } from '@/components/dashboard/KPICard';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Legend } from 'recharts';
import { formatNumber } from '@/lib/utils';
import { useChartTheme } from '@/lib/theme/useIsDark';

export default function UTSPage() {
 const metrics = mockKPIs.filter(m => m.cell === 'UTS PRS');
 const ct = useChartTheme();
 const chartData = mockRevenue.map(d => ({ month: d.month, revenue: d.utsprs }));

 return (
 <div className="space-y-6 pb-6">
 <CellStaffRoster cell="UTS PRS"/>
 <CellDataManager cell="UTS PRS"/>
 <SharedTablesView cell="UTS PRS"/>

 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
 {metrics.map((m, i) => <KPICard key={m.id} metric={m} delay={i * 0.06} />)}
 </div>

 <div className="grid lg:grid-cols-2 gap-4">
 <GlassCard className="p-6"delay={0.1}>
 <div className="flex items-center gap-3 mb-5">
 <div className="p-2 rounded-xl bg-blue-500/10 border border-blue-500/20">
 <Ticket className="w-5 h-5 text-blue-600"/>
 </div>
 <div>
 <h3 className="text-slate-900 font-semibold">UTS Revenue Trend</h3>
 <p className="text-slate-800/40 text-xs">May 2024 – Apr 2025</p>
 </div>
 </div>
 <ResponsiveContainer width="100%"height={220}>
 <AreaChart data={chartData} margin={{ top: 5, right: 5, bottom: 5, left: 0 }}>
 <defs>
 <linearGradient id="uts-grad"x1="0"y1="0"x2="0"y2="1">
 <stop offset="5%"stopColor="#3b82f6"stopOpacity={0.35} />
 <stop offset="95%"stopColor="#3b82f6"stopOpacity={0} />
 </linearGradient>
 </defs>
 <CartesianGrid strokeDasharray="3 3"stroke={ct.grid} />
 <XAxis dataKey="month"tick={{ fill: ct.tick, fontSize: 10 }} axisLine={false} tickLine={false} />
 <YAxis tick={{ fill: ct.tick, fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={v => `₹${v}`} />
 <Tooltip contentStyle={{ background: ct.tooltipBg, border: `1px solid ${ct.tooltipBorder}`, borderRadius: '12px', fontSize: '12px', color: ct.tooltipText }} />
 <Area type="monotone"dataKey="revenue"stroke="#3b82f6"fill="url(#uts-grad)"strokeWidth={2.5} name="UTS Revenue (Cr)"dot={false} />
 </AreaChart>
 </ResponsiveContainer>
 </GlassCard>

 <GlassCard className="p-6"delay={0.15}>
 <h3 className="text-slate-900 font-semibold mb-4">Station-wise UTS Revenue</h3>
 <ResponsiveContainer width="100%"height={220}>
 <BarChart data={mockStations.slice(0, 8)} margin={{ top: 5, right: 5, bottom: 20, left: 0 }} barSize={16}>
 <CartesianGrid strokeDasharray="3 3"stroke={ct.grid} vertical={false} />
 <XAxis dataKey="code"tick={{ fill: ct.tick, fontSize: 10 }} axisLine={false} tickLine={false} angle={-20} textAnchor="end"/>
 <YAxis tick={{ fill: ct.tick, fontSize: 10 }} axisLine={false} tickLine={false} />
 <Tooltip contentStyle={{ background: ct.tooltipBg, border: `1px solid ${ct.tooltipBorder}`, borderRadius: '12px', fontSize: '12px', color: ct.tooltipText }} formatter={(v: any) => [`₹${v} Cr`, 'UTS Revenue']} />
 <Bar dataKey="utsRevenue"fill="#3b82f6"radius={[4, 4, 0, 0]} name="UTS Revenue"opacity={0.85} />
 </BarChart>
 </ResponsiveContainer>
 </GlassCard>
 </div>

 <GlassCard className="p-6"delay={0.2}>
 <h3 className="text-slate-900 font-semibold mb-4">UTS Data Entry</h3>
 <div className="grid md:grid-cols-4 gap-4">
 {['Station', 'Date', 'Transactions', 'Amount (₹)'].map(f => (
 <div key={f}>
 <label className="text-slate-800/40 text-xs block mb-1.5">{f}</label>
 <input type={f === 'Date' ? 'date' : f === 'Amount (₹)' || f === 'Transactions' ? 'number' : 'text'}
 className="w-full px-3 py-2 bg-slate-900/5 border border-slate-900/10 rounded-xl text-slate-900 text-xs placeholder-slate-400/25 focus:outline-none focus:border-blue-500/50"
 placeholder={f === 'Station' ? 'e.g. NDLS' : ''} />
 </div>
 ))}
 </div>
 <button className="mt-4 px-4 py-2 rounded-xl bg-blue-500/20 border border-blue-500/30 text-blue-700 text-sm font-medium hover:bg-blue-500/30 transition-all">
 Submit Entry
 </button>
 </GlassCard>
 </div>
 );
}
