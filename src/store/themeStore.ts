'use client';
import { create } from 'zustand';

interface ThemeStore {
 isDark: boolean;
 initialize: () => void;
 toggleTheme: () => void;
 setDark: (dark: boolean) => void;
}

const THEME_NS = 'dashboard_theme'; // Upstash namespace (shared across devices)

function applyToDocument(isDark: boolean) {
 if (typeof document === 'undefined') return;
 document.documentElement.classList.toggle('dark', isDark);
}

/** Write theme to server (fire-and-forget). */
function serverWriteTheme(isDark: boolean) {
 if (typeof window === 'undefined') return;
 import('@/lib/config/sharedSync').then(({ sharedWrite }) => {
   sharedWrite(THEME_NS, isDark ? 'dark' : 'light');
 }).catch(() => {});
}

export const useThemeStore = create<ThemeStore>((set, get) => ({
 isDark: false, // default: light — prevents dark flash on Windows/Edge fresh sessions

 initialize: () => {
   if (typeof window === 'undefined') return;
   // 1. Apply light immediately to avoid dark flash while server responds
   applyToDocument(false);
   // 2. Read from server (source of truth — cross-device consistent)
   import('@/lib/config/sharedSync').then(({ sharedRead }) => {
     sharedRead(THEME_NS).then((val: unknown) => {
       const isDark = val === 'dark';
       applyToDocument(isDark);
       set({ isDark });
     }).catch(() => {
       // Server unavailable — stay light (already applied above)
     });
   }).catch(() => {});
 },

 toggleTheme: () => {
   const next = !get().isDark;
   applyToDocument(next);
   set({ isDark: next });
   serverWriteTheme(next);
 },

 setDark: (dark: boolean) => {
   applyToDocument(dark);
   set({ isDark: dark });
   serverWriteTheme(dark);
 },
}));
