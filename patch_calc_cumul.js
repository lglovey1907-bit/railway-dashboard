const fs = require('fs');
const filepath = 'src/lib/financial/calculations.ts';
let text = fs.readFileSync(filepath, 'utf8');

text = text.replace(
  `    const cCurrent = computeCumulative(records, fyId, upToMonth, rh.id, 'actual');
    const cPrev    = computeCumulative(records, fyId, upToMonth, rh.id, 'previousYearActual');`,
  `    const cCurrent = curRec?.cumulCY ?? computeCumulative(records, fyId, upToMonth, rh.id, 'actual');
    const cPrev    = curRec?.cumulPY ?? computeCumulative(records, fyId, upToMonth, rh.id, 'previousYearActual');`
);

fs.writeFileSync(filepath, text);
console.log('Patched calculations');
