'use client';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line } from 'recharts';
import { GlassCard } from '@/components/ui/GlassCard';
import { mockTTE } from '@/lib/data/mockData';
import { useChartTheme } from '@/lib/theme/useIsDark';
import { ShieldCheck } from 'lucide-react';

const TOOLTIP = ({ active, payload, label }: any) => {
 if (!active || !payload?.length) return null;
 return (
 <div className="bg-white/95 backdrop-blur-xl border border-slate-900/10 rounded-xl p-3 shadow-2xl text-xs">
 <p className="text-slate-800/70 mb-2">{label}</p>
 {payload.map((p: any) => (
 <div key={p.name} className="flex items-center gap-2 mb-1">
 <span className="w-2 h-2 rounded-full"style={{ background: p.color }} />
 <span className="text-slate-800/60">{p.name}:</span>
 <span className="text-slate-900 font-semibold">{p.value.toLocaleString()}</span>
 </div>
 ))}
 </div>
 );
};

export function TTEChart() {
 const ct = useChartTheme();
 return (
 <GlassCard className="p-6"delay={0.3} animate>
 <div className="flex items-center gap-3 mb-5">
 <div className="p-2 rounded-xl bg-red-500/10 border border-red-500/20">
 <ShieldCheck className="w-5 h-5 text-red-600"/>
 </div>
 <div>
 <h3 className="text-slate-900 font-semibold">TTE Inspection & Penalty</h3>
 <p className="text-slate-800/40 text-xs">Monthly trend · Delhi Division</p>
 </div>
 </div>
 <ResponsiveContainer width="100%"height={240}>
 <BarChart data={mockTTE} margin={{ top: 5, right: 5, bottom: 5, left: -10 }} barSize={14}>
 <CartesianGrid strokeDasharray="3 3"stroke={ct.grid} vertical={false} />
 <XAxis dataKey="date"tick={{ fill: ct.tick, fontSize: 10 }} axisLine={false} tickLine={false} />
 <YAxis yAxisId="left"tick={{ fill: ct.tick, fontSize: 10 }} axisLine={false} tickLine={false} />
 <YAxis yAxisId="right"orientation="right"tick={{ fill: ct.tick, fontSize: 10 }} axisLine={false} tickLine={false} />
 <Tooltip content={<TOOLTIP />} />
 <Legend wrapperStyle={{ fontSize: 11, color: ct.legend }} />
 <Bar yAxisId="left"dataKey="penaltyCases"fill="#ef4444"name="Penalty Cases"radius={[3, 3, 0, 0]} opacity={0.8} />
 <Bar yAxisId="left"dataKey="compoundedCases"fill="#f97316"name="Compounded"radius={[3, 3, 0, 0]} opacity={0.8} />
 <Line yAxisId="right"type="monotone"dataKey="inspections"stroke="#10b981"strokeWidth={2} dot={{ r: 3, fill: '#10b981' }} name="Inspections"/>
 </BarChart>
 </ResponsiveContainer>
 </GlassCard>
 );
}
