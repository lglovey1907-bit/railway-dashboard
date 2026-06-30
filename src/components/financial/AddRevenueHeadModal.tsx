'use client';
// ─────────────────────────────────────────────────────────────────────────────
// Add Revenue Head Modal — lets admin add a new row to the financial table
// ─────────────────────────────────────────────────────────────────────────────

import { useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useFinancialStore } from '@/lib/financial/financialStore';

const PRESET_COLORS = [
  '#3b82f6','#10b981','#f59e0b','#ef4444','#8b5cf6',
  '#06b6d4','#f97316','#84cc16','#ec4899','#6b7280',
];

interface Props {
  onClose: () => void;
}

export function AddRevenueHeadModal({ onClose }: Props) {
  const store = useFinancialStore();
  const nextOrder = Math.max(0, ...store.revenueHeads.map(h => h.order)) + 1;

  const [name,  setName]  = useState('');
  const [code,  setCode]  = useState('');
  const [color, setColor] = useState(PRESET_COLORS[0]);
  const [error, setError] = useState('');

  const save = () => {
    if (!name.trim()) { setError('Revenue head name is required.'); return; }
    if (!code.trim()) { setError('Short code is required.'); return; }
    if (code.trim().length > 8) { setError('Code must be 8 characters or less.'); return; }
    if (store.revenueHeads.some(h => h.code.toLowerCase() === code.trim().toLowerCase())) {
      setError('A revenue head with this code already exists.'); return;
    }

    store.addRevenueHead({
      name:      name.trim(),
      code:      code.trim().toUpperCase(),
      order:     nextOrder,
      isTotal:   false,
      isActive:  true,
      color,
      description: '',
    });
    onClose();
  };

  if (typeof window === 'undefined') return null;

  return createPortal(
    <div className="fixed inset-0 z-[5000] flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 bg-slate-800 text-white">
          <div className="flex items-center gap-2">
            <Plus size={16}/>
            <span className="font-semibold text-sm">Add Revenue Head</span>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-slate-700">
            <X size={15}/>
          </button>
        </div>

        {/* Form */}
        <div className="p-5 space-y-4">
          {/* Name */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Revenue Head Name <span className="text-red-500">*</span>
            </label>
            <input
              autoFocus
              type="text"
              value={name}
              onChange={e => { setName(e.target.value); setError(''); }}
              placeholder="e.g. Sundry Earnings"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:border-rail-500 focus:ring-1 focus:ring-rail-300"
            />
          </div>

          {/* Code */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Short Code <span className="text-red-500">*</span>
              <span className="font-normal text-slate-400 ml-1">(max 8 chars, used internally)</span>
            </label>
            <input
              type="text"
              value={code}
              onChange={e => { setCode(e.target.value.toUpperCase()); setError(''); }}
              placeholder="e.g. SUND"
              maxLength={8}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm font-mono focus:outline-none focus:border-rail-500 focus:ring-1 focus:ring-rail-300"
            />
          </div>

          {/* Color */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-2">Chart Color</label>
            <div className="flex items-center gap-2 flex-wrap">
              {PRESET_COLORS.map(c => (
                <button
                  key={c}
                  onClick={() => setColor(c)}
                  className={cn(
                    'w-7 h-7 rounded-full border-2 transition-transform',
                    color === c ? 'border-slate-800 scale-110' : 'border-transparent hover:scale-105',
                  )}
                  style={{ backgroundColor: c }}
                />
              ))}
              {/* Custom color */}
              <input
                type="color"
                value={color}
                onChange={e => setColor(e.target.value)}
                title="Custom color"
                className="w-7 h-7 rounded-full cursor-pointer border border-slate-300 p-0.5 bg-white"
              />
            </div>

            {/* Preview swatch */}
            <div className="mt-2 flex items-center gap-2">
              <span className="inline-block w-3 h-3 rounded-full" style={{ backgroundColor: color }}/>
              <span className="text-xs text-slate-500">{name || 'Revenue Head'}</span>
            </div>
          </div>

          {/* Error */}
          {error && (
            <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          {/* Info note */}
          <p className="text-[11px] text-slate-400 bg-slate-50 rounded-lg px-3 py-2">
            The new row appears at the bottom of the table. Enter monthly data via <strong>Enter Data</strong>.
          </p>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 px-5 py-4 border-t border-slate-100 bg-slate-50">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-600 bg-white border border-slate-200 rounded-lg hover:border-slate-300"
          >
            Cancel
          </button>
          <button
            onClick={save}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-rail-600 hover:bg-rail-700 rounded-lg shadow-sm"
          >
            <Plus size={12}/> Add Row
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
