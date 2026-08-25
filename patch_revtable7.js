const fs = require('fs');
let text = fs.readFileSync('src/components/financial/RevenueTable.tsx', 'utf8');

text = text.replace('getVariationColour(row.currentMonthVarPct)', 'getVariationColour(row.currentMonthVarPct ?? null)');
text = text.replace('formatPct(row.currentMonthVarPct)', 'formatPct(row.currentMonthVarPct ?? null)');

fs.writeFileSync('src/components/financial/RevenueTable.tsx', text);
console.log('Fixed undefined types');
