'use client';
import {
 PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend,
 RadialBarChart, RadialBar, BarChart, Bar, XAxis, YAxis, CartesianGrid
} from 'recharts';
import { GlassCard } from '@/components/ui/GlassCard';
import { mockRevenue } from '@/lib/data/mockData';
import { CELL_COLORS } from '@/lib/utils';
import { useChartTheme } from '@/lib/theme/useIsDark';
import { PieChart as PieIcon, Target } from 'lucide-react';
import { cn } from '@/lib/utils';

// Inline data for cell distribution donut
const cellRevenueDistribution = [
 { name: 'UTS/PRS', value: 20.66, color: '#8b5cf6' },
 { name: 'Catering', value: 3.24, color: '#fb923c' },
 { name: 'Parking', value: 0.87, color: '#a78bfa' },
 { name: 'JTBS', value: 2.11, color: '#06b6d4' },
 { name: 'TC Penalty', value: 1.84, color: '#f97316' },
];

const targetAchievement = [
 { cell: 'UTS/PRS', target: 22.0, actual: 20.66 },
 { cell: 'Catering', target: 3.5, actual: 3.24 },
 { cell: 'Parking', target: 0.9, actual: 0.87 },
 { cell: 'JTBS', target: 2.5, actual: 2.11 },
 { cell: 'TC', target: 2.0, actual: 1.84 },
];

const TOOLTIP_STYLE = ({ active, payload }: any) => {
 if (!active || !payload?.length) return null;
 return (
 <div className="bg-white/95 backdrop-blur-xl border border-slate-900/10 rounded-xl p-3 shadow-2xl text-xs">
 <p className="text-slate-900 font-semibold">{payload[0].name}</p>
 <p className="text-slate-800/60">₹{payload[0].value} Cr</p>
 </div>
 );
};

export function CellDistributionChart() {
 const ct = useChartTheme();
 return (
 <GlassCard className="p-6"delay={0.2}>
 <div className="flex items-center gap-3 mb-5">
 <div className="p-2 rounded-xl bg-violet-500/10 border border-violet-500/20">
 <PieIcon className="w-5 h-5 text-violet-600"/>
 </div>
 <div>
 <h3 className="text-slate-900 font-semibold">Revenue by Cell</h3>
 <p className="text-slate-800/40 text-xs">April 2025</p>
 </div>
 </div>
 <ResponsiveContainer width="100%"height={220}>
 <PieChart>
 <Pie data={cellRevenueDistribution} cx="50%"cy="50%"innerRadius={55} outerRadius={85}
 paddingAngle={3} dataKey="value"nameKey="name">
 {cellRevenueDistribution.map((entry, i) => (
 <Cell key={i} fill={entry.color} stroke="transparent"/>
 ))}
 </Pie>
 <Tooltip content={<TOOLTIP_STYLE />} />
 <Legend wrapperStyle={{ fontSize: 11, color: ct.legend }} />
 </PieChart>
 </ResponsiveContainer>
 </GlassCard>
 );
}

const TARGET_TOOLTIP = ({ active, payload }: any) => {
 if (!active || !payload?.length) return null;
 const d = payload[0]?.payload;
 return (
 <div className="bg-white/95 backdrop-blur-xl border border-slate-900/10 rounded-xl p-3 shadow-2xl text-xs">
 <p className="text-slate-900 font-semibold mb-1">{d.cell}</p>
 <p className="text-slate-800/60">Target: ₹{d.target} Cr</p>
 <p className="text-slate-800/60">Achieved: ₹{d.achieved} Cr</p>
 <p className={cn('font-semibold mt-1', d.pct >= 100 ? 'text-emerald-600 ' : 'text-yellow-600 ')}>
 {d.pct}% of Target
 </p>
 </div>
 );
};

export function TargetAchievementChart() {
 const ct = useChartTheme();
 return (
 <GlassCard className="p-6"delay={0.25}>
 <div className="flex items-center gap-3 mb-5">
 <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
 <Target className="w-5 h-5 text-emerald-600"/>
 </div>
 <div>
 <h3 className="text-slate-900 font-semibold">Target vs Achievement</h3>
 <p className="text-slate-800/40 text-xs">Cell-wise comparison · April 2025</p>
 </div>
 </div>
 <ResponsiveContainer width="100%"height={220}>
 <BarChart data={targetAchievement} margin={{ top: 5, right: 5, bottom: 5, left: -10 }} barSize={16} barGap={4}>
 <CartesianGrid strokeDasharray="3 3"stroke={ct.grid} vertical={false} />
 <XAxis dataKey="cell"tick={{ fill: ct.tick, fontSize: 11 }} axisLine={false} tickLine={false} />
 <YAxis tick={{ fill: ct.tick, fontSize: 11 }} axisLine={false} tickLine={false} />
 <Tooltip content={<TARGET_TOOLTIP />} />
 <Legend wrapperStyle={{ fontSize: 11, color: ct.legend }} />
 <Bar dataKey="target"fill={ct.isDark ? 'rgba(255,255,255,0.1)' : 'rgba(15,23,42,0.08)'} name="Target"radius={[4, 4, 0, 0]} />
 <Bar dataKey="achieved"name="Achieved"radius={[4, 4, 0, 0]}
 fill="#10b981"
 label={false}
 />
 </BarChart>
 </ResponsiveContainer>
 </GlassCard>
 );
}
