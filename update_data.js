require('dotenv').config({ path: '.env.local' });
const { kv } = require('@vercel/kv');

async function main() {
  const fyYear = 2026;
  const division = 'DLI';
  const month = 4; // July
  
  const key = `monthly:${division}:${fyYear}`;
  let report = await kv.get(key);
  if (!report) {
    report = {
      division,
      fyYear,
      months: {},
      annualTargets: {},
      customHeads: [],
      dataSources: []
    };
  }

  if (!report.months) report.months = {};
  if (!report.months[month]) report.months[month] = { month, heads: {} };

  report.months[month].heads['pass'] = { cy: 638.90, py: 609.96 };
  report.months[month].heads['oc'] = { cy: 56.75, py: 83.85 };
  report.months[month].heads['goods'] = { cy: 233.46, py: 224.71 };
  report.months[month].heads['sundry'] = { cy: 48.78, py: 102.88 };

  await kv.set(key, report);
  console.log(`Updated Monthly Statement for ${division} FY${fyYear} Month ${month}`);
}

main().catch(console.error);
