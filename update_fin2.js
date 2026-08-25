require('dotenv').config({ path: '.env.local' });
const { kv } = require('@vercel/kv');

async function main() {
  const key = 'config:_shared_:rly_financial_v1';
  let stateStr = await kv.get(key);
  if (!stateStr) {
    console.error('No financial data found in KV!');
    return;
  }
  
  let state = typeof stateStr === 'string' ? JSON.parse(stateStr) : stateStr;

  // Find FY2026-27 DLI
  const fy = state.state.financialYears.find(y => y.yearString === '2026-27' && y.division === 'DLI');
  if (!fy) {
    console.error('No FY2026-27 DLI found!');
    return;
  }
  
  const fyId = fy.id;
  const month = 4; // July
  
  // NOTE: Revenue heads are:
  // rh-pass (Passenger)
  // rh-coach (Other Coaching)
  // rh-goods (Goods)
  // rh-sund (Sundry)
  // rh-parc (Parcel)
  // rh-misc (Misc)
  // rh-total
  
  const data = [
    { targetId: 'rh-pass', cy: 638.90, py: 609.96 },
    { targetId: 'rh-coach', cy: 56.75, py: 83.85 },
    { targetId: 'rh-goods', cy: 233.46, py: 224.71 },
    { targetId: 'rh-sund', cy: 48.78, py: 102.88 }
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

  await kv.set(key, JSON.stringify(state));
  console.log(`Updated Revenue Dashboard for DLI FY2026-27 Month 4`);
}

main().catch(console.error);
