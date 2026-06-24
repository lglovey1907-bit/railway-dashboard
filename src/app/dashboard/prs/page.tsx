'use client';
import { useState, useMemo } from 'react';
import {
 BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
 LineChart, Line, PieChart, Pie, Cell as RCell, Legend
} from 'recharts';
import { mockPRSStations, mockDailyDigi, mockPaymentModes } from '@/lib/data/mockData';
import { formatCrore, formatNumber } from '@/lib/utils';
import { CellStaffRosterLight } from '@/components/cell/CellStaffRosterLight';
import { CellDataManager } from '@/components/cell/CellDataManager';
import { SharedTablesView } from '@/components/cell/SharedTablesView';

// ── KPI Card ──────────────────────────────────────────────────────────────────
function KpiCard({ label, value, unit, color }: { label: string; value: string; unit: string; color: string }) {
 return (
 <div className="bg-slate-50 rounded-lg shadow-sm border border-gray-200 p-4 text-center min-w-0">
 <p className="text-xs font-semibold text-gray-500 mb-1 uppercase tracking-wide leading-tight">{label}</p>
 <p className={`text-xl font-bold ${color}`}>
 {unit === '₹' ? <span className="text-base mr-0.5">₹</span> : null}
 {value}
 {unit !== '₹' && unit ? <span className="text-sm ml-1 font-semibold">{unit}</span> : null}
 </p>
 </div>
 );
}

// ── Custom Bar Tooltip ────────────────────────────────────────────────────────
function BarTooltip({ active, payload, label }: { active?: boolean; payload?: { value: number }[]; label?: string }) {
 if (!active || !payload?.length) return null;
 return (
 <div className="bg-[#1e2a3a] border border-blue-800/40 rounded px-3 py-2 text-xs text-slate-900 shadow-xl">
 <p className="font-bold mb-1">{label}</p>
 <p>{(payload[0].value).toFixed(2)}%</p>
 </div>
 );
}

// ── Donut label ───────────────────────────────────────────────────────────────
function renderCustomLabel({ cx, cy, midAngle, outerRadius, percent, name }:
 { cx: number; cy: number; midAngle: number; outerRadius: number; percent: number; name: string }) {
 const RADIAN = Math.PI / 180;
 const r = outerRadius + 22;
 const x = cx + r * Math.cos(-midAngle * RADIAN);
 const y = cy + r * Math.sin(-midAngle * RADIAN);
 if (percent < 0.02) return null;
 return (
 <text x={x} y={y} fill="#374151"textAnchor={x > cx ? 'start' : 'end'} dominantBaseline="central"fontSize={11} fontWeight={600}>
 {`${(percent * 100).toFixed(2)}%`}
 </text>
 );
}

