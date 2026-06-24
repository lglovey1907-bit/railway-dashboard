'use client';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { GlassCard } from '@/components/ui/GlassCard';
import { mockComplaints } from '@/lib/data/mockData';
import { Badge } from '@/components/ui/Badge';
import { AlertCircle, ChevronDown, ChevronUp, Clock, User } from 'lucide-react';
import { cn, formatDate } from '@/lib/utils';
import type { Cell } from '@/types';

export function ComplaintsPanel() {
 const [expanded, setExpanded] = useState<string | null>(null);
 const [filter, setFilter] = useState<'all' | 'open' | 'escalated' | 'resolved'>('all');

 const counts = {
 open: mockComplaints.filter(c => c.status === 'open' || c.status === 'in-progress').length,
 escalated: mockComplaints.filter(c => c.status === 'escalated').length,
 resolved: mockComplaints.filter(c => c.status === 'resolved').length,
 all: mockComplaints.length,
 };

 const filtered = mockComplaints.filter(c => {
 if (filter === 'all') return true;
 if (filter === 'open') return c.status === 'open' || c.status === 'in-progress';
 return c.status === filter;
 });

 const ESCALATION_COLORS = ['', 'bg-green-500', 'bg-yellow-500', 'bg-orange-500', 'bg-red-500', 'bg-red-700', 'bg-purple-600'];

 return (
 <GlassCard className="p-6"delay={0.35} animate>
 <div className="flex items-center gap-3 mb-5">
 <div className="p-2 rounded-xl bg-red-500/10 border border-red-500/20">
 <AlertCircle className="w-5 h-5 text-red-600"/>
 </div>
 <div>
 <h3 className="text-slate-900 font-semibold">Complaint Register</h3>
 <p className="text-slate-800/40 text-xs">8-level escalation matrix</p>
 </div>
 </div>

 {/* Filter tabs */}
 <div className="flex gap-2 mb-4">
 {(['all', 'open', 'escalated', 'resolved'] as const).map(tab => (
 <button key={tab}
 onClick={() => setFilter(tab)}
 className={cn('px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-all',
 filter === tab ? 'bg-slate-900/15 text-slate-900 ' : 'text-slate-800/40 hover:text-slate-800/60 bg-slate-900/3 ')}>
 {tab} <span className="ml-1 opacity-60">({counts[tab]})</span>
 </button>
 ))}
 </div>

 <div className="space-y-2">
 <AnimatePresence>
 {filtered.map((complaint, i) => (
 <motion.div key={complaint.id}
 layout
 initial={{ opacity: 0, y: 8 }}
 animate={{ opacity: 1, y: 0 }}
 exit={{ opacity: 0, y: -8 }}
 transition={{ delay: i * 0.03 }}
 className="rounded-xl border border-slate-900/8 bg-slate-900/3 overflow-hidden">
 <div
 className="flex items-center justify-between p-3 cursor-pointer hover:bg-slate-900/4 transition-all"
 onClick={() => setExpanded(expanded === complaint.id ? null : complaint.id)}>
 <div className="flex items-center gap-3 min-w-0">
 {/* Escalation dot */}
 <div className={cn('w-2 h-2 rounded-full flex-shrink-0', ESCALATION_COLORS[complaint.escalationLevel] ?? 'bg-slate-500')} />
 <div className="min-w-0">
 <div className="flex items-center gap-2 flex-wrap">
 <span className="text-slate-800/80 text-xs font-mono font-medium">{complaint.id}</span>
 <Badge label={complaint.cell} variant="cell"/>
 </div>
 <p className="text-slate-800/50 text-xs truncate mt-0.5">{complaint.category}</p>
 </div>
 </div>
 <div className="flex items-center gap-2 flex-shrink-0 ml-2">
 <Badge label={complaint.priority} variant="priority"/>
 <Badge label={complaint.status.replace('-', ' ')} variant="status"/>
 {complaint.daysOpen > 0 && (
 <span className="text-red-600 text-[10px] flex items-center gap-0.5">
 <Clock className="w-3 h-3"/>{complaint.daysOpen}d
 </span>
 )}
 {expanded === complaint.id
 ? <ChevronUp className="w-4 h-4 text-slate-800/30"/>
 : <ChevronDown className="w-4 h-4 text-slate-800/30"/>}
 </div>
 </div>

 <AnimatePresence>
 {expanded === complaint.id && (
 <motion.div
 initial={{ height: 0, opacity: 0 }}
 animate={{ height: 'auto', opacity: 1 }}
 exit={{ height: 0, opacity: 0 }}
 className="border-t border-slate-900/5 px-4 py-3">
 <p className="text-slate-800/60 text-xs mb-3">{complaint.description}</p>
 <div className="grid grid-cols-2 gap-3 text-xs">
 <div className="flex items-center gap-1.5 text-slate-800/40">
 <User className="w-3 h-3"/>
 <span>{complaint.assignedTo}</span>
 </div>
 <div className="flex items-center gap-1.5 text-slate-800/40">
 <Clock className="w-3 h-3"/>
 <span>{formatDate(complaint.date)}</span>
 </div>
 <div className="text-slate-800/40">
 Escalation Level: <span className="text-slate-800/70">{complaint.escalationLevel}/8</span>
 </div>
 </div>
 {/* Escalation bar */}
 <div className="mt-2 h-1 rounded-full bg-slate-900/5">
 <div className="h-full rounded-full bg-gradient-to-r from-green-500 to-red-500 transition-all"
 style={{ width: `${(complaint.escalationLevel / 8) * 100}%` }} />
 </div>
 </motion.div>
 )}
 </AnimatePresence>
 </motion.div>
 ))}
 </AnimatePresence>
 </div>
 </GlassCard>
 );
}
