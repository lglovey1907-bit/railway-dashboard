const fs = require('fs');
const filepath = 'src/lib/financial/calculations.ts';
let text = fs.readFileSync(filepath, 'utf8');

text = text.replace(
  `    const variationPct = variation !== null && cPrev !== null && cPrev !== 0
      ? (variation / cPrev) * 100 : null;`,
  `    let variationPct: number | null = null;
    if (variation !== null && cPrev !== null) {
      if (cPrev === 0 && cCurrent === 0) {
        variationPct = null;
      } else if (cPrev === 0) {
        variationPct = cCurrent > 0 ? 100 : -100;
      } else {
        variationPct = (variation / Math.abs(cPrev)) * 100;
      }
    }`
);

text = text.replace(
  `    let currentMonthVarPct: number | null = null;
    if (currentMonthCY !== null && currentMonthPY !== null && currentMonthPY !== 0) {
      currentMonthVarPct = ((currentMonthCY - currentMonthPY) / currentMonthPY) * 100;
    }`,
  `    let currentMonthVarPct: number | null = null;
    if (currentMonthCY !== null && currentMonthPY !== null) {
      if (currentMonthPY === 0 && currentMonthCY === 0) {
        currentMonthVarPct = null;
      } else if (currentMonthPY === 0) {
        currentMonthVarPct = currentMonthCY > 0 ? 100 : -100;
      } else {
        currentMonthVarPct = ((currentMonthCY - currentMonthPY) / Math.abs(currentMonthPY)) * 100;
      }
    }`
);

// We need to do it twice because the blocks appear twice (for nonTotalRows and totalRows)
text = text.replace(
  `    const variationPct = variation !== null && cPrev !== null && cPrev !== 0
      ? (variation / cPrev) * 100 : null;`,
  `    let variationPct: number | null = null;
    if (variation !== null && cPrev !== null) {
      if (cPrev === 0 && cCurrent === 0) {
        variationPct = null;
      } else if (cPrev === 0) {
        variationPct = cCurrent > 0 ? 100 : -100;
      } else {
        variationPct = (variation / Math.abs(cPrev)) * 100;
      }
    }`
);

text = text.replace(
  `    let currentMonthVarPct: number | null = null;
    if (currentMonthCY !== null && currentMonthPY !== null && currentMonthPY !== 0) {
      currentMonthVarPct = ((currentMonthCY - currentMonthPY) / currentMonthPY) * 100;
    }`,
  `    let currentMonthVarPct: number | null = null;
    if (currentMonthCY !== null && currentMonthPY !== null) {
      if (currentMonthPY === 0 && currentMonthCY === 0) {
        currentMonthVarPct = null;
      } else if (currentMonthPY === 0) {
        currentMonthVarPct = currentMonthCY > 0 ? 100 : -100;
      } else {
        currentMonthVarPct = ((currentMonthCY - currentMonthPY) / Math.abs(currentMonthPY)) * 100;
      }
    }`
);

fs.writeFileSync(filepath, text);
