const fs = require('fs');

function patchFile(filepath, isDashboard) {
  let text = fs.readFileSync(filepath, 'utf8');

  // Replace regex
  text = text.replace(/const nums = line\.match\(\/\[\\d,\]\+\\\.\\d\+\/g\);/g, "const nums = line.match(/-?[\\d,]+\\.\\d{1,2}/g);");

  // For Dashboard
  if (isDashboard) {
    const oldCode = `              const cyStr = nums[nums.length - 1].replace(/,/g, '');
              const pyStr = nums[nums.length - 2].replace(/,/g, '');`;
    const newCode = `              // Use the first two valid numbers for CY and PY respectively from the smashed text
              const cyStr = nums[0].replace(/,/g, '');
              const pyStr = nums[1].replace(/,/g, '');`;
    text = text.replace(oldCode, newCode);
    
    const checkSet = `              if (!isNaN(cy) && !isNaN(py)) {`;
    const checkSetNew = `              if (!isNaN(cy) && !isNaN(py) && !store.records.some(r => r.fyId === selectedFYId && r.month === selectedMonth && r.revenueHeadId === targetId)) {`;
    text = text.replace(checkSet, checkSetNew);
  } else {
    // For Monthly Report Widget
    const oldCode = `              const cyStr = nums[nums.length - 1].replace(/,/g, '');
              const pyStr = nums[nums.length - 2].replace(/,/g, '');`;
    const newCode = `              const cyStr = nums[0].replace(/,/g, '');
              const pyStr = nums[1].replace(/,/g, '');`;
    text = text.replace(oldCode, newCode);
    
    // Monthly sets it by doing:
    // if (!newMonths[selectedMonth]!.heads[targetId]) { newMonths[selectedMonth]!.heads[targetId] = { cy: 0, py: 0 }; }
    // newMonths[selectedMonth]!.heads[targetId].cy = cy;
    // We only want to set it if it's currently 0 or doesn't exist, to avoid overwriting with the Target table.
    
    const oldSet = `                if (!newMonths[selectedMonth]!.heads[targetId]) {
                  newMonths[selectedMonth]!.heads[targetId] = { cy: 0, py: 0 };
                }
                newMonths[selectedMonth]!.heads[targetId].cy = cy;
                newMonths[selectedMonth]!.heads[targetId].py = py;`;
                
    const newSet = `                if (!newMonths[selectedMonth]!.heads[targetId]) {
                  newMonths[selectedMonth]!.heads[targetId] = { cy, py };
                } else if (newMonths[selectedMonth]!.heads[targetId].cy === 0) {
                  newMonths[selectedMonth]!.heads[targetId].cy = cy;
                  newMonths[selectedMonth]!.heads[targetId].py = py;
                }`;
    text = text.replace(oldSet, newSet);
  }

  fs.writeFileSync(filepath, text);
}

patchFile('src/components/financial/FinancialDashboard.tsx', true);
patchFile('src/components/monthly/MonthlyReportWidget.tsx', false);
console.log('Patched regex and extraction logic!');
