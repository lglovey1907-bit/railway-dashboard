'use client';
import { useState, useEffect, useCallback } from 'react';
import type { SheetRow } from '@/lib/sheets/googleSheets';

export interface CellField {
 id: string;
 label: string; // column display name, e.g."Platforms","Staff Strength"
 column: string; // underlying data key (matches a Google Sheet column if connected)
 nominatedUserIds: string[]; // staff (from this cell) authorized to fill this specific column
}

export interface CellRow {
 id: string;
 label: string; // row display name, e.g."NDLS","01-Jun-2026","Team A"
 nominatedUserIds: string[]; // staff authorized to fill data in this specific row
}

export interface CellTable {
 id: string;
 name: string; // table name, e.g."Platform Inventory","Daily Collections"
 fields: CellField[]; // columns
 rows: CellRow[]; // rows
 // Manually-entered cell values, keyed"rowId:fieldId"-> value.
 // Used when no Google Sheet is connected for this table.
 values: Record<string, string>;
 nominatedUserIds: string[]; // staff authorized to fill ANY cell anywhere in this table
 sheetUrl?: string; // if set, this table's data is auto-imported from a Google Sheet
}

function genId(prefix: string) {
 return `${prefix}${Date.now()}${Math.floor(Math.random() * 1000)}`;
}

function cellKey(rowId: string, fieldId: string) {
 return `${rowId}:${fieldId}`;
}

const DEFAULT_TABLES: CellTable[] = [];

/**
 * Manages a cell's custom data tables. CMI/COS — the heads of each cell —
 * can create a table by choosing how many rows/columns it should start
 * with, rename column headers and row labels, and nominate staff at three
 * levels: a specific row, a specific column, or the whole table.
 *
 * A table can also be linked to a Google Sheet — when linked, the sheet's
 * header row becomes the table's columns and every data row becomes a
 * table row automatically; manual editing is disabled for that table
 * since the sheet becomes the source of truth.
 *
 * Persisted per-cell (storageKey includes the cell name), so each of the
 * 20 cells maintains its own independent set of tables.
 */
