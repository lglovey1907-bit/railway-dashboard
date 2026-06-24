'use client';
import { useState, useEffect } from 'react';

export default function DebugPage() {
 const [data, setData] = useState<any>(null);

 useEffect(() => {
 const collab = (() => {
 try { return JSON.parse(localStorage.getItem('rly_collab_registry') ?? '[]'); }
 catch { return []; }
 })();

 const wsKeys = Object.keys(localStorage).filter(k => k.startsWith('workspace_v2_'));
 const workspaces: Record<string, any> = {};
 wsKeys.forEach(k => {
 try {
 const ws = JSON.parse(localStorage.getItem(k) ?? '{}');
 workspaces[k] = {
 tableCount: ws.tables?.length ?? 0,
 tables: (ws.tables ?? []).map((t: any) => ({
 id: t.id, name: t.name, ownerCell: t.ownerCell ?? '',
 rowCount: t.rows?.length ?? 0,
 })),
 };
 } catch {}
 });

 setData({ collab, workspaces, allKeys: Object.keys(localStorage) });
 }, []);

 if (!data) return <p className="p-8 font-mono">Loading localStorage…</p>;

 return (
 <div className="p-6 font-mono text-xs space-y-6 max-w-4xl">
 <h1 className="text-lg font-bold text-slate-900">🔍 Share Debug Inspector</h1>
 <p className="text-slate-400 text-[10px]">Navigate here at /dashboard/debug — shows raw localStorage state</p>

 {/* Share registry */}
 <section>
 <h2 className="font-bold text-blue-600 mb-2 text-sm">
 rly_collab_registry — {data.collab.length} share record{data.collab.length !== 1 ? 's' : ''}
 </h2>
 {data.collab.length === 0
 ? <div className="bg-red-100 border border-red-300 rounded p-3 text-red-700">
 ❌ NO SHARES IN REGISTRY — sharing was not saved. Re-open the table, click Share, select Planning, click"Share Table".
 </div>
 : data.collab.map((s: any, i: number) => (
 <div key={i} className={`rounded p-3 mb-2 border ${s.revokedAt ? 'bg-slate-100 border-slate-300 opacity-50' : 'bg-blue-50 border-blue-300'}`}>
 <p>tableId: <b>{s.tableId}</b></p>
 <p>ownerCell: <b>"{s.ownerCell}"</b></p>
 <p>sharedWithCell: <b>"{s.sharedWithCell}"</b></p>
 <p>permission: {s.permission} | revokedAt: {s.revokedAt ?? <span className="text-green-600">null (ACTIVE)</span>}</p>
 </div>
 ))}
 </section>

 {/* Workspaces */}
 <section>
 <h2 className="font-bold text-green-600 mb-2 text-sm">
 workspace_v2_* keys — {Object.keys(data.workspaces).length} found
 </h2>
 {Object.keys(data.workspaces).length === 0
 ? <div className="bg-red-100 border border-red-300 rounded p-3 text-red-700">
 ❌ NO WORKSPACES — no cell has created any tables yet.
 </div>
 : Object.entries(data.workspaces).map(([key, ws]: any) => (
 <div key={key} className="bg-green-50 border border-green-300 rounded p-3 mb-2">
 <p className="font-bold text-green-800">{key}</p>
 {ws.tables.length === 0
 ? <p className="text-slate-400">no tables in this workspace</p>
 : ws.tables.map((t: any) => (
 <div key={t.id} className="ml-4 mt-1.5 border-l-2 border-green-400 pl-2">
 <p>id: {t.id}</p>
 <p>name: <b>"{t.name}"</b> | ownerCell: <b>"{t.ownerCell || <span className="text-red-500">BLANK</span>}"</b> | rows: {t.rowCount}</p>
 </div>
 ))
 }
 </div>
 ))}
 </section>

 {/* Diagnosis for Planning */}
 <section>
 <h2 className="font-bold text-purple-600 mb-2 text-sm">
 Diagnosis — what Planning cell should receive
 </h2>
 {(() => {
 const planningShares = data.collab.filter((s: any) =>
 s.sharedWithCell === 'Planning' && !s.revokedAt
 );
 if (planningShares.length === 0) {
 return (
 <div className="bg-red-100 border border-red-300 rounded p-3 text-red-700">
 <p className="font-bold">❌ No active shares with"Planning"found.</p>
 <p className="mt-1">Check: did you share the table, or was the share saved with a different cell name?</p>
 <p className="mt-1">All sharedWithCell values in registry: {data.collab.map((s: any) => `"${s.sharedWithCell}"`).join(', ') || 'none'}</p>
 </div>
 );
 }
 return planningShares.map((s: any, i: number) => {
 const wsKey = `workspace_v2_${s.ownerCell.replace(/[^a-zA-Z0-9]/g, '_')}`;
 const ws = data.workspaces[wsKey];
 const table = ws?.tables?.find((t: any) => t.id === s.tableId);
 const ok = !!table;
 return (
 <div key={i} className={`rounded p-3 mb-2 border ${ok ? 'bg-green-100 border-green-400' : 'bg-red-100 border-red-400'}`}>
 <p className={`font-bold mb-2 ${ok ? 'text-green-700 ' : 'text-red-700 '}`}>
 {ok ? '✅ TABLE SHOULD BE VISIBLE' : '❌ TABLE NOT VISIBLE — see reason below'}
 </p>
 <p>Share tableId: {s.tableId}</p>
 <p>Owner cell:"{s.ownerCell}"</p>
 <p>Expected workspace key: <b>{wsKey}</b></p>
 <p>Workspace key exists: <b>{ws ? '✅ YES' : '❌ NO'}</b></p>
 {!ws && (
 <p className="text-red-600 font-bold mt-1">
 Available keys: [{Object.keys(data.workspaces).join(', ')}]<br/>
 Fix: the ownerCell name in the share record ("{s.ownerCell}") doesn't match any workspace key.
 </p>
 )}
 {ws && <p>Table found in workspace: <b>{table ? `✅ YES —"${table.name}"` : '❌ NO (tableId mismatch or deleted)'}</b></p>}
 </div>
 );
 });
 })()}
 </section>

 {/* All localStorage keys */}
 <section>
 <h2 className="font-bold text-slate-500 mb-2 text-sm">All localStorage keys</h2>
 <div className="bg-slate-100 rounded p-3">
 {data.allKeys.map((k: string) => <div key={k}>{k}</div>)}
 </div>
 </section>
 </div>
 );
}
