require('dotenv').config({ path: '.env.local' });
const { kv } = require('@vercel/kv');

async function main() {
  const key = 'rly_financial_data';
  let state = await kv.get(key);
  if (!state) {
    console.error('No financial data found in KV!');
    return;
  }

  // Find FY2026-27 DLI
  const fy = state.state.financialYears.find(y => y.yearString === '2026-27' && y.division === 'DLI');
  if (!fy) {
    console.error('No FY2026-27 DLI found!');
    return;
  }
  
  const fyId = fy.id;
  const month = 4; // July
  
  const data = [
    { targetId: 'pass', cy: 638.90, py: 609.96 },
    { targetId: 'other_coaching', cy: 56.75, py: 83.85 },
    { targetId: 'goods', cy: 233.46, py: 224.71 },
    { targetId: 'sundry', cy: 48.78, py: 102.88 }
  ];

  for (const d of data) {
    let rec = state.state.monthlyRecords.find(r => r.fyId === fyId && r.month === month && r.revenueHeadId === d.targetId);
    if (rec) {
      rec.actual = d.cy;
      rec.previousYearActual = d.py;
      rec.status = 'published';
    } else {
      state.state.monthlyRecords.push({
        id: `rec-${fyId}-${month}-${d.targetId}`,
        fyId,
        month,
        revenueHeadId: d.targetId,
        targetStatus: 'available',
        status: 'published',
        actual: d.cy,
        previousYearActual: d.py,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
    }
  }

  await kv.set(key, state);
  console.log(`Updated Revenue Dashboard for DLI FY2026-27 Month 4`);
}

main().catch(console.error);
