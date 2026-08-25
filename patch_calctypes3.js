const fs = require('fs');
let text = fs.readFileSync('src/lib/financial/calculations.ts', 'utf8');

text = text.replace(/r => r\.actualsPrevYear/g, 'r => r.actualsPrevYear ?? null');
text = text.replace(/r => r\.actualsPrevPrevYear/g, 'r => r.actualsPrevPrevYear ?? null');
text = text.replace(/r => r\.targetMonth/g, 'r => r.targetMonth ?? null');
text = text.replace(/r => r\.targetUpto/g, 'r => r.targetUpto ?? null');
text = text.replace(/r => r\.targetYearly/g, 'r => r.targetYearly ?? null');
text = text.replace(/r => r\.currentMonthCY/g, 'r => r.currentMonthCY ?? null');
text = text.replace(/r => r\.currentMonthPY/g, 'r => r.currentMonthPY ?? null');

fs.writeFileSync('src/lib/financial/calculations.ts', text);
console.log('Fixed undefined mapping in sumNullable');
