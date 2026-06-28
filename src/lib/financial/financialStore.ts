'use client';
// ─────────────────────────────────────────────────────────────────────────────
// Financial Performance Management — Zustand Store
// Persists under localStorage key: rly_financial_v1
// ─────────────────────────────────────────────────────────────────────────────

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type {
  FinancialYear, RevenueHead, MonthlyRecord, AuditLog,
  FYMonth, TargetStatus, RecordStatus,
} from './types';

// ── Seed Data ─────────────────────────────────────────────────────────────────

const SEED_FY: FinancialYear[] = [
  {
    id: 'fy-2223', label: 'FY 2022-23', startYear: 2022, endYear: 2023,
    status: 'closed', isCurrent: false, createdAt: '2022-04-01T00:00:00Z',
  },
  {
    id: 'fy-2324', label: 'FY 2023-24', startYear: 2023, endYear: 2024,
    status: 'closed', isCurrent: false, createdAt: '2023-04-01T00:00:00Z',
  },
  {
    id: 'fy-2425', label: 'FY 2024-25', startYear: 2024, endYear: 2025,
    status: 'closed', isCurrent: false, createdAt: '2024-04-01T00:00:00Z',
  },
  {
    id: 'fy-2526', label: 'FY 2025-26', startYear: 2025, endYear: 2026,
    status: 'closed', isCurrent: false, createdAt: '2025-04-01T00:00:00Z',
  },
  {
    id: 'fy-2627', label: 'FY 2026-27', startYear: 2026, endYear: 2027,
    status: 'active', isCurrent: true, createdAt: '2026-04-01T00:00:00Z',
  },
];

const SEED_HEADS: RevenueHead[] = [
  { id: 'rh-pass',  name: 'Passenger Revenue',    code: 'PASS',  order: 1, isTotal: false, isActive: true, color: '#3b82f6' },
  { id: 'rh-coach', name: 'Other Coaching Revenue', code: 'OCR',  order: 2, isTotal: false, isActive: true, color: '#8b5cf6' },
  { id: 'rh-goods', name: 'Goods Revenue',          code: 'GOODS', order: 3, isTotal: false, isActive: true, color: '#f59e0b' },
  { id: 'rh-sund',  name: 'Sundry Revenue',         code: 'SUND', order: 4, isTotal: false, isActive: true, color: '#06b6d4' },
  { id: 'rh-parc',  name: 'Parcel Revenue',         code: 'PARC', order: 5, isTotal: false, isActive: true, color: '#10b981' },
  { id: 'rh-misc',  name: 'Miscellaneous Revenue',  code: 'MISC', order: 6, isTotal: false, isActive: true, color: '#f97316' },
  { id: 'rh-total', name: 'Total Revenue',          code: 'TOTAL', order: 7, isTotal: true,  isActive: true, color: '#1e3a5f' },
];

// ── Helper to build a monthly record ─────────────────────────────────────────

let _idCounter = 1;
function mkId(prefix: string) { return `${prefix}-${_idCounter++}`; }

