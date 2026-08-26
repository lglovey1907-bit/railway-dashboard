const fs = require('fs');
const filepath = 'src/lib/financial/types.ts';
let text = fs.readFileSync(filepath, 'utf8');

text = text.replace(
  `  currentMonthVarPct?: number;`,
  `  currentMonthVarPct?: number;
  cumulPY?: number;
  cumulCY?: number;`
);

fs.writeFileSync(filepath, text);
console.log('Added cumulPY and cumulCY to types.ts');
