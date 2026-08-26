const fs = require('fs');
const filepath = 'src/lib/financial/calculations.ts';
let text = fs.readFileSync(filepath, 'utf8');

text = text.replace(
  `    const cCurrent = computeCumulative(records, fyId, upToMonth, rh.id, 'actual');
    const cPrev    = computeCumulative(records, fyId, upToMonth, rh.id, 'previousYearActual');`,
  `    const cCurrent = computeCumulative(records, fyId, upToMonth, rh.id, 'actual');
    let cPrev = curRec?.cumulPY ?? computeCumulative(records, fyId, upToMonth, rh.id, 'previousYearActual');
    if (cPrev === null && curRec?.cumulPY !== undefined) {
      cPrev = curRec.cumulPY;
    }`
);

fs.writeFileSync(filepath, text);
