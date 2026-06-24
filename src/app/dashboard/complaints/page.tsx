'use client';
import { CellStaffRoster } from '@/components/cell/CellStaffRoster';
import { CellDataManager } from '@/components/cell/CellDataManager';
import { SharedTablesView } from '@/components/cell/SharedTablesView';
import { ComplaintsPanel } from '@/components/dashboard/ComplaintsPanel';
export default function ComplaintsPage() {
 return <div className="pb-6"><CellStaffRoster cell="Complaint/RailMadad"/><CellDataManager cell="Complaint/RailMadad"/>
 <SharedTablesView cell="Complaint/RailMadad"/><ComplaintsPanel /></div>;
}
