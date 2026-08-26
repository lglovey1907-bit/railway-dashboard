const fs = require('fs');
const filepath = 'src/components/financial/FinancialDashboard.tsx';
let text = fs.readFileSync(filepath, 'utf8');

text = text.replace(
  `const fullText = data.text.replace(/\\r/g, '');`,
  `const fullText = data.text.replace(/[\\r\\n]+/g, ' ');`
);

text = text.replace(
  `                if (aPrevPrev !== null && !isNaN(aPrevPrev)) newRec.actualsPrevPrevYear = aPrevPrev;
                if (aPrev !== null && !isNaN(aPrev)) newRec.actualsPrevYear = aPrev;
                if (tMonth !== null && !isNaN(tMonth)) newRec.targetMonth = tMonth;
                if (tUpto !== null && !isNaN(tUpto)) newRec.targetUpto = tUpto;
                if (tYear !== null && !isNaN(tYear)) newRec.targetYearly = tYear;
                
                store.upsertRecord(newRec, 'Auto-Fill from PDF');`,
  `                newRec.actualsPrevPrevYear = aPrevPrev !== null && !isNaN(aPrevPrev) ? aPrevPrev : null;
                newRec.actualsPrevYear = aPrev !== null && !isNaN(aPrev) ? aPrev : null;
                
                // EXPLICITLY set targets to null if they don't exist, to wipe out corrupted old data
                newRec.targetMonth = tMonth !== null && !isNaN(tMonth) ? tMonth : null;
                newRec.targetUpto = tUpto !== null && !isNaN(tUpto) ? tUpto : null;
                newRec.targetYearly = tYear !== null && !isNaN(tYear) ? tYear : null;
                
                store.upsertRecord(newRec, 'Auto-Fill from PDF');`
);

fs.writeFileSync(filepath, text);
console.log('Patched PDF newlines and explicit nulls');
