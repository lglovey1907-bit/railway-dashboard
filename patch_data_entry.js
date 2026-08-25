const fs = require('fs');
const filepath = 'src/components/financial/DataEntryModal.tsx';
let text = fs.readFileSync(filepath, 'utf8');

// We need to rewrite DataEntryModal.tsx to use modular cards.
// First, define groups like in RevenueTable.

const newCode = `'use client';
import { useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Save, Send, CheckCircle, XCircle, Eye, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useFinancialStore } from '@/lib/financial/financialStore';
import type { FYMonth, TargetStatus } from '@/lib/financial/types';
import { FY_MONTHS } from '@/lib/financial/types';
import type { RevenueHead } from '@/lib/financial/types';

const STATUS_COLOURS: Record<string, string> = {
  draft:     'bg-slate-100 text-slate-600',
  submitted: 'bg-blue-100 text-blue-700',
  verified:  'bg-indigo-100 text-indigo-700',
  approved:  'bg-emerald-100 text-emerald-700',
  published: 'bg-green-100 text-green-700',
};

interface Props {
  fyId: string;
  onClose: () => void;
  currentUser?: string;
  canApprove?: boolean;
}

export function DataEntryModal({ fyId, onClose, currentUser = 'User', canApprove = false }: Props) {
  const store = useFinancialStore();
  // Include headers now for grouping
  const revenueHeads = store.revenueHeads.filter(h => h.isActive && !h.isTotal);
  const records      = store.getAllRecords(fyId);

  const [selectedMonth, setSelectedMonth] = useState<FYMonth>(1);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form state matches new advanced fields
  const [form, setForm] = useState({
    actualsPrevPrevYear: '',
    actualsPrevYear: '',
    targetMonth: '',
    targetUpto: '',
    targetYearly: '',
    currentMonthPY: '',
    actual: '', // Current Month CY
    remarks: '',
  });

  const openEdit = (rec: ReturnType<typeof store.getRecord>) => {
    if (!rec) return;
    setEditingId(rec.id);
    setForm({
      actualsPrevPrevYear: rec.actualsPrevPrevYear?.toString() ?? '',
      actualsPrevYear: rec.actualsPrevYear?.toString() ?? '',
      targetMonth: rec.targetMonth?.toString() ?? '',
      targetUpto: rec.targetUpto?.toString() ?? '',
      targetYearly: rec.targetYearly?.toString() ?? '',
      currentMonthPY: rec.currentMonthPY?.toString() ?? '',
      actual: rec.actual?.toString() ?? '',
      remarks: rec.remarks ?? '',
    });
  };

  const save = (rhId: string) => {
    const parseNum = (v: string) => v.trim() !== '' ? parseFloat(v) : undefined;
    store.upsertRecord(
      {
        fyId, month: selectedMonth, revenueHeadId: rhId,
        actualsPrevPrevYear: parseNum(form.actualsPrevPrevYear),
        actualsPrevYear: parseNum(form.actualsPrevYear),
        targetMonth: parseNum(form.targetMonth),
        targetUpto: parseNum(form.targetUpto),
        targetYearly: parseNum(form.targetYearly),
        currentMonthPY: parseNum(form.currentMonthPY),
        actual: parseNum(form.actual),
        remarks: form.remarks,
        // We will default to available if it's new
        targetStatus: 'available',
      },
      currentUser,
    );
    setEditingId(null);
  };

  // Grouping logic (like RevenueTable)
  const groups: RevenueHead[][] = [];
  let currentGroup: RevenueHead[] = [];
  
  revenueHeads.forEach(head => {
    const isTopLevelStart = !head.parentId && !head.isSubTotalFor && !head.isTotal;
    const isGrandTotal = head.isTotal && !head.isSubTotalFor;
    
    if (isTopLevelStart || isGrandTotal) {
      if (currentGroup.length > 0) groups.push(currentGroup);
      currentGroup = [head];
    } else {
      currentGroup.push(head);
    }
  });
  if (currentGroup.length > 0) groups.push(currentGroup);

  if (typeof window === 'undefined') return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[3000] flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}
      onClick={onClose}
    >
      <div
        className="bg-slate-100 rounded-2xl shadow-2xl w-full max-w-[95vw] max-h-[95vh] flex flex-col overflow-hidden border border-slate-300"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-slate-300 bg-white shrink-0 shadow-sm z-10">
          <div>
            <h2 className="text-base font-bold text-slate-900">Data Entry — Monthly Figures</h2>
            <p className="text-[10px] text-slate-500 uppercase tracking-wide">All figures in Crore (₹ Cr)</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="relative">
              <select
                value={selectedMonth}
                onChange={e => { setSelectedMonth(Number(e.target.value) as FYMonth); setEditingId(null); }}
                className="pl-3 pr-7 py-1.5 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-rail-400 appearance-none font-semibold text-slate-800"
              >
                {FY_MONTHS.map(m => (
                  <option key={m.id} value={m.id}>{m.label}</option>
                ))}
              </select>
              <ChevronDown size={14} className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400"/>
            </div>
            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-200 text-slate-500 hover:text-slate-800 transition-colors">
              <X size={18}/>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          {groups.map((group, gIdx) => {
            const topRow = group[0];
            const title = topRow.isTotal ? topRow.name : (topRow.name || 'Category');
            
            return (
              <div key={topRow.id} className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="px-4 py-2 bg-slate-50/80 border-b border-slate-200">
                  <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full shadow-sm" style={{ backgroundColor: topRow.color || '#94a3b8' }} />
                    {title}
                  </h3>
                </div>
                
                <div className="overflow-x-auto">
                  <table className="w-full text-xs border-collapse">
                    <thead className="bg-slate-800 text-slate-100 text-[10px] uppercase tracking-wider sticky top-0 z-10">
                      <tr>
                        <th className="px-3 py-1.5 text-left border-r border-slate-700 w-48 font-semibold" rowSpan={2}>Revenue Head</th>
                        <th className="px-2 py-1 border-r border-b border-slate-700 text-center" colSpan={2}>Achieved in year</th>
                        <th className="px-2 py-1 border-r border-b border-slate-700 text-center" colSpan={3}>Target</th>
                        <th className="px-2 py-1 border-r border-b border-slate-700 text-center" colSpan={2}>Current Month</th>
                        <th className="px-3 py-1.5 text-center border-r border-slate-700" rowSpan={2}>Status</th>
                        <th className="px-3 py-1.5 text-center" rowSpan={2}>Action</th>
                      </tr>
                      <tr>
                        <th className="px-2 py-1 border-r border-slate-700 font-medium">Prev-Prev</th>
                        <th className="px-2 py-1 border-r border-slate-700 font-medium">Prev</th>
                        <th className="px-2 py-1 border-r border-slate-700 font-medium">Month</th>
                        <th className="px-2 py-1 border-r border-slate-700 font-medium">Upto</th>
                        <th className="px-2 py-1 border-r border-slate-700 font-medium">Yearly</th>
                        <th className="px-2 py-1 border-r border-slate-700 font-medium">PY</th>
                        <th className="px-2 py-1 border-r border-slate-700 font-medium">CY</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {group.map(head => {
                        const rec = records.find(r => r.month === selectedMonth && r.revenueHeadId === head.id);
                        const isEditing = editingId === rec?.id || (editingId === \`new-\${head.id}\` && !rec);
                        const isHdr = head.isHeader;
                        const hBg = isHdr ? 'bg-slate-50 font-bold' : 'bg-inherit';
                        
                        if (isEditing) {
                          return (
                            <tr key={head.id} className="bg-blue-50/50 border-y border-blue-200">
                              <td className="px-3 py-2 font-semibold text-slate-800 whitespace-nowrap border-r border-slate-200">
                                <span className="inline-block w-2 h-2 rounded-full mr-2" style={{ backgroundColor: head.color }}/>
                                {head.name}
                              </td>
                              <td className="px-1 py-1 border-r border-slate-200"><input type="number" value={form.actualsPrevPrevYear} onChange={e => setForm(f => ({ ...f, actualsPrevPrevYear: e.target.value }))} className="w-16 px-1 py-0.5 rounded border border-slate-200 text-right text-xs" /></td>
                              <td className="px-1 py-1 border-r border-slate-200"><input type="number" value={form.actualsPrevYear} onChange={e => setForm(f => ({ ...f, actualsPrevYear: e.target.value }))} className="w-16 px-1 py-0.5 rounded border border-slate-200 text-right text-xs" /></td>
                              <td className="px-1 py-1 border-r border-slate-200"><input type="number" value={form.targetMonth} onChange={e => setForm(f => ({ ...f, targetMonth: e.target.value }))} className="w-16 px-1 py-0.5 rounded border border-slate-200 text-right text-xs text-indigo-700" /></td>
                              <td className="px-1 py-1 border-r border-slate-200"><input type="number" value={form.targetUpto} onChange={e => setForm(f => ({ ...f, targetUpto: e.target.value }))} className="w-16 px-1 py-0.5 rounded border border-slate-200 text-right text-xs text-indigo-700" /></td>
                              <td className="px-1 py-1 border-r border-slate-200"><input type="number" value={form.targetYearly} onChange={e => setForm(f => ({ ...f, targetYearly: e.target.value }))} className="w-16 px-1 py-0.5 rounded border border-slate-200 text-right text-xs text-indigo-700" /></td>
                              <td className="px-1 py-1 border-r border-slate-200"><input type="number" value={form.currentMonthPY} onChange={e => setForm(f => ({ ...f, currentMonthPY: e.target.value }))} className="w-16 px-1 py-0.5 rounded border border-slate-200 text-right text-xs" /></td>
                              <td className="px-1 py-1 border-r border-slate-200"><input type="number" value={form.actual} onChange={e => setForm(f => ({ ...f, actual: e.target.value }))} className="w-16 px-1 py-0.5 rounded border border-blue-300 text-right text-xs font-semibold" /></td>
                              
                              <td className="px-2 py-1 text-center border-r border-slate-200 text-[10px] italic text-slate-500">Draft</td>
                              <td className="px-2 py-1 text-center">
                                <div className="flex items-center gap-1 justify-center">
                                  <button onClick={() => save(head.id)} className="px-2 py-1 bg-rail-600 text-white rounded text-[10px] hover:bg-rail-700">Save</button>
                                  <button onClick={() => setEditingId(null)} className="p-1 rounded hover:bg-slate-200 text-slate-400"><X size={12}/></button>
                                </div>
                              </td>
                            </tr>
                          );
                        }

                        return (
                          <tr key={head.id} className={cn("hover:bg-slate-50/50 transition-colors border-b border-slate-100", hBg)}>
                            <td className={cn("px-3 py-2 text-slate-800 whitespace-nowrap border-r border-slate-200", isHdr ? "uppercase text-[10px] text-slate-700" : "", head.parentId ? "pl-6" : "")}>
                              {!isHdr && <span className="inline-block w-1.5 h-1.5 rounded-full mr-2" style={{ backgroundColor: head.color }}/>}
                              {head.name}
                            </td>
                            <td className="px-2 py-2 text-right text-slate-500 border-r border-slate-200">{isHdr ? '' : rec?.actualsPrevPrevYear?.toFixed(2) ?? '—'}</td>
                            <td className="px-2 py-2 text-right text-slate-500 border-r border-slate-200 bg-slate-50/50">{isHdr ? '' : (rec?.actualsPrevYear ?? rec?.previousYearActual)?.toFixed(2) ?? '—'}</td>
                            
                            <td className="px-2 py-2 text-right text-indigo-700 border-r border-slate-200">{isHdr ? '' : rec?.targetMonth?.toFixed(2) ?? '—'}</td>
                            <td className="px-2 py-2 text-right text-indigo-700 border-r border-slate-200">{isHdr ? '' : rec?.targetUpto?.toFixed(2) ?? '—'}</td>
                            <td className="px-2 py-2 text-right text-indigo-700 border-r border-slate-200 bg-indigo-50/30">{isHdr ? '' : (rec?.targetYearly ?? rec?.target)?.toFixed(2) ?? '—'}</td>
                            
                            <td className="px-2 py-2 text-right text-slate-500 border-r border-slate-200">{isHdr ? '' : rec?.currentMonthPY?.toFixed(2) ?? '—'}</td>
                            <td className="px-2 py-2 text-right font-semibold text-slate-900 border-r border-slate-200">{isHdr ? '' : rec?.actual?.toFixed(2) ?? '—'}</td>
                            
                            <td className="px-2 py-2 text-center border-r border-slate-200">
                              {isHdr ? '' : rec ? (
                                <span className={cn('px-2 py-0.5 rounded text-[9px] font-semibold tracking-wide uppercase', STATUS_COLOURS[rec.status])}>
                                  {rec.status}
                                </span>
                              ) : (
                                <span className="text-[10px] text-slate-300 italic">No data</span>
                              )}
                            </td>
                            <td className="px-2 py-2">
                              {!isHdr && (
                                <div className="flex items-center gap-1 justify-center flex-wrap">
                                  <button
                                    onClick={() => {
                                      if (rec) { openEdit(rec); }
                                      else { setEditingId(\`new-\${head.id}\`); setForm({ actualsPrevPrevYear: '', actualsPrevYear: '', targetMonth: '', targetUpto: '', targetYearly: '', currentMonthPY: '', actual: '', remarks: '' }); }
                                    }}
                                    className="px-1.5 py-0.5 text-[9px] bg-white border border-slate-200 rounded hover:border-rail-400 hover:text-rail-600 text-slate-600 font-medium uppercase"
                                  >
                                    Edit
                                  </button>

                                  {rec && rec.status === 'draft' && (
                                    <button onClick={() => store.submitRecord(rec.id, currentUser)} className="px-1.5 py-0.5 text-[9px] bg-blue-50 text-blue-700 border border-blue-200 rounded hover:bg-blue-100 uppercase font-medium">Submit</button>
                                  )}
                                  {canApprove && rec && rec.status === 'submitted' && (
                                    <button onClick={() => store.verifyRecord(rec.id, currentUser)} className="px-1.5 py-0.5 text-[9px] bg-indigo-50 text-indigo-700 border border-indigo-200 rounded hover:bg-indigo-100 uppercase font-medium">Verify</button>
                                  )}
                                  {canApprove && rec && rec.status === 'verified' && (
                                    <>
                                      <button onClick={() => store.approveRecord(rec.id, currentUser)} className="px-1.5 py-0.5 text-[9px] bg-emerald-50 text-emerald-700 border border-emerald-200 rounded hover:bg-emerald-100 uppercase font-medium">Approve</button>
                                    </>
                                  )}
                                  {canApprove && rec && rec.status === 'approved' && (
                                    <button onClick={() => store.publishRecord(rec.id, currentUser)} className="px-1.5 py-0.5 text-[9px] bg-green-50 text-green-700 border border-green-200 rounded hover:bg-green-100 uppercase font-medium">Publish</button>
                                  )}
                                </div>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-slate-200 bg-white shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] flex items-center justify-between text-[10px] text-slate-500 shrink-0 z-10">
          <span className="flex items-center gap-2">
            <span className="font-semibold text-slate-700">Workflow:</span> Draft → Submit → Verify → Approve → Publish
          </span>
          <span className="italic text-slate-400">Only Published records appear on the Executive Dashboard.</span>
        </div>
      </div>
    </div>,
    document.body,
  );
}
`;
fs.writeFileSync(filepath, newCode);
console.log('Replaced DataEntryModal.tsx with new tabular structure.');
