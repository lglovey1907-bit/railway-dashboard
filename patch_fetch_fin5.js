const fs = require('fs');

function patch(filepath) {
  let text = fs.readFileSync(filepath, 'utf8');
  
  const oldCode = `              // Use the first two valid numbers for CY and PY respectively from the smashed text
              const cyStr = nums[0].replace(/,/g, '');
              const pyStr = nums[1].replace(/,/g, '');`;
              
  const newCode = `              // Intelligently parse based on column count
              let cyStr = '0', pyStr = '0';
              if (nums.length >= 10) {
                // Annexure B format (11 columns usually)
                // [Achieved24, Achieved25, TgtM, TgtU, TgtY, PYMonth, CYMonth, ...]
                cyStr = nums[6].replace(/,/g, '');
                pyStr = nums[5].replace(/,/g, '');
              } else {
                // Smashed/short format (8 columns)
                // [CYMonth, PYMonth, ...]
                cyStr = nums[0].replace(/,/g, '');
                pyStr = nums[1].replace(/,/g, '');
              }`;
              
  const oldCode2 = `              const cyStr = nums[0].replace(/,/g, '');
              const pyStr = nums[1].replace(/,/g, '');`;
  
  if (text.includes(oldCode)) {
    text = text.replace(oldCode, newCode);
  } else if (text.includes(oldCode2)) {
    text = text.replace(oldCode2, newCode);
  }
  
  fs.writeFileSync(filepath, text);
}

patch('src/components/financial/FinancialDashboard.tsx');
patch('src/components/monthly/MonthlyReportWidget.tsx');
console.log('Done patching length-based extraction.');
