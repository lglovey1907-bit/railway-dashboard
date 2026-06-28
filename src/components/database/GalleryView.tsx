'use client';
import { useState } from 'react';
import { ExternalLink, Eye, Pencil, Trash2, Plus, LayoutGrid, X, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { TableDef, FieldDef } from '@/lib/cellData/types';
import type { useWorkspace } from '@/lib/cellData/useWorkspace';

type Hook = ReturnType<typeof useWorkspace>;

function getLabel(table: TableDef, rowId: string): string {
  return table.values[`${rowId}:__label__`] ?? 'Untitled';
}

function getFieldValue(table: TableDef, rowId: string, fieldId: string): string {
  return table.values[`${rowId}:${fieldId}`] ?? '';
}

// Status badge colors
const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-amber-100 text-amber-700',
  active: 'bg-emerald-100 text-emerald-700',
  done: 'bg-green-100 text-green-700',
  completed: 'bg-green-100 text-green-700',
  cancelled: 'bg-red-100 text-red-700',
  blocked: 'bg-red-100 text-red-700',
  open: 'bg-blue-100 text-blue-700',
  closed: 'bg-slate-100 text-slate-600',
  high: 'bg-orange-100 text-orange-700',
  medium: 'bg-amber-100 text-amber-700',
  low: 'bg-slate-100 text-slate-500',
  critical: 'bg-red-100 text-red-700',
};

function getStatusColor(val: string): string {
  const key = val.toLowerCase().replace(/\s+/g, '');
  return STATUS_COLORS[key] ?? 'bg-rail-50 text-rail-700';
}

