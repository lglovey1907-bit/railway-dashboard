'use client';
import { CellStaffRoster } from '@/components/cell/CellStaffRoster';
import { CellDataManager } from '@/components/cell/CellDataManager';
import { SharedTablesView } from '@/components/cell/SharedTablesView';
import { GlassCard } from '@/components/ui/GlassCard';
import { TTEChart } from '@/components/charts/TTEChart';
import { mockKPIs, mockTTE } from '@/lib/data/mockData';
import { KPICard } from '@/components/dashboard/KPICard';
import { formatNumber } from '@/lib/utils';
import { motion } from 'framer-motion';

export default function TTEPage() {
 const metrics = mockKPIs.filter(m => m.cell === 'Ticket Checking');
 const latest = mockTTE[mockTTE.length - 1];

 return (
 <div className="space-y-6 pb-6">
 <CellStaffRoster cell="Ticket Checking"/>
 <CellDataManager cell="Ticket Checking"/>
 <SharedTablesView cell="Ticket Checking"/>

 <div className="grid grid-cols-2 gap-4">
 {metrics.map((m, i) => <KPICard key={m.id} metric={m} delay={i * 0.06} />)}
 </div>

 <TTEChart />

 <GlassCard className="p-6"delay={0.2}>
 <h3 className="text-slate-900 font-semibold mb-4">Latest Month Summary – March 2025</h3>
 <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
 {[
 { label: 'Total Inspections', value: formatNumber(latest.inspections), color: 'text-emerald-600 ' },
 { label: 'Penalty Cases', value: formatNumber(latest.penaltyCases), color: 'text-red-600 ' },
 { label: 'Penalty Amount', value: `₹${latest.penaltyAmount} L`, color: 'text-red-600 ' },
 { label: 'Compounded Cases', value: formatNumber(latest.compoundedCases), color: 'text-orange-600 ' },
 { label: 'Compounded Amount', value: `₹${latest.compoundedAmount} L`, color: 'text-orange-600 ' },
 { label: 'EDRS Cases', value: formatNumber(latest.edrsCases), color: 'text-yellow-600 ' },
 ].map((s, i) => (
 <motion.div key={s.label}
 initial={{ opacity: 0, y: 8 }}
 animate={{ opacity: 1, y: 0 }}
 transition={{ delay: 0.25 + i * 0.05 }}
 className="p-4 rounded-xl bg-slate-900/3 border border-slate-900/8">
 <p className={`text-xl font-bold ${s.color}`}>{s.value}</p>
 <p className="text-slate-800/40 text-xs mt-1">{s.label}</p>
 </motion.div>
 ))}
 </div>
 </GlassCard>
 </div>
 );
}
