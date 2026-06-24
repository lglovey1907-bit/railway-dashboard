'use client';
/**
 * Shared reactive cell list — fixes the same-tab refresh bug.
 *
 * The Web Storage `storage` event only fires in OTHER browser tabs.
 * To make the Sidebar react immediately when the Cell Manager creates
 * a new cell in the SAME tab, we dispatch a custom DOM event
 * ('rly_cells_changed') that both the Cell Manager (writer) and the
 * Sidebar (reader) can listen to.
 */
import { useState, useEffect, useCallback } from 'react';
import { getActiveCells, getAllCells, type CellRecord } from './cellRegistry';

export const CELLS_CHANGED_EVENT = 'rly_cells_changed';

/** Call this after any write to the cell registry to trigger immediate refresh */
export function notifyCellsChanged() {
 if (typeof window !== 'undefined') {
 window.dispatchEvent(new CustomEvent(CELLS_CHANGED_EVENT));
 }
}

/** Reactive hook — returns active cells, re-reads on any write from any tab */
export function useActiveCells(): CellRecord[] {
 const [cells, setCells] = useState<CellRecord[]>([]);

 const refresh = useCallback(() => {
 setCells(getActiveCells());
 }, []);

 useEffect(() => {
 refresh();

 // Same-tab updates (from Cell Manager)
 window.addEventListener(CELLS_CHANGED_EVENT, refresh);

 // Cross-tab updates (from another browser window)
 const storageHandler = (e: StorageEvent) => {
 if (e.key === 'rly_cell_registry') refresh();
 };
 window.addEventListener('storage', storageHandler);

 return () => {
 window.removeEventListener(CELLS_CHANGED_EVENT, refresh);
 window.removeEventListener('storage', storageHandler);
 };
 }, [refresh]);

 return cells;
}

/** Same but returns all cells (including inactive/archived) — for admin views */
export function useAllCells(): CellRecord[] {
 const [cells, setCells] = useState<CellRecord[]>([]);

 const refresh = useCallback(() => {
 setCells(getAllCells());
 }, []);

 useEffect(() => {
 refresh();
 window.addEventListener(CELLS_CHANGED_EVENT, refresh);
 const storageHandler = (e: StorageEvent) => {
 if (e.key === 'rly_cell_registry') refresh();
 };
 window.addEventListener('storage', storageHandler);
 return () => {
 window.removeEventListener(CELLS_CHANGED_EVENT, refresh);
 window.removeEventListener('storage', storageHandler);
 };
 }, [refresh]);

 return cells;
}
