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
        'relative rounded-2xl bg-white border border-slate-200/80 transition-all duration-300',
        hover && 'hover:shadow-xl hover:shadow-rail-900/5 hover:-translate-y-1 hover:scale-[1.01] hover:border-rail-200 cursor-pointer',
        accent === 'blue'   && 'border-l-[3px] border-l-rail-600',
        accent === 'navy'   && 'border-l-[3px] border-l-navy-800',
        accent === 'green'  && 'border-l-[3px] border-l-emerald-500',
        accent === 'amber'  && 'border-l-[3px] border-l-amber-500',
        accent === 'red'    && 'border-l-[3px] border-l-red-500',
        accent === 'purple' && 'border-l-[3px] border-l-violet-500',
        className
      )}
      style={{ boxShadow: '0 4px 6px -1px rgba(15,23,42,0.02), 0 2px 4px -2px rgba(15,23,42,0.02)' }}
    >
      {children}
    </div>
  );

  if (!animate) return base;
  return (
    <motion.div initial={{ opacity: 0, y: 15, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.4, delay, ease: [0.22, 1, 0.36, 1] }}>
      {base}
    </motion.div>
  );
}
