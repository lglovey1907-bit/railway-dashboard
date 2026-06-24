'use client';
import { GlassCard } from '@/components/ui/GlassCard';
import { Settings, Bell, Shield, Database, Palette, RefreshCw } from 'lucide-react';

const SETTING_GROUPS = [
 { icon: Bell, label: 'Notifications', desc: 'Alert preferences and escalation thresholds' },
 { icon: Shield, label: 'Security', desc: 'Session timeout, 2FA, password policy' },
 { icon: Database, label: 'Data Retention', desc: 'Backup schedules and data archival policy' },
 { icon: Palette, label: 'Display', desc: 'Theme, density, and chart defaults' },
 { icon: RefreshCw, label: 'Sync', desc: 'Auto-refresh intervals and PRIMES sync schedule' },
];

export default function SettingsPage() {
 return (
 <div className="space-y-4 pb-6">
 {SETTING_GROUPS.map((s, i) => (
 <GlassCard key={s.label} className="p-5"delay={i * 0.06}>
 <div className="flex items-center justify-between">
 <div className="flex items-center gap-3">
 <div className="p-2 rounded-xl bg-slate-900/5 border border-slate-900/10">
 <s.icon className="w-4 h-4 text-slate-800/50"/>
 </div>
 <div>
 <p className="text-slate-800/80 font-medium text-sm">{s.label}</p>
 <p className="text-slate-800/30 text-xs">{s.desc}</p>
 </div>
 </div>
 <button className="px-3 py-1.5 rounded-xl bg-slate-900/5 border border-slate-900/10 text-slate-800/40 text-xs hover:bg-slate-900/10 hover:text-slate-800/70 transition-all">
 Configure
 </button>
 </div>
 </GlassCard>
 ))}
 </div>
 );
}
