'use client';

import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { ReactNode } from 'react';

interface Tab {
  id: string;
  label: ReactNode;
}

interface AnimatedTabsProps {
  tabs: Tab[];
  activeTab: string;
  onChange: (id: string) => void;
  className?: string;
  tabClassName?: string;
  activeTabClassName?: string;
}

export function AnimatedTabs({
  tabs,
  activeTab,
  onChange,
  className,
  tabClassName,
  activeTabClassName
}: AnimatedTabsProps) {
  return (
    <div className={cn("flex space-x-1 p-1 bg-slate-100/60 dark:bg-slate-800/50 rounded-xl backdrop-blur-md border border-white/20 shadow-inner", className)}>
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            onClick={() => onChange(tab.id)}
            className={cn(
              "relative px-4 py-2 text-sm font-medium rounded-lg transition-colors duration-200 outline-none",
              isActive ? "text-slate-900 dark:text-slate-100" : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300",
              tabClassName,
              isActive && activeTabClassName
            )}
            style={{ WebkitTapHighlightColor: 'transparent' }}
          >
            {isActive && (
              <motion.div
                layoutId="active-tab-indicator"
                className="absolute inset-0 bg-white dark:bg-slate-700 rounded-lg shadow-sm border border-slate-200/50 dark:border-slate-600/50"
                initial={false}
                transition={{
                  type: "spring",
                  stiffness: 400,
                  damping: 30
                }}
              />
            )}
            <span className="relative z-10">{tab.label}</span>
          </button>
        );
      })}
    </div>
  );
}