// ── Card Detail Modal ─────────────────────────────────────────────────────────
function CardDetail({ table, rowId, hook, canManage, onClose }: {
  table: TableDef; rowId: string; hook: Hook; canManage: boolean; onClose: () => void;
}) {
  const label = getLabel(table, rowId);
  const [editing, setEditing] = useState<Record<string, string>>({});

  const getVal = (fId: string) => editing[fId] ?? getFieldValue(table, rowId, fId);
  const save = (fId: string) => {
    if (editing[fId] !== undefined) hook.setCellValue(table.id, rowId, fId, editing[fId]);
    setEditing(e => { const n = { ...e }; delete n[fId]; return n; });
  };

  return (
    <div className="fixed inset-0 z-[2100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="flex items-start justify-between px-5 py-4 border-b border-slate-100">
          <div className="flex-1 pr-4">
            <p className="text-sm font-bold text-slate-900">{label}</p>
            <p className="text-[10px] text-slate-400 mt-0.5">{table.name}</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 mt-0.5"><X size={14}/></button>
        </div>

        <div className="p-5 space-y-3 max-h-[55vh] overflow-y-auto">
          <div>
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">{table.firstColLabel}</label>
            <input
              defaultValue={label}
              onChange={e => setEditing(ed => ({ ...ed, '__label__': e.target.value }))}
              onBlur={() => save('__label__')}
              disabled={!canManage}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-800 focus:outline-none focus:border-rail-400 disabled:opacity-60"
            />
          </div>
          {table.fields.map(field => (
            <div key={field.id}>
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">{field.label}</label>
              {field.type === 'dropdown' && field.options ? (
                <select
                  value={getVal(field.id)}
                  onChange={e => hook.setCellValue(table.id, rowId, field.id, e.target.value)}
                  disabled={!canManage}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-700 focus:outline-none focus:border-rail-400 disabled:opacity-60"
                >
                  <option value="">—</option>
                  {field.options.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                </select>
              ) : field.type === 'checkbox' ? (
                <button
                  onClick={() => canManage && hook.setCellValue(table.id, rowId, field.id, getVal(field.id) === 'true' ? 'false' : 'true')}
                  className={cn('w-5 h-5 rounded border flex items-center justify-center transition-colors',
                    getVal(field.id) === 'true' ? 'bg-rail-600 border-rail-600 text-white' : 'border-slate-300')}
                >
                  {getVal(field.id) === 'true' && <Check size={11}/>}
                </button>
              ) : (
                <input
                  value={getVal(field.id)}
                  onChange={e => setEditing(ed => ({ ...ed, [field.id]: e.target.value }))}
                  onBlur={() => save(field.id)}
                  disabled={!canManage}
                  type={field.type === 'date' ? 'date' : field.type === 'number' || field.type === 'currency' ? 'number' : 'text'}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-800 focus:outline-none focus:border-rail-400 disabled:opacity-60"
                />
              )}
            </div>
          ))}
        </div>

        <div className="flex gap-2 px-5 py-4 border-t border-slate-100 bg-slate-50">
          {canManage && (
            <button onClick={() => { hook.removeRow(table.id, rowId); onClose(); }}
              className="px-3 py-2 text-xs text-red-600 hover:bg-red-50 rounded-lg transition-colors">
              Delete
            </button>
          )}
          <button onClick={onClose} className="ml-auto px-4 py-2 bg-rail-600 text-white text-xs font-bold rounded-lg hover:bg-rail-700">
            Done
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Gallery Card ──────────────────────────────────────────────────────────────
function GalleryCard({ table, rowId, hook, canManage, onOpen }: {
  table: TableDef; rowId: string; hook: Hook; canManage: boolean; onOpen: () => void;
}) {
  const label = getLabel(table, rowId);
  // First dropdown field for badge
  const badgeField = table.fields.find(f => f.type === 'dropdown' || f.type === 'multiselect');
  const badgeVal = badgeField ? getFieldValue(table, rowId, badgeField.id) : '';
  // First date for display
  const dateField = table.fields.find(f => f.type === 'date');
  const dateVal = dateField ? getFieldValue(table, rowId, dateField.id) : '';
  // Preview: up to 3 non-badge non-date fields
  const previewFields = table.fields
    .filter(f => f.id !== badgeField?.id && f.id !== dateField?.id && f.type !== 'checkbox')
    .slice(0, 3);

  // Derive initials/color for avatar from label
  const initials = label.split(/\s+/).slice(0, 2).map(w => w[0]).join('').toUpperCase();
  const HUES = ['from-rail-400', 'from-blue-400', 'from-emerald-400', 'from-amber-400', 'from-purple-400', 'from-rose-400'];
  const hue = HUES[label.charCodeAt(0) % HUES.length];

  return (
    <div
      onClick={onOpen}
      className="bg-white border border-slate-200 rounded-xl overflow-hidden hover:shadow-lg hover:border-rail-200 transition-all cursor-pointer group flex flex-col"
    >
      {/* Avatar/Cover */}
      <div className={cn('h-16 bg-gradient-to-br to-slate-100 flex items-center justify-center', hue)}>
        <span className="text-xl font-black text-white/90 drop-shadow-sm">{initials || '?'}</span>
      </div>

      {/* Body */}
      <div className="p-3 flex-1 flex flex-col gap-2">
        <div className="flex items-start gap-2">
          <p className="text-xs font-bold text-slate-800 leading-snug flex-1 group-hover:text-rail-700 transition-colors line-clamp-2">{label}</p>
          {badgeVal && (
            <span className={cn('text-[9px] font-bold px-1.5 py-0.5 rounded-full shrink-0 whitespace-nowrap', getStatusColor(badgeVal))}>
              {badgeVal}
            </span>
          )}
        </div>

        {previewFields.map(f => {
          const val = getFieldValue(table, rowId, f.id);
          if (!val) return null;
          return (
            <div key={f.id} className="flex items-center gap-1.5">
              <span className="text-[9px] text-slate-400 font-semibold uppercase tracking-wider w-16 shrink-0 truncate">{f.label}</span>
              <span className="text-[10px] text-slate-600 truncate">{val}</span>
            </div>
          );
        })}

        {dateVal && (
          <div className="text-[9px] text-slate-400 mt-auto pt-1 border-t border-slate-50">
            📅 {dateVal}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main Gallery View ─────────────────────────────────────────────────────────
export function GalleryView({ table, hook, cell, canManage }: {
  table: TableDef; hook: Hook; cell: string; canManage: boolean;
}) {
  const [openRow, setOpenRow] = useState<string | null>(null);
  const activeRows = table.rows.filter(r => !r.deletedAt);

  if (activeRows.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 gap-3 text-center">
        <div className="w-12 h-12 rounded-xl bg-slate-50 flex items-center justify-center">
          <LayoutGrid size={20} className="text-slate-400"/>
        </div>
        <p className="text-sm font-semibold text-slate-700">No records to show</p>
        {canManage && (
          <button
            onClick={() => hook.addRow(table.id, 'New Record')}
            className="flex items-center gap-1.5 px-4 py-2 bg-rail-600 text-white text-xs font-bold rounded-xl hover:bg-rail-700 transition-colors"
          >
            <Plus size={12}/> Add Record
          </button>
        )}
      </div>
    );
  }

  return (
    <>
      <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))' }}>
        {activeRows.map(row => (
          <GalleryCard
            key={row.id} table={table} rowId={row.id}
            hook={hook} canManage={canManage}
            onOpen={() => setOpenRow(row.id)}
          />
        ))}
        {canManage && (
          <button
            onClick={() => hook.addRow(table.id, 'New Record')}
            className="border-2 border-dashed border-slate-200 rounded-xl p-4 flex flex-col items-center justify-center gap-2 text-slate-300 hover:text-rail-400 hover:border-rail-300 hover:bg-rail-50 transition-all min-h-[120px] cursor-pointer"
          >
            <Plus size={20}/>
            <span className="text-[10px] font-semibold">Add record</span>
          </button>
        )}
      </div>

      {openRow && (
        <CardDetail
          table={table} rowId={openRow}
          hook={hook} canManage={canManage}
          onClose={() => setOpenRow(null)}
        />
      )}
    </>
  );
}
