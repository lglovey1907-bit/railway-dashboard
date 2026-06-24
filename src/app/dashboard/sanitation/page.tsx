'use client';
import { Construction } from 'lucide-react';
import { CellStaffRoster } from '@/components/cell/CellStaffRoster';
import { CellDataManager } from '@/components/cell/CellDataManager';
import { SharedTablesView } from '@/components/cell/SharedTablesView';

export default function Page() {
 return (
 <div className="space-y-5 pb-8">
 <CellStaffRoster cell="Sanitation"/>
 <CellDataManager cell="Sanitation"/>
 <SharedTablesView cell="Sanitation"/>

 <div className="rounded-2xl border border-slate-900/8 bg-slate-900/3 flex flex-col items-center justify-center gap-3 py-16">
 <Construction size={40} className="text-blue-600"/>
 <h1 className="text-slate-800/60 text-lg font-bold">Sanitation</h1>
 <p className="text-slate-800/30 text-sm">Connect a data source to activate this cell's analytics dashboard.</p>
 </div>
 </div>
 );
}
