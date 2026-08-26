// ─────────────────────────────────────────────────────────────────────────────
// Financial Performance — Pure Calculation Engine
// ─────────────────────────────────────────────────────────────────────────────

import type {
  MonthlyRecord, RevenueHead, CumulativeRow, FYMonth,
  MonthlyTrendPoint, ContributionPoint, TargetStatus,
} from './types';
import { FY_MONTHS } from './types';

// ── Record lookup helpers ─────────────────────────────────────────────────────

export function getRecord(
  records: MonthlyRecord[],
  fyId: string,
  month: FYMonth,
  revenueHeadId: string,
): MonthlyRecord | undefined {
  return records.find(
    r => r.fyId === fyId && r.month === month && r.revenueHeadId === revenueHeadId,
  );
}

export function getPublishedRecords(records: MonthlyRecord[]): MonthlyRecord[] {
  return records.filter(r => r.status === 'published' || r.status === 'approved');
}

// ── Cumulative aggregation ────────────────────────────────────────────────────

export function computeCumulative(
  records: MonthlyRecord[],
  fyId: string,
  upToMonth: FYMonth,
  revenueHeadId: string,
  field: 'actual' | 'previousYearActual' | 'target',
): number | null {
  let total = 0;
  let hasAny = false;
  for (let m = 1; m <= upToMonth; m++) {
    const rec = getRecord(records, fyId, m as FYMonth, revenueHeadId);
    const val = rec?.[field];
    if (val !== undefined && val !== null) {
      total += val;
      hasAny = true;
    }
  }
  return hasAny ? total : null;
}

// ── Aggregated sum across revenue heads (for Total row) ──────────────────────

function sumNullable(vals: (number | null)[]): number | null {
  const defined = vals.filter((v): v is number => v !== null);
  return defined.length > 0 ? defined.reduce((a, b) => a + b, 0) : null;
}

// ── Build the full executive table ───────────────────────────────────────────

