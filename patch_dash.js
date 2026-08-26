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
                newRec.actualsPrevPrevYear = aPrevPrev !== null && !isNaN(aPrevPrev) ? aPrevPrev : null;
                newRec.actualsPrevYear = aPrev !== null && !isNaN(aPrev) ? aPrev : null;
                
                // EXPLICITLY set targets to null if they don't exist, to wipe out corrupted old data
                newRec.targetMonth = tMonth !== null && !isNaN(tMonth) ? tMonth : null;
                newRec.targetUpto = tUpto !== null && !isNaN(tUpto) ? tUpto : null;
                newRec.targetYearly = tYear !== null && !isNaN(tYear) ? tYear : null;
                
                store.upsertRecord(newRec, 'Auto-Fill from PDF');`,
  `              let cumulPY = null;
              if (hasTargetsInPDF) {
                // 2024-25, 2025-26, TargetMonth, TargetUpto, TargetYearly, PY Month, CY Month, %Var, Cumul PY
                aPrevPrev = parseFloat(nums[0].replace(/,/g, ''));
                aPrev = parseFloat(nums[1].replace(/,/g, ''));
                tMonth = parseFloat(nums[2].replace(/,/g, ''));
                tUpto = parseFloat(nums[3].replace(/,/g, ''));
                tYear = parseFloat(nums[4].replace(/,/g, ''));
                pyStr = nums[5].replace(/,/g, '');
                cyStr = nums[6].replace(/,/g, '');
                if (nums.length > 8) cumulPY = parseFloat(nums[8].replace(/,/g, ''));
              } else {
                // No Targets in PDF.
                // 2024-25, 2025-26, PY Month, CY Month, %Var, Cumul PY
                aPrevPrev = parseFloat(nums[0].replace(/,/g, ''));
                aPrev = parseFloat(nums[1].replace(/,/g, ''));
                pyStr = nums[2].replace(/,/g, '');
                cyStr = nums[3].replace(/,/g, '');
                if (nums.length > 5) cumulPY = parseFloat(nums[5].replace(/,/g, ''));
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
                newRec.actualsPrevPrevYear = aPrevPrev !== null && !isNaN(aPrevPrev) ? aPrevPrev : null;
                newRec.actualsPrevYear = aPrev !== null && !isNaN(aPrev) ? aPrev : null;
                if (cumulPY !== null && !isNaN(cumulPY)) newRec.cumulPY = cumulPY;
                
                // EXPLICITLY set targets to null if they don't exist, to wipe out corrupted old data
                newRec.targetMonth = tMonth !== null && !isNaN(tMonth) ? tMonth : null;
                newRec.targetUpto = tUpto !== null && !isNaN(tUpto) ? tUpto : null;
                newRec.targetYearly = tYear !== null && !isNaN(tYear) ? tYear : null;
                
                store.upsertRecord(newRec, 'Auto-Fill from PDF');`
);

fs.writeFileSync(filepath, text);
