'use client';
import { RevenueTrendChart } from '@/components/charts/RevenueTrendChart';
import { CellDistributionChart, TargetAchievementChart } from '@/components/charts/CellCharts';
import { StationPerformanceTable } from '@/components/dashboard/StationTable';
export default function RevenuePage() {
 return (
 <div className="space-y-6 pb-6">
 <RevenueTrendChart />
 <div className="grid lg:grid-cols-2 gap-4">
 <CellDistributionChart />
 <TargetAchievementChart />
 </div>
 <StationPerformanceTable />
 </div>
 );
}
