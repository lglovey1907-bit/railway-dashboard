require('dotenv').config({ path: '.env.local' });
const { kv } = require('@vercel/kv');

async function main() {
  const key = 'user:_shared_:config:financial_v1';
  let stateStr = await kv.get(key);
  let state = typeof stateStr === 'string' ? JSON.parse(stateStr) : stateStr;

  if (state && state.financialYears) {
    const fy = state.financialYears.find(y => y.yearString === '2026-27' && y.division === 'DLI');
    console.log("Found FY:", fy ? fy.id : 'No');
    
    if (fy) {
      const month = 4; // July
      const data = [
        { targetId: 'rh-pass', cy: 638.90, py: 609.96 },
        { targetId: 'rh-coach', cy: 56.75, py: 83.85 },
        { targetId: 'rh-goods', cy: 233.46, py: 224.71 },
        { targetId: 'rh-sund', cy: 48.78, py: 102.88 }
      ];

      for (const d of data) {
        let rec = state.monthlyRecords.find(r => r.fyId === fy.id && r.month === month && r.revenueHeadId === d.targetId);
        if (rec) {
          rec.actual = d.cy;
          rec.previousYearActual = d.py;
          rec.status = 'published';
        } else {
          state.monthlyRecords.push({
            id: `rec-${fy.id}-${month}-${d.targetId}`,
            fyId: fy.id,
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
      console.log(`Updated Revenue Dashboard for DLI FY2026-27 Month 4 in financial_v1`);
    }
  } else {
    console.log("Still no state found");
  }
}

main().catch(console.error);
