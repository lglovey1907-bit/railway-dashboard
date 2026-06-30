// Monthly Comparative Statement – Types
// Indian Railways Financial Year: April (month 1) → March (month 12)
// FY stored as start year, e.g. 2026 means FY 2026-27

export const MONTH_NAMES = [
  'April', 'May', 'June', 'July', 'August', 'September',
  'October', 'November', 'December', 'January', 'February', 'March',
] as const;

export type MonthIndex = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12;

// The heads that appear in the statement (order matters for display)
export const REPORT_HEADS = [
  { id: 'passenger_revenue',       label: 'Passenger Revenue',        unit: 'Cr',   isTotal: false },
  { id: 'other_coaching_revenue',  label: 'Other Coaching Revenue',   unit: 'Cr',   isTotal: false },
  { id: 'goods_revenue',           label: 'Goods Revenue',            unit: 'Cr',   isTotal: false },
  { id: 'sundry_revenue',          label: 'Sundry Revenue',           unit: 'Cr',   isTotal: false },
  { id: 'total_revenue',           label: 'Total Revenue',            unit: 'Cr',   isTotal: true  },
  { id: 'passengers_booked',       label: 'No. of Passengers Booked', unit: 'Lakh', isTotal: false },
  { id: 'ticket_checking_revenue', label: 'Ticket Checking Revenue',  unit: 'Cr',   isTotal: false },
  { id: 'commercial_publicity',    label: 'Commercial Publicity',     unit: 'Cr',   isTotal: false },
  { id: 'atm_revenue',             label: 'ATM Revenue',              unit: 'Cr',   isTotal: false },
] as const;

export type ReportHeadId = (typeof REPORT_HEADS)[number]['id'];

/** A custom (admin-added) revenue head */
export interface CustomHead {
  id: string;
  label: string;
  unit: 'Cr' | 'Lakh';
  order: number;
}

/** Values stored per head per month */
export interface HeadValues {
  cy: number | null;  // Current Year actual
  py: number | null;  // Previous Year actual (same month)
  // variation (cy - py) and %age are computed, never stored
}

/** Cumulative target for a head for the full FY */
export interface AnnualTarget {
  target: number | null;
}

/** Full data record for one month */
export interface MonthEntry {
  month: MonthIndex;
  heads: Record<string, HeadValues>;
  enteredAt?: string;  // ISO timestamp
  enteredBy?: string;  // user email
}

/** All data for one financial year */
export interface YearlyReport {
  division: string;
  fyYear: number;  // start year, e.g. 2026 means FY 2026-27
  months: Partial<Record<MonthIndex, MonthEntry>>;
  annualTargets?: Record<string, AnnualTarget>;
  customHeads?: CustomHead[];
}

// ── Helper functions ────────────────────────────────────────────────────────

/** Returns the FY start year for a given calendar date */
export function getFyYear(date: Date = new Date()): number {
  const m = date.getMonth() + 1;
  const y = date.getFullYear();
  return m >= 4 ? y : y - 1;
}

/** Returns the current month index within the FY (April=1 ... March=12) */
export function getCurrentMonthIndex(date: Date = new Date()): MonthIndex {
  const m = date.getMonth() + 1;
  return ((m - 4 + 12) % 12 + 1) as MonthIndex;
}

/** FY display string, e.g. 2026 → "2026-27" */
export function fyLabel(fyYear: number): string {
  return `${fyYear}-${String(fyYear + 1).slice(-2)}`;
}

/** Month short label, e.g. (2026, 1) → "Apr'26" */
export function monthShortLabel(fyYear: number, monthIdx: MonthIndex): string {
  const name = MONTH_NAMES[monthIdx - 1];
  const calYear = monthIdx >= 10 ? fyYear + 1 : fyYear;
  return `${name.slice(0, 3)}'${String(calYear).slice(-2)}`;
}

/** Compute variation and %age (null-safe) */
export function computeVariation(cy: number | null, py: number | null) {
  if (cy === null || py === null) return { variation: null, pctAge: null };
  const variation = +(cy - py).toFixed(2);
  const pctAge = py !== 0 ? +((variation / py) * 100).toFixed(1) : null;
  return { variation, pctAge };
}

/** Compute cumulative value for a head up to a given month */
export function computeCumulativeForHead(
  months: Partial<Record<MonthIndex, MonthEntry>>,
  headId: string,
  upToMonth: MonthIndex,
  field: 'cy' | 'py',
): number | null {
  // total_revenue is computed from 4 component heads
  if (headId === 'total_revenue') {
    const revenueHeads = [
      'passenger_revenue', 'other_coaching_revenue', 'goods_revenue', 'sundry_revenue',
    ];
    let total = 0;
    let hasAny = false;
    for (const rh of revenueHeads) {
      const v = computeCumulativeForHead(months, rh, upToMonth, field);
      if (v !== null) { total += v; hasAny = true; }
    }
    return hasAny ? +total.toFixed(2) : null;
  }

  let sum = 0;
  let hasAny = false;
  for (let m = 1; m <= upToMonth; m++) {
    const entry = months[m as MonthIndex];
    if (!entry) continue;
    const v = entry.heads[headId]?.[field];
    if (v !== null && v !== undefined) { sum += v; hasAny = true; }
  }
  return hasAny ? +sum.toFixed(2) : null;
}
