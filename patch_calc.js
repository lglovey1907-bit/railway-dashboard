const fs = require('fs');

const filepath = 'src/lib/financial/calculations.ts';
let text = fs.readFileSync(filepath, 'utf8');

const oldActualsPrev = `    // Let's approximate actualsPrevYear by summing prevYearActual for all 12 months in the current FY records.
    let actualsPrevYear = 0; let hasPY = false;
    let actualsPrevPrevYear = 0; // Hard to get without traversing FYs, we'll leave it null for now unless we do a deep search.
    
    // Actually, to get actualsPrevYear, we just sum 'previousYearActual' for all 12 months of this FY!
    for (let m = 1; m <= 12; m++) {
      const r = getRecord(records, fyId, m as FYMonth, rh.id);
      if (r?.previousYearActual != null) { actualsPrevYear += r.previousYearActual; hasPY = true; }
    }
    
    const curRec = getRecord(records, fyId, upToMonth, rh.id);
    const currentMonthCY = curRec?.actual ?? null;
    const currentMonthPY = curRec?.previousYearActual ?? null;
    const currentMonthVarPct = currentMonthCY !== null && currentMonthPY !== null && currentMonthPY !== 0 
      ? ((currentMonthCY - currentMonthPY) / currentMonthPY) * 100 : null;

    const aprRec = getRecord(records, fyId, 1, rh.id);
    const targetMonth = curRec?.target ?? null;
    const targetUpto = computeCumulative(records, fyId, upToMonth, rh.id, 'target');
    const targetYearly = aprRec?.budgetEstimate ?? computeCumulative(records, fyId, 12, rh.id, 'target');`;

const newActualsPrev = `    const curRec = getRecord(records, fyId, upToMonth, rh.id);

    let actualsPrevPrevYear = curRec?.actualsPrevPrevYear ?? 0;
    let actualsPrevYear = curRec?.actualsPrevYear ?? 0;
    
    if (!curRec?.actualsPrevYear && curRec?.actualsPrevYear !== 0) {
      let hasPY = false;
      for (let m = 1; m <= 12; m++) {
        const r = getRecord(records, fyId, m as FYMonth, rh.id);
        if (r?.previousYearActual != null) { actualsPrevYear += r.previousYearActual; hasPY = true; }
      }
      if (!hasPY) actualsPrevYear = 0;
    }
    
    const currentMonthCY = curRec?.actual ?? null;
    const currentMonthPY = curRec?.previousYearActual ?? null;
    const currentMonthVarPct = currentMonthCY !== null && currentMonthPY !== null && currentMonthPY !== 0 
      ? ((currentMonthCY - currentMonthPY) / currentMonthPY) * 100 : null;

    const aprRec = getRecord(records, fyId, 1, rh.id);
    const targetMonth = curRec?.targetMonth ?? curRec?.target ?? null;
    let targetUpto = curRec?.targetUpto ?? null;
    if (targetUpto === null) targetUpto = computeCumulative(records, fyId, upToMonth, rh.id, 'target');
    let targetYearly = curRec?.targetYearly ?? null;
    if (targetYearly === null) targetYearly = aprRec?.budgetEstimate ?? computeCumulative(records, fyId, 12, rh.id, 'target');`;

if (text.includes(oldActualsPrev)) {
  text = text.replace(oldActualsPrev, newActualsPrev);
  fs.writeFileSync(filepath, text);
  console.log('Patched calculations.ts');
} else {
  console.log('Could not find oldActualsPrev');
}
