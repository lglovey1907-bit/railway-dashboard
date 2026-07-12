'use client';
import { useState } from 'react';
import { motion } from 'framer-motion';
import { GlassCard } from '@/components/ui/GlassCard';
import { Badge } from '@/components/ui/Badge';
import { useAuthStore } from '@/store/authStore';
import { BarChart3, Download, Plus, Calendar, FileText, TrendingUp, Train, Ticket, CreditCard, ShieldCheck, UtensilsCrossed, MessageSquare, QrCode } from 'lucide-react';
import { cn } from '@/lib/utils';

const REPORT_TEMPLATES = [
 { id: 'monthly-revenue', name: 'Monthly Revenue Summary', icon: TrendingUp, cell: 'All', color: 'emerald' },
 { id: 'uts-daily', name: 'UTS Daily Statement', icon: Ticket, cell: 'UTS', color: 'blue' },
 { id: 'prs-booking', name: 'PRS Booking Analysis', icon: Train, cell: 'PRS', color: 'violet' },
 { id: 'atvm-txn', name: 'ATVM Transaction Report', icon: CreditCard, cell: 'ATVM', color: 'amber' },
 { id: 'tte-inspection', name: 'TTE Inspection Report', icon: ShieldCheck, cell: 'TTE', color: 'red' },
 { id: 'catering-revenue', name: 'Catering Revenue Report', icon: UtensilsCrossed, cell: 'Catering', color: 'orange' },
 { id: 'division-kpis', name: 'Division KPI Dashboard', icon: BarChart3, cell: 'All', color: 'indigo' },
 { id: 'complaint-status', name: 'Complaint Status Report', icon: FileText, cell: 'All', color: 'pink' },
 { id: 'passenger-feedback-sanitation', name: 'Passenger Feedback Sanitation', icon: MessageSquare, cell: 'Sanitation', color: 'blue' },
 { id: 'qr-patrol-sanitation', name: 'Recent QR Patrol Sanitation', icon: QrCode, cell: 'Sanitation', color: 'emerald' },
];

const RECENT_REPORTS = [
 { id: 'r-001', name: 'Monthly Revenue Summary - March 2025', status: 'generated', requestedBy: 'ACM Operations', date: '2025-04-01', cell: 'All' },
 { id: 'r-002', name: 'UTS Daily Statement - 30 Apr 2025', status: 'generated', requestedBy: 'Rajesh Kumar', date: '2025-04-30', cell: 'UTS' },
 { id: 'r-003', name: 'ATVM Transaction Report - April 2025', status: 'pending', requestedBy: 'Priya Singh', date: '2025-04-30', cell: 'ATVM' },
 { id: 'r-004', name: 'TTE Inspection Report - April 2025', status: 'approved', requestedBy: 'Amit Verma', date: '2025-04-29', cell: 'TTE' },
 { id: 'r-005', name: 'Complaint Status Report - Q4 FY25', status: 'rejected', requestedBy: 'Deepak Mishra', date: '2025-04-28', cell: 'All' },
];

const COLOR_CLASSES: Record<string, string> = {
 emerald: 'from-emerald-500/15 to-emerald-900/5 border-emerald-500/20 text-emerald-600 ',
 blue: 'from-blue-500/15 to-blue-900/5 border-blue-500/20 text-blue-600 ',
 violet: 'from-violet-500/15 to-violet-900/5 border-violet-500/20 text-violet-600 ',
 amber: 'from-amber-500/15 to-amber-900/5 border-amber-500/20 text-amber-600 ',
 red: 'from-red-500/15 to-red-900/5 border-red-500/20 text-red-600 ',
 orange: 'from-orange-500/15 to-orange-900/5 border-orange-500/20 text-orange-600 ',
 indigo: 'from-indigo-500/15 to-indigo-900/5 border-indigo-500/20 text-indigo-600 ',
 pink: 'from-pink-500/15 to-pink-900/5 border-pink-500/20 text-pink-600 ',
};

