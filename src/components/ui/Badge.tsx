'use client';
import { cn, getStatusColor, getPriorityColor } from '@/lib/utils';

interface BadgeProps {
 label: string;
 variant?: 'status' | 'priority' | 'role' | 'cell' | 'default';
 className?: string;
}

const ROLE_STYLES: Record<string, string> = {
 maintenance: 'bg-purple-100 text-purple-700 border border-purple-300 ',
 admin: 'bg-blue-100 text-blue-700 border border-blue-300 ',
 user: 'bg-slate-100 text-slate-700 border border-slate-300 ',
};

const CELL_STYLES: Record<string, string> = {
 UTS: 'bg-blue-100 text-blue-700 ',
 PRS: 'bg-violet-100 text-violet-700 ',
 ATVM: 'bg-amber-100 text-amber-700 ',
 TTE: 'bg-red-100 text-red-700 ',
 Catering: 'bg-orange-100 text-orange-700 ',
 Claims: 'bg-pink-100 text-pink-700 ',
 Revenue: 'bg-emerald-100 text-emerald-700 ',
 Pass: 'bg-cyan-100 text-cyan-700 ',
 All: 'bg-slate-100 text-slate-700 ',
};

export function Badge({ label, variant = 'default', className }: BadgeProps) {
 let style = 'bg-slate-100 text-slate-700 ';
 if (variant === 'status') style = getStatusColor(label.toLowerCase());
 else if (variant === 'priority') style = getPriorityColor(label.toLowerCase());
 else if (variant === 'role') style = ROLE_STYLES[label] ?? style;
 else if (variant === 'cell') style = CELL_STYLES[label] ?? style;

 return (
 <span className={cn('inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium capitalize', style, className)}>
 {variant === 'status' && <span className="w-1.5 h-1.5 rounded-full bg-current opacity-80"/>}
 {label}
 </span>
 );
}

interface StatPillProps {
 value: string | number;
 change?: number;
 unit?: string;
}

export function StatPill({ value, change, unit }: StatPillProps) {
 const isPositive = (change ?? 0) >= 0;
 return (
 <div className="flex items-center gap-2">
 <span className="text-slate-900 font-semibold">{value}{unit && <span className="text-slate-500 text-sm ml-0.5">{unit}</span>}</span>
 {change !== undefined && (
 <span className={cn('text-xs font-medium px-1.5 py-0.5 rounded-full', isPositive ? 'bg-emerald-500/20 text-emerald-700 ' : 'bg-red-500/20 text-red-700 ')}>
 {isPositive ? '↑' : '↓'} {Math.abs(change)}%
 </span>
 )}
 </div>
 );
}
