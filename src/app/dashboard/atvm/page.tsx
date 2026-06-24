'use client';
import { CellStaffRoster } from '@/components/cell/CellStaffRoster';
import { CellDataManager } from '@/components/cell/CellDataManager';
import { SharedTablesView } from '@/components/cell/SharedTablesView';
import { GlassCard } from '@/components/ui/GlassCard';
import { ATVMDashboard } from '@/components/dashboard/ATVMDashboard';
import { mockKPIs, mockATVM } from '@/lib/data/mockData';
import { KPICard } from '@/components/dashboard/KPICard';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { useChartTheme } from '@/lib/theme/useIsDark';

export default function ATVMPage() {
 const metrics = mockKPIs.filter(m => m.cell === 'UTS PRS');
 const ct = useChartTheme();
 const chartData = mockATVM.map(m => ({
 id: m.machineId, transactions: m.transactions, uptime: m.uptime,
 color: m.status === 'active' ? '#10b981' : m.status === 'fault' ? '#ef4444' : '#a855f7'
 }));

 return (
 <div className="space-y-6 pb-6">
 <CellStaffRoster cell="UTS PRS"/>
 <CellDataManager cell="UTS PRS"/>
 <SharedTablesView cell="UTS PRS"/>

 <div className="grid grid-cols-2 gap-4">
 {metrics.map((m, i) => <KPICard key={m.id} metric={m} delay={i * 0.06} />)}
 </div>

 <div className="grid lg:grid-cols-2 gap-4">
 <ATVMDashboard />
 <GlassCard className="p-6"delay={0.15}>
 <h3 className="text-slate-900 font-semibold mb-4">Transactions by Machine</h3>
 <ResponsiveContainer width="100%"height={300}>
 <BarChart data={chartData} margin={{ top: 5, right: 5, bottom: 30, left: 0 }} barSize={18}>
 <CartesianGrid strokeDasharray="3 3"stroke={ct.grid} vertical={false} />
 <XAxis dataKey="id"tick={{ fill: ct.tick, fontSize: 9 }} axisLine={false} tickLine={false} angle={-30} textAnchor="end"/>
 <YAxis tick={{ fill: ct.tick, fontSize: 10 }} axisLine={false} tickLine={false} />
 <Tooltip contentStyle={{ background: ct.tooltipBg, border: `1px solid ${ct.tooltipBorder}`, borderRadius: '12px', fontSize: '12px', color: ct.tooltipText }} />
 <Bar dataKey="transactions"radius={[4, 4, 0, 0]} name="Transactions">
 {chartData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
 </Bar>
 </BarChart>
 </ResponsiveContainer>
 </GlassCard>
 </div>
 </div>
 );
}
