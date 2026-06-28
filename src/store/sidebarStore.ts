'use client';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface SidebarStore {
  /** Icon-rail (true) or full sidebar (false) */
  isCollapsed: boolean;
  /** Mobile overlay drawer open */
  isMobileOpen: boolean;
  /** Auto-collapse when navigating into a Cell page */
  autoCollapseOnCell: boolean;
  /** Set true when sidebar was collapsed automatically (not by user) */
  wasAutoCollapsed: boolean;

  toggle: () => void;
  collapse: (auto?: boolean) => void;
  expand: () => void;
  setMobileOpen: (open: boolean) => void;
  toggleMobile: () => void;
  setAutoCollapseOnCell: (v: boolean) => void;
}

export const useSidebarStore = create<SidebarStore>()(
  persist(
    (set) => ({
      isCollapsed: false,
      isMobileOpen: false,
      autoCollapseOnCell: true,
      wasAutoCollapsed: false,

      toggle: () => set(s => ({ isCollapsed: !s.isCollapsed, wasAutoCollapsed: false })),
      collapse: (auto = false) => set({ isCollapsed: true, wasAutoCollapsed: auto }),
      expand: () => set({ isCollapsed: false, wasAutoCollapsed: false }),
      setMobileOpen: (open) => set({ isMobileOpen: open }),
      toggleMobile: () => set(s => ({ isMobileOpen: !s.isMobileOpen })),
      setAutoCollapseOnCell: (v) => set({ autoCollapseOnCell: v }),
    }),
    {
      name: 'rly_sidebar_pref',
      // Only persist these keys across sessions
      partialize: (s) => ({
        isCollapsed: s.isCollapsed,
        autoCollapseOnCell: s.autoCollapseOnCell,
      }),
    }
  )
);
