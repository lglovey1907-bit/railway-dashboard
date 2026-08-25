const fs = require('fs');
const filepath = 'src/lib/financial/types.ts';
let text = fs.readFileSync(filepath, 'utf8');

text = text.replace('targetYearly?: number;', 'targetYearly?: number;\n  currentMonthPY?: number;\n  currentMonthCY?: number;\n  currentMonthVarPct?: number;');
fs.writeFileSync(filepath, text);
