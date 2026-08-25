const fs = require('fs');

let text = fs.readFileSync('src/lib/financial/calculations.ts', 'utf8');

const OLD_NON_TOTAL = `    const cCurrent = computeCumulative(records, fyId, upToMonth, rh.id, 'actual');`;
const NEW_NON_TOTAL = `
    // Advanced Layout calculations
    // We need fyId (e.g. fy-2627). We can parse it to find previous FYs.
    // Actually, we can just look up the previous year actuals for the whole year.
    // wait, prevYearActual stores the same month's previous year data. So summing all 12 months' prevYearActual gives us actualsPrevYear!
    // And for actualsPrevPrevYear, we'd need to look at fyId-1's prevYearActual, or fyId-2's actual.
    // Let's approximate actualsPrevYear by summing prevYearActual for all 12 months in the current FY records.
    let actualsPrevYear = 0; let hasPY = false;
    let actualsPrevPrevYear = 0; // Hard to get without traversing FYs, we'll leave it null for now unless we do a deep search.
    
    // Actually, to get actualsPrevYear, we just sum 'previousYearActual' for all 12 months of this FY!
    for (let m = 1; m <= 12; m++) {
      const r = getRecord(records, fyId, m, rh.id);
      if (r?.previousYearActual != null) { actualsPrevYear += r.previousYearActual; hasPY = true; }
    }
    
    const curRec = getRecord(records, fyId, upToMonth, rh.id);
    const currentMonthCY = curRec?.actual ?? null;
    const currentMonthPY = curRec?.previousYearActual ?? null;
    const currentMonthVarPct = currentMonthCY !== null && currentMonthPY !== null && currentMonthPY !== 0 
      ? ((currentMonthCY - currentMonthPY) / currentMonthPY) * 100 : null;

    const targetMonth = curRec?.target ?? null;
    const targetUpto = computeCumulative(records, fyId, upToMonth, rh.id, 'target');
    const targetYearly = aprRec?.budgetEstimate ?? computeCumulative(records, fyId, 12, rh.id, 'target');

    const cCurrent = computeCumulative(records, fyId, upToMonth, rh.id, 'actual');`;

text = text.replace(OLD_NON_TOTAL, NEW_NON_TOTAL);

const OLD_NON_RET = `      isTotal: false,
    };`;
const NEW_NON_RET = `      isTotal: false,
      actualsPrevYear: hasPY ? actualsPrevYear : null,
      actualsPrevPrevYear: null,
      targetMonth,
      targetUpto,
      targetYearly,
      currentMonthCY,
      currentMonthPY,
      currentMonthVarPct,
    };`;

text = text.replace(OLD_NON_RET, NEW_NON_RET);


const OLD_TOT_CALCS = `    const cCurrent = sumNullable(targetRows.map(r => r.cumulativeCurrentYear));`;
const NEW_TOT_CALCS = `
    const actualsPrevYear = sumNullable(targetRows.map(r => r.actualsPrevYear));
    const actualsPrevPrevYear = sumNullable(targetRows.map(r => r.actualsPrevPrevYear));
    const targetMonth = sumNullable(targetRows.map(r => r.targetMonth));
    const targetUpto = sumNullable(targetRows.map(r => r.targetUpto));
    const targetYearly = sumNullable(targetRows.map(r => r.targetYearly));
    const currentMonthCY = sumNullable(targetRows.map(r => r.currentMonthCY));
    const currentMonthPY = sumNullable(targetRows.map(r => r.currentMonthPY));
    
    let currentMonthVarPct: number | null = null;
    if (currentMonthCY !== null && currentMonthPY !== null && currentMonthPY !== 0) {
      currentMonthVarPct = ((currentMonthCY - currentMonthPY) / currentMonthPY) * 100;
    }

    const cCurrent = sumNullable(targetRows.map(r => r.cumulativeCurrentYear));`;

text = text.replace(OLD_TOT_CALCS, NEW_TOT_CALCS);

const OLD_TOT_RET = `      isTotal: true,
    };`;
const NEW_TOT_RET = `      isTotal: true,
      actualsPrevYear,
      actualsPrevPrevYear,
      targetMonth,
      targetUpto,
      targetYearly,
      currentMonthCY,
      currentMonthPY,
      currentMonthVarPct,
    };`;

text = text.replace(OLD_TOT_RET, NEW_TOT_RET);

fs.writeFileSync('src/lib/financial/calculations.ts', text);
console.log('Patched calculations.ts');
