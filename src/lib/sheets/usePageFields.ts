'use client';
import { useState, useEffect, useCallback } from 'react';
import { sharedWrite } from '@/lib/config/sharedSync';

export interface PageField {
  id: string;
  label: string;       // display label shown on cards/tables
  column: string;      // exact column header from the Google Sheet
  visible: boolean;    // whether this field is shown (req 98)
  order: number;       // display order (req 98)
}

function genId() { return `f${Date.now()}${Math.floor(Math.random() * 9999)}`; }

function fieldsKey(sk: string) { return `${sk}_fields_v2`; }

/**
 * Manages user-selected fields for a sheet view (req 97-102).
 *
 * Behaviour:
 * - When sheet headers arrive, unmapped headers are auto-added as hidden fields
 * - Users can toggle visibility, reorder, rename display labels
 * - All settings persist in localStorage — survive refresh and deployment
 * - No hardcoded DEFAULT_FIELDS — everything comes from the actual sheet
 */
export function usePageFields(storageKey: string) {
  const [fields, setFields] = useState<PageField[]>([]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const saved = localStorage.getItem(fieldsKey(storageKey));
      if (saved) setFields(JSON.parse(saved));
    } catch { /* ignore */ }
  }, [storageKey]);

  const persist = useCallback((next: PageField[]) => {
    setFields(next);
    if (typeof window !== 'undefined') {
      const key = fieldsKey(storageKey);
      localStorage.setItem(key, JSON.stringify(next));
      // Push to shared namespace so all users get admin's field config
      sharedWrite(key, next);
    }
  }, [storageKey]);

  /**
   * Called whenever sheet headers are fetched (req 99 — dynamic detection).
   * Adds any new headers that aren't already tracked, as hidden by default.
   * Never removes existing user-configured fields.
   */
  const syncFromHeaders = useCallback((headers: string[]) => {
    setFields(prev => {
      const existing = new Set(prev.map(f => f.column));
      const newFields = headers
        .filter(h => h && !existing.has(h))
        .map((h, i) => ({
          id: genId(), label: h, column: h,
          visible: prev.length === 0 ? true : false,  // first sync: all visible; later: hidden by default
          order: prev.length + i,
        }));
      if (newFields.length === 0) return prev;
      const merged = [...prev, ...newFields];
      // Save to localStorage
      if (typeof window !== 'undefined') {
        const key = fieldsKey(storageKey);
        localStorage.setItem(key, JSON.stringify(merged));
        sharedWrite(key, merged);
      }
      return merged;
    });
  }, [storageKey]);

  const addField = useCallback((label: string, column: string) => {
    if (!label.trim() || !column.trim()) return;
    persist([...fields, { id: genId(), label: label.trim(), column: column.trim(), visible: true, order: fields.length }]);
  }, [fields, persist]);

  const removeField = useCallback((id: string) => {
    persist(fields.filter(f => f.id !== id));
  }, [fields, persist]);

  const toggleField = useCallback((id: string) => {
    persist(fields.map(f => f.id !== id ? f : { ...f, visible: !f.visible }));
  }, [fields, persist]);

  const renameField = useCallback((id: string, label: string) => {
    persist(fields.map(f => f.id !== id ? f : { ...f, label }));
  }, [fields, persist]);

  const moveField = useCallback((id: string, dir: 'up' | 'down') => {
    const sorted = [...fields].sort((a, b) => a.order - b.order);
    const idx = sorted.findIndex(f => f.id === id);
    if (idx < 0) return;
    const newIdx = dir === 'up' ? idx - 1 : idx + 1;
    if (newIdx < 0 || newIdx >= sorted.length) return;
    [sorted[idx], sorted[newIdx]] = [sorted[newIdx], sorted[idx]];
    persist(sorted.map((f, i) => ({ ...f, order: i })));
  }, [fields, persist]);

  const resetToDefaults = useCallback(() => {
    persist([]);
  }, [persist]);

  const visibleFields = fields
    .filter(f => f.visible)
    .sort((a, b) => a.order - b.order);

  return { fields, visibleFields, addField, removeField, toggleField, renameField, moveField, syncFromHeaders, resetToDefaults };
}
