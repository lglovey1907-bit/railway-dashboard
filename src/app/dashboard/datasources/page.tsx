'use client';
import { useState } from 'react';
import { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { GlassCard } from '@/components/ui/GlassCard';
import { Badge } from '@/components/ui/Badge';
import { mockDataSources } from '@/lib/data/mockData';
import { useAuthStore } from '@/store/authStore';
import { useRouter } from 'next/navigation';
import {
 Database, Plus, Settings2, RefreshCw, Trash2, Upload,
 Globe, FileText, Code, HardDrive, CheckCircle, AlertCircle, Clock
} from 'lucide-react';
import { cn, formatDateTime } from '@/lib/utils';
import type { DataSourceConfig } from '@/types';

const TYPE_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
 csv: FileText, json: Code, api: Globe, sql: HardDrive
};
const TYPE_COLORS: Record<string, string> = {
 csv: 'text-blue-600 bg-blue-500/10 border-blue-500/20',
 json: 'text-violet-600 bg-violet-500/10 border-violet-500/20',
 api: 'text-emerald-600 bg-emerald-500/10 border-emerald-500/20',
 sql: 'text-amber-600 bg-amber-500/10 border-amber-500/20',
};

export default function DataSourcesPage() {
 const { user } = useAuthStore();
 const router = useRouter();
 const [configs, setConfigs] = useState<DataSourceConfig[]>(mockDataSources);
 const [showAddModal, setShowAddModal] = useState(false);
 const [refreshingId, setRefreshingId] = useState<string | null>(null);

 useEffect(() => {
 if (user && user.role !== 'maintenance') router.replace('/dashboard');
 }, [user, router]);

 const handleRefresh = (id: string) => {
 setRefreshingId(id);
 setTimeout(() => setRefreshingId(null), 1500);
 };

 const statusIcon = (status: string) => {
 if (status === 'active') return <CheckCircle className="w-4 h-4 text-emerald-600"/>;
 if (status === 'error') return <AlertCircle className="w-4 h-4 text-red-600"/>;
 return <Clock className="w-4 h-4 text-yellow-600"/>;
 };

 const totals = {
 active: configs.filter(c => c.status === 'active').length,
 error: configs.filter(c => c.status === 'error').length,
 };

 return (
 <div className="space-y-6 pb-6">
 {/* Header stats */}
 <div className="grid grid-cols-4 gap-4">
 {[
 { label: 'Total Sources', value: configs.length, color: 'text-slate-900 ' },
 { label: 'Active', value: totals.active, color: 'text-emerald-600 ' },
 { label: 'Error', value: totals.error, color: 'text-red-600 ' },
 { label: 'Data Types', value: 4, color: 'text-violet-600 ' },
 ].map(s => (
 <GlassCard key={s.label} className="p-4"delay={0.05}>
 <p className={cn('text-2xl font-bold', s.color)}>{s.value}</p>
 <p className="text-slate-800/40 text-xs mt-1">{s.label}</p>
 </GlassCard>
 ))}
 </div>

 {/* Actions row */}
 <div className="flex items-center justify-between">
 <h3 className="text-slate-900 font-semibold">Data Source Registry</h3>
 <button onClick={() => setShowAddModal(true)}
 className="flex items-center gap-2 px-4 py-2 rounded-xl bg-rail-600/20 border border-rail-500/30 text-rail-300 text-sm font-medium hover:bg-rail-600/30 transition-all">
 <Plus className="w-4 h-4"/>
 Add Source
 </button>
 </div>

 {/* Source cards */}
 <div className="space-y-3">
 {configs.map((config, i) => {
 const TypeIcon = TYPE_ICONS[config.type] ?? Database;
 return (
 <motion.div key={config.id}
 initial={{ opacity: 0, y: 8 }}
 animate={{ opacity: 1, y: 0 }}
 transition={{ delay: i * 0.05 }}
 className={cn('rounded-2xl border backdrop-blur-xl p-5 transition-all',
 config.status === 'error'
 ? 'bg-red-500/5 border-red-500/20'
 : 'bg-slate-900/3 border-slate-900/8 hover:bg-slate-900/5 ')}>
 <div className="flex items-start justify-between flex-wrap gap-3">
 <div className="flex items-start gap-4">
 <div className={cn('p-2.5 rounded-xl border flex-shrink-0', TYPE_COLORS[config.type])}>
 <TypeIcon className="w-5 h-5"/>
 </div>
 <div>
 <div className="flex items-center gap-2 mb-1">
 <p className="text-slate-800/80 font-semibold">{config.name}</p>
 {statusIcon(config.status)}
 </div>
 <div className="flex items-center gap-2 flex-wrap">
 <span className={cn('px-2 py-0.5 rounded-lg text-[10px] font-medium uppercase border', TYPE_COLORS[config.type])}>
 {config.type}
 </span>
 <Badge label={config.cell} variant="cell"/>
 <Badge label={config.status} variant="status"/>
 </div>
 {config.endpoint && (
 <p className="text-slate-800/30 text-xs mt-1.5 font-mono">{config.endpoint}</p>
 )}
 <div className="flex items-center gap-3 mt-1.5 text-slate-800/30 text-[10px]">
 <span>Refresh: every {config.refreshInterval >= 1440 ? `${config.refreshInterval / 1440}d` : `${config.refreshInterval}m`}</span>
 {config.lastRefreshed && <span>Last: {formatDateTime(config.lastRefreshed)}</span>}
 </div>
 </div>
 </div>

 <div className="flex items-center gap-2">
 <button onClick={() => handleRefresh(config.id)}
 className="p-2 rounded-xl bg-slate-900/5 border border-slate-900/8 text-slate-800/40 hover:text-slate-800/70 hover:bg-slate-900/10 transition-all">
 <RefreshCw className={cn('w-4 h-4', refreshingId === config.id && 'animate-spin')} />
 </button>
 <button className="p-2 rounded-xl bg-slate-900/5 border border-slate-900/8 text-slate-800/40 hover:text-blue-600 hover:bg-blue-500/10 transition-all">
 <Settings2 className="w-4 h-4"/>
 </button>
 <button className="p-2 rounded-xl bg-slate-900/5 border border-slate-900/8 text-slate-800/40 hover:text-red-600 hover:bg-red-500/10 transition-all">
 <Trash2 className="w-4 h-4"/>
 </button>
 </div>
 </div>

 {/* Error message */}
 {config.status === 'error' && (
 <div className="mt-3 flex items-center gap-2 px-3 py-2 bg-red-500/10 border border-red-500/20 rounded-xl">
 <AlertCircle className="w-3.5 h-3.5 text-red-600 flex-shrink-0"/>
 <p className="text-red-700 text-xs">Connection failed. Check endpoint or re-upload file.</p>
 </div>
 )}
 </motion.div>
 );
 })}
 </div>

 {/* Add Modal */}
 <AnimatePresence>
 {showAddModal && (
 <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
 className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
 onClick={() => setShowAddModal(false)}>
 <motion.div
 initial={{ scale: 0.95, y: 20 }}
 animate={{ scale: 1, y: 0 }}
 exit={{ scale: 0.95, y: 20 }}
 onClick={e => e.stopPropagation()}
 className="w-full max-w-lg rounded-2xl bg-slate-900/95 border border-slate-900/10 backdrop-blur-2xl p-6 shadow-2xl">
 <h3 className="text-slate-900 font-bold text-lg mb-4">Add Data Source</h3>
 <div className="space-y-4">
 <div>
 <label className="text-slate-800/50 text-xs font-medium block mb-1.5">Source Name</label>
 <input placeholder="e.g. PRS Daily Revenue"className="w-full px-4 py-2.5 bg-slate-900/5 border border-slate-900/10 rounded-xl text-slate-900 text-sm placeholder-slate-400/25 focus:outline-none focus:border-rail-500/50"/>
 </div>
 <div className="grid grid-cols-2 gap-4">
 <div>
 <label className="text-slate-800/50 text-xs font-medium block mb-1.5">Type</label>
 <select className="w-full px-4 py-2.5 bg-slate-900/5 border border-slate-900/10 rounded-xl text-slate-900 text-sm focus:outline-none focus:border-rail-500/50">
 <option value="csv">CSV Upload</option>
 <option value="json">JSON Upload</option>
 <option value="api">REST API</option>
 <option value="sql">SQL Database</option>
 </select>
 </div>
 <div>
 <label className="text-slate-800/50 text-xs font-medium block mb-1.5">Cell</label>
 <select className="w-full px-4 py-2.5 bg-slate-900/5 border border-slate-900/10 rounded-xl text-slate-900 text-sm focus:outline-none focus:border-rail-500/50">
 {['UTS','PRS','ATVM','TTE','Catering','Claims','Revenue','Pass'].map(c => (
 <option key={c} value={c}>{c}</option>
 ))}
 </select>
 </div>
 </div>
 <div>
 <label className="text-slate-800/50 text-xs font-medium block mb-1.5">API Endpoint / File</label>
 <div className="flex gap-2">
 <input placeholder="https://... or upload file"className="flex-1 px-4 py-2.5 bg-slate-900/5 border border-slate-900/10 rounded-xl text-slate-900 text-sm placeholder-slate-400/25 focus:outline-none focus:border-rail-500/50"/>
 <button className="px-3 py-2.5 bg-slate-900/5 border border-slate-900/10 rounded-xl text-slate-800/40 hover:text-slate-800/70 hover:bg-slate-900/10 transition-all">
 <Upload className="w-4 h-4"/>
 </button>
 </div>
 </div>
 <div>
 <label className="text-slate-800/50 text-xs font-medium block mb-1.5">Refresh Interval</label>
 <select className="w-full px-4 py-2.5 bg-slate-900/5 border border-slate-900/10 rounded-xl text-slate-900 text-sm focus:outline-none focus:border-rail-500/50">
 <option value="15">Every 15 minutes</option>
 <option value="30">Every 30 minutes</option>
 <option value="60">Every hour</option>
 <option value="720">Every 12 hours</option>
 <option value="1440">Every day</option>
 </select>
 </div>
 </div>
 <div className="flex gap-3 mt-6">
 <button onClick={() => setShowAddModal(false)}
 className="flex-1 py-2.5 rounded-xl border border-slate-900/10 text-slate-800/50 text-sm hover:bg-slate-900/5 transition-all">
 Cancel
 </button>
 <button className="flex-1 py-2.5 rounded-xl bg-rail-600/30 border border-rail-500/40 text-slate-900 text-sm font-medium hover:bg-rail-600/40 transition-all">
 Add Source
 </button>
 </div>
 </motion.div>
 </motion.div>
 )}
 </AnimatePresence>
 </div>
 );
}