export function useCellDataStructure(cell: string) {
 const storageKey = `cell_data_structure_${cell.replace(/[^a-zA-Z0-9]/g, '_')}`;
 const [tables, setTables] = useState<CellTable[]>(DEFAULT_TABLES);
 const [loaded, setLoaded] = useState(false);

 useEffect(() => {
 if (typeof window === 'undefined') return;
 try {
 const saved = localStorage.getItem(storageKey);
 if (saved) {
 const parsed = JSON.parse(saved) as CellTable[];
 // Migrate any older"sections"shape saved under the same key
 const migrated = parsed.map((t: any) => ({
 id: t.id,
 name: t.name,
 fields: t.fields ?? [],
 rows: t.rows ?? [],
 values: t.values ?? {},
 nominatedUserIds: t.nominatedUserIds ?? [],
 sheetUrl: t.sheetUrl,
 }));
 setTables(migrated);
 } else {
 setTables(DEFAULT_TABLES);
 }
 } catch {
 setTables(DEFAULT_TABLES);
 }
 setLoaded(true);
 }, [storageKey]);

 const persist = useCallback((next: CellTable[]) => {
 setTables(next);
 if (typeof window !== 'undefined') {
 localStorage.setItem(storageKey, JSON.stringify(next));
 }
 }, [storageKey]);

 // ── Table creation ───────────────────────────────────────────────────────
 /** Creates a table with the requested number of rows and columns,
 * pre-filled with generic editable headers (Column 1, Column 2, …
 * and Row 1, Row 2, …) that the user can immediately rename. */
 const createTable = useCallback((name: string, numRows: number, numCols: number) => {
 if (!name.trim()) return;
 const fields: CellField[] = Array.from({ length: Math.max(1, numCols) }, (_, i) => ({
 id: genId('fld'),
 label: `Column ${i + 1}`,
 column: `Column ${i + 1}`,
 nominatedUserIds: [],
 }));
 const rows: CellRow[] = Array.from({ length: Math.max(1, numRows) }, (_, i) => ({
 id: genId('row'),
 label: `Row ${i + 1}`,
 nominatedUserIds: [],
 }));
 persist([...tables, {
 id: genId('tbl'), name: name.trim(), fields, rows, values: {}, nominatedUserIds: [],
 }]);
 }, [tables, persist]);

 /** Creates a table directly from imported Google Sheet data: the sheet's
 * header row becomes columns, every data row becomes a table row, and
 * existing values are pre-filled from the sheet (read-only, sheet-driven). */
 const createTableFromSheet = useCallback((name: string, sheetUrl: string, headers: string[], sheetRows: SheetRow[]) => {
 if (!name.trim() || headers.length === 0) return;
 const fields: CellField[] = headers.map(h => ({
 id: genId('fld'), label: h, column: h, nominatedUserIds: [],
 }));
 const rows: CellRow[] = [];
 const values: Record<string, string> = {};
 sheetRows.forEach((sr, i) => {
 const rowId = genId('row');
 const firstCol = headers[0];
 rows.push({ id: rowId, label: sr[firstCol]?.trim() || `Row ${i + 1}`, nominatedUserIds: [] });
 fields.forEach(f => {
 values[cellKey(rowId, f.id)] = sr[f.column] ?? '';
 });
 });
 persist([...tables, {
 id: genId('tbl'), name: name.trim(), fields, rows, values, nominatedUserIds: [], sheetUrl,
 }]);
 }, [tables, persist]);

 const removeTable = useCallback((tableId: string) => {
 persist(tables.filter(t => t.id !== tableId));
 }, [tables, persist]);

 const renameTable = useCallback((tableId: string, name: string) => {
 if (!name.trim()) return;
 persist(tables.map(t => t.id === tableId ? { ...t, name: name.trim() } : t));
 }, [tables, persist]);

 const setTableNominees = useCallback((tableId: string, userIds: string[]) => {
 persist(tables.map(t => t.id === tableId ? { ...t, nominatedUserIds: userIds } : t));
 }, [tables, persist]);

 /** Re-syncs an already-sheet-linked table's columns/rows/values from
 * fresh sheet data (called when the underlying sheet changes). */
 const syncTableFromSheet = useCallback((tableId: string, headers: string[], sheetRows: SheetRow[]) => {
 const table = tables.find(t => t.id === tableId);
 if (!table) return;
 const fields: CellField[] = headers.map(h => {
 const existing = table.fields.find(f => f.column === h);
 return existing ?? { id: genId('fld'), label: h, column: h, nominatedUserIds: [] };
 });
 const rows: CellRow[] = [];
 const values: Record<string, string> = {};
 sheetRows.forEach((sr, i) => {
 const firstCol = headers[0];
 const label = sr[firstCol]?.trim() || `Row ${i + 1}`;
 const existingRow = table.rows.find(r => r.label === label);
 const rowId = existingRow?.id ?? genId('row');
 rows.push({ id: rowId, label, nominatedUserIds: existingRow?.nominatedUserIds ?? [] });
 fields.forEach(f => {
 values[cellKey(rowId, f.id)] = sr[f.column] ?? '';
 });
 });
 persist(tables.map(t => t.id === tableId ? { ...t, fields, rows, values } : t));
 }, [tables, persist]);

 /** Disconnects a table's sheet link — it reverts to a normal manually-
 * editable table, keeping whatever rows/columns/values it last had. */
 const unlinkTableSheet = useCallback((tableId: string) => {
 persist(tables.map(t => t.id === tableId ? { ...t, sheetUrl: undefined } : t));
 }, [tables, persist]);

 // ── Fields (columns) ─────────────────────────────────────────────────────
 const addField = useCallback((tableId: string, label: string) => {
 if (!label.trim()) return;
 persist(tables.map(t => t.id === tableId
 ? { ...t, fields: [...t.fields, { id: genId('fld'), label: label.trim(), column: label.trim(), nominatedUserIds: [] }] }
 : t
 ));
 }, [tables, persist]);

 const removeField = useCallback((tableId: string, fieldId: string) => {
 persist(tables.map(t => t.id === tableId
 ? { ...t, fields: t.fields.filter(f => f.id !== fieldId) }
 : t
 ));
 }, [tables, persist]);

 const renameField = useCallback((tableId: string, fieldId: string, label: string) => {
 if (!label.trim()) return;
 persist(tables.map(t => t.id === tableId
 ? { ...t, fields: t.fields.map(f => f.id === fieldId ? { ...f, label: label.trim(), column: label.trim() } : f) }
 : t
 ));
 }, [tables, persist]);

 const setFieldNominees = useCallback((tableId: string, fieldId: string, userIds: string[]) => {
 persist(tables.map(t => t.id === tableId
 ? { ...t, fields: t.fields.map(f => f.id === fieldId ? { ...f, nominatedUserIds: userIds } : f) }
 : t
 ));
 }, [tables, persist]);

 // ── Rows ──────────────────────────────────────────────────────────────────
 const addRow = useCallback((tableId: string, label?: string) => {
 persist(tables.map(t => {
 if (t.id !== tableId) return t;
 const rowLabel = label?.trim() || `Row ${t.rows.length + 1}`;
 return { ...t, rows: [...t.rows, { id: genId('row'), label: rowLabel, nominatedUserIds: [] }] };
 }));
 }, [tables, persist]);

 const removeRow = useCallback((tableId: string, rowId: string) => {
 persist(tables.map(t => t.id === tableId
 ? {
 ...t,
 rows: t.rows.filter(r => r.id !== rowId),
 values: Object.fromEntries(Object.entries(t.values).filter(([k]) => !k.startsWith(`${rowId}:`))),
 }
 : t
 ));
 }, [tables, persist]);

 const renameRow = useCallback((tableId: string, rowId: string, label: string) => {
 if (!label.trim()) return;
 persist(tables.map(t => t.id === tableId
 ? { ...t, rows: t.rows.map(r => r.id === rowId ? { ...r, label: label.trim() } : r) }
 : t
 ));
 }, [tables, persist]);

 const setRowNominees = useCallback((tableId: string, rowId: string, userIds: string[]) => {
 persist(tables.map(t => t.id === tableId
 ? { ...t, rows: t.rows.map(r => r.id === rowId ? { ...r, nominatedUserIds: userIds } : r) }
 : t
 ));
 }, [tables, persist]);

 // ── Manual cell values (used when no sheet is connected) ──────────────────
 const setCellValue = useCallback((tableId: string, rowId: string, fieldId: string, value: string) => {
 persist(tables.map(t => t.id === tableId
 ? { ...t, values: { ...t.values, [cellKey(rowId, fieldId)]: value } }
 : t
 ));
 }, [tables, persist]);

 const getCellValue = useCallback((table: CellTable, rowId: string, fieldId: string): string => {
 return table.values[cellKey(rowId, fieldId)] ?? '';
 }, []);

 return {
 tables, loaded,
 createTable, createTableFromSheet, syncTableFromSheet, unlinkTableSheet,
 removeTable, renameTable, setTableNominees,
 addField, removeField, renameField, setFieldNominees,
 addRow, removeRow, renameRow, setRowNominees,
 setCellValue, getCellValue,
 };
}

