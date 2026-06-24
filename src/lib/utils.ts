import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
 return twMerge(clsx(inputs));
}

export function formatCrore(value: number, decimals = 2): string {
 return `₹${value.toFixed(decimals)} Cr`;
}

export function formatLakh(value: number, decimals = 2): string {
 return `₹${value.toFixed(decimals)} L`;
}

export function formatNumber(value: number): string {
 return new Intl.NumberFormat('en-IN').format(value);
}

export function formatPercent(value: number, decimals = 1): string {
 return `${value > 0 ? '+' : ''}${value.toFixed(decimals)}%`;
}

export function formatDate(dateStr: string): string {
 return new Date(dateStr).toLocaleDateString('en-IN', {
 day: '2-digit', month: 'short', year: 'numeric'
 });
}

export function formatDateTime(dateStr: string): string {
 return new Date(dateStr).toLocaleString('en-IN', {
 day: '2-digit', month: 'short', year: 'numeric',
 hour: '2-digit', minute: '2-digit'
 });
}

export function getAchievementColor(pct: number): string {
 if (pct >= 105) return 'text-emerald-700 ';
 if (pct >= 100) return 'text-green-700 ';
 if (pct >= 90) return 'text-amber-700 ';
 return 'text-red-700 ';
}

export function getStatusColor(status: string): string {
 const map: Record<string, string> = {
 active: 'text-emerald-700 bg-emerald-100 ',
 resolved: 'text-emerald-700 bg-emerald-100 ',
 generated: 'text-emerald-700 bg-emerald-100 ',
 'in-progress':'text-blue-700 bg-blue-100 ',
 approved: 'text-blue-700 bg-blue-100 ',
 open: 'text-amber-700 bg-amber-100 ',
 pending: 'text-amber-700 bg-amber-100 ',
 idle: 'text-amber-700 bg-amber-100 ',
 escalated: 'text-red-700 bg-red-100 ',
 error: 'text-red-700 bg-red-100 ',
 fault: 'text-red-700 bg-red-100 ',
 critical: 'text-red-700 bg-red-100 ',
 maintenance: 'text-purple-700 bg-purple-100 ',
 rejected: 'text-red-700 bg-red-100 ',
 };
 return map[status] ?? 'text-slate-700 bg-slate-100 ';
}

export function getPriorityColor(priority: string): string {
 const map: Record<string, string> = {
 critical: 'text-red-700 bg-red-100 border border-red-300 ',
 high: 'text-orange-700 bg-orange-100 border border-orange-300 ',
 medium: 'text-amber-700 bg-amber-100 border border-amber-300 ',
 low: 'text-green-700 bg-green-100 border border-green-300 ',
 };
 return map[priority] ?? '';
}

// 20 cells + All — unique colour per cell
export const CELL_COLORS: Record<string, string> = {
 'Planning': '#3b82f6',
 'Manpower Planning': '#6366f1',
 'Security D&AR': '#ef4444',
 'Legal': '#f59e0b',
 'Marketing': '#ec4899',
 'Ticket Checking': '#f97316',
 'UTS PRS': '#8b5cf6',
 'JTBS/YTSK/STBA': '#06b6d4',
 'Store': '#84cc16',
 'Sanitation': '#14b8a6',
 'Catering': '#fb923c',
 'Parking': '#a78bfa',
 'Publicity': '#f472b6',
 'License Porter': '#facc15',
 'Complaint/RailMadad': '#f87171',
 'Concession': '#34d399',
 'PA': '#38bdf8',
 'Commercial Control': '#818cf8',
 'Union/DRUCC': '#fb7185',
 'DAK': '#a3e635',
 'All': '#94a3b8',
};

export const CELL_BG: Record<string, string> = {
 'Planning': 'from-blue-600/20 to-blue-900/10 border-blue-500/20',
 'Manpower Planning': 'from-indigo-600/20 to-indigo-900/10 border-indigo-500/20',
 'Security D&AR': 'from-red-600/20 to-red-900/10 border-red-500/20',
 'Legal': 'from-amber-600/20 to-amber-900/10 border-amber-500/20',
 'Marketing': 'from-pink-600/20 to-pink-900/10 border-pink-500/20',
 'Ticket Checking': 'from-orange-600/20 to-orange-900/10 border-orange-500/20',
 'UTS PRS': 'from-violet-600/20 to-violet-900/10 border-violet-500/20',
 'JTBS/YTSK/STBA': 'from-cyan-600/20 to-cyan-900/10 border-cyan-500/20',
 'Store': 'from-lime-600/20 to-lime-900/10 border-lime-500/20',
 'Sanitation': 'from-teal-600/20 to-teal-900/10 border-teal-500/20',
 'Catering': 'from-orange-500/20 to-orange-900/10 border-orange-400/20',
 'Parking': 'from-purple-600/20 to-purple-900/10 border-purple-500/20',
 'Publicity': 'from-fuchsia-600/20 to-fuchsia-900/10 border-fuchsia-500/20',
 'License Porter': 'from-yellow-600/20 to-yellow-900/10 border-yellow-500/20',
 'Complaint/RailMadad': 'from-rose-600/20 to-rose-900/10 border-rose-500/20',
 'Concession': 'from-emerald-600/20 to-emerald-900/10 border-emerald-500/20',
 'PA': 'from-sky-600/20 to-sky-900/10 border-sky-500/20',
 'Commercial Control': 'from-slate-600/20 to-slate-900/10 border-slate-500/20',
 'Union/DRUCC': 'from-rose-500/20 to-rose-900/10 border-rose-400/20',
 'DAK': 'from-green-600/20 to-green-900/10 border-green-500/20',
 'All': 'from-slate-600/20 to-slate-900/10 border-slate-500/20',
};

// Short display labels for tight UI (sidebar, tabs)
export const CELL_SHORT: Record<string, string> = {
 'Planning': 'Planning',
 'Manpower Planning': 'Manpower',
 'Security D&AR': 'Security',
 'Legal': 'Legal',
 'Marketing': 'Marketing',
 'Ticket Checking': 'TTE/TC',
 'UTS PRS': 'UTS/PRS',
 'JTBS/YTSK/STBA': 'JTBS',
 'Store': 'Store',
 'Sanitation': 'Sanitation',
 'Catering': 'Catering',
 'Parking': 'Parking',
 'Publicity': 'Publicity',
 'License Porter': 'Lic.Porter',
 'Complaint/RailMadad': 'Complaints',
 'Concession': 'Concession',
 'PA': 'PA',
 'Commercial Control': 'Comm.Ctrl',
 'Union/DRUCC': 'Union',
 'DAK': 'DAK',
 'All': 'All',
};
