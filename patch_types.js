const fs = require('fs');
const filepath = 'src/lib/financial/types.ts';
let text = fs.readFileSync(filepath, 'utf8');

text = text.replace(
  `  currentMonthVarPct?: number;`,
  `  currentMonthVarPct?: number;
  cumulPY?: number;`
);

fs.writeFileSync(filepath, text);