/**
 * A user can manage a cell's data structure (create/delete tables, fields,
 * rows, nominations) if:
 * - they are Maintenance or Admin (full override), OR
 * - they belong to that exact cell AND their workingAs is CMI or COS
 * (the two designations defined as"head of the cell").
 */
export function canManageCellStructure(
 user: { cell: string; role: string; workingAs?: string } | null,
 cell: string
): boolean {
 if (!user) return false;
 if (user.role === 'maintenance' || user.role === 'admin') return true;
 if (user.cell !== cell) return false;
 // incharge has full control of their own cell
 if (user.role === 'incharge') return true;
 return user.workingAs === 'CMI' || user.workingAs === 'COS';
}

/**
 * A user can fill in a specific table cell if:
 * - they can manage the structure (cell head / admin), OR
 * - they are nominated on the whole table, OR
 * - they are nominated on that specific row, OR
 * - they are nominated on that specific column.
 */
export function canFillCellData(
 userId: string | undefined,
 canManage: boolean,
 table: CellTable,
 rowNominees: string[],
 fieldNominees: string[],
): boolean {
 if (canManage) return true;
 if (!userId) return false;
 return table.nominatedUserIds.includes(userId)
 || rowNominees.includes(userId)
 || fieldNominees.includes(userId);
}

/**
 * A user can connect/manage the Google Sheet link for a table if they can
 * manage the structure (CMI/COS/admin), OR if they are nominated anywhere
 * in that table (whole-table, any row, or any column) — nominated staff
 * are trusted to keep the live data source up to date too.
 */
export function canManageTableSheet(
 userId: string | undefined,
 canManage: boolean,
 table: CellTable,
): boolean {
 if (canManage) return true;
 if (!userId) return false;
 return table.nominatedUserIds.includes(userId)
 || table.fields.some(f => f.nominatedUserIds.includes(userId))
 || table.rows.some(r => r.nominatedUserIds.includes(userId));
}
