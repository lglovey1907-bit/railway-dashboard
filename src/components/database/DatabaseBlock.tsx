'use client';
import { useState } from 'react';
import {
  Table2, Columns, Calendar, LayoutGrid, BarChart2,
  Plus, Filter, SortAsc, Settings2, RefreshCcw, Download,
  ChevronDown, Search, X,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { TableDef, RowDef, FieldDef } from '@/lib/cellData/types';
import type { useWorkspace } from '@/lib/cellData/useWorkspace';
import { BoardView } from './BoardView';
import { CalendarView } from './CalendarView';
import { GalleryView } from './GalleryView';
import { ChartView } from './ChartView';

// Lazy import TableEngine to avoid SSR issues
import dynamic from 'next/dynamic';
const TableEngine = dynamic(
  () => import('@/components/cell/TableEngine').then(m => m.TableEngine),
  { ssr: false, loading: () => <div className="h-32 flex items-center justify-center text-xs text-slate-400">Loading table…</div> }
);

type Hook = ReturnType<typeof useWorkspace>;
type ViewType = 'table' | 'board' | 'calendar' | 'gallery' | 'chart';

const VIEWS: { id: ViewType; label: string; icon: React.ReactNode }[] = [
  { id: 'table', label: 'Table', icon: <Table2 size={12}/> },
  { id: 'board', label: 'Board', icon: <Columns size={12}/> },
  { id: 'calendar', label: 'Calendar', icon: <Calendar size={12}/> },
  { id: 'gallery', label: 'Gallery', icon: <LayoutGrid size={12}/> },
  { id: 'chart', label: 'Chart', icon: <BarChart2 size={12}/> },
];

function SearchBar({ value, onChange, onClear }: { value: string; onChange: (v: string) => void; onClear: () => void }) {
  return (
    <div className="relative">
      <Search size={11} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-300 pointer-events-none"/>
      <input
        type="text"
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder="Search records…"
        className="pl-7 pr-7 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-rail-400 w-44"
      />
      {value && (
        <button onClick={onClear} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-300 hover:text-slate-500">
          <X size={10}/>
        </button>
      )}
    </div>
  );
}

// Table selector (when no table is selected)
function TableSelector({
  tables, onSelect,
}: {
  tables: TableDef[];
  onSelect: (id: string) => void;
}) {
  return (
    <div className="py-6 px-4 flex flex-col gap-3">
      <p className="text-xs font-semibold text-slate-500">Select a database to display</p>
      {tables.length === 0 ? (
        <p className="text-xs text-slate-400">No databases in this cell yet. Create one via the Data Manager.</p>
      ) : (
        <div className="grid gap-2" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))' }}>
          {tables.map(t => (
            <button
              key={t.id}
              onClick={() => onSelect(t.id)}
              className="flex items-center gap-2.5 px-3 py-3 bg-white hover:bg-rail-50 border border-slate-200 hover:border-rail-300 rounded-xl transition-all text-left group"
            >
              <Table2 size={16} className="text-slate-300 group-hover:text-rail-500 shrink-0"/>
              <span className="text-xs font-semibold text-slate-700 truncate">{t.name}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export function DatabaseBlock({
  tableId, hook, cell, userId, userName, canManage,
}: {
  tableId?: string;
  hook: Hook;
  cell: string;
  userId?: string;
  userName?: string;
  canManage: boolean;
}) {
  const [activeView, setActiveView] = useState<ViewType>('table');
  const [search, setSearch] = useState('');
  const [selectedTableId, setSelectedTableId] = useState<string | undefined>(tableId);

  const tables = hook.ws.tables ?? [];
  const table = tables.find((t: TableDef) => t.id === selectedTableId);

  // Filter table rows by search (for non-table views we show all; TableEngine has its own filter)
  const filteredTable: TableDef | undefined = table && search
    ? {
        ...table,
        rows: table.rows.filter((r: RowDef) => {
          if (r.deletedAt) return false;
          const label = table.values[`${r.id}:__label__`] ?? '';
          if (label.toLowerCase().includes(search.toLowerCase())) return true;
          return table.fields.some((f: FieldDef) => {
            const val = table.values[`${r.id}:${f.id}`] ?? '';
            return val.toLowerCase().includes(search.toLowerCase());
          });
        }),
      }
    : table;

  if (!selectedTableId || !table || !filteredTable) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="flex items-center gap-2 px-4 py-3 border-b border-slate-100 bg-slate-50">
          <Table2 size={14} className="text-slate-400"/>
          <span className="text-xs font-bold text-slate-600">Database</span>
        </div>
        <TableSelector tables={tables} onSelect={setSelectedTableId}/>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden flex flex-col">
      {/* Header bar */}
      <div className="flex items-center gap-2 px-3 py-2.5 border-b border-slate-100 bg-slate-50/80 flex-wrap gap-y-2">
        {/* Table name */}
        <div className="flex items-center gap-1.5">
          <Table2 size={13} className="text-slate-400"/>
          <button
            onClick={() => setSelectedTableId(undefined)}
            className="text-xs font-bold text-slate-700 hover:text-rail-600 transition-colors"
          >
            {table.name}
          </button>
          {tables.length > 1 && (
            <ChevronDown size={10} className="text-slate-400 cursor-pointer" onClick={() => setSelectedTableId(undefined)}/>
          )}
        </div>

        <div className="w-px h-4 bg-slate-200 mx-1"/>

        {/* View tabs */}
        <div className="flex items-center gap-0.5">
          {VIEWS.map(v => (
            <button
              key={v.id}
              onClick={() => setActiveView(v.id)}
              className={cn(
                'flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all',
                activeView === v.id
                  ? 'bg-white text-rail-700 shadow-sm border border-slate-200'
                  : 'text-slate-400 hover:text-slate-600 hover:bg-slate-100'
              )}
            >
              {v.icon} {v.label}
            </button>
          ))}
        </div>

        {/* Spacer */}
        <div className="flex-1"/>

        {/* Right actions */}
        <div className="flex items-center gap-1.5">
          <SearchBar value={search} onChange={setSearch} onClear={() => setSearch('')}/>
          {canManage && (
            <button
              onClick={() => hook.addRow(table.id, 'New Record')}
              className="flex items-center gap-1 px-2.5 py-1.5 bg-rail-600 hover:bg-rail-700 text-white text-[10px] font-bold rounded-lg transition-colors shrink-0"
            >
              <Plus size={11}/> Add
            </button>
          )}
        </div>
      </div>

      {/* Rows count bar */}
      <div className="flex items-center gap-3 px-4 py-1.5 border-b border-slate-50 bg-white">
        <span className="text-[10px] text-slate-400">
          {filteredTable.rows.filter(r => !r.deletedAt).length} record{filteredTable.rows.filter(r => !r.deletedAt).length !== 1 ? 's' : ''}
          {search && ` matching "${search}"`}
        </span>
        {table.dataSource === 'linked_sheet' && table.sheet && (
          <div className="flex items-center gap-1 text-[10px] text-emerald-600">
            <RefreshCcw size={9}/>
            <span>Google Sheet linked</span>
          </div>
        )}
      </div>

      {/* View content */}
      <div className={cn('overflow-auto', activeView !== 'table' && 'p-4')}>
        {activeView === 'table' && (
          <TableEngine
            table={filteredTable}
            hook={hook}
            cell={cell}
            userId={userId}
            userName={userName}
            canManage={canManage}
          />
        )}
        {activeView === 'board' && (
          <BoardView
            table={filteredTable}
            hook={hook}
            cell={cell}
            canManage={canManage}
          />
        )}
        {activeView === 'calendar' && (
          <CalendarView
            table={filteredTable}
            hook={hook}
            cell={cell}
            canManage={canManage}
          />
        )}
        {activeView === 'gallery' && (
          <GalleryView
            table={filteredTable}
            hook={hook}
            cell={cell}
            canManage={canManage}
          />
        )}
        {activeView === 'chart' && (
          <ChartView table={filteredTable}/>
        )}
      </div>
    </div>
  );
}
