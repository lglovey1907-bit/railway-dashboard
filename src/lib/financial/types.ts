// ─────────────────────────────────────────────────────────────────────────────
// Financial Performance Management — Type Definitions
// Indian Railway Financial Year: April (month 1) → March (month 12)
// ─────────────────────────────────────────────────────────────────────────────

export type FYMonth = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12;

export const FY_MONTHS: { id: FYMonth; label: string; short: string; calMonth: number }[] = [
  { id: 1,  label: 'April',     short: 'Apr', calMonth: 4  },
  { id: 2,  label: 'May',       short: 'May', calMonth: 5  },
  { id: 3,  label: 'June',      short: 'Jun', calMonth: 6  },
  { id: 4,  label: 'July',      short: 'Jul', calMonth: 7  },
  { id: 5,  label: 'August',    short: 'Aug', calMonth: 8  },
  { id: 6,  label: 'September', short: 'Sep', calMonth: 9  },
  { id: 7,  label: 'October',   short: 'Oct', calMonth: 10 },
  { id: 8,  label: 'November',  short: 'Nov', calMonth: 11 },
  { id: 9,  label: 'December',  short: 'Dec', calMonth: 12 },
  { id: 10, label: 'January',   short: 'Jan', calMonth: 1  },
  { id: 11, label: 'February',  short: 'Feb', calMonth: 2  },
  { id: 12, label: 'March',     short: 'Mar', calMonth: 3  },
];

/** Get the FY month (1-12) from today's date */
export function getCurrentFYMonth(): FYMonth {
  const m = new Date().getMonth() + 1; // 1-indexed calendar month
  // April(4)=1, May(5)=2 ... March(3)=12
  const fyMonth = m >= 4 ? m - 3 : m + 9;
  return Math.max(1, Math.min(12, fyMonth)) as FYMonth;
}

// ── Financial Year ────────────────────────────────────────────────────────────

export interface FinancialYear {
  id: string;
  label: string;        // "FY 2026-27"
  startYear: number;    // 2026
  endYear: number;      // 2027
  status: 'planned' | 'active' | 'closed';
  isCurrent: boolean;
  createdAt: string;
}

// ── Revenue Heads ─────────────────────────────────────────────────────────────

export interface RevenueHead {
  id: string;
  name: string;         // "Passenger Revenue"
  code: string;         // "PASS"
  order: number;
  isTotal: boolean;     // true → row is auto-calculated sum
  isActive: boolean;
  color: string;        // chart color hex
  description?: string;
}

// ── Monthly Records ───────────────────────────────────────────────────────────

export type TargetStatus = 'available' | 'pending' | 'revised' | 'na';
export type RecordStatus = 'draft' | 'submitted' | 'verified' | 'approved' | 'published';

export interface MonthlyRecord {
  id: string;
  fyId: string;
  month: FYMonth;
  revenueHeadId: string;
  budgetEstimate?: number;      // full-year BE in Cr (stored once on April record)
  target?: number;              // monthly target in Cr
  targetStatus: TargetStatus;
  actual?: number;              // in Cr
  previousYearActual?: number;  // in Cr (same month, previous FY)
  remarks?: string;
  updatedBy?: string;
  updatedAt?: string;
  approvedBy?: string;
  approvedAt?: string;
  status: RecordStatus;
  version: number;
}

// ── Audit Log ─────────────────────────────────────────────────────────────────

export interface AuditLog {
  id: string;
  recordId: string;
  fyId: string;
  month: FYMonth;
  revenueHeadId: string;
  field: string;
  previousValue: string;
  newValue: string;
  modifiedBy: string;
  modifiedAt: string;
  approvedBy?: string;
  approvalDate?: string;
  version: number;
}

// ── Computed View Types (not stored) ─────────────────────────────────────────

export interface CumulativeRow {
  revenueHead: RevenueHead;
  budgetEstimate: number | null;
  target: number | null;
  targetStatus: TargetStatus;
  /** index 0 = April (month 1) … index 11 = March (month 12); null if no data or future */
  monthlyActuals: (number | null)[];
  cumulativeCurrentYear: number | null;
  cumulativePreviousYear: number | null;
  variation: number | null;
  variationPct: number | null;
  achievementPct: number | null;
  isTotal: boolean;
}

export interface MonthlyTrendPoint {
  month: string;    // "Apr"
  actual: number | null;
  previousYear: number | null;
  target: number | null;
  cumulative: number | null;
}

export interface ContributionPoint {
  name: string;
  value: number;
  color: string;
}
