const fs = require('fs');

const filepath = 'src/components/financial/RevenueTable.tsx';
let text = fs.readFileSync(filepath, 'utf8');

const oldHeaderLogic = `  const curMonthShort = FY_MONTHS[upToMonth - 1].short.toUpperCase();`;
const newHeaderLogic = `  const curMonthData = FY_MONTHS[upToMonth - 1];
  const curMonthShort = curMonthData.short.toUpperCase();
  
  let cyYr = 26;
  let pyYr = 25;
  if (match) {
    const startYr = parseInt(match[1], 10);
    const endYr = parseInt(match[2], 10);
    if (curMonthData.calMonth >= 4) {
      cyYr = startYr;
      pyYr = startYr - 1;
    } else {
      cyYr = endYr;
      pyYr = endYr - 1;
    }
  }`;

text = text.replace(oldHeaderLogic, newHeaderLogic);

const oldHeaderPY = `{curMonthShort}'{pyFull.split('-')[1]}`;
const oldHeaderCY = `{curMonthShort}'{cyFull.split('-')[1]}`;
const newHeaderPY = `{curMonthShort}'{pyYr.toString().padStart(2, '0')}`;
const newHeaderCY = `{curMonthShort}'{cyYr.toString().padStart(2, '0')}`;

text = text.replace(oldHeaderPY, newHeaderPY);
text = text.replace(oldHeaderCY, newHeaderCY);

const oldCumulHeader = `Cummulative Upto {curMonthShort} {cyFull.split('-')[1]}`;
const newCumulHeader = `Cummulative Upto {curMonthShort} {cyYr.toString().padStart(2, '0')}`;
text = text.replace(oldCumulHeader, newCumulHeader);

fs.writeFileSync(filepath, text);
console.log('Patched RevenueTable headers');
