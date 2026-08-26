const fs = require('fs');
const filepath = 'src/lib/financial/calculations.ts';
let text = fs.readFileSync(filepath, 'utf8');

text = text.replace(
  `    let variationPct: number | null = null;
    if (variation !== null && cPrev !== null) {
      if (cPrev === 0 && cCurrent === 0) {
        variationPct = null;
      } else if (cPrev === 0) {
        variationPct = cCurrent > 0 ? 100 : -100;
      } else {
        variationPct = (variation / Math.abs(cPrev)) * 100;
      }
    }`,
  `    let variationPct: number | null = null;
    if (variation !== null && cPrev !== null && cCurrent !== null) {
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
  `    let variationPct: number | null = null;
    if (variation !== null && cPrev !== null) {
      if (cPrev === 0 && cCurrent === 0) {
        variationPct = null;
      } else if (cPrev === 0) {
        variationPct = cCurrent > 0 ? 100 : -100;
      } else {
        variationPct = (variation / Math.abs(cPrev)) * 100;
      }
    }`,
  `    let variationPct: number | null = null;
    if (variation !== null && cPrev !== null && cCurrent !== null) {
      if (cPrev === 0 && cCurrent === 0) {
        variationPct = null;
      } else if (cPrev === 0) {
        variationPct = cCurrent > 0 ? 100 : -100;
      } else {
        variationPct = (variation / Math.abs(cPrev)) * 100;
      }
    }`
);

fs.writeFileSync(filepath, text);
