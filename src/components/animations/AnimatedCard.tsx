'use client';

import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { ReactNode } from 'react';

interface AnimatedCardProps {
  children: ReactNode;
  className?: string;
  delay?: number;
  hoverEffect?: boolean;
}

export function AnimatedCard({ children, className, delay = 0, hoverEffect = true }: AnimatedCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 15, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{
        duration: 0.4,
        delay: delay,
        ease: [0.22, 1, 0.36, 1]
      }}
      whileHover={hoverEffect ? {
        y: -4,
        scale: 1.01,
        transition: { duration: 0.2, ease: 'easeOut' }
      } : undefined}
      className={cn(
        "bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/60 dark:border-slate-800",
        hoverEffect && "hover:shadow-xl hover:shadow-indigo-500/5 hover:border-indigo-200/50 dark:hover:border-indigo-900/50 transition-shadow duration-300",
        className
      )}
    >
      {children}
    </motion.div>
  );
}