export default function ReportsPage() {
 const { user, canViewCell, hasPermission } = useAuthStore();
 const [dateFrom, setDateFrom] = useState('2025-04-01');
 const [dateTo, setDateTo] = useState('2025-04-30');

 const visibleTemplates = REPORT_TEMPLATES.filter(t => canViewCell(t.cell));

 return (
 <div className="space-y-6 pb-6">
 {/* Date range filter */}
 <GlassCard className="p-5"delay={0}>
 <div className="flex items-center gap-4 flex-wrap">
 <div className="flex items-center gap-2 text-slate-800/50">
 <Calendar className="w-4 h-4"/>
 <span className="text-sm font-medium">Report Period</span>
 </div>
 <div className="flex items-center gap-3">
 <input type="date"value={dateFrom} onChange={e => setDateFrom(e.target.value)}
 className="px-3 py-2 bg-slate-900/5 border border-slate-900/10 rounded-xl text-slate-900 text-xs focus:outline-none focus:border-rail-500/50"/>
 <span className="text-slate-800/30 text-sm">to</span>
 <input type="date"value={dateTo} onChange={e => setDateTo(e.target.value)}
 className="px-3 py-2 bg-slate-900/5 border border-slate-900/10 rounded-xl text-slate-900 text-xs focus:outline-none focus:border-rail-500/50"/>
 </div>
 <div className="flex gap-2">
 {['This Month', 'Last Month', 'This Quarter'].map(p => (
 <button key={p} className="px-3 py-1.5 bg-slate-900/5 border border-slate-900/8 rounded-xl text-slate-800/40 text-xs hover:text-slate-800/70 hover:bg-slate-900/10 transition-all">
 {p}
 </button>
 ))}
 </div>
 </div>
 </GlassCard>

 {/* Report templates */}
 <div>
 <h3 className="text-slate-800/70 text-sm font-semibold mb-3">Report Templates</h3>
 <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
 {visibleTemplates.map((t, i) => {
 const classes = COLOR_CLASSES[t.color] ?? COLOR_CLASSES.blue;
 const [gradientClass, borderClass, textClass] = classes.split(' ');
 return (
 <motion.button key={t.id}
 initial={{ opacity: 0, scale: 0.97 }}
 animate={{ opacity: 1, scale: 1 }}
 transition={{ delay: i * 0.04 }}
 whileHover={{ y: -2 }}
 className={cn('rounded-xl border bg-gradient-to-br p-4 text-left transition-all hover:shadow-lg',
 `from-${t.color}-500/15 to-${t.color}-900/5 border-${t.color}-500/20`)}>
 <t.icon className={cn('w-5 h-5 mb-3', `text-${t.color}-400`)} />
 <p className="text-slate-800/80 text-xs font-medium leading-tight">{t.name}</p>
 <div className="flex items-center justify-between mt-2">
 <Badge label={t.cell} variant="cell"/>
 <Download className={cn('w-3.5 h-3.5 opacity-50', `text-${t.color}-400`)} />
 </div>
 </motion.button>
 );
 })}
 </div>
 </div>

 {/* Recent reports */}
 <div>
 <div className="flex items-center justify-between mb-3">
 <h3 className="text-slate-800/70 text-sm font-semibold">Recent Reports</h3>
 {hasPermission('request:export') && (
 <button className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-rail-600/20 border border-rail-500/30 text-rail-300 text-xs hover:bg-rail-600/30 transition-all">
 <Plus className="w-3.5 h-3.5"/>
 Request Report
 </button>
 )}
 </div>
 <GlassCard className="p-0 overflow-hidden"delay={0.15}>
 <table className="w-full text-xs">
 <thead>
 <tr className="border-b border-slate-900/5">
 <th className="text-left text-slate-800/40 font-medium py-3 px-5">Report</th>
 <th className="text-left text-slate-800/40 font-medium py-3 px-3">Cell</th>
 <th className="text-left text-slate-800/40 font-medium py-3 px-3">Requested By</th>
 <th className="text-left text-slate-800/40 font-medium py-3 px-3">Date</th>
 <th className="text-left text-slate-800/40 font-medium py-3 px-3">Status</th>
 <th className="text-left text-slate-800/40 font-medium py-3 px-3">Action</th>
 </tr>
 </thead>
 <tbody>
 {RECENT_REPORTS.filter(r => canViewCell(r.cell)).map((r, i) => (
 <motion.tr key={r.id}
 initial={{ opacity: 0 }}
 animate={{ opacity: 1 }}
 transition={{ delay: i * 0.04 }}
 className="border-b border-slate-900/5 hover:bg-slate-900/3 transition-colors">
 <td className="py-3 px-5">
 <div className="flex items-center gap-2">
 <FileText className="w-3.5 h-3.5 text-slate-800/30 flex-shrink-0"/>
 <span className="text-slate-800/70">{r.name}</span>
 </div>
 </td>
 <td className="py-3 px-3"><Badge label={r.cell} variant="cell"/></td>
 <td className="py-3 px-3 text-slate-800/50">{r.requestedBy}</td>
 <td className="py-3 px-3 text-slate-800/40">{r.date}</td>
 <td className="py-3 px-3"><Badge label={r.status} variant="status"/></td>
 <td className="py-3 px-3">
 {r.status === 'generated' ? (
 <button className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 hover:bg-emerald-500/20 transition-all">
 <Download className="w-3 h-3"/>
 <span>Download</span>
 </button>
 ) : r.status === 'pending' && hasPermission('approve:reports') ? (
 <button className="px-2.5 py-1.5 rounded-lg bg-blue-500/10 text-blue-600 border border-blue-500/20 hover:bg-blue-500/20 transition-all">
 Approve
 </button>
 ) : <span className="text-slate-800/20">—</span>}
 </td>
 </motion.tr>
 ))}
 </tbody>
 </table>
 </GlassCard>
 </div>
 </div>
 );
}
