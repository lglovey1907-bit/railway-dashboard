'use client';
import { useState, useRef } from 'react';
import { Plus, MoreHorizontal, User, Calendar, Flag, X, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { TableDef, FieldDef } from '@/lib/cellData/types';
import type { useWorkspace } from '@/lib/cellData/useWorkspace';

type Hook = ReturnType<typeof useWorkspace>;

// ── Helpers ───────────────────────────────────────────────────────────────────
function getStatusField(table: TableDef): FieldDef | undefined {
  return (
    table.fields.find(f => f.label.toLowerCase() === 'status') ||
    table.fields.find(f => f.label.toLowerCase() === 'stage') ||
    table.fields.find(f => f.label.toLowerCase() === 'state') ||
    table.fields.find(f => f.type === 'dropdown')
  );
}

function getStatusValue(table: TableDef, rowId: string, statusField: FieldDef): string {
  return table.values[`${rowId}:${statusField.id}`] ?? '';
}

function getLabel(table: TableDef, rowId: string): string {
  return table.values[`${rowId}:__label__`] ?? 'Untitled';
}

function getFieldValue(table: TableDef, rowId: string, fieldId: string): string {
  return table.values[`${rowId}:${fieldId}`] ?? '';
}

// ── Card ──────────────────────────────────────────────────────────────────────
function BoardCard({
  table, rowId, statusField, previewFields, canManage, hook, cell,
  onDragStart, onDragEnd, onClick,
}: {
  table: TableDef; rowId: string; statusField: FieldDef;
  previewFields: FieldDef[]; canManage: boolean;
  hook: Hook; cell: string;
  onDragStart: () => void; onDragEnd: () => void;
  onClick: () => void;
}) {
  const label = getLabel(table, rowId);
  const dateField = previewFields.find(f => f.type === 'date');
  const assigneeField = previewFields.find(f => f.label.toLowerCase().includes('assign') || f.label.toLowerCase().includes('officer'));
  const priorityField = previewFields.find(f => f.label.toLowerCase().includes('priority'));

  const priority = priorityField ? getFieldValue(table, rowId, priorityField.id) : '';
  const dueDate = dateField ? getFieldValue(table, rowId, dateField.id) : '';
  const assignee = assigneeField ? getFieldValue(table, rowId, assigneeField.id) : '';

  const isOverdue = dueDate && new Date(dueDate) < new Date();

  return (
    <div
      draggable={canManage}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onClick={onClick}
      className="bg-white border border-slate-200 rounded-xl p-3 cursor-pointer hover:shadow-md hover:border-rail-300 transition-all group select-none"
      style={{ boxShadow: '0 1px 3px rgba(15,23,42,0.06)' }}
    >
      <p className="text-xs font-semibold text-slate-800 leading-snug mb-2 group-hover:text-rail-700 transition-colors">
        {label}
      </p>

      {/* Preview fields */}
      {previewFields.slice(0, 2).filter(f => f.id !== statusField.id).map(f => {
        const val = getFieldValue(table, rowId, f.id);
        if (!val) return null;
        return (
          <div key={f.id} className="flex items-center gap-1 mb-1">
            <span className="text-[9px] text-slate-400 font-medium uppercase tracking-wider w-14 shrink-0 truncate">{f.label}</span>
            <span className="text-[10px] text-slate-600 truncate">{val}</span>
          </div>
        );
      })}

      {/* Footer: priority, due date, assignee */}
      <div className="flex items-center gap-2 mt-2.5 pt-2 border-t border-slate-50">
        {priority && (
          <span className={cn('text-[9px] font-bold px-1.5 py-0.5 rounded-full capitalize',
            priority.toLowerCase().includes('high') || priority.toLowerCase().includes('critical') ? 'bg-red-50 text-red-600' :
            priority.toLowerCase().includes('medium') ? 'bg-amber-50 text-amber-600' : 'bg-slate-50 text-slate-500'
          )}>
            {priority}
          </span>
        )}
        {dueDate && (
          <div className={cn('flex items-center gap-0.5 text-[9px] font-medium', isOverdue ? 'text-red-500' : 'text-slate-400')}>
            <Calendar size={9}/> {dueDate}
          </div>
        )}
        {assignee && (
          <div className="ml-auto flex items-center gap-0.5 text-[9px] text-slate-400">
            <User size={9}/> <span className="truncate max-w-[60px]">{assignee}</span>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Card Editor Modal ─────────────────────────────────────────────────────────
function CardModal({
  table, rowId, hook, cell, canManage, onClose,
}: {
  table: TableDef; rowId: string; hook: Hook; cell: string; canManage: boolean; onClose: () => void;
}) {
  const label = getLabel(table, rowId);
  const [editing, setEditing] = useState<Record<string, string>>({});

  const getVal = (fId: string) => editing[fId] ?? getFieldValue(table, rowId, fId);

  const save = (fId: string) => {
    if (editing[fId] !== undefined) {
      hook.setCellValue(table.id, rowId, fId, editing[fId]);
    }
    setEditing(e => { const n = { ...e }; delete n[fId]; return n; });
  };

  return (
    <div className="fixed inset-0 z-[2100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <div>
            <p className="text-sm font-bold text-slate-900">{label}</p>
            <p className="text-[10px] text-slate-400 mt-0.5">{table.name}</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400"><X size={14}/></button>
        </div>

        <div className="p-5 space-y-3 max-h-[60vh] overflow-y-auto">
          {/* Label */}
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

          {/* Fields */}
          {table.fields.map(field => (
            <div key={field.id}>
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">{field.label}</label>
              {field.type === 'dropdown' && field.options ? (
                <select
                  value={getVal(field.id)}
                  onChange={e => { hook.setCellValue(table.id, rowId, field.id, e.target.value); }}
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
            <button
              onClick={() => { hook.removeRow(table.id, rowId); onClose(); }}
              className="px-3 py-2 text-xs text-red-600 hover:bg-red-50 rounded-lg transition-colors"
            >
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

// ── Board Column ──────────────────────────────────────────────────────────────
function BoardColumn({
  title, color, rows, table, statusField, previewFields, canManage, hook, cell,
  onDragOver, onDrop, onCardDragStart, onCardDragEnd, onCardClick, onAddCard,
}: {
  title: string; color: string; rows: string[];
  table: TableDef; statusField: FieldDef; previewFields: FieldDef[];
  canManage: boolean; hook: Hook; cell: string;
  onDragOver: (e: React.DragEvent) => void;
  onDrop: () => void;
  onCardDragStart: (rowId: string) => void;
  onCardDragEnd: () => void;
  onCardClick: (rowId: string) => void;
  onAddCard: () => void;
}) {
  return (
    <div
      className="flex flex-col w-64 shrink-0 bg-slate-50 rounded-xl border border-slate-200 overflow-hidden"
      onDragOver={e => { e.preventDefault(); onDragOver(e); }}
      onDrop={onDrop}
    >
      {/* Column Header */}
      <div className="flex items-center gap-2 px-3 py-2.5 border-b border-slate-200">
        <div className={cn('w-2.5 h-2.5 rounded-full shrink-0', color)}/>
        <p className="text-xs font-bold text-slate-700 flex-1 truncate">{title || 'No Status'}</p>
        <span className="text-[10px] font-bold text-slate-400 bg-slate-200 rounded-full px-1.5 py-0.5">{rows.length}</span>
      </div>

      {/* Cards */}
      <div className="flex-1 p-2 space-y-2 overflow-y-auto" style={{ maxHeight: 500 }}>
        {rows.map(rowId => (
          <BoardCard
            key={rowId}
            table={table} rowId={rowId} statusField={statusField}
            previewFields={previewFields} canManage={canManage}
            hook={hook} cell={cell}
            onDragStart={() => onCardDragStart(rowId)}
            onDragEnd={onCardDragEnd}
            onClick={() => onCardClick(rowId)}
          />
        ))}
      </div>

      {/* Add Card */}
      {canManage && (
        <div className="p-2 border-t border-slate-200">
          <button
            onClick={onAddCard}
            className="w-full flex items-center gap-1.5 px-3 py-2 text-xs text-slate-400 hover:text-rail-600 hover:bg-white rounded-lg transition-all border border-transparent hover:border-slate-200"
          >
            <Plus size={12}/> Add card
          </button>
        </div>
      )}
    </div>
  );
}

// ── Main Board View ───────────────────────────────────────────────────────────
export function BoardView({
  table, hook, cell, canManage,
}: {
  table: TableDef;
  hook: Hook;
  cell: string;
  canManage: boolean;
}) {
  const statusField = getStatusField(table);
  const [activeCard, setActiveCard] = useState<string | null>(null);
  const [editRow, setEditRow] = useState<string | null>(null);
  const dragCard = useRef<string | null>(null);
  const dragTargetCol = useRef<string | null>(null);

  if (!statusField) {
    return (
      <div className="flex flex-col items-center justify-center py-12 gap-3 text-center">
        <div className="w-12 h-12 rounded-xl bg-amber-50 flex items-center justify-center">
          <Flag size={20} className="text-amber-500"/>
        </div>
        <p className="text-sm font-semibold text-slate-700">Board view needs a Status field</p>
        <p className="text-xs text-slate-400 max-w-xs">
          Add a <strong>Dropdown</strong> field named "Status" to your table to use Board view.
          Options become columns.
        </p>
      </div>
    );
  }

  const options = statusField.options ?? [];
  // Include unset status as first column
  const columns = [
    { value: '', label: 'No Status', color: 'bg-slate-300' },
    ...options.map(opt => ({
      value: opt.value,
      label: opt.label,
      color: opt.color ?? 'bg-blue-400',
    })),
  ];

  const activeRows = table.rows.filter(r => !r.deletedAt);

  const rowsByStatus = (colValue: string) =>
    activeRows
      .filter(r => getStatusValue(table, r.id, statusField) === colValue)
      .map(r => r.id);

  const previewFields = table.fields.filter(f => f.id !== statusField.id).slice(0, 5);

  const handleAddCard = (colValue: string) => {
    hook.addRow(table.id, 'New Card');
    // Set status of new row after a tick
    setTimeout(() => {
      const rows = table.rows;
      const newRow = rows[rows.length - 1];
      if (newRow && colValue) {
        hook.setCellValue(table.id, newRow.id, statusField.id, colValue);
      }
    }, 50);
  };

  return (
    <>
      <div className="flex gap-3 overflow-x-auto pb-3" style={{ minHeight: 200 }}>
        {columns.map(col => (
          <BoardColumn
            key={col.value}
            title={col.label}
            color={col.color}
            rows={rowsByStatus(col.value)}
            table={table}
            statusField={statusField}
            previewFields={previewFields}
            canManage={canManage}
            hook={hook}
            cell={cell}
            onDragOver={() => { dragTargetCol.current = col.value; }}
            onDrop={() => {
              const cardId = dragCard.current;
              const targetStatus = dragTargetCol.current;
              if (cardId && targetStatus !== null) {
                hook.setCellValue(table.id, cardId, statusField.id, targetStatus ?? '');
              }
              dragCard.current = null;
              dragTargetCol.current = null;
            }}
            onCardDragStart={rowId => { dragCard.current = rowId; }}
            onCardDragEnd={() => { dragCard.current = null; }}
            onCardClick={rowId => setEditRow(rowId)}
            onAddCard={() => handleAddCard(col.value)}
          />
        ))}
      </div>

      {editRow && (
        <CardModal
          table={table} rowId={editRow}
          hook={hook} cell={cell} canManage={canManage}
          onClose={() => setEditRow(null)}
        />
      )}
    </>
  );
}
