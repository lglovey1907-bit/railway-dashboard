const fs = require('fs');

const filepath = 'src/lib/financial/types.ts';
let text = fs.readFileSync(filepath, 'utf8');

const oldLogic = `export function getCurrentFYMonth(): FYMonth {
  const m = new Date().getMonth() + 1; // 1-indexed calendar month
  // April(4)=1, May(5)=2 ... March(3)=12
  const fyMonth = m >= 4 ? m - 3 : m + 9;
  return Math.max(1, Math.min(12, fyMonth)) as FYMonth;
}`;

const newLogic = `export function getCurrentFYMonth(): FYMonth {
  const m = new Date().getMonth() + 1; // 1-indexed calendar month
  // April(4)=1, May(5)=2 ... March(3)=12
  const fyMonth = m >= 4 ? m - 3 : m + 9;
  // Default to previous month because data for current month is usually not ready
  // e.g. if it's August (fyMonth 5), default to July (fyMonth 4)
  const prevFyMonth = Math.max(1, fyMonth - 1);
  return prevFyMonth as FYMonth;
}`;

if (text.includes(oldLogic)) {
  text = text.replace(oldLogic, newLogic);
  fs.writeFileSync(filepath, text);
  console.log('Patched getCurrentFYMonth');
} else {
  console.log('Could not find logic');
}
