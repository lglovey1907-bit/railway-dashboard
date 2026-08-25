const fs = require('fs');

const filepath = 'src/components/financial/FinancialDashboard.tsx';
let text = fs.readFileSync(filepath, 'utf8');

const oldLogic = `            if (nums && nums.length >= 2) {
              let cyStr = '0', pyStr = '0';
              if (nums.length >= 10) {
                cyStr = nums[6].replace(/,/g, '');
                pyStr = nums[5].replace(/,/g, '');
              } else {
                cyStr = nums[0].replace(/,/g, '');
                pyStr = nums[1].replace(/,/g, '');
              }
              
              const cy = parseFloat(cyStr);
              const py = parseFloat(pyStr);
              
              const currentData = allRecords.find(r => r.fyId === selectedFYId && r.month === selectedMonth && r.revenueHeadId === targetId);
              if (!isNaN(cy) && !isNaN(py) && (!currentData || !currentData.actual)) {
                store.upsertRecord({
                  fyId: selectedFYId,
                  month: selectedMonth,
                  revenueHeadId: targetId,
                  actual: cy,
                  previousYearActual: py,
                  status: 'published',
                  targetStatus: 'available'
                }, 'Auto-Fill from PDF');
              }
            }`;

const newLogic = `            if (nums && nums.length >= 2) {
              let cyStr = '0', pyStr = '0';
              let aPrevPrev = null, aPrev = null, tMonth = null, tUpto = null, tYear = null;
              
              if (nums.length >= 10) {
                aPrevPrev = parseFloat(nums[0].replace(/,/g, ''));
                aPrev = parseFloat(nums[1].replace(/,/g, ''));
                tMonth = parseFloat(nums[2].replace(/,/g, ''));
                tUpto = parseFloat(nums[3].replace(/,/g, ''));
                tYear = parseFloat(nums[4].replace(/,/g, ''));
                pyStr = nums[5].replace(/,/g, '');
                cyStr = nums[6].replace(/,/g, '');
              } else {
                cyStr = nums[0].replace(/,/g, '');
                pyStr = nums[1].replace(/,/g, '');
              }
              
              const cy = parseFloat(cyStr);
              const py = parseFloat(pyStr);
              
              const currentData = allRecords.find(r => r.fyId === selectedFYId && r.month === selectedMonth && r.revenueHeadId === targetId);
              if (!isNaN(cy) && !isNaN(py) && (!currentData || !currentData.actual)) {
                const newRec: any = {
                  fyId: selectedFYId,
                  month: selectedMonth,
                  revenueHeadId: targetId,
                  actual: cy,
                  previousYearActual: py,
                  status: 'published',
                  targetStatus: 'available'
                };
                if (aPrevPrev !== null && !isNaN(aPrevPrev)) newRec.actualsPrevPrevYear = aPrevPrev;
                if (aPrev !== null && !isNaN(aPrev)) newRec.actualsPrevYear = aPrev;
                if (tMonth !== null && !isNaN(tMonth)) newRec.targetMonth = tMonth;
                if (tUpto !== null && !isNaN(tUpto)) newRec.targetUpto = tUpto;
                if (tYear !== null && !isNaN(tYear)) newRec.targetYearly = tYear;
                
                store.upsertRecord(newRec, 'Auto-Fill from PDF');
              }
            }`;

if (text.includes(oldLogic)) {
  text = text.replace(oldLogic, newLogic);
  fs.writeFileSync(filepath, text);
  console.log('Patched FinancialDashboard.tsx for advanced fields');
} else {
  console.log('Failed to find oldLogic');
}
