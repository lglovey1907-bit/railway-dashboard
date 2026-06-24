'use client';
import { useState, useEffect } from 'react';

/**
 * Tracks whether the app is currently in dark mode by observing the
 * `dark` class on <html> (toggled by the TopBar theme switch).
 * Needed for anything that can't use Tailwind's `dark:` variant —
 * e.g. inline styles passed to chart libraries like Recharts, which
 * take raw color values (rgba(...)) rather than CSS classes.
 */
export function useIsDark(): boolean {
 const [isDark, setIsDark] = useState(true);

 useEffect(() => {
 const root = document.documentElement;
 const update = () => setIsDark(root.classList.contains('dark'));
 update();

 const observer = new MutationObserver(update);
 observer.observe(root, { attributes: true, attributeFilter: ['class'] });
 return () => observer.disconnect();
 }, []);

 return isDark;
}

/** Common chart color tokens that flip with theme — pass straight into Recharts props. */
export function useChartTheme() {
 const isDark = useIsDark();
 return {
 isDark,
 grid: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(15,23,42,0.08)',
 tick: isDark ? 'rgba(255,255,255,0.4)' : 'rgba(15,23,42,0.55)',
 legend: isDark ? 'rgba(255,255,255,0.6)' : 'rgba(15,23,42,0.65)',
 reference: isDark ? 'rgba(255,255,255,0.2)' : 'rgba(15,23,42,0.25)',
 referenceLabel: isDark ? 'rgba(255,255,255,0.3)' : 'rgba(15,23,42,0.4)',
 target: isDark ? 'rgba(255,255,255,0.3)' : 'rgba(15,23,42,0.35)',
 tooltipBg: isDark ? '#1e293b' : '#ffffff',
 tooltipBorder: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(15,23,42,0.1)',
 tooltipText: isDark ? '#fff' : '#0f172a',
 };
}
