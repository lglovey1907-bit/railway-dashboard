'use client';
import { motion } from 'framer-motion';
import { GlassCard } from '@/components/ui/GlassCard';
import { mockATVM } from '@/lib/data/mockData';
import { Badge } from '@/components/ui/Badge';
import { getStatusColor, formatNumber, cn } from '@/lib/utils';
import { CreditCard, Wifi, WifiOff, AlertTriangle, Wrench } from 'lucide-react';

const STATUS_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
 active: Wifi,
 idle: Wifi,
 fault: AlertTriangle,
 maintenance: Wrench,
};

export function ATVMDashboard() {
 const active = mockATVM.filter(m => m.status === 'active').length;
 const fault = mockATVM.filter(m => m.status === 'fault').length;
 const maintenance = mockATVM.filter(m => m.status === 'maintenance').length;
 const avgUptime = mockATVM.reduce((sum, m) => sum + m.uptime, 0) / mockATVM.length;
 const totalTxn = mockATVM.reduce((sum, m) => sum + m.transactions, 0);

 return (
 <GlassCard className="p-6"delay={0.2} animate>
 <div className="flex items-center gap-3 mb-5">
 <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/20">
 <CreditCard className="w-5 h-5 text-amber-600"/>
 </div>
 <div>
 <h3 className="text-slate-900 font-semibold">ATVM Machine Status</h3>
 <p className="text-slate-800/40 text-xs">{mockATVM.length} machines · Live status</p>
 </div>
 </div>

 {/* Summary pills */}
 <div className="grid grid-cols-4 gap-3 mb-5">
 {[
 { label: 'Active', value: active, color: 'text-emerald-600 bg-emerald-500/10' },
 { label: 'Fault', value: fault, color: 'text-red-600 bg-red-500/10' },
 { label: 'Maint.', value: maintenance, color: 'text-purple-600 bg-purple-500/10' },
 { label: 'Avg Uptime', value: `${avgUptime.toFixed(1)}%`, color: 'text-amber-600 bg-amber-500/10' },
 ].map(item => (
 <div key={item.label} className={cn('rounded-xl p-3 text-center', item.color)}>
 <p className="text-lg font-bold">{item.value}</p>
 <p className="text-[10px] opacity-70 mt-0.5">{item.label}</p>
 </div>
 ))}
 </div>

 {/* Machine list */}
 <div className="space-y-2 max-h-64 overflow-y-auto custom-scroll pr-1">
 {mockATVM.map((machine, i) => {
 const StatusIcon = STATUS_ICONS[machine.status] ?? Wifi;
 return (
 <motion.div key={machine.machineId}
 initial={{ opacity: 0, x: -8 }}
 animate={{ opacity: 1, x: 0 }}
 transition={{ delay: 0.05 * i }}
 className="flex items-center justify-between py-2 px-3 rounded-xl bg-slate-900/3 border border-slate-900/5 hover:bg-slate-900/5 transition-all">
 <div className="flex items-center gap-3">
 <StatusIcon className={cn('w-4 h-4',
 machine.status === 'active' ? 'text-emerald-600 ' :
 machine.status === 'fault' ? 'text-red-600 ' :
 machine.status === 'maintenance' ? 'text-purple-600 ' : 'text-yellow-600 ')} />
 <div>
 <p className="text-slate-800/80 text-xs font-medium">{machine.machineId}</p>
 <p className="text-slate-800/30 text-[10px]">{machine.station}</p>
 </div>
 </div>
 <div className="flex items-center gap-4 text-xs">
 <div className="text-right hidden sm:block">
 <p className="text-slate-800/60">{formatNumber(machine.transactions)}</p>
 <p className="text-slate-800/30 text-[10px]">Txn</p>
 </div>
 <div className="text-right hidden sm:block">
 <p className={machine.uptime >= 95 ? 'text-emerald-600 ' : machine.uptime >= 85 ? 'text-yellow-600 ' : 'text-red-600 '}>
 {machine.uptime}%
 </p>
 <p className="text-slate-800/30 text-[10px]">Uptime</p>
 </div>
 <Badge label={machine.status} variant="status"/>
 </div>
 </motion.div>
 );
 })}
 </div>
 </GlassCard>
 );
}