export function buildCumulativeRows(
  records: MonthlyRecord[],
  revenueHeads: RevenueHead[],
  fyId: string,
  upToMonth: FYMonth,
): CumulativeRow[] {
  const activeHeads = revenueHeads.filter(h => h.isActive).sort((a, b) => a.order - b.order);
  const nonTotalHeads = activeHeads.filter(h => !h.isTotal);

  const nonTotalRows: CumulativeRow[] = nonTotalHeads.map(rh => {
    const monthlyActuals: (number | null)[] = FY_MONTHS.map(({ id }) => {
      if (id > upToMonth) return null;
      const rec = getRecord(records, fyId, id, rh.id);
      return rec?.actual ?? null;
    });


    // Advanced Layout calculations
    // We need fyId (e.g. fy-2627). We can parse it to find previous FYs.
    // Actually, we can just look up the previous year actuals for the whole year.
    // wait, prevYearActual stores the same month's previous year data. So summing all 12 months' prevYearActual gives us actualsPrevYear!
    // And for actualsPrevPrevYear, we'd need to look at fyId-1's prevYearActual, or fyId-2's actual.
    const curRec = getRecord(records, fyId, upToMonth, rh.id);

    let actualsPrevPrevYear = curRec?.actualsPrevPrevYear ?? 0;
    let actualsPrevYear = curRec?.actualsPrevYear ?? 0;
    
    if (!curRec?.actualsPrevYear && curRec?.actualsPrevYear !== 0) {
      let hasPY = false;
      for (let m = 1; m <= 12; m++) {
        const r = getRecord(records, fyId, m as FYMonth, rh.id);
        if (r?.previousYearActual != null) { actualsPrevYear += r.previousYearActual; hasPY = true; }
      }
      if (!hasPY) actualsPrevYear = 0;
    }
    
    const currentMonthCY = curRec?.actual ?? null;
    const currentMonthPY = curRec?.currentMonthPY ?? curRec?.previousYearActual ?? null;
    const currentMonthVarPct = currentMonthCY !== null && currentMonthPY !== null && currentMonthPY !== 0 
      ? ((currentMonthCY - currentMonthPY) / currentMonthPY) * 100 : null;

    const aprRec = getRecord(records, fyId, 1, rh.id);
    const targetMonth = curRec?.targetMonth ?? curRec?.target ?? null;
    let targetUpto = curRec?.targetUpto ?? null;
    if (targetUpto === null) targetUpto = computeCumulative(records, fyId, upToMonth, rh.id, 'target');
    let targetYearly = curRec?.targetYearly ?? null;
    if (targetYearly === null) targetYearly = aprRec?.budgetEstimate ?? computeCumulative(records, fyId, 12, rh.id, 'target');

    const cCurrent = computeCumulative(records, fyId, upToMonth, rh.id, 'actual');
    const cPrev    = computeCumulative(records, fyId, upToMonth, rh.id, 'previousYearActual');
    const target   = computeCumulative(records, fyId, upToMonth, rh.id, 'target');

    // Budget Estimate stored on April (month 1) record
    const budget = aprRec?.budgetEstimate ?? null;

    // Determine target status from the most recent record
    const latestRec = records
      .filter(r => r.fyId === fyId && r.revenueHeadId === rh.id && r.month <= upToMonth)
      .sort((a, b) => b.month - a.month)[0];
    const targetStatus: TargetStatus = latestRec?.targetStatus ?? 'pending';

    const variation    = cCurrent !== null && cPrev !== null ? cCurrent - cPrev : null;
    const variationPct = variation !== null && cPrev !== null && cPrev !== 0
      ? (variation / cPrev) * 100 : null;
    const achievementPct = cCurrent !== null && target !== null && target !== 0
      ? (cCurrent / target) * 100 : null;

    return {
      revenueHead: rh,
      budgetEstimate: budget,
      target: targetStatus === 'available' || targetStatus === 'revised' ? target : null,
      targetStatus,
      monthlyActuals,
      cumulativeCurrentYear: cCurrent,
      cumulativePreviousYear: cPrev,
      variation,
      variationPct,
      achievementPct,
      isTotal: false,
      actualsPrevYear,
      actualsPrevPrevYear,
      targetMonth,
      targetUpto,
      targetYearly,
      currentMonthCY,
      currentMonthPY,
      currentMonthVarPct,
    };
  });

  // Total row: auto-sum of non-total heads
  const totalHeads = activeHeads.filter(h => h.isTotal);

  const totalRows: CumulativeRow[] = totalHeads.map(rh => {
    // If it's a subtotal, sum only its siblings (same parentId)
    const isSubTotal = !!rh.isSubTotalFor;
    const targetRows = nonTotalRows.filter(r => 
      isSubTotal ? r.revenueHead.parentId === rh.isSubTotalFor : !r.revenueHead.excludeFromGrandTotal && !r.revenueHead.isHeader
    );

    const monthlyActuals: (number | null)[] = FY_MONTHS.map((_, i) => {
      if (i + 1 > upToMonth) return null;
      return sumNullable(targetRows.map(r => r.monthlyActuals[i]));
    });


    const actualsPrevYear = sumNullable(targetRows.map(r => r.actualsPrevYear ?? null));
    const actualsPrevPrevYear = sumNullable(targetRows.map(r => r.actualsPrevPrevYear ?? null));
    const targetMonth = sumNullable(targetRows.map(r => r.targetMonth ?? null));
    const targetUpto = sumNullable(targetRows.map(r => r.targetUpto ?? null));
    const targetYearly = sumNullable(targetRows.map(r => r.targetYearly ?? null));
    const currentMonthCY = sumNullable(targetRows.map(r => r.currentMonthCY ?? null));
    const currentMonthPY = sumNullable(targetRows.map(r => r.currentMonthPY ?? null));
    
    let currentMonthVarPct: number | null = null;
    if (currentMonthCY !== null && currentMonthPY !== null && currentMonthPY !== 0) {
      currentMonthVarPct = ((currentMonthCY - currentMonthPY) / currentMonthPY) * 100;
    }

    const cCurrent = sumNullable(targetRows.map(r => r.cumulativeCurrentYear));
    const cPrev    = sumNullable(targetRows.map(r => r.cumulativePreviousYear));
    const target   = sumNullable(targetRows.map(r => r.target));
    const budget   = sumNullable(targetRows.map(r => r.budgetEstimate));

    const variation    = cCurrent !== null && cPrev !== null ? cCurrent - cPrev : null;
    const variationPct = variation !== null && cPrev !== null && cPrev !== 0
      ? (variation / cPrev) * 100 : null;
    const achievementPct = cCurrent !== null && target !== null && target !== 0
      ? (cCurrent / target) * 100 : null;

    return {
      revenueHead: rh,
      budgetEstimate: budget,
      target,
      targetStatus: 'available',
      monthlyActuals,
      cumulativeCurrentYear: cCurrent,
      cumulativePreviousYear: cPrev,
      variation,
      variationPct,
      achievementPct,
      isTotal: true,
      actualsPrevYear,
      actualsPrevPrevYear,
      targetMonth,
      targetUpto,
      targetYearly,
      currentMonthCY,
      currentMonthPY,
      currentMonthVarPct,
    };
  });

  return [...nonTotalRows, ...totalRows];
}

