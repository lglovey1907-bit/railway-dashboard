'use client';
import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown, Minus, IndianRupee, Ticket, Train, CreditCard, ShieldCheck, UtensilsCrossed, AlertCircle, Target, BookOpen, Activity, FileCheck, Eye } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { KPIMetric } from '@/types';

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
 IndianRupee, Ticket, Train, CreditCard, ShieldCheck, UtensilsCrossed,
 AlertCircle, Target, BookOpen, Activity, FileCheck, Eye,
};

const COLOR_MAP: Record<string, { bg: string; text: string; glow: string; border: string }> = {
 emerald: { bg: 'from-emerald-500/20 to-emerald-900/5', text: 'text-emerald-600 ', glow: 'shadow-emerald-500/10', border: 'border-emerald-500/20' },
 blue: { bg: 'from-blue-500/20 to-blue-900/5', text: 'text-blue-600 ', glow: 'shadow-blue-500/10', border: 'border-blue-500/20' },
 violet: { bg: 'from-violet-500/20 to-violet-900/5', text: 'text-violet-600 ', glow: 'shadow-violet-500/10', border: 'border-violet-500/20' },
 amber: { bg: 'from-amber-500/20 to-amber-900/5', text: 'text-amber-600 ', glow: 'shadow-amber-500/10', border: 'border-amber-500/20' },
 red: { bg: 'from-red-500/20 to-red-900/5', text: 'text-red-600 ', glow: 'shadow-red-500/10', border: 'border-red-500/20' },
 orange: { bg: 'from-orange-500/20 to-orange-900/5', text: 'text-orange-600 ', glow: 'shadow-orange-500/10', border: 'border-orange-500/20' },
 yellow: { bg: 'from-yellow-500/20 to-yellow-900/5', text: 'text-yellow-600 ', glow: 'shadow-yellow-500/10', border: 'border-yellow-500/20' },
 cyan: { bg: 'from-cyan-500/20 to-cyan-900/5', text: 'text-cyan-600 ', glow: 'shadow-cyan-500/10', border: 'border-cyan-500/20' },
 teal: { bg: 'from-teal-500/20 to-teal-900/5', text: 'text-teal-600 ', glow: 'shadow-teal-500/10', border: 'border-teal-500/20' },
 pink: { bg: 'from-pink-500/20 to-pink-900/5', text: 'text-pink-600 ', glow: 'shadow-pink-500/10', border: 'border-pink-500/20' },
 indigo: { bg: 'from-indigo-500/20 to-indigo-900/5', text: 'text-indigo-600 ', glow: 'shadow-indigo-500/10', border: 'border-indigo-500/20' },
};

interface KPICardProps {
 metric: KPIMetric;
 delay?: number;
}

export function KPICard({ metric, delay = 0 }: KPICardProps) {
 const colors = COLOR_MAP[metric.color] ?? COLOR_MAP.blue;
 const Icon = ICON_MAP[metric.icon] ?? IndianRupee;
 const TrendIcon = metric.trend === 'up' ? TrendingUp : metric.trend === 'down' ? TrendingDown : Minus;
 const isGood = (metric.trend === 'up' && metric.id !== 'complaints-open') ||
 (metric.trend === 'down' && metric.id === 'complaints-open');
 const achievementPct = metric.target
 ? Math.round((Number(metric.value) / metric.target) * 100)
 : null;

 return (
 <motion.div
 initial={{ opacity: 0, scale: 0.95, y: 12 }}
 animate={{ opacity: 1, scale: 1, y: 0 }}
 transition={{ duration: 0.35, delay, ease: 'easeOut' }}
 whileHover={{ y: -2, transition: { duration: 0.2 } }}
 className={cn(
 'relative rounded-2xl border backdrop-blur-xl overflow-hidden',
 'bg-gradient-to-br shadow-xl transition-all duration-300 hover:shadow-2xl cursor-default',
 colors.bg, colors.border, colors.glow
 )}
 >
 {/* Ambient glow */}
 <div className={cn('absolute -top-8 -right-8 w-24 h-24 rounded-full opacity-20 blur-2xl', colors.text.replace('text-', 'bg-'))} />

 <div className="relative p-5 z-10">
 {/* Header row */}
 <div className="flex items-start justify-between mb-3">
 <div className={cn('p-2.5 rounded-xl bg-slate-900/5 border border-slate-900/10 ', colors.text)}>
 <Icon className="w-5 h-5"/>
 </div>
 <div className={cn('flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full',
 isGood ? 'bg-emerald-500/15 text-emerald-600 ' : 'bg-red-500/15 text-red-600 ')}>
 <TrendIcon className="w-3 h-3"/>
 <span>{Math.abs(metric.change)}%</span>
 </div>
 </div>

 {/* Value */}
 <div className="mb-1">
 <span className={cn('text-2xl font-bold', colors.text)}>
 {metric.unit === 'Cr' || metric.unit === 'L' || metric.unit === '%' ? '' : ''}
 {metric.value}
 </span>
 {metric.unit && <span className="text-slate-800/50 text-sm font-medium ml-1">{metric.unit}</span>}
 </div>

 {/* Label */}
 <p className="text-slate-800/60 text-xs font-medium tracking-wide">{metric.label}</p>

 {/* Target progress bar */}
 {achievementPct !== null && (
 <div className="mt-3">
 <div className="flex justify-between text-[10px] text-slate-800/40 mb-1">
 <span>vs Target</span>
 <span className={achievementPct >= 100 ? 'text-emerald-600 ' : 'text-yellow-600 '}>
 {achievementPct}%
 </span>
 </div>
 <div className="h-1 rounded-full bg-slate-900/5 overflow-hidden">
 <motion.div
 initial={{ width: 0 }}
 animate={{ width: `${Math.min(achievementPct, 100)}%` }}
 transition={{ duration: 1, delay: delay + 0.3 }}
 className={cn('h-full rounded-full', achievementPct >= 100 ? 'bg-emerald-500' : achievementPct >= 90 ? 'bg-yellow-500' : 'bg-red-500')}
 />
 </div>
 </div>
 )}
 </div>
 </motion.div>
 );
}
