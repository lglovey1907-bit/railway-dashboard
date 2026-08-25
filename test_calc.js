const fs = require('fs');
const calc = fs.readFileSync('src/lib/financial/calculations.ts', 'utf8');
console.log(calc.substring(calc.indexOf('export function buildCumulativeRows'), calc.indexOf('export function buildMonthlyTrend')));
