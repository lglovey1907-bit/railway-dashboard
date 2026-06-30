// /api/monthly – Monthly Comparative Statement persistence via Vercel KV
// GET  ?division=DELHI&fyYear=2026            → returns YearlyReport (or empty skeleton)
// POST { division, fyYear, month, entry, annualTargets? } → upserts month entry
// POST { division, fyYear, customHead }        → adds a custom head to the report

import { NextRequest, NextResponse } from 'next/server';
import { kv } from '@vercel/kv';
import type {
  YearlyReport, MonthIndex, MonthEntry, AnnualTarget, CustomHead,
} from '@/lib/monthly/types';
import { REPORT_HEADS } from '@/lib/monthly/types';

function kvKey(division: string, fyYear: number) {
  return `rly_monthly:${division.toUpperCase()}:${fyYear}`;
}

function emptyReport(division: string, fyYear: number): YearlyReport {
  return { division: division.toUpperCase(), fyYear, months: {}, annualTargets: {}, customHeads: [] };
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const division = searchParams.get('division') || 'DELHI';
  const fyYear = parseInt(searchParams.get('fyYear') || '2026', 10);

  try {
    const data = await kv.get<YearlyReport>(kvKey(division, fyYear));
    return NextResponse.json(data ?? emptyReport(division, fyYear));
  } catch (err) {
    console.error('[monthly GET]', err);
    return NextResponse.json(emptyReport(division, fyYear));
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      division,
      fyYear,
      month,
      entry,
      annualTargets,
      customHead,
    }: {
      division: string;
      fyYear: number;
      month?: MonthIndex;
      entry?: MonthEntry;
      annualTargets?: Record<string, AnnualTarget>;
      customHead?: CustomHead;
    } = body;

    if (!division || !fyYear) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const key = kvKey(division, fyYear);
    const existing = (await kv.get<YearlyReport>(key)) ?? emptyReport(division, fyYear);

    // ── Add custom head ────────────────────────────────────────────────────
    if (customHead) {
      const heads = existing.customHeads ?? [];
      // Avoid duplicate IDs
      if (!heads.find(h => h.id === customHead.id)) {
        heads.push(customHead);
        existing.customHeads = heads;
      }
      await kv.set(key, existing);
      return NextResponse.json({ ok: true, report: existing });
    }

    // ── Upsert month entry ─────────────────────────────────────────────────
    if (!month || !entry) {
      return NextResponse.json({ error: 'Missing month/entry' }, { status: 400 });
    }

    // Auto-compute Total Revenue CY and PY from the four component heads
    const revenueHeads = [
      'passenger_revenue', 'other_coaching_revenue', 'goods_revenue', 'sundry_revenue',
    ];
    const total = REPORT_HEADS.find(h => h.id === 'total_revenue');
    if (total) {
      let cyCum = 0, pyCum = 0, cyOk = true, pyOk = true;
      for (const rh of revenueHeads) {
        const cy = entry.heads[rh]?.cy;
        const py = entry.heads[rh]?.py;
        if (cy === null || cy === undefined) cyOk = false; else cyCum += cy;
        if (py === null || py === undefined) pyOk = false; else pyCum += py;
      }
      entry.heads['total_revenue'] = {
        cy: cyOk ? +cyCum.toFixed(2) : null,
        py: pyOk ? +pyCum.toFixed(2) : null,
      };
    }

    existing.months[month] = entry;
    if (annualTargets) {
      existing.annualTargets = { ...(existing.annualTargets ?? {}), ...annualTargets };
    }

    await kv.set(key, existing);
    return NextResponse.json({ ok: true, report: existing });
  } catch (err) {
    console.error('[monthly POST]', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
