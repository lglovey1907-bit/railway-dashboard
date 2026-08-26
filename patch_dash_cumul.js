const fs = require('fs');
const filepath = 'src/components/financial/FinancialDashboard.tsx';
let text = fs.readFileSync(filepath, 'utf8');

text = text.replace(
  `              if (hasTargetsInPDF) {
                // 2024-25, 2025-26, TargetMonth, TargetUpto, TargetYearly, PY Month, CY Month
                aPrevPrev = parseFloat(nums[0].replace(/,/g, ''));
                aPrev = parseFloat(nums[1].replace(/,/g, ''));
                tMonth = parseFloat(nums[2].replace(/,/g, ''));
                tUpto = parseFloat(nums[3].replace(/,/g, ''));
                tYear = parseFloat(nums[4].replace(/,/g, ''));
                pyStr = nums[5].replace(/,/g, '');
                cyStr = nums[6].replace(/,/g, '');
              } else {
                // No Targets in PDF.
                // 2024-25, 2025-26, PY Month, CY Month
                aPrevPrev = parseFloat(nums[0].replace(/,/g, ''));
                aPrev = parseFloat(nums[1].replace(/,/g, ''));
                pyStr = nums[2].replace(/,/g, '');
                cyStr = nums[3].replace(/,/g, '');
              }
              
              const cy = parseFloat(cyStr);
              const py = parseFloat(pyStr);
              
              const currentData = allRecords.find(r => r.fyId === selectedFYId && r.month === selectedMonth && r.revenueHeadId === targetId);
              if (!isNaN(cy) && !isNaN(py)) {
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
                
                store.upsertRecord(newRec, 'Auto-Fill from PDF');`,
  `              let cumulPY = null;
              let cumulCY = null;
              
              if (hasTargetsInPDF) {
                // 2024-25, 2025-26, TargetMonth, TargetUpto, TargetYearly, PY Month, CY Month, %Var, Cumul PY, Cumul CY
                aPrevPrev = parseFloat(nums[0].replace(/,/g, ''));
                aPrev = parseFloat(nums[1].replace(/,/g, ''));
                tMonth = parseFloat(nums[2].replace(/,/g, ''));
                tUpto = parseFloat(nums[3].replace(/,/g, ''));
                tYear = parseFloat(nums[4].replace(/,/g, ''));
                pyStr = nums[5].replace(/,/g, '');
                cyStr = nums[6].replace(/,/g, '');
                if (nums.length > 9) {
                  cumulPY = parseFloat(nums[8].replace(/,/g, ''));
                  cumulCY = parseFloat(nums[9].replace(/,/g, ''));
                }
              } else {
                // No Targets in PDF.
                // 2024-25, 2025-26, PY Month, CY Month, %Var, Cumul PY, Cumul CY
                aPrevPrev = parseFloat(nums[0].replace(/,/g, ''));
                aPrev = parseFloat(nums[1].replace(/,/g, ''));
                pyStr = nums[2].replace(/,/g, '');
                cyStr = nums[3].replace(/,/g, '');
                if (nums.length > 6) {
                  cumulPY = parseFloat(nums[5].replace(/,/g, ''));
                  cumulCY = parseFloat(nums[6].replace(/,/g, ''));
                }
              }
              
              const cy = parseFloat(cyStr);
              const py = parseFloat(pyStr);
              
              const currentData = allRecords.find(r => r.fyId === selectedFYId && r.month === selectedMonth && r.revenueHeadId === targetId);
              if (!isNaN(cy) && !isNaN(py)) {
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
                if (cumulPY !== null && !isNaN(cumulPY)) newRec.cumulPY = cumulPY;
                if (cumulCY !== null && !isNaN(cumulCY)) newRec.cumulCY = cumulCY;
                
                store.upsertRecord(newRec, 'Auto-Fill from PDF');`
);

fs.writeFileSync(filepath, text);
console.log('Patched FinancialDashboard PDF tokens');
