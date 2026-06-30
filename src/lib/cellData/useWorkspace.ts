'use client';
import { useState, useEffect, useCallback, useRef } from 'react';
import type {
 CellWorkspace, TableDef, Section, Widget, FieldDef, RowDef, FieldType,
 HistoryEntry, TrashEntry, SheetConnection,
} from './types';
import { makeField, makeRow, makeSection, makeTable, makeHistoryId, makeDraftTrashId } from './types';
import { fetchGoogleSheet } from '@/lib/sheets/googleSheets';
import { logActivity, createTableMeta, touchTableMeta, createRowMeta, touchRowMeta, saveVersion } from './collaboration';
import { cloudWrite, cloudRead } from '@/lib/config/cloudSync';
import { sharedWrite, sharedRead } from '@/lib/config/sharedSync';

function ck(rId: string, fId: string) { return `${rId}:${fId}`; }
function gid(p: string) { return `${p}${Date.now()}${Math.floor(Math.random()*1000)}`; }

const MAX_HISTORY = 50;
const TRASH_RETAIN_DAYS = 30;

const EMPTY_WS = (cell: string): CellWorkspace => ({ cell, sections: [], tables: [], trash: [] });


// Namespace for a given cell key (shared across all users in _shared_ Upstash)
function sharedNS(cell: string) {
  // Dashboard tab workspaces keep their legacy ws_ prefix (backward-compat with useAppSync)
  if (cell.startsWith('dashboard_tab_')) return `ws_${cell.replace(/[^a-zA-Z0-9]/g, '_')}`;
  // All other cells: cell_ws_ prefix — matches NS.cellWorkspace() used in useAppSync
  return `cell_ws_${cell.replace(/[^a-zA-Z0-9]/g, '_')}`;
}