// ── Monthly trend for charts ──────────────────────────────────────────────────

export function buildMonthlyTrend(
  records: MonthlyRecord[],
  fyId: string,
  revenueHeadId: string,
  upToMonth: FYMonth,
): MonthlyTrendPoint[] {
  let cumulative = 0;
  return FY_MONTHS.slice(0, upToMonth).map(({ id, short }) => {
    const rec = getRecord(records, fyId, id, revenueHeadId);
    const actual = rec?.actual ?? null;
    if (actual !== null) cumulative += actual;
    return {
      month: short,
      actual,
      previousYear: rec?.previousYearActual ?? null,
      target: rec?.target ?? null,
      cumulative: actual !== null ? cumulative : null,
    };
  });
}

// ── Contribution pie data ─────────────────────────────────────────────────────

export function buildContributionData(rows: CumulativeRow[]): ContributionPoint[] {
  return rows
    .filter(r => !r.isTotal && r.cumulativeCurrentYear !== null && (r.cumulativeCurrentYear ?? 0) > 0)
    .map(r => ({
      name: r.revenueHead.name.replace(' Revenue', ''),
      value: r.cumulativeCurrentYear!,
      color: r.revenueHead.color,
    }));
}

// ── Formatters ────────────────────────────────────────────────────────────────

export function formatCr(val: number | null | undefined, decimals = 2): string {
  if (val === null || val === undefined) return '—';
  return val.toLocaleString('en-IN', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

export function formatPct(val: number | null | undefined, decimals = 2): string {
  if (val === null || val === undefined) return '—';
  const sign = val > 0 ? '+' : '';
  return sign + val.toFixed(decimals) + '%';
}

export function formatAchPct(val: number | null | undefined): string {
  if (val === null || val === undefined) return '—';
  return val.toFixed(1) + '%';
}

// ── Colour coding for executive display ──────────────────────────────────────

/** Returns Tailwind text-color class based on achievement vs target / vs prev year */
export function getAchColour(achPct: number | null): string {
  if (achPct === null) return 'text-slate-500';
  if (achPct >= 100) return 'text-emerald-600';
  if (achPct >= 95)  return 'text-amber-600';
  return 'text-red-600';
}

export function getVariationColour(variation: number | null): string {
  if (variation === null) return 'text-slate-400';
  if (variation > 0)  return 'text-emerald-600';
  if (variation < 0)  return 'text-red-500';
  return 'text-slate-500';
}

export function getVariationBg(variation: number | null, achPct: number | null): string {
  if (variation === null) return 'bg-slate-50';
  if (achPct !== null) {
    if (achPct >= 100) return 'bg-emerald-50';
    if (achPct >= 95)  return 'bg-amber-50';
    return 'bg-red-50';
  }
  if (variation > 0)  return 'bg-emerald-50';
  if (variation < 0)  return 'bg-red-50';
  return 'bg-slate-50';
}

export function getArrow(val: number | null): string {
  if (val === null) return '';
  return val > 0 ? '▲' : val < 0 ? '▼' : '—';
}
