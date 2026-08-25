const fs = require('fs');

const filepath = 'src/lib/financial/types.ts';
let text = fs.readFileSync(filepath, 'utf8');

const targetStatusLine = `export interface MonthlyRecord {
  id: string;
  fyId: string;
  month: FYMonth;
  revenueHeadId: string;
  budgetEstimate?: number;      // full-year BE in Cr (stored once on April record)
  target?: number;              // monthly target in Cr
  targetStatus: TargetStatus;
  actual?: number;              // in Cr
  previousYearActual?: number;  // in Cr (same month, previous FY)`;

const newTargetStatusLine = `export interface MonthlyRecord {
  id: string;
  fyId: string;
  month: FYMonth;
  revenueHeadId: string;
  budgetEstimate?: number;      // full-year BE in Cr (stored once on April record)
  target?: number;              // monthly target in Cr
  targetStatus: TargetStatus;
  actual?: number;              // in Cr
  previousYearActual?: number;  // in Cr (same month, previous FY)
  
  // Advanced PDF Fields
  actualsPrevPrevYear?: number;
  actualsPrevYear?: number;
  targetMonth?: number;
  targetUpto?: number;
  targetYearly?: number;`;

if (text.includes(targetStatusLine)) {
  text = text.replace(targetStatusLine, newTargetStatusLine);
  fs.writeFileSync(filepath, text);
  console.log('Patched types.ts');
} else {
  console.log('Could not find targetStatusLine in types.ts');
}
