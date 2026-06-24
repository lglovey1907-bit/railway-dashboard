'use client';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';
import type { ReactNode } from 'react';

interface GlassCardProps {
  children: ReactNode; className?: string;
  hover?: boolean; glow?: string;
  animate?: boolean; delay?: number; onClick?: () => void;
  accent?: 'blue' | 'navy' | 'green' | 'amber' | 'red' | 'purple' | 'none';
}

export function GlassCard({ children, className, hover, animate = true, delay = 0, onClick, accent = 'none' }: GlassCardProps) {
  const base = (
    <div onClick={onClick}
      className={cn(
        'relative rounded-xl bg-white border border-slate-200 transition-all duration-200',
        hover && 'hover:shadow-md hover:-translate-y-0.5 hover:border-slate-300 cursor-pointer',
        accent === 'blue'   && 'border-l-[3px] border-l-rail-600',
        accent === 'navy'   && 'border-l-[3px] border-l-navy-800',
        accent === 'green'  && 'border-l-[3px] border-l-emerald-500',
        accent === 'amber'  && 'border-l-[3px] border-l-amber-500',
        accent === 'red'    && 'border-l-[3px] border-l-red-500',
        accent === 'purple' && 'border-l-[3px] border-l-violet-500',
        className
      )}
      style={{ boxShadow: '0 1px 2px rgba(15,23,42,0.04), 0 2px 4px rgba(15,23,42,0.06)' }}
    >
      {children}
    </div>
  );

  if (!animate) return base;
  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay, ease: 'easeOut' }}>
      {base}
    </motion.div>
  );
}