export default function PRSPage() {
 const [dateFrom, setDateFrom] = useState('2026-05-01');
 const [dateTo, setDateTo] = useState('2026-05-30');
 const [search, setSearch] = useState('');
 const [sortKey, setSortKey] = useState<'bookingLocation' | 'totalAmount' | 'digiPct' | 'passengersBooked'>('totalAmount');
 const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
 const [expandedRow, setExpandedRow] = useState<string | null>(null);

 // Filter + sort table
 const tableData = useMemo(() => {
 const filtered = mockPRSStations.filter(r =>
 r.bookingLocation.toLowerCase().includes(search.toLowerCase()) ||
 r.code.toLowerCase().includes(search.toLowerCase())
 );
 return [...filtered].sort((a, b) => {
 const av = a[sortKey] as number | string;
 const bv = b[sortKey] as number | string;
 const cmp = typeof av === 'string' ? av.localeCompare(bv as string) : (av as number) - (bv as number);
 return sortDir === 'desc' ? -cmp : cmp;
 });
 }, [search, sortKey, sortDir]);

 // Totals
 const totals = useMemo(() => ({
 totalAmount: mockPRSStations.reduce((s, r) => s + r.totalAmount, 0),
 digiAmount: mockPRSStations.reduce((s, r) => s + r.digiAmount, 0),
 totalSlips: mockPRSStations.reduce((s, r) => s + r.totalSlips, 0),
 passengersBooked: mockPRSStations.reduce((s, r) => s + r.passengersBooked, 0),
 passengersCancelled:mockPRSStations.reduce((s, r) => s + r.passengersCancelled, 0),
 }), []);
 const digiPct = (totals.digiAmount / totals.totalAmount * 100);

 // Bar chart: digi pct by station (sorted asc)
 const barData = [...mockPRSStations]
 .sort((a, b) => a.digiPct - b.digiPct)
 .map(r => ({ name: r.code, value: r.digiPct }));

 const handleSort = (key: typeof sortKey) => {
 if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
 else { setSortKey(key); setSortDir('desc'); }
 };
 const sortIcon = (key: string) => sortKey === key ? (sortDir === 'desc' ? ' ▼' : ' ▲') : '';

 return (
 <div className="min-h-screen bg-gray-50 font-sans">
 <CellStaffRosterLight cell="UTS PRS"/>
 <div className="px-6"><CellDataManager cell="UTS PRS"/>
 <SharedTablesView cell="UTS PRS"/></div>

 {/* ── Header ─────────────────────────────────────────────────────────── */}
 <div className="bg-slate-50 border-b border-gray-200 px-6 py-3 flex items-center gap-4 flex-wrap shadow-sm">
 <div className="bg-blue-700 text-slate-900 font-black text-2xl px-5 py-2 rounded select-none">PRS Data</div>

 {/* Date pickers */}
 <div className="flex items-center gap-3 ml-2">
 <div>
 <p className="text-[9px] font-semibold text-gray-500 uppercase tracking-wider mb-0.5">DATE FROM</p>
 <input type="date"value={dateFrom} onChange={e => setDateFrom(e.target.value)}
 className="border border-gray-300 rounded px-2 py-1 text-xs text-gray-700 focus:outline-none focus:ring-1 focus:ring-blue-400"/>
 </div>
 <div>
 <p className="text-[9px] font-semibold text-gray-500 uppercase tracking-wider mb-0.5">DATE TO</p>
 <input type="date"value={dateTo} onChange={e => setDateTo(e.target.value)}
 className="border border-gray-300 rounded px-2 py-1 text-xs text-gray-700 focus:outline-none focus:ring-1 focus:ring-blue-400"/>
 </div>
 </div>

 {/* Range slider placeholder */}
 <div className="flex items-center gap-2 ml-2">
 <div className="w-4 h-4 rounded-full bg-gray-400 border-2 border-slate-300 shadow"/>
 <input type="range"min={1} max={31} defaultValue={1} className="w-28 accent-blue-600"/>
 <div className="w-4 h-4 rounded-full bg-gray-400 border-2 border-slate-300 shadow"/>
 </div>
 </div>

 {/* ── KPI Row ────────────────────────────────────────────────────────── */}
 <div className="px-6 pt-5 pb-3 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
 <KpiCard label="Total Amount"value={totals.totalAmount.toFixed(2)} unit="Cr"color="text-purple-700"/>
 <KpiCard label="Digital Collection"value={totals.digiAmount.toFixed(2)} unit="Cr"color="text-purple-700"/>
 <KpiCard label="Digi Percentage"value={digiPct.toFixed(2)} unit="%"color="text-purple-700"/>
 <KpiCard label="PRS Slips"value={(totals.totalSlips / 100000).toFixed(2)} unit="Lac"color="text-green-600"/>
 <KpiCard label="Tickets"value={(totals.passengersBooked / 100000 * 0.41).toFixed(2)} unit="Lac"color="text-green-600"/>
 <KpiCard label="Passenger Bookings"value={(totals.passengersBooked / 100000).toFixed(2)} unit="Lac"color="text-green-600"/>
 </div>

 {/* ── 3-column charts ────────────────────────────────────────────────── */}
 <div className="px-6 pb-4 grid grid-cols-1 lg:grid-cols-3 gap-4">

 {/* Chart 1: Station-wise horizontal bar */}
 <div className="bg-slate-50 rounded-lg shadow-sm border border-gray-200 p-4">
 <p className="text-sm font-bold text-slate-900 bg-blue-700 -mx-4 -mt-4 mb-4 px-4 py-2 rounded-t-lg">
 Station Wise Percentage of Digital Payment
 </p>
 <p className="text-[10px] text-gray-500 font-semibold uppercase tracking-wider mb-2">Digi Percentage by Booking Location</p>
 <ResponsiveContainer width="100%"height={300}>
 <BarChart data={barData} layout="vertical"margin={{ left: 8, right: 30, top: 0, bottom: 0 }}>
 <CartesianGrid strokeDasharray="3 3"horizontal={false} stroke="#e5e7eb"/>
 <XAxis type="number"domain={[0, 100]} tickFormatter={v => `${v}%`}
 tick={{ fontSize: 9, fill: '#6b7280' }} axisLine={false} tickLine={false} />
 <YAxis type="category"dataKey="name"width={36}
 tick={{ fontSize: 10, fill: '#374151', fontWeight: 600 }} axisLine={false} tickLine={false} />
 <Tooltip content={<BarTooltip />} cursor={{ fill: '#eff6ff' }} />
 <Bar dataKey="value"fill="#1e3a5f"radius={[0, 2, 2, 0]} barSize={10}
 label={{ position: 'right', formatter: (v: number) => `${v.toFixed(2)}%`, fontSize: 9, fill: '#374151' }} />
 </BarChart>
 </ResponsiveContainer>
 </div>

 {/* Chart 2: Daily digital % line chart */}
 <div className="bg-slate-50 rounded-lg shadow-sm border border-gray-200 p-4">
 <p className="text-sm font-bold text-slate-900 bg-blue-700 -mx-4 -mt-4 mb-4 px-4 py-2 rounded-t-lg">
 Digital Payment &amp; Percentage
 </p>
 <p className="text-[10px] text-gray-500 font-semibold uppercase tracking-wider mb-2">Digital Percentage by Day</p>
 <ResponsiveContainer width="100%"height={300}>
 <LineChart data={mockDailyDigi} margin={{ top: 20, right: 20, left: 0, bottom: 10 }}>
 <CartesianGrid strokeDasharray="3 3"stroke="#e5e7eb"/>
 <XAxis dataKey="day"tick={{ fontSize: 9, fill: '#6b7280' }} axisLine={false} tickLine={false}
 label={{ value: 'Day', position: 'insideBottom', offset: -5, fontSize: 10, fill: '#9ca3af' }} />
 <YAxis domain={[30, 52]} tickFormatter={v => `${v}%`}
 tick={{ fontSize: 9, fill: '#6b7280' }} axisLine={false} tickLine={false}
 label={{ value: 'Digital Percentage', angle: -90, position: 'insideLeft', fontSize: 10, fill: '#9ca3af' }} />
 <Tooltip formatter={(v: number) => [`${v.toFixed(2)}%`, 'Digi %']}
 contentStyle={{ fontSize: 11, borderRadius: 6, border: '1px solid #dbeafe' }} />
 <Line type="monotone"dataKey="digiPct"stroke="#1e3a5f"strokeWidth={2} dot={{ r: 4, fill: '#1e3a5f', strokeWidth: 0 }}
 label={{ position: 'top', formatter: (v: number) => `${v.toFixed(2)}%`, fontSize: 8, fill: '#374151' }} />
 </LineChart>
 </ResponsiveContainer>
 </div>

 {/* Chart 3: Payment mode donut */}
 <div className="bg-slate-50 rounded-lg shadow-sm border border-gray-200 p-4">
 <p className="text-sm font-bold text-slate-900 bg-blue-700 -mx-4 -mt-4 mb-4 px-4 py-2 rounded-t-lg">
 Mode of Payment Shares
 </p>
 <p className="text-[10px] text-gray-500 font-semibold uppercase tracking-wider mb-2">CASH, DIGITAL, CCARD, VOUCHERS</p>
 <ResponsiveContainer width="100%"height={300}>
 <PieChart>
 <Pie data={mockPaymentModes} dataKey="value"nameKey="mode"cx="50%"cy="45%"
 innerRadius={65} outerRadius={95} paddingAngle={2}
 labelLine={true} label={renderCustomLabel}>
 {mockPaymentModes.map((entry, i) => (
 <RCell key={i} fill={entry.color} />
 ))}
 </Pie>
 <Legend iconType="circle"iconSize={8} formatter={(value) => (
 <span style={{ fontSize: 10, color: '#374151', fontWeight: 600 }}>{value}</span>
 )} />
 </PieChart>
 </ResponsiveContainer>
 </div>
 </div>

 {/* ── Station-wise Table ─────────────────────────────────────────────── */}
 <div className="px-6 pb-8">
 <div className="bg-slate-50 rounded-lg shadow-sm border border-gray-200 overflow-hidden">
 {/* Table toolbar */}
 <div className="flex items-center justify-between px-4 py-2 border-b border-gray-200 bg-gray-50">
 <p className="text-xs font-bold text-gray-700 uppercase tracking-wide">Station-wise Breakdown</p>
 <input value={search} onChange={e => setSearch(e.target.value)}
 placeholder="Search station…"
 className="border border-gray-300 rounded px-2 py-1 text-xs text-gray-700 focus:outline-none focus:ring-1 focus:ring-blue-400 w-40"/>
 </div>

 <div className="overflow-x-auto">
 <table className="w-full text-xs">
 <thead>
 <tr className="bg-blue-700 text-slate-900 text-left">
 {[
 { key: 'bookingLocation', label: 'BOOKING LOCATION' },
 { key: 'totalAmount', label: 'Total Amount' },
 { key: null, label: 'Digi Amount' },
 { key: 'digiPct', label: 'Digi %' },
 { key: null, label: 'Total Slips' },
 { key: 'passengersBooked',label: 'Passengers Booked' },
 { key: null, label: 'Passengers Cancelled' },
 ].map((col, i) => (
 <th key={i}
 className={`px-3 py-2 font-semibold whitespace-nowrap ${col.key ? 'cursor-pointer hover:bg-blue-600 select-none' : ''}`}
 onClick={() => col.key && handleSort(col.key as typeof sortKey)}>
 {col.label}{col.key ? sortIcon(col.key) : ''}
 </th>
 ))}
 </tr>

 {/* Totals row */}
 <tr className="bg-blue-700 text-slate-900 font-bold border-t border-blue-500/50">
 <td className="px-3 py-1.5">Total</td>
 <td className="px-3 py-1.5 text-right">₹{totals.totalAmount.toFixed(2)} Cr</td>
 <td className="px-3 py-1.5 text-right">₹{totals.digiAmount.toFixed(2)} Cr</td>
 <td className="px-3 py-1.5 text-right">{digiPct.toFixed(2)}%</td>
 <td className="px-3 py-1.5 text-right">{formatNumber(totals.totalSlips)}</td>
 <td className="px-3 py-1.5 text-right">{formatNumber(totals.passengersBooked)}</td>
 <td className="px-3 py-1.5 text-right">{formatNumber(totals.passengersCancelled)}</td>
 </tr>
 </thead>

 <tbody>
 {tableData.map((row, idx) => {
 const isExpanded = expandedRow === row.code;
 const isAlt = idx % 2 === 1;
 return (
 <>
 <tr key={row.code}
 className={`border-b border-gray-100 hover:bg-blue-50 cursor-pointer transition-colors ${isAlt ? 'bg-gray-50/50' : 'bg-slate-50 '}`}
 onClick={() => setExpandedRow(isExpanded ? null : row.code)}>
 <td className="px-3 py-2 font-semibold text-blue-700 flex items-center gap-1.5">
 <span className="text-gray-400 text-[10px]">{isExpanded ? '▼' : '⊞'}</span>
 {row.bookingLocation}
 </td>
 <td className="px-3 py-2 text-right">₹{row.totalAmount.toFixed(2)} Cr</td>
 <td className="px-3 py-2 text-right">₹{row.digiAmount.toFixed(2)} Cr</td>
 <td className="px-3 py-2 text-right">
 <span className={`font-semibold ${row.digiPct >= 50 ? 'text-green-600' : row.digiPct >= 30 ? 'text-amber-600' : 'text-red-500'}`}>
 {row.digiPct.toFixed(2)}%
 </span>
 </td>
 <td className="px-3 py-2 text-right">{formatNumber(row.totalSlips)}</td>
 <td className="px-3 py-2 text-right">{formatNumber(row.passengersBooked)}</td>
 <td className="px-3 py-2 text-right">{formatNumber(row.passengersCancelled)}</td>
 </tr>
 {isExpanded && (
 <tr key={`${row.code}-exp`} className="bg-blue-50/60 border-b border-blue-100">
 <td colSpan={7} className="px-8 py-3">
 <div className="grid grid-cols-3 gap-4 text-xs">
 <div>
 <p className="text-gray-500 uppercase tracking-wide text-[9px] mb-1">Cash Collection</p>
 <p className="font-bold text-gray-800">₹{(row.totalAmount - row.digiAmount).toFixed(2)} Cr</p>
 </div>
 <div>
 <p className="text-gray-500 uppercase tracking-wide text-[9px] mb-1">Cancellation Rate</p>
 <p className="font-bold text-gray-800">
 {row.passengersBooked > 0
 ? ((row.passengersCancelled / row.passengersBooked) * 100).toFixed(1)
 : '0.0'}%
 </p>
 </div>
 <div>
 <p className="text-gray-500 uppercase tracking-wide text-[9px] mb-1">Avg Ticket Value</p>
 <p className="font-bold text-gray-800">
 {row.totalSlips > 0
 ? `₹${((row.totalAmount * 10000000) / row.totalSlips).toFixed(0)}`
 : '—'}
 </p>
 </div>
 </div>
 </td>
 </tr>
 )}
 </>
 );
 })}
 </tbody>
 </table>
 </div>

 {/* Table footer */}
 <div className="px-4 py-2 bg-gray-50 border-t border-gray-200 flex items-center justify-between">
 <p className="text-xs text-gray-500">{tableData.length} stations · Click row to expand</p>
 <p className="text-xs text-gray-400">Data: {dateFrom} → {dateTo}</p>
 </div>
 </div>
 </div>
 </div>
 );
}
