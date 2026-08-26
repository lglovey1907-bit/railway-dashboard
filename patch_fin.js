const fs = require('fs');
const filepath = 'src/components/financial/FinancialDashboard.tsx';
let text = fs.readFileSync(filepath, 'utf8');

text = text.replace(
  `                // EXPLICITLY set targets to null if they don't exist, to wipe out corrupted old data
                newRec.targetMonth = tMonth !== null && !isNaN(tMonth) ? tMonth : null;`,
  `                // EXPLICITLY set targets to null if they don't exist, to wipe out corrupted old data
                newRec.targetMonth = tMonth !== null && !isNaN(tMonth) ? tMonth : null;
                newRec.target = tMonth !== null && !isNaN(tMonth) ? tMonth : null;`
);

fs.writeFileSync(filepath, text);
