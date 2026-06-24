'use client';
import { CellStaffRoster } from '@/components/cell/CellStaffRoster';
import { CellDataManager } from '@/components/cell/CellDataManager';
import { SharedTablesView } from '@/components/cell/SharedTablesView';
import { GlassCard } from '@/components/ui/GlassCard';
import { mockKPIs } from '@/lib/data/mockData';
import { KPICard } from '@/components/dashboard/KPICard';
export default function CellPage() {
 return (
 <div className="space-y-6 pb-6">
 <CellStaffRoster cell="Catering"/>
 <CellDataManager cell="Catering"/>
 <SharedTablesView cell="Catering"/>

 <div className="grid grid-cols-2 gap-4">
 {mockKPIs.slice(0,2).map((m, i) => <KPICard key={m.id} metric={m} delay={i * 0.06} />)}
 </div>
 <GlassCard className="p-8"delay={0.1}>
 <p className="text-slate-800/50 text-sm text-center">Connect a data source to view this dashboard. Go to Data Sources (Maintenance role) to configure.</p>
 </GlassCard>
 </div>
 );
}