export function useWorkspace(cell: string, currentUser?: { id: string; name: string }) {
 const key = `workspace_v2_${cell.replace(/[^a-zA-Z0-9]/g, '_')}`;
 const [ws, setWs] = useState<CellWorkspace>(EMPTY_WS(cell));
 const [history, setHistory] = useState<HistoryEntry[]>([]);
 const [future, setFuture] = useState<HistoryEntry[]>([]);

 // ── Helper: apply stored CellWorkspace data with safe defaults ──────────────
 const applyWsData = (parsed: CellWorkspace | any) => ({
   cell,
   sections: (parsed.sections ?? []).map((s: any) => ({
     ...s, collapsed: s.collapsed ?? false, widgets: s.widgets ?? [],
   })),
   tables: (parsed.tables ?? []).map((t: any) => ({
     ...t,
     ownerCell: t.ownerCell || cell,
     firstColLabel: t.firstColLabel ?? 'Label',
     dataSource: t.dataSource ?? 'manual',
     filters: t.filters ?? {},
     nominatedUserIds: t.nominatedUserIds ?? [],
     trash: t.trash ?? [],
     rows: (t.rows ?? []).map((r: any, i: number) => ({ ...r, order: r.order ?? i })),
     columnOrder: t.columnOrder ?? (t.fields ?? []).map((f: any) => f.id),
   })),
   trash: parsed.trash ?? [],
 });

 // Load from localStorage first (fast / instant render), then override from cloud
 useEffect(() => {
   if (typeof window === 'undefined') return;
   // Phase 1: localStorage (synchronous, immediate)
   try {
     const raw = localStorage.getItem(key);
     if (raw) setWs(applyWsData(JSON.parse(raw)));
   } catch { /* ignore */ }
   // Phase 2: cloud read (authoritative — ensures cross-browser sync on page load)
   sharedRead(sharedNS(cell)).then(cloudData => {
     if (!cloudData) return;
     try {
       const normalized = applyWsData(cloudData as CellWorkspace);
       setWs(normalized);
       localStorage.setItem(key, JSON.stringify(normalized));
     } catch { /* ignore */ }
   }).catch(() => { /* silent */ });
 }, [key, cell]);

 // Sync from other useWorkspace instances on the same page (e.g. DatabasePeekModal ↔ canvas)
 useEffect(() => {
 if (typeof window === 'undefined') return;
 const handler = (e: Event) => {
   const ce = e as CustomEvent<{ key: string; data: CellWorkspace }>;
   if (ce.detail.key === key) setWs(ce.detail.data);
 };
 window.addEventListener('ws-sync', handler);
 return () => window.removeEventListener('ws-sync', handler);
 }, [key]);

 // ── Core persistence + history ─────────────────────────────────────────────
 const persist = useCallback((next: CellWorkspace) => {
   if (typeof window !== 'undefined') {
     localStorage.setItem(key, JSON.stringify(next));
     // Always sync to shared cloud namespace so every browser sees the latest
     sharedWrite(sharedNS(cell), next);
     // Broadcast to other useWorkspace instances on the same page
     window.dispatchEvent(new CustomEvent('ws-sync', { detail: { key, data: next } }));
   }
 }, [key, cell]);

 /**
 * All mutations go through this. Pushes a history snapshot before every
 * change so Ctrl+Z can undo any single operation.
 */
 const commit = useCallback((
 fn: (w: CellWorkspace) => CellWorkspace,
 description = 'Change',
 ) => {
 setWs(prev => {
 const next = fn(prev);
 persist(next);
 setHistory(h => {
 const entry: HistoryEntry = {
 id: makeHistoryId(),
 timestamp: new Date().toISOString(),
 description,
 snapshot: JSON.parse(JSON.stringify(prev)),
 };
 return [entry, ...h].slice(0, MAX_HISTORY);
 });
 setFuture([]);
 return next;
 });
 }, [persist]);

 // ── Undo / Redo ────────────────────────────────────────────────────────────
 const undo = useCallback(() => {
 setHistory(h => {
 if (!h.length) return h;
 const [latest, ...rest] = h;
 const restoredWs = latest.snapshot;
 persist(restoredWs);
 setFuture(f => {
 const entry: HistoryEntry = {
 id: makeHistoryId(), timestamp: new Date().toISOString(),
 description: latest.description, snapshot: restoredWs,
 };
 return [entry, ...f].slice(0, MAX_HISTORY);
 });
 setWs(restoredWs);
 return rest;
 });
 }, [persist]);

 const redo = useCallback(() => {
 setFuture(f => {
 if (!f.length) return f;
 const [latest, ...rest] = f;
 const restoredWs = latest.snapshot;
 persist(restoredWs);
 setHistory(h => {
 const entry: HistoryEntry = {
 id: makeHistoryId(), timestamp: new Date().toISOString(),
 description: latest.description, snapshot: restoredWs,
 };
 return [entry, ...h].slice(0, MAX_HISTORY);
 });
 setWs(restoredWs);
 return rest;
 });
 }, [persist]);

 // ── Keyboard undo/redo ──────────────────────────────────────────────────────
 useEffect(() => {
 const handler = (e: KeyboardEvent) => {
 if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) { e.preventDefault(); undo(); }
 if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) { e.preventDefault(); redo(); }
 };
 window.addEventListener('keydown', handler);
 return () => window.removeEventListener('keydown', handler);
 }, [undo, redo]);

 // ── Trash helpers ──────────────────────────────────────────────────────────
 const addToTrash = (entry: Omit<TrashEntry, 'id' | 'deletedAt'>): TrashEntry => ({
 ...entry, id: makeDraftTrashId(), deletedAt: new Date().toISOString(),
 });

 // ── Sections ────────────────────────────────────────────────────────────────
 const addSection = useCallback((title = 'New Section') => {
 commit(w => ({ ...w, sections: [...w.sections, { ...makeSection(title), order: w.sections.length }] }), 'Add section');
 }, [commit]);

 const removeSection = useCallback((sId: string) => {
 commit(w => {
 const s = w.sections.find(x => x.id === sId);
 return {
 ...w,
 sections: w.sections.filter(x => x.id !== sId),
 trash: [...w.trash, addToTrash({ type: 'section', label: s?.title ?? sId, data: s })],
 };
 }, 'Delete section');
 }, [commit]);

 const renameSection = useCallback((sId: string, title: string) => {
 commit(w => ({ ...w, sections: w.sections.map(s => s.id === sId ? { ...s, title } : s) }), 'Rename section');
 }, [commit]);

 const toggleSection = useCallback((sId: string) => {
 setWs(prev => {
 const next = { ...prev, sections: prev.sections.map(s => s.id === sId ? { ...s, collapsed: !s.collapsed } : s) };
 persist(next); return next;
 });
 }, [persist]);

 const moveSectionUp = useCallback((sId: string) => {
 commit(w => {
 const i = w.sections.findIndex(s => s.id === sId);
 if (i <= 0) return w;
 const arr = [...w.sections];
 [arr[i-1], arr[i]] = [arr[i], arr[i-1]];
 return { ...w, sections: arr };
 }, 'Reorder section');
 }, [commit]);

 const moveSectionDown = useCallback((sId: string) => {
 commit(w => {
 const i = w.sections.findIndex(s => s.id === sId);
 if (i < 0 || i >= w.sections.length - 1) return w;
 const arr = [...w.sections];
 [arr[i], arr[i+1]] = [arr[i+1], arr[i]];
 return { ...w, sections: arr };
 }, 'Reorder section');
 }, [commit]);

 // ── Widgets ─────────────────────────────────────────────────────────────────
 const addTableToSection = useCallback((sId: string, table: TableDef) => {
 commit(w => ({
 ...w,
 tables: [...w.tables, table],
 sections: w.sections.map(s => s.id === sId
 ? { ...s, widgets: [...s.widgets, { type: 'table', id: gid('w'), tableId: table.id }] }
 : s),
 }), `Create table"${table.name}"`);
 // Audit
 if (currentUser) {
 createTableMeta(table.id, currentUser.id, currentUser.name);
 logActivity(cell, { action: 'table_created', tableId: table.id, tableName: table.name, userId: currentUser.id, userName: currentUser.name, detail: table.name });
 }
 }, [commit, cell, currentUser]);

 const addTextToSection = useCallback((sId: string) => {
 commit(w => ({
 ...w,
 sections: w.sections.map(s => s.id === sId
 ? { ...s, widgets: [...s.widgets, { type: 'text', id: gid('w'), content: '' }] }
 : s),
 }), 'Add text block');
 }, [commit]);

 const addKpiToSection = useCallback((sId: string) => {
 commit(w => ({
 ...w,
 sections: w.sections.map(s => s.id === sId
 ? { ...s, widgets: [...s.widgets, { type: 'kpi', id: gid('w'), label: 'KPI', value: '0' }] }
 : s),
 }), 'Add KPI');
 }, [commit]);

 const removeWidget = useCallback((sId: string, wId: string, tableId?: string) => {
 commit(w => {
 const table = tableId ? w.tables.find(t => t.id === tableId) : undefined;
 return {
 ...w,
 tables: tableId ? w.tables.filter(t => t.id !== tableId) : w.tables,
 sections: w.sections.map(s => s.id === sId ? { ...s, widgets: s.widgets.filter(x => x.id !== wId) } : s),
 trash: table ? [...w.trash, addToTrash({ type: 'table', label: table.name, data: table })] : w.trash,
 };
 }, tableId ? 'Delete table' : 'Remove widget');
 }, [commit]);

 const updateWidget = useCallback((sId: string, wId: string, patch: Partial<Widget>) => {
 commit(w => ({
 ...w,
 sections: w.sections.map(s => s.id !== sId ? s : {
 ...s, widgets: s.widgets.map(x => x.id === wId ? { ...x, ...patch } as Widget : x),
 }),
 }), 'Edit widget');
 }, [commit]);

 // ── Table ────────────────────────────────────────────────────────────────────
 const updateTable = useCallback((tId: string, patch: Partial<TableDef>) => {
 commit(w => ({ ...w, tables: w.tables.map(t => t.id === tId ? { ...t, ...patch } : t) }), 'Edit table');
 }, [commit]);

 // ── Columns ──────────────────────────────────────────────────────────────────
 const addColumn = useCallback((tId: string, type: FieldType = 'text') => {
 commit(w => ({
 ...w, tables: w.tables.map(t => {
 if (t.id !== tId) return t;
 const f = makeField(`Column ${t.fields.length + 1}`, type);
 return { ...t, fields: [...t.fields, f], columnOrder: [...(t.columnOrder ?? t.fields.map(x => x.id)), f.id] };
 }),
 }), 'Add column');
 }, [commit]);

 const removeColumn = useCallback((tId: string, fId: string) => {
 commit(w => ({
 ...w, tables: w.tables.map(t => {
 if (t.id !== tId) return t;
 const field = t.fields.find(f => f.id === fId);
 return {
 ...t,
 fields: t.fields.filter(f => f.id !== fId),
 columnOrder: (t.columnOrder ?? t.fields.map(f => f.id)).filter(id => id !== fId),
 trash: undefined, // handled at workspace level
 };
 }),
 trash: (() => {
 const table = w.tables.find(t => t.id === tId);
 const field = table?.fields.find(f => f.id === fId);
 return field ? [...w.trash, addToTrash({ type: 'column', label: field.label, data: { tableId: tId, field }, parentId: tId })] : w.trash;
 })(),
 }), 'Delete column');
 }, [commit]);

 const updateColumn = useCallback((tId: string, fId: string, patch: Partial<FieldDef>) => {
 commit(w => ({ ...w, tables: w.tables.map(t => t.id !== tId ? t : { ...t, fields: t.fields.map(f => f.id !== fId ? f : { ...f, ...patch }) }) }), 'Edit column');
 }, [commit]);

 const moveColumn = useCallback((tId: string, fId: string, dir: 'left' | 'right') => {
 commit(w => ({
 ...w, tables: w.tables.map(t => {
 if (t.id !== tId) return t;
 const order = [...(t.columnOrder ?? t.fields.map(f => f.id))];
 const i = order.indexOf(fId);
 if (i < 0) return t;
 const ni = dir === 'left' ? i - 1 : i + 1;
 if (ni < 0 || ni >= order.length) return t;
 [order[i], order[ni]] = [order[ni], order[i]];
 return { ...t, columnOrder: order };
 }),
 }), 'Reorder column');
 }, [commit]);

 const setColumnNominees = useCallback((tId: string, fId: string, ids: string[]) => {
 updateColumn(tId, fId, { nominatedUserIds: ids });
 }, [updateColumn]);

 // ── Rows ──────────────────────────────────────────────────────────────────────
 const addRow = useCallback((tId: string, labelValue = '') => {
 let newRowId = '';
 commit(w => ({
 ...w, tables: w.tables.map(t => {
 if (t.id !== tId) return t;
 const r = makeRow(t.rows.length);
 newRowId = r.id;
 const values = labelValue ? { ...t.values, [ck(r.id, '__label__')]: labelValue } : t.values;
 return { ...t, rows: [...t.rows, r], values };
 }),
 }), 'Add row');
 if (currentUser) {
 if (newRowId) createRowMeta(tId, newRowId, currentUser.id, currentUser.name);
 const table = ws.tables.find(t => t.id === tId);
 logActivity(cell, { action: 'record_created', tableId: tId, tableName: table?.name, rowId: newRowId, userId: currentUser.id, userName: currentUser.name, detail: labelValue || undefined });
 }
 }, [commit, cell, currentUser, ws.tables]);

 const removeRow = useCallback((tId: string, rId: string) => {
 const table = ws.tables.find(t => t.id === tId);
 const label = table?.values[ck(rId, '__label__')] || rId;
 commit(w => ({
 ...w, tables: w.tables.map(t => {
 if (t.id !== tId) return t;
 return {
 ...t,
 rows: t.rows.filter(r => r.id !== rId),
 values: Object.fromEntries(Object.entries(t.values).filter(([k]) => !k.startsWith(`${rId}:`))),
 };
 }),
 trash: (() => {
 const tbl = w.tables.find(t => t.id === tId);
 const row = tbl?.rows.find(r => r.id === rId);
 const rowValues = Object.fromEntries(Object.entries(tbl?.values ?? {}).filter(([k]) => k.startsWith(`${rId}:`)));
 return row ? [...w.trash, addToTrash({ type: 'row', label, data: { tableId: tId, row, values: rowValues }, parentId: tId })] : w.trash;
 })(),
 }), 'Delete row');
 if (currentUser) {
 logActivity(cell, { action: 'record_deleted', tableId: tId, tableName: table?.name, rowId: rId, userId: currentUser.id, userName: currentUser.name, detail: label });
 }
 }, [commit, cell, currentUser, ws.tables]);

 const moveRow = useCallback((tId: string, rId: string, dir: 'up' | 'down') => {
 commit(w => ({
 ...w, tables: w.tables.map(t => {
 if (t.id !== tId) return t;
 const rows = [...t.rows].sort((a, b) => a.order - b.order);
 const i = rows.findIndex(r => r.id === rId);
 const ni = dir === 'up' ? i - 1 : i + 1;
 if (ni < 0 || ni >= rows.length) return t;
 [rows[i], rows[ni]] = [rows[ni], rows[i]];
 return { ...t, rows: rows.map((r, idx) => ({ ...r, order: idx })) };
 }),
 }), 'Reorder row');
 }, [commit]);

 const setRowNominees = useCallback((tId: string, rId: string, ids: string[]) => {
 commit(w => ({ ...w, tables: w.tables.map(t => t.id !== tId ? t : { ...t, rows: t.rows.map(r => r.id !== rId ? r : { ...r, nominatedUserIds: ids }) }) }), 'Set row nominees');
 }, [commit]);

 // ── Cell values ───────────────────────────────────────────────────────────────
 const setCellValue = useCallback((tId: string, rId: string, fId: string, val: string) => {
 setWs(prev => {
 const next = { ...prev, tables: prev.tables.map(t => t.id !== tId ? t : { ...t, values: { ...t.values, [ck(rId, fId)]: val } }) };
 persist(next); return next;
 });
 // Update row-level audit meta + log activity (debounced by row — don't log every keystroke)
 if (currentUser && fId !== '__label__') {
 touchRowMeta(tId, rId, currentUser.id, currentUser.name);
 touchTableMeta(tId, currentUser.id, currentUser.name);
 const table = ws.tables.find(t => t.id === tId);
 logActivity(cell, { action: 'record_edited', tableId: tId, tableName: table?.name, rowId: rId, fieldId: fId, userId: currentUser.id, userName: currentUser.name });
 }
 }, [persist, cell, currentUser, ws.tables]);

 const getCellValue = useCallback((table: TableDef, rId: string, fId: string) => {
 return table.values[ck(rId, fId)] ?? '';
 }, []);

 // ── Table-level operations ────────────────────────────────────────────────────
 const setFirstColLabel = useCallback((tId: string, label: string) => {
 updateTable(tId, { firstColLabel: label });
 }, [updateTable]);

 const setTableNominees = useCallback((tId: string, ids: string[]) => {
 commit(w => ({ ...w, tables: w.tables.map(t => t.id !== tId ? t : { ...t, nominatedUserIds: ids }) }), 'Set table nominees');
 }, [commit]);

 const setSort = useCallback((tId: string, fieldId: string) => {
 setWs(prev => {
 const next = { ...prev, tables: prev.tables.map(t => {
 if (t.id !== tId) return t;
 const same = t.sortField === fieldId;
 return { ...t, sortField: fieldId, sortDir: (same && t.sortDir === 'asc' ? 'desc' : 'asc') as 'asc' | 'desc' };
 })};
 persist(next); return next;
 });
 }, [persist]);

 const setFilter = useCallback((tId: string, fId: string, val: string) => {
 setWs(prev => {
 const next = { ...prev, tables: prev.tables.map(t => t.id !== tId ? t : { ...t, filters: { ...t.filters, [fId]: val } }) };
 persist(next); return next;
 });
 }, [persist]);

 const clearFilter = useCallback((tId: string, fId: string) => {
 setWs(prev => {
 const next = { ...prev, tables: prev.tables.map(t => {
 if (t.id !== tId) return t;
 const { [fId]: _, ...rest } = t.filters ?? {};
 return { ...t, filters: rest };
 })};
 persist(next); return next;
 });
 }, [persist]);

 // ── Google Sheets — Import (one-time copy) ────────────────────────────────────
 const importFromSheet = useCallback(async (tId: string, url: string): Promise<string | null> => {
 const result = await fetchGoogleSheet(url);
 if (result.error) return result.error;
 const headers = result.headers.filter(h => h.trim());
 if (!headers.length) return 'No columns found in sheet';
 const firstCol = headers[0];
 const dataHeaders = headers.slice(1);
 commit(w => {
 const existing = w.tables.find(t => t.id === tId);
 if (!existing) return w;
 const fields: FieldDef[] = dataHeaders.map(h => makeField(h));
 const rows: RowDef[] = result.rows.map((_, i) => makeRow(i));
 const values: Record<string, string> = {};
 result.rows.forEach((sr, i) => {
 const row = rows[i];
 values[ck(row.id, '__label__')] = sr[firstCol]?.trim() ?? `Row ${i+1}`;
 fields.forEach(f => { values[ck(row.id, f.id)] = sr[f.label] ?? ''; });
 });
 return {
 ...w, tables: w.tables.map(t => t.id !== tId ? t : {
 ...t, fields, rows, values,
 firstColLabel: existing.firstColLabel || firstCol,
 dataSource: 'manual',
 sheet: { url, mode: 'import', lastSynced: new Date().toISOString() },
 columnOrder: fields.map(f => f.id),
 }),
 };
 }, 'Import from Google Sheet');
 return null;
 }, [commit]);

 // ── Google Sheets — Link (live sync) ─────────────────────────────────────────
 const syncSheet = useCallback(async (tId: string): Promise<string | null> => {
 const table = ws.tables.find(t => t.id === tId);
 const url = table?.sheet?.url;
 if (!url) return 'No sheet URL configured';
 const result = await fetchGoogleSheet(url);
 if (result.error) {
 commit(w => ({ ...w, tables: w.tables.map(t => t.id !== tId ? t : { ...t, sheet: { ...t.sheet!, syncError: result.error } }) }), 'Sheet sync error');
 return result.error;
 }
 const headers = result.headers.filter(h => h.trim());
 if (!headers.length) return 'No columns found';
 const firstCol = headers[0];
 const dataHeaders = headers.slice(1);
 setWs(prev => {
 const existing = prev.tables.find(t => t.id === tId);
 if (!existing) return prev;
 const fields: FieldDef[] = dataHeaders.map(h => {
 const prev_f = existing.fields.find(f => f.label === h);
 return prev_f ? { ...prev_f } : makeField(h);
 });
 const rows: RowDef[] = result.rows.map((_, i) => {
 const label = result.rows[i][firstCol]?.trim() ?? '';
 const existing_r = existing.rows[i];
 return existing_r ? { ...existing_r, order: i } : makeRow(i);
 });
 const values: Record<string, string> = {};
 result.rows.forEach((sr, i) => {
 const row = rows[i]; if (!row) return;
 values[ck(row.id, '__label__')] = sr[firstCol]?.trim() ?? `Row ${i+1}`;
 fields.forEach(f => { values[ck(row.id, f.id)] = sr[f.label] ?? ''; });
 });
 const next = { ...prev, tables: prev.tables.map(t => t.id !== tId ? t : {
 ...t, fields, rows, values,
 firstColLabel: existing.firstColLabel || firstCol,
 dataSource: 'linked_sheet' as const,
 sheet: { ...existing.sheet!, lastSynced: new Date().toISOString(), syncError: undefined, mode: 'link' as const },
 columnOrder: fields.map(f => f.id),
 })};
 persist(next); return next;
 });
 return null;
 }, [ws.tables, persist, commit]);

 const linkSheet = useCallback(async (tId: string, url: string): Promise<string | null> => {
 commit(w => ({ ...w, tables: w.tables.map(t => t.id !== tId ? t : { ...t, dataSource: 'linked_sheet', sheet: { url, mode: 'link' } }) }), 'Link Google Sheet');
 const result = await syncSheet(tId);
 if (!result && currentUser) {
 const table = ws.tables.find(t => t.id === tId);
 logActivity(cell, { action: 'sheet_synced', tableId: tId, tableName: table?.name, userId: currentUser.id, userName: currentUser.name, detail: url });
 }
 return result;
 }, [commit, syncSheet, cell, currentUser, ws.tables]);

 const unlinkSheet = useCallback((tId: string) => {
 commit(w => ({ ...w, tables: w.tables.map(t => t.id !== tId ? t : { ...t, dataSource: 'manual', sheet: undefined }) }), 'Unlink Google Sheet');
 }, [commit]);

 // ── Trash / Restore ───────────────────────────────────────────────────────────
 const restoreFromTrash = useCallback((trashId: string) => {
 commit(w => {
 const entry = w.trash.find(e => e.id === trashId);
 if (!entry) return w;
 let next = { ...w, trash: w.trash.filter(e => e.id !== trashId) };
 if (entry.type === 'table') {
 next = { ...next, tables: [...next.tables, entry.data as TableDef] };
 }
 if (entry.type === 'row') {
 const { tableId, row, values } = entry.data as { tableId: string; row: RowDef; values: Record<string,string> };
 next = { ...next, tables: next.tables.map(t => t.id !== tableId ? t : {
 ...t, rows: [...t.rows, row], values: { ...t.values, ...values },
 })};
 }
 if (entry.type === 'column') {
 const { tableId, field } = entry.data as { tableId: string; field: FieldDef };
 next = { ...next, tables: next.tables.map(t => t.id !== tableId ? t : {
 ...t, fields: [...t.fields, field], columnOrder: [...(t.columnOrder ?? []), field.id],
 })};
 }
 return next;
 }, 'Restore from trash');
 }, [commit]);

 const emptyTrash = useCallback(() => {
 commit(w => ({ ...w, trash: [] }), 'Empty trash');
 }, [commit]);

 return {
 ws, history, future,
 canUndo: history.length > 0, canRedo: future.length > 0,
 undo, redo,
 // sections
 addSection, removeSection, renameSection, toggleSection, moveSectionUp, moveSectionDown,
 // widgets
 addTableToSection, addTextToSection, addKpiToSection, removeWidget, updateWidget,
 // table
 updateTable, setFirstColLabel, setTableNominees, setSort, setFilter, clearFilter,
 // columns
 addColumn, removeColumn, updateColumn, moveColumn, setColumnNominees,
 // rows
 addRow, removeRow, moveRow, setRowNominees,
 // cells
 setCellValue, getCellValue,
 // sheets
 importFromSheet, linkSheet, unlinkSheet, syncSheet,
 // trash
 restoreFromTrash, emptyTrash,
 };
}
