'use client';
import { useState } from 'react';
import { ChevronLeft, ChevronRight, CalendarDays, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { TableDef, FieldDef } from '@/lib/cellData/types';
import type { useWorkspace } from '@/lib/cellData/useWorkspace';

type Hook = ReturnType<typeof useWorkspace>;

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];

function getDateField(table: TableDef): FieldDef | undefined {
  return (
    table.fields.find(f => f.label.toLowerCase().includes('date') || f.label.toLowerCase().includes('due') || f.label.toLowerCase().includes('schedule')) ??
    table.fields.find(f => f.type === 'date')
  );
}

function getLabel(table: TableDef, rowId: string): string {
  return table.values[`${rowId}:__label__`] ?? 'Untitled';
}

function getFieldValue(table: TableDef, rowId: string, fieldId: string): string {
  return table.values[`${rowId}:${fieldId}`] ?? '';
}

function daysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

function firstWeekday(year: number, month: number): number {
  return new Date(year, month, 1).getDay();
}

// Calendar cell entry
function CalEntry({ label, colorClass }: { label: string; colorClass: string }) {
  return (
    <div className={cn('text-[9px] font-semibold px-1.5 py-0.5 rounded-md truncate cursor-pointer hover:opacity-80 transition-opacity', colorClass)}>
      {label}
    </div>
  );
}

export function CalendarView({
  table, hook, cell, canManage,
}: {
  table: TableDef;
  hook: Hook;
  cell: string;
  canManage: boolean;
}) {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());

  const dateField = getDateField(table);

  if (!dateField) {
    return (
      <div className="flex flex-col items-center justify-center py-12 gap-3 text-center">
        <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center">
          <CalendarDays size={20} className="text-blue-500"/>
        </div>
        <p className="text-sm font-semibold text-slate-700">Calendar view needs a Date field</p>
        <p className="text-xs text-slate-400 max-w-xs">
          Add a <strong>Date</strong> field to your table (e.g., "Due Date", "Schedule Date") to use Calendar view.
        </p>
      </div>
    );
  }

  const prev = () => { if (month === 0) { setYear(y => y - 1); setMonth(11); } else setMonth(m => m - 1); };
  const next = () => { if (month === 11) { setYear(y => y + 1); setMonth(0); } else setMonth(m => m + 1); };
  const goToday = () => { setYear(today.getFullYear()); setMonth(today.getMonth()); };

  const totalDays = daysInMonth(year, month);
  const startWD = firstWeekday(year, month);
  const totalCells = Math.ceil((startWD + totalDays) / 7) * 7;

  // Build per-day entries
  const activeRows = table.rows.filter(r => !r.deletedAt);
  const eventsByDay: Record<number, { label: string; rowId: string }[]> = {};

  activeRows.forEach(row => {
    const dateVal = getFieldValue(table, row.id, dateField.id);
    if (!dateVal) return;
    const d = new Date(dateVal);
    if (isNaN(d.getTime())) return;
    if (d.getFullYear() === year && d.getMonth() === month) {
      const day = d.getDate();
      if (!eventsByDay[day]) eventsByDay[day] = [];
      eventsByDay[day].push({ label: getLabel(table, row.id), rowId: row.id });
    }
  });

  const COLOR_CYCLE = [
    'bg-rail-100 text-rail-700',
    'bg-blue-100 text-blue-700',
    'bg-emerald-100 text-emerald-700',
    'bg-amber-100 text-amber-700',
    'bg-purple-100 text-purple-700',
  ];

  return (
    <div className="flex flex-col gap-3">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={prev} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors">
          <ChevronLeft size={14}/>
        </button>
        <h3 className="text-sm font-bold text-slate-800 min-w-[140px] text-center">
          {MONTHS[month]} {year}
        </h3>
        <button onClick={next} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors">
          <ChevronRight size={14}/>
        </button>
        <button onClick={goToday} className="ml-1 px-3 py-1 text-[10px] font-bold text-rail-600 bg-rail-50 hover:bg-rail-100 rounded-lg transition-colors border border-rail-100">
          Today
        </button>
        <span className="ml-auto text-[10px] text-slate-400">
          {Object.values(eventsByDay).flat().length} event{Object.values(eventsByDay).flat().length !== 1 ? 's' : ''} this month
        </span>
      </div>

      {/* Grid */}
      <div className="border border-slate-200 rounded-xl overflow-hidden">
        {/* Weekday headers */}
        <div className="grid grid-cols-7 bg-slate-50 border-b border-slate-200">
          {WEEKDAYS.map(wd => (
            <div key={wd} className="text-center text-[9px] font-bold text-slate-400 uppercase tracking-wider py-2">
              {wd}
            </div>
          ))}
        </div>

        {/* Days grid */}
        <div className="grid grid-cols-7">
          {Array.from({ length: totalCells }).map((_, i) => {
            const dayNum = i - startWD + 1;
            const isThisMonth = dayNum >= 1 && dayNum <= totalDays;
            const isToday = isThisMonth && year === today.getFullYear() && month === today.getMonth() && dayNum === today.getDate();
            const events = isThisMonth ? (eventsByDay[dayNum] ?? []) : [];
            const maxVisible = 2;

            return (
              <div
                key={i}
                className={cn(
                  'min-h-[80px] border-b border-r border-slate-100 p-1.5 last:border-r-0',
                  !isThisMonth && 'bg-slate-50/50',
                  isToday && 'bg-rail-50/60',
                  'transition-colors'
                )}
              >
                {isThisMonth && (
                  <>
                    <div className={cn(
                      'w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold mb-1',
                      isToday ? 'bg-rail-600 text-white' : 'text-slate-500'
                    )}>
                      {dayNum}
                    </div>
                    <div className="space-y-0.5">
                      {events.slice(0, maxVisible).map((ev, ei) => (
                        <CalEntry key={ev.rowId} label={ev.label} colorClass={COLOR_CYCLE[ei % COLOR_CYCLE.length]}/>
                      ))}
                      {events.length > maxVisible && (
                        <div className="text-[9px] text-slate-400 font-medium pl-1">
                          +{events.length - maxVisible} more
                        </div>
                      )}
                    </div>
                    {canManage && events.length === 0 && (
                      <button
                        onClick={() => {
                          const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
                          hook.addRow(table.id, 'New Entry');
                          setTimeout(() => {
                            const rows = table.rows;
                            const newRow = rows[rows.length - 1];
                            if (newRow) hook.setCellValue(table.id, newRow.id, dateField.id, dateStr);
                          }, 50);
                        }}
                        className="w-full mt-1 flex items-center justify-center text-slate-200 hover:text-rail-400 transition-colors"
                      >
                        <Plus size={10}/>
                      </button>
                    )}
                  </>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-3 text-[10px] text-slate-400">
        <CalendarDays size={11}/>
        <span>Grouped by <strong className="text-slate-600">{dateField.label}</strong></span>
        {canManage && <span className="ml-auto">Click <Plus size={9} className="inline"/> on a day to add an entry</span>}
      </div>
    </div>
  );
}
