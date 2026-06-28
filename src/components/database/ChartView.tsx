'use client';
import { useState } from 'react';
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell as ReCell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import { BarChart2, TrendingUp, PieChart as PieIcon, Settings, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { TableDef, FieldDef } from '@/lib/cellData/types';

type ChartType = 'bar' | 'line' | 'pie';

const CHART_TYPES: { id: ChartType; label: string; icon: React.ReactNode }[] = [
  { id: 'bar', label: 'Bar', icon: <BarChart2 size={13}/> },
  { id: 'line', label: 'Line', icon: <TrendingUp size={13}/> },
  { id: 'pie', label: 'Pie', icon: <PieIcon size={13}/> },
];

const COLORS = ['#4f46e5', '#0ea5e9', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4'];

function getLabel(table: TableDef, rowId: string): string {
  return table.values[`${rowId}:__label__`] ?? 'Untitled';
}
function getFieldValue(table: TableDef, rowId: string, fieldId: string): string {
  return table.values[`${rowId}:${fieldId}`] ?? '';
}

// Aggregate helper: count by category field
function countByCategory(table: TableDef, field: FieldDef) {
  const counts: Record<string, number> = {};
  table.rows.filter(r => !r.deletedAt).forEach(row => {
    const val = getFieldValue(table, row.id, field.id) || 'Unknown';
    counts[val] = (counts[val] ?? 0) + 1;
  });
  return Object.entries(counts).map(([name, value]) => ({ name, value }));
}

// Aggregate helper: sum of numeric field
function sumByLabel(table: TableDef, numericField: FieldDef) {
  return table.rows.filter(r => !r.deletedAt).map(row => ({
    name: getLabel(table, row.id),
    value: parseFloat(getFieldValue(table, row.id, numericField.id)) || 0,
  })).filter(d => d.value !== 0).slice(0, 20);
}

// Sum numeric field grouped by category
function sumByCategory(table: TableDef, catField: FieldDef, numField: FieldDef) {
  const sums: Record<string, number> = {};
  table.rows.filter(r => !r.deletedAt).forEach(row => {
    const cat = getFieldValue(table, row.id, catField.id) || 'Unknown';
    const num = parseFloat(getFieldValue(table, row.id, numField.id)) || 0;
    sums[cat] = (sums[cat] ?? 0) + num;
  });
  return Object.entries(sums).map(([name, value]) => ({ name, value: Math.round(value * 100) / 100 }));
}

function Dropdown({ label, options, value, onChange }: {
  label: string; options: { value: string; label: string }[];
  value: string; onChange: (v: string) => void;
}) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="text-[10px] text-slate-400 font-medium">{label}</span>
      <div className="relative">
        <select
          value={value}
          onChange={e => onChange(e.target.value)}
          className="text-xs text-slate-700 font-semibold bg-white border border-slate-200 rounded-lg pl-2.5 pr-6 py-1 focus:outline-none focus:border-rail-400 appearance-none cursor-pointer"
        >
          {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        <ChevronDown size={10} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"/>
      </div>
    </div>
  );
}

export function ChartView({ table }: { table: TableDef }) {
  const [chartType, setChartType] = useState<ChartType>('bar');
  const [xAxisField, setXAxisField] = useState<string>('__label__');
  const [yAxisField, setYAxisField] = useState<string>('');

  const activeRows = table.rows.filter(r => !r.deletedAt);

  // Field options
  const catFields: FieldDef[] = [
    { id: '__label__', label: table.firstColLabel, type: 'text', width: 120, nominatedUserIds: [] },
    ...table.fields.filter(f => ['text', 'dropdown', 'multiselect'].includes(f.type)),
  ];
  const numFields: FieldDef[] = table.fields.filter(f => ['number', 'currency', 'formula'].includes(f.type));

  // Build chart data
  let data: { name: string; value: number }[] = [];
  const xField = catFields.find(f => f.id === xAxisField);
  const yField = numFields.find(f => f.id === yAxisField);

  if (xField && yField) {
    data = xField.id === '__label__'
      ? sumByLabel(table, yField)
      : sumByCategory(table, xField, yField);
  } else if (xField) {
    // Count occurrences
    if (xField.id === '__label__') {
      data = activeRows.map(row => ({ name: getLabel(table, row.id), value: 1 })).slice(0, 20);
    } else {
      data = countByCategory(table, xField);
    }
  }

  // If y-axis not chosen, auto-pick first numeric
  const yOptions = [
    { value: '', label: '— Count —' },
    ...numFields.map(f => ({ value: f.id, label: f.label })),
  ];

  const noData = data.length === 0 || activeRows.length === 0;

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;
    return (
      <div className="bg-white border border-slate-200 rounded-xl shadow-xl px-3 py-2">
        <p className="text-[10px] font-bold text-slate-700 mb-1">{label}</p>
        {payload.map((p: any) => (
          <p key={p.name} className="text-[10px] text-slate-500">
            <span className="font-semibold text-slate-800">{p.value?.toLocaleString()}</span>
            {yField ? ` ${yField.label}` : ' records'}
          </p>
        ))}
      </div>
    );
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Controls */}
      <div className="flex items-center gap-4 flex-wrap">
        {/* Chart type */}
        <div className="flex items-center bg-slate-50 border border-slate-200 rounded-xl overflow-hidden">
          {CHART_TYPES.map(ct => (
            <button
              key={ct.id}
              onClick={() => setChartType(ct.id)}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold transition-colors',
                chartType === ct.id ? 'bg-rail-600 text-white' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-100'
              )}
            >
              {ct.icon} {ct.label}
            </button>
          ))}
        </div>

        {/* X Axis field */}
        <Dropdown
          label="X axis"
          options={catFields.map(f => ({ value: f.id, label: f.label }))}
          value={xAxisField}
          onChange={setXAxisField}
        />

        {/* Y Axis field */}
        <Dropdown
          label="Y axis"
          options={yOptions}
          value={yAxisField}
          onChange={setYAxisField}
        />
      </div>

      {/* Chart */}
      <div className="bg-slate-50 rounded-xl border border-slate-100 p-4" style={{ height: 320 }}>
        {noData ? (
          <div className="h-full flex flex-col items-center justify-center gap-2 text-center">
            <BarChart2 size={28} className="text-slate-200"/>
            <p className="text-xs text-slate-400">No data to display</p>
            <p className="text-[10px] text-slate-300">Add records and select valid axis fields</p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            {chartType === 'pie' ? (
              <PieChart>
                <Pie
                  data={data}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  labelLine={false}
                >
                  {data.map((_, i) => <ReCell key={i} fill={COLORS[i % COLORS.length]}/>)}
                </Pie>
                <Tooltip content={<CustomTooltip/>}/>
                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 10 }}/>
              </PieChart>
            ) : chartType === 'line' ? (
              <LineChart data={data} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0"/>
                <XAxis dataKey="name" tick={{ fontSize: 9, fill: '#94a3b8' }} tickLine={false} axisLine={{ stroke: '#e2e8f0' }}/>
                <YAxis tick={{ fontSize: 9, fill: '#94a3b8' }} tickLine={false} axisLine={false}/>
                <Tooltip content={<CustomTooltip/>}/>
                <Line type="monotone" dataKey="value" stroke="#4f46e5" strokeWidth={2} dot={{ r: 3, fill: '#4f46e5' }} activeDot={{ r: 5 }}/>
              </LineChart>
            ) : (
              <BarChart data={data} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false}/>
                <XAxis dataKey="name" tick={{ fontSize: 9, fill: '#94a3b8' }} tickLine={false} axisLine={{ stroke: '#e2e8f0' }}/>
                <YAxis tick={{ fontSize: 9, fill: '#94a3b8' }} tickLine={false} axisLine={false}/>
                <Tooltip content={<CustomTooltip/>}/>
                <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                  {data.map((_, i) => <ReCell key={i} fill={COLORS[i % COLORS.length]}/>)}
                </Bar>
              </BarChart>
            )}
          </ResponsiveContainer>
        )}
      </div>

      {/* Stats summary */}
      {data.length > 0 && (
        <div className="flex gap-4 flex-wrap">
          {[
            { label: 'Records', value: activeRows.length },
            { label: 'Data points', value: data.length },
            { label: 'Total', value: data.reduce((s, d) => s + d.value, 0).toLocaleString() },
            { label: 'Max', value: Math.max(...data.map(d => d.value)).toLocaleString() },
          ].map(stat => (
            <div key={stat.label} className="text-center">
              <p className="text-sm font-black text-slate-800">{stat.value}</p>
              <p className="text-[9px] text-slate-400 font-semibold uppercase tracking-wider">{stat.label}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
