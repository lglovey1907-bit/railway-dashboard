'use client';
// ─────────────────────────────────────────────────────────────────────────────
// Data Entry Modal — Monthly Revenue CRUD + Approval Workflow
// ─────────────────────────────────────────────────────────────────────────────

import { useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Save, Send, CheckCircle, XCircle, Eye, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useFinancialStore } from '@/lib/financial/financialStore';
import type { FYMonth, TargetStatus } from '@/lib/financial/types';
import { FY_MONTHS } from '@/lib/financial/types';

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
  const revenueHeads = store.revenueHeads.filter(h => h.isActive && !h.isTotal);
  const records      = store.getAllRecords(fyId);

  const [selectedMonth, setSelectedMonth] = useState<FYMonth>(1);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form state
  const [form, setForm] = useState({
    actual: '',
    previousYearActual: '',
    target: '',
    budgetEstimate: '',
    targetStatus: 'available' as TargetStatus,
    remarks: '',
  });

  const openEdit = (rec: ReturnType<typeof store.getRecord>) => {
    if (!rec) return;
    setEditingId(rec.id);
    setForm({
      actual:             rec.actual?.toString()             ?? '',
      previousYearActual: rec.previousYearActual?.toString() ?? '',
      target:             rec.target?.toString()             ?? '',
      budgetEstimate:     rec.budgetEstimate?.toString()     ?? '',
      targetStatus:       rec.targetStatus,
      remarks:            rec.remarks ?? '',
    });
  };

  const save = (rhId: string) => {
    const parseNum = (v: string) => v.trim() !== '' ? parseFloat(v) : undefined;
    store.upsertRecord(
      {
        fyId, month: selectedMonth, revenueHeadId: rhId,
        actual:             parseNum(form.actual),
        previousYearActual: parseNum(form.previousYearActual),
        target:             parseNum(form.target),
        budgetEstimate:     parseNum(form.budgetEstimate),
        targetStatus:       form.targetStatus,
        remarks:            form.remarks,
      },
      currentUser,
    );
    setEditingId(null);
  };

  const monthRecords = revenueHeads.map(rh => ({
    head: rh,
    rec:  records.find(r => r.month === selectedMonth && r.revenueHeadId === rh.id),
  }));

  if (typeof window === 'undefined') return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[3000] flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[92vh] flex flex-col overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center gap-3 px-5 py-3.5 border-b border-slate-100 bg-slate-50 shrink-0">
          <div className="flex-1">
            <h2 className="text-sm font-bold text-slate-900">Data Entry — Monthly Figures</h2>
            <p className="text-[10px] text-slate-500">All figures in Crore (₹ Cr)</p>
          </div>
          {/* Month selector */}
          <div className="relative">
            <select
              value={selectedMonth}
              onChange={e => { setSelectedMonth(Number(e.target.value) as FYMonth); setEditingId(null); }}
              className="pl-3 pr-7 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-rail-400 appearance-none font-semibold"
            >
              {FY_MONTHS.map(m => (
                <option key={m.id} value={m.id}>{m.label}</option>
              ))}
            </select>
            <ChevronDown size={11} className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400"/>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-200 text-slate-400 hover:text-slate-700">
            <X size={15}/>
          </button>
        </div>

        {/* Table */}
        <div className="flex-1 overflow-y-auto">
          <table className="w-full text-xs border-collapse">
            <thead className="sticky top-0 z-10">
              <tr className="bg-slate-100 text-slate-600">
                <th className="px-3 py-2 text-left font-bold">Revenue Head</th>
                <th className="px-3 py-2 text-right font-semibold">Budget Est. (Cr)</th>
                <th className="px-3 py-2 text-right font-semibold">Target (Cr)</th>
                <th className="px-3 py-2 text-right font-semibold">Actual (Cr)</th>
                <th className="px-3 py-2 text-right font-semibold">Prev Year (Cr)</th>
                <th className="px-3 py-2 text-center font-semibold">Status</th>
                <th className="px-3 py-2 text-center font-semibold">Action</th>
              </tr>
            </thead>
            <tbody>
              {monthRecords.map(({ head, rec }) => {
                const isEditing = editingId === rec?.id || (editingId === `new-${head.id}` && !rec);

                if (isEditing) {
                  return (
                    <tr key={head.id} className="bg-blue-50 border-y border-blue-200">
                      <td className="px-3 py-2 font-semibold text-slate-800 whitespace-nowrap">
                        <span className="inline-block w-2 h-2 rounded-full mr-2" style={{ backgroundColor: head.color }}/>
                        {head.name}
                      </td>
                      <td className="px-2 py-1.5">
                        <input type="number" value={form.budgetEstimate}
                          onChange={e => setForm(f => ({ ...f, budgetEstimate: e.target.value }))}
                          placeholder="BE"
                          className="w-full px-2 py-1 rounded border border-slate-200 focus:outline-none focus:border-rail-400 text-right text-xs"/>
                      </td>
                      <td className="px-2 py-1.5">
                        <div className="space-y-1">
                          <input type="number" value={form.target}
                            onChange={e => setForm(f => ({ ...f, target: e.target.value }))}
                            placeholder="Target"
                            className="w-full px-2 py-1 rounded border border-slate-200 focus:outline-none focus:border-rail-400 text-right text-xs"/>
                          <select value={form.targetStatus}
                            onChange={e => setForm(f => ({ ...f, targetStatus: e.target.value as TargetStatus }))}
                            className="w-full px-1.5 py-0.5 text-[10px] rounded border border-slate-200 focus:outline-none">
                            <option value="available">Available</option>
                            <option value="pending">Pending</option>
                            <option value="revised">Revised</option>
                            <option value="na">N/A</option>
                          </select>
                        </div>
                      </td>
                      <td className="px-2 py-1.5">
                        <input type="number" value={form.actual}
                          onChange={e => setForm(f => ({ ...f, actual: e.target.value }))}
                          placeholder="Actual"
                          className="w-full px-2 py-1 rounded border border-blue-300 focus:outline-none focus:border-blue-500 text-right text-xs bg-white font-semibold"/>
                      </td>
                      <td className="px-2 py-1.5">
                        <input type="number" value={form.previousYearActual}
                          onChange={e => setForm(f => ({ ...f, previousYearActual: e.target.value }))}
                          placeholder="Prev. year"
                          className="w-full px-2 py-1 rounded border border-slate-200 focus:outline-none focus:border-rail-400 text-right text-xs"/>
                      </td>
                      <td className="px-2 py-1.5">
                        <input value={form.remarks}
                          onChange={e => setForm(f => ({ ...f, remarks: e.target.value }))}
                          placeholder="Remarks"
                          className="w-full px-2 py-1 rounded border border-slate-200 focus:outline-none text-xs"/>
                      </td>
                      <td className="px-2 py-1.5">
                        <div className="flex items-center gap-1 justify-center">
                          <button onClick={() => save(head.id)}
                            className="flex items-center gap-1 px-2 py-1 bg-rail-600 text-white rounded text-[10px] hover:bg-rail-700">
                            <Save size={10}/> Save
                          </button>
                          <button onClick={() => setEditingId(null)}
                            className="p-1 rounded hover:bg-slate-200 text-slate-400">
                            <X size={12}/>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                }

                return (
                  <tr key={head.id} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="px-3 py-2.5 font-medium text-slate-800 whitespace-nowrap">
                      <span className="inline-block w-2 h-2 rounded-full mr-2" style={{ backgroundColor: head.color }}/>
                      {head.name}
                    </td>
                    <td className="px-3 py-2.5 text-right text-slate-500">{rec?.budgetEstimate?.toFixed(2) ?? '—'}</td>
                    <td className="px-3 py-2.5 text-right text-indigo-700">{rec?.target?.toFixed(2) ?? '—'}</td>
                    <td className="px-3 py-2.5 text-right font-semibold text-blue-800">{rec?.actual?.toFixed(2) ?? '—'}</td>
                    <td className="px-3 py-2.5 text-right text-slate-500">{rec?.previousYearActual?.toFixed(2) ?? '—'}</td>
                    <td className="px-3 py-2.5 text-center">
                      {rec ? (
                        <span className={cn('px-2 py-0.5 rounded-full text-[10px] font-semibold', STATUS_COLOURS[rec.status])}>
                          {rec.status.charAt(0).toUpperCase() + rec.status.slice(1)}
                        </span>
                      ) : (
                        <span className="text-[10px] text-slate-300 italic">No data</span>
                      )}
                    </td>
                    <td className="px-3 py-2.5">
                      <div className="flex items-center gap-1 justify-center">
                        <button
                          onClick={() => {
                            if (rec) { openEdit(rec); }
                            else { setEditingId(`new-${head.id}`); setForm({ actual: '', previousYearActual: '', target: '', budgetEstimate: '', targetStatus: 'available', remarks: '' }); }
                          }}
                          className="px-2 py-1 text-[10px] bg-white border border-slate-200 rounded hover:border-rail-400 hover:text-rail-600 text-slate-600 font-medium"
                        >
                          Edit
                        </button>

                        {/* Approval workflow buttons */}
                        {rec && rec.status === 'draft' && (
                          <button onClick={() => store.submitRecord(rec.id, currentUser)}
                            className="flex items-center gap-0.5 px-2 py-1 text-[10px] bg-blue-50 text-blue-700 border border-blue-200 rounded hover:bg-blue-100">
                            <Send size={9}/> Submit
                          </button>
                        )}
                        {canApprove && rec && rec.status === 'submitted' && (
                          <button onClick={() => store.verifyRecord(rec.id, currentUser)}
                            className="px-2 py-1 text-[10px] bg-indigo-50 text-indigo-700 border border-indigo-200 rounded hover:bg-indigo-100">
                            Verify
                          </button>
                        )}
                        {canApprove && rec && rec.status === 'verified' && (
                          <>
                            <button onClick={() => store.approveRecord(rec.id, currentUser)}
                              className="flex items-center gap-0.5 px-2 py-1 text-[10px] bg-emerald-50 text-emerald-700 border border-emerald-200 rounded hover:bg-emerald-100">
                              <CheckCircle size={9}/> Approve
                            </button>
                            <button onClick={() => store.rejectRecord(rec.id, currentUser, 'Rejected — please revise.')}
                              className="flex items-center gap-0.5 px-2 py-1 text-[10px] bg-red-50 text-red-700 border border-red-200 rounded hover:bg-red-100">
                              <XCircle size={9}/> Reject
                            </button>
                          </>
                        )}
                        {canApprove && rec && rec.status === 'approved' && (
                          <button onClick={() => store.publishRecord(rec.id, currentUser)}
                            className="flex items-center gap-0.5 px-2 py-1 text-[10px] bg-green-50 text-green-700 border border-green-200 rounded hover:bg-green-100">
                            <Eye size={9}/> Publish
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-slate-100 bg-slate-50 flex items-center gap-3 text-[10px] text-slate-500 shrink-0">
          <span>Approval flow: Draft → Submit → Verify → Approve → Publish</span>
          <span className="ml-auto">Only Published/Approved figures appear on Executive Dashboard</span>
        </div>
      </div>
    </div>,
    document.body,
  );
}
