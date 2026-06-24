'use client';
import { create } from 'zustand';

interface ThemeStore {
 isDark: boolean;
 initialize: () => void;
 toggleTheme: () => void;
 setDark: (dark: boolean) => void;
}

const STORAGE_KEY = 'rly_dashboard_theme';

function applyToDocument(isDark: boolean) {
 if (typeof document === 'undefined') return;
 // The single source of truth: the `dark` class lives on <html>, matching
 // Tailwind's `darkMode: 'class'` convention exactly (Tailwind's dark:
 // variant compiles to".dark <selector>", which works correctly applied
 // at any ancestor — but <html> is the canonical, conventional place so
 // every CSS variable and component agrees on the same element).
 document.documentElement.classList.toggle('dark', isDark);
}

export const useThemeStore = create<ThemeStore>((set, get) => ({
 isDark: true,

 initialize: () => {
 if (typeof window === 'undefined') return;
 const saved = localStorage.getItem(STORAGE_KEY);
 const isDark = saved !== null ? saved === 'dark' : true; // default dark
 applyToDocument(isDark);
 set({ isDark });
 },

 toggleTheme: () => {
 const next = !get().isDark;
 applyToDocument(next);
 if (typeof window !== 'undefined') {
 localStorage.setItem(STORAGE_KEY, next ? 'dark' : 'light');
 }
 set({ isDark: next });
 },

 setDark: (dark: boolean) => {
 applyToDocument(dark);
 if (typeof window !== 'undefined') {
 localStorage.setItem(STORAGE_KEY, dark ? 'dark' : 'light');
 }
 set({ isDark: dark });
 },
}));
