const fs = require('fs');
const filepath = 'src/components/financial/DataEntryModal.tsx';
let text = fs.readFileSync(filepath, 'utf8');

text = text.replace(
  `        currentMonthPY: parseNum(form.currentMonthPY),
        actual: parseNum(form.actual),`,
  `        currentMonthPY: parseNum(form.currentMonthPY),
        previousYearActual: parseNum(form.currentMonthPY), // Must sync for cumulative calcs!
        actual: parseNum(form.actual),`
);

fs.writeFileSync(filepath, text);

const calcPath = 'src/lib/financial/calculations.ts';
let calcText = fs.readFileSync(calcPath, 'utf8');
calcText = calcText.replace(
  `    const currentMonthPY = curRec?.previousYearActual ?? null;`,
  `    const currentMonthPY = curRec?.currentMonthPY ?? curRec?.previousYearActual ?? null;`
);
fs.writeFileSync(calcPath, calcText);

console.log('Fixed PY sync');