function rec(
  fyId: string, month: FYMonth, revenueHeadId: string,
  actual: number | undefined, prevYrActual: number | undefined,
  target: number | undefined, budgetEstimate: number | undefined,
  targetStatus: TargetStatus = 'available',
  status: RecordStatus = 'published',
): MonthlyRecord {
  return {
    id: mkId('mr'),
    fyId, month, revenueHeadId,
    budgetEstimate,
    target, targetStatus,
    actual, previousYearActual: prevYrActual,
    updatedBy: 'System', updatedAt: new Date().toISOString(),
    approvedBy: 'System', approvedAt: new Date().toISOString(),
    status, version: 1, remarks: '',
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// SEED RECORDS — FY 2026-27 (Current)  April=1, May=2, June=3
// Figures in Crore (₹ Cr)
// Budget Estimate stored on April record only
// ─────────────────────────────────────────────────────────────────────────────

const SEED_RECORDS: MonthlyRecord[] = [
  // ── PASSENGER REVENUE ──────────────────────────────────────────────────────
  // Month 1 = April 2026 | Budget 8640 Cr/yr
  rec('fy-2627', 1, 'rh-pass',  704.37, 635.49, 720.00, 8640.00),
  // Month 2 = May 2026
  rec('fy-2627', 2, 'rh-pass',  738.52, 672.18, 748.00, undefined),
  // Month 3 = June 2026
  rec('fy-2627', 3, 'rh-pass',  718.90, 658.32, 730.00, undefined),

  // ── OTHER COACHING REVENUE ─────────────────────────────────────────────────
  rec('fy-2627', 1, 'rh-coach',  54.21,  48.76,  56.00,  672.00),
  rec('fy-2627', 2, 'rh-coach',  57.83,  51.04,  58.00, undefined),
  rec('fy-2627', 3, 'rh-coach',  55.67,  49.88,  57.00, undefined),

  // ── GOODS REVENUE ─────────────────────────────────────────────────────────
  rec('fy-2627', 1, 'rh-goods', 1124.56,  988.32, 1150.00, 13800.00),
  rec('fy-2627', 2, 'rh-goods', 1187.43, 1042.67, 1195.00, undefined),
  rec('fy-2627', 3, 'rh-goods', 1156.28, 1015.44, 1170.00, undefined),

  // ── SUNDRY REVENUE ────────────────────────────────────────────────────────
  rec('fy-2627', 1, 'rh-sund',   38.94,   33.27,  40.00,  480.00),
  rec('fy-2627', 2, 'rh-sund',   41.72,   35.88,  42.00, undefined),
  rec('fy-2627', 3, 'rh-sund',   39.56,   34.41,  40.50, undefined),

  // ── PARCEL REVENUE ────────────────────────────────────────────────────────
  rec('fy-2627', 1, 'rh-parc',   68.43,   59.14,  70.00,  840.00),
  rec('fy-2627', 2, 'rh-parc',   72.18,   62.37,  72.50, undefined),
  rec('fy-2627', 3, 'rh-parc',   70.05,   60.88,  71.00, undefined),

  // ── MISCELLANEOUS REVENUE ─────────────────────────────────────────────────
  rec('fy-2627', 1, 'rh-misc',   24.87,   21.33,  25.00,  300.00),
  rec('fy-2627', 2, 'rh-misc',   26.44,   22.76,  26.50, undefined),
  rec('fy-2627', 3, 'rh-misc',   25.11,   22.08,  25.50, undefined),

  // ─────────────────────────────────────────────────────────────────────────
  // SEED RECORDS — FY 2025-26 (Previous Year — full year, closed)
  // April=1 … March=12
  // ─────────────────────────────────────────────────────────────────────────

  // PASSENGER REVENUE 2025-26
  rec('fy-2526', 1,  'rh-pass', 635.49, 589.44,  650.00, 7800.00),
  rec('fy-2526', 2,  'rh-pass', 672.18, 624.32,  680.00, undefined),
  rec('fy-2526', 3,  'rh-pass', 658.32, 610.77,  665.00, undefined),
  rec('fy-2526', 4,  'rh-pass', 688.44, 638.21,  695.00, undefined),
  rec('fy-2526', 5,  'rh-pass', 715.67, 660.18,  720.00, undefined),
  rec('fy-2526', 6,  'rh-pass', 692.33, 641.55,  700.00, undefined),
  rec('fy-2526', 7,  'rh-pass', 701.88, 651.44,  710.00, undefined),
  rec('fy-2526', 8,  'rh-pass', 725.42, 672.38,  730.00, undefined),
  rec('fy-2526', 9,  'rh-pass', 698.76, 648.22,  705.00, undefined),
  rec('fy-2526', 10, 'rh-pass', 681.54, 632.11,  688.00, undefined),
  rec('fy-2526', 11, 'rh-pass', 644.28, 597.44,  650.00, undefined),
  rec('fy-2526', 12, 'rh-pass', 666.77, 618.33,  672.00, undefined),

  // GOODS REVENUE 2025-26
  rec('fy-2526', 1,  'rh-goods',  988.32, 901.44, 1000.00, 12000.00),
  rec('fy-2526', 2,  'rh-goods', 1042.67, 949.88, 1050.00, undefined),
  rec('fy-2526', 3,  'rh-goods', 1015.44, 924.67, 1025.00, undefined),
  rec('fy-2526', 4,  'rh-goods', 1078.33, 981.22, 1085.00, undefined),
  rec('fy-2526', 5,  'rh-goods', 1124.56, 1023.44, 1130.00, undefined),
  rec('fy-2526', 6,  'rh-goods', 1088.77, 990.67, 1095.00, undefined),
  rec('fy-2526', 7,  'rh-goods', 1099.44, 1001.33, 1105.00, undefined),
  rec('fy-2526', 8,  'rh-goods', 1148.22, 1045.67, 1155.00, undefined),
  rec('fy-2526', 9,  'rh-goods', 1074.88, 978.44, 1080.00, undefined),
  rec('fy-2526', 10, 'rh-goods', 1033.67, 940.22, 1040.00, undefined),
  rec('fy-2526', 11, 'rh-goods',  974.33, 886.77, 980.00,  undefined),
  rec('fy-2526', 12, 'rh-goods', 1012.44, 921.67, 1018.00, undefined),

  // OTHER COACHING 2025-26
  rec('fy-2526', 1,  'rh-coach',  48.76,  44.22,  50.00, 600.00),
  rec('fy-2526', 2,  'rh-coach',  51.04,  46.38,  52.00, undefined),
  rec('fy-2526', 3,  'rh-coach',  49.88,  45.33,  51.00, undefined),
  rec('fy-2526', 4,  'rh-coach',  53.22,  48.44,  54.00, undefined),
  rec('fy-2526', 5,  'rh-coach',  55.67,  50.61,  56.50, undefined),
  rec('fy-2526', 6,  'rh-coach',  52.44,  47.67,  53.50, undefined),
  rec('fy-2526', 7,  'rh-coach',  54.11,  49.22,  55.00, undefined),
  rec('fy-2526', 8,  'rh-coach',  56.88,  51.72,  57.50, undefined),
  rec('fy-2526', 9,  'rh-coach',  51.33,  46.67,  52.00, undefined),
  rec('fy-2526', 10, 'rh-coach',  48.77,  44.33,  49.50, undefined),
  rec('fy-2526', 11, 'rh-coach',  46.22,  42.01,  47.00, undefined),
  rec('fy-2526', 12, 'rh-coach',  49.44,  44.98,  50.00, undefined),

  // SUNDRY 2025-26
  rec('fy-2526', 1,  'rh-sund',  33.27,  30.11,  34.00, 408.00),
  rec('fy-2526', 2,  'rh-sund',  35.88,  32.52,  36.50, undefined),
  rec('fy-2526', 3,  'rh-sund',  34.41,  31.22,  35.00, undefined),
  rec('fy-2526', 4,  'rh-sund',  37.22,  33.78,  38.00, undefined),
  rec('fy-2526', 5,  'rh-sund',  39.67,  36.01,  40.00, undefined),
  rec('fy-2526', 6,  'rh-sund',  37.88,  34.44,  38.50, undefined),
  rec('fy-2526', 7,  'rh-sund',  38.44,  34.94,  39.00, undefined),
  rec('fy-2526', 8,  'rh-sund',  40.22,  36.56,  41.00, undefined),
  rec('fy-2526', 9,  'rh-sund',  37.11,  33.74,  37.50, undefined),
  rec('fy-2526', 10, 'rh-sund',  34.88,  31.70,  35.50, undefined),
  rec('fy-2526', 11, 'rh-sund',  32.44,  29.49,  33.00, undefined),
  rec('fy-2526', 12, 'rh-sund',  34.77,  31.61,  35.00, undefined),

  // PARCEL 2025-26
  rec('fy-2526', 1,  'rh-parc',  59.14,  53.21,  60.00, 720.00),
  rec('fy-2526', 2,  'rh-parc',  62.37,  56.14,  63.00, undefined),
  rec('fy-2526', 3,  'rh-parc',  60.88,  54.79,  62.00, undefined),
  rec('fy-2526', 4,  'rh-parc',  64.77,  58.29,  65.50, undefined),
  rec('fy-2526', 5,  'rh-parc',  67.44,  60.70,  68.00, undefined),
  rec('fy-2526', 6,  'rh-parc',  65.22,  58.70,  66.00, undefined),
  rec('fy-2526', 7,  'rh-parc',  66.11,  59.50,  67.00, undefined),
  rec('fy-2526', 8,  'rh-parc',  69.33,  62.40,  70.00, undefined),
  rec('fy-2526', 9,  'rh-parc',  64.44,  58.00,  65.00, undefined),
  rec('fy-2526', 10, 'rh-parc',  61.22,  55.10,  62.00, undefined),
  rec('fy-2526', 11, 'rh-parc',  57.88,  52.09,  58.50, undefined),
  rec('fy-2526', 12, 'rh-parc',  60.77,  54.69,  61.50, undefined),

  // MISC 2025-26
  rec('fy-2526', 1,  'rh-misc',  21.33,  19.22,  22.00, 264.00),
  rec('fy-2526', 2,  'rh-misc',  22.76,  20.48,  23.00, undefined),
  rec('fy-2526', 3,  'rh-misc',  22.08,  19.87,  22.50, undefined),
  rec('fy-2526', 4,  'rh-misc',  23.88,  21.49,  24.00, undefined),
  rec('fy-2526', 5,  'rh-misc',  25.11,  22.60,  25.50, undefined),
  rec('fy-2526', 6,  'rh-misc',  24.22,  21.80,  24.50, undefined),
  rec('fy-2526', 7,  'rh-misc',  24.67,  22.20,  25.00, undefined),
  rec('fy-2526', 8,  'rh-misc',  26.11,  23.50,  26.50, undefined),
  rec('fy-2526', 9,  'rh-misc',  23.44,  21.10,  24.00, undefined),
  rec('fy-2526', 10, 'rh-misc',  22.11,  19.90,  22.50, undefined),
  rec('fy-2526', 11, 'rh-misc',  20.88,  18.79,  21.00, undefined),
  rec('fy-2526', 12, 'rh-misc',  22.33,  20.10,  22.50, undefined),
];

// ── Store Interface ───────────────────────────────────────────────────────────

export interface FinancialState {
  financialYears: FinancialYear[];
  revenueHeads: RevenueHead[];
  monthlyRecords: MonthlyRecord[];
  auditLogs: AuditLog[];

  // ── Financial Year actions ────────────────────────────────────────────────
  setCurrentFY: (fyId: string) => void;
  addFinancialYear: (fy: Omit<FinancialYear, 'id' | 'createdAt'>) => string;
  updateFinancialYear: (fyId: string, patch: Partial<FinancialYear>) => void;

  // ── Revenue Head actions ──────────────────────────────────────────────────
  addRevenueHead: (rh: Omit<RevenueHead, 'id'>) => string;
  updateRevenueHead: (rhId: string, patch: Partial<RevenueHead>) => void;
  removeRevenueHead: (rhId: string) => void;

  // ── Monthly Record actions ────────────────────────────────────────────────
  upsertRecord: (
    r: Pick<MonthlyRecord, 'fyId' | 'month' | 'revenueHeadId'> & Partial<MonthlyRecord>,
    updatedBy: string,
  ) => void;
  submitRecord:  (id: string, by: string) => void;
  verifyRecord:  (id: string, by: string) => void;
  approveRecord: (id: string, by: string) => void;
  publishRecord: (id: string, by: string) => void;
  rejectRecord:  (id: string, by: string, reason: string) => void;

  // ── Query helpers ─────────────────────────────────────────────────────────
  getCurrentFY: () => FinancialYear | undefined;
  getRecord: (fyId: string, month: FYMonth, rhId: string) => MonthlyRecord | undefined;
  getPublishedRecords: (fyId: string) => MonthlyRecord[];
  getAllRecords: (fyId: string) => MonthlyRecord[];

  // ── Reset to seed (dev only) ──────────────────────────────────────────────
  resetToSeed: () => void;
}

// ── Store ─────────────────────────────────────────────────────────────────────

export const useFinancialStore = create<FinancialState>()(
  persist(
    (set, get) => ({
      financialYears: SEED_FY,
      revenueHeads:   SEED_HEADS,
      monthlyRecords: SEED_RECORDS,
      auditLogs:      [],

      // ── Financial Year ──────────────────────────────────────────────────────
      setCurrentFY: (fyId) =>
        set(s => ({
          financialYears: s.financialYears.map(fy => ({
            ...fy,
            isCurrent: fy.id === fyId,
            status: fy.id === fyId ? 'active' as const : fy.status,
          })),
        })),

      addFinancialYear: (fy) => {
        const id = `fy-${Date.now()}`;
        set(s => ({
          financialYears: [...s.financialYears, {
            ...fy, id, createdAt: new Date().toISOString(),
          }],
        }));
        return id;
      },

      updateFinancialYear: (fyId, patch) =>
        set(s => ({
          financialYears: s.financialYears.map(fy =>
            fy.id === fyId ? { ...fy, ...patch } : fy,
          ),
        })),

      // ── Revenue Heads ───────────────────────────────────────────────────────
      addRevenueHead: (rh) => {
        const id = `rh-${Date.now()}`;
        set(s => ({ revenueHeads: [...s.revenueHeads, { ...rh, id }] }));
        return id;
      },

      updateRevenueHead: (rhId, patch) =>
        set(s => ({
          revenueHeads: s.revenueHeads.map(h => h.id === rhId ? { ...h, ...patch } : h),
        })),

      removeRevenueHead: (rhId) =>
        set(s => ({
          revenueHeads: s.revenueHeads.map(h =>
            h.id === rhId ? { ...h, isActive: false } : h,
          ),
        })),

      // ── Monthly Records ─────────────────────────────────────────────────────
      upsertRecord: (r, updatedBy) => {
        set(s => {
          const existing = s.monthlyRecords.find(
            x => x.fyId === r.fyId && x.month === r.month && x.revenueHeadId === r.revenueHeadId,
          );

          // Build audit entries for changed fields
          const auditEntries: AuditLog[] = [];
          if (existing) {
            const trackedFields: (keyof MonthlyRecord)[] = [
              'actual', 'previousYearActual', 'target', 'budgetEstimate', 'remarks', 'targetStatus',
            ];
            trackedFields.forEach(field => {
              const prev = String(existing[field] ?? '');
              const next = String((r as any)[field] ?? existing[field] ?? '');
              if (prev !== next) {
                auditEntries.push({
                  id: `al-${Date.now()}-${field}`,
                  recordId: existing.id,
                  fyId: r.fyId, month: r.month, revenueHeadId: r.revenueHeadId,
                  field, previousValue: prev, newValue: next,
                  modifiedBy: updatedBy, modifiedAt: new Date().toISOString(),
                  version: (existing.version ?? 1) + 1,
                });
              }
            });
          }

          const nowIso = new Date().toISOString();
          if (existing) {
            return {
              monthlyRecords: s.monthlyRecords.map(x =>
                x.fyId === r.fyId && x.month === r.month && x.revenueHeadId === r.revenueHeadId
                  ? { ...x, ...r, updatedBy, updatedAt: nowIso, version: (x.version ?? 1) + 1, status: 'draft' as const }
                  : x,
              ),
              auditLogs: [...s.auditLogs, ...auditEntries],
            };
          } else {
            const newRec: MonthlyRecord = {
              id: `mr-${Date.now()}`, version: 1, status: 'draft',
              targetStatus: 'available', updatedBy, updatedAt: nowIso,
              ...r,
            } as MonthlyRecord;
            return {
              monthlyRecords: [...s.monthlyRecords, newRec],
              auditLogs: s.auditLogs,
            };
          }
        });
      },

      submitRecord: (id, by) =>
        set(s => ({
          monthlyRecords: s.monthlyRecords.map(r =>
            r.id === id ? { ...r, status: 'submitted' as const, updatedBy: by, updatedAt: new Date().toISOString() } : r,
          ),
        })),

      verifyRecord: (id, by) =>
        set(s => ({
          monthlyRecords: s.monthlyRecords.map(r =>
            r.id === id ? { ...r, status: 'verified' as const, updatedBy: by, updatedAt: new Date().toISOString() } : r,
          ),
        })),

      approveRecord: (id, by) =>
        set(s => ({
          monthlyRecords: s.monthlyRecords.map(r =>
            r.id === id ? { ...r, status: 'approved' as const, approvedBy: by, approvedAt: new Date().toISOString() } : r,
          ),
        })),

      publishRecord: (id, by) =>
        set(s => ({
          monthlyRecords: s.monthlyRecords.map(r =>
            r.id === id ? { ...r, status: 'published' as const, approvedBy: by, approvedAt: new Date().toISOString() } : r,
          ),
        })),

      rejectRecord: (id, by, reason) =>
        set(s => ({
          monthlyRecords: s.monthlyRecords.map(r =>
            r.id === id ? { ...r, status: 'draft' as const, remarks: reason, updatedBy: by, updatedAt: new Date().toISOString() } : r,
          ),
        })),

      // ── Queries ─────────────────────────────────────────────────────────────
      getCurrentFY: () => get().financialYears.find(fy => fy.isCurrent),

      getRecord: (fyId, month, rhId) =>
        get().monthlyRecords.find(
          r => r.fyId === fyId && r.month === month && r.revenueHeadId === rhId,
        ),

      getPublishedRecords: (fyId) =>
        get().monthlyRecords.filter(
          r => r.fyId === fyId && (r.status === 'published' || r.status === 'approved'),
        ),

      getAllRecords: (fyId) =>
        get().monthlyRecords.filter(r => r.fyId === fyId),

      resetToSeed: () =>
        set({ financialYears: SEED_FY, revenueHeads: SEED_HEADS, monthlyRecords: SEED_RECORDS, auditLogs: [] }),
    }),
    { name: 'rly_financial_v1' },
  ),
);
