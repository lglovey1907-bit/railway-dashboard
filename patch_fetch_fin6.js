const fs = require('fs');

function patch(filepath) {
  let text = fs.readFileSync(filepath, 'utf8');
  
  const oldCode = `            const nameMatch = Object.entries(targetMap).find(([name]) => 
              line.toLowerCase().includes(name.toLowerCase())
            );
            if (nameMatch) {
              const [matchedName, targetId] = nameMatch;
              // Extract all numbers that look like XX.XX
              const nums = line.match(/-?[\\d,]+\\.\\d{1,2}/g);
              
              if (nums && nums.length >= 2) {
                // To avoid overwriting Actuals with Targets (since some PDFs list targets below actuals),
                // we only populate if cy is not yet set (0).
                const currentData = store.records.find(r => r.fyId === selectedFYId && r.month === selectedMonth && r.revenueHeadId === targetId);
                if (!currentData || currentData.actual === 0) {
              // Intelligently parse based on column count
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
              }
                  const cy = parseFloat(cyStr);
                  const py = parseFloat(pyStr);
                  
                  if (!isNaN(cy) && !isNaN(py)) {
                    populatedCount++;
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
                }
              }
            }`;

  const newCode = `            // NO-OP line iteration, we handle parsing globally below`;

  if (text.includes(oldCode)) {
    text = text.replace(oldCode, newCode);
    console.log('Replaced old line logic in', filepath);
  } else {
    console.log('Could not find old logic in', filepath);
  }

  const globalSearchCode = `          // We will parse the entire text block globally to handle line breaks and smashed text
          const fullText = text.replace(/\\r/g, '');
          for (const [name, targetId] of Object.entries(targetMap)) {
            let idx = fullText.toLowerCase().indexOf(name.toLowerCase());
            if (idx !== -1) {
              // Extract a chunk of text following the name to find its numbers
              // If it's a category with sub-items (like Other Coaching Revenue), we must look for its Total if present.
              let searchChunk = fullText.substring(idx, idx + 600);
              if (['other coaching revenue', 'sundry revenue', 'non fare revenue'].includes(name.toLowerCase())) {
                const totalIdx = searchChunk.toLowerCase().indexOf('total');
                if (totalIdx !== -1 && totalIdx < 400) {
                  searchChunk = searchChunk.substring(totalIdx);
                }
              }

              const nums = searchChunk.match(/-?[\\d,]+\\.\\d{1,2}/g);
              if (nums && nums.length >= 2) {
                let cyStr = '0', pyStr = '0';
                if (nums.length >= 10) {
                  // Annexure B format (11 columns usually)
                  cyStr = nums[6].replace(/,/g, '');
                  pyStr = nums[5].replace(/,/g, '');
                } else {
                  // Smashed/short format (8 columns)
                  cyStr = nums[0].replace(/,/g, '');
                  pyStr = nums[1].replace(/,/g, '');
                }
                const cy = parseFloat(cyStr);
                const py = parseFloat(pyStr);
                
                if (!isNaN(cy) && !isNaN(py)) {
                  const currentData = store.records.find(r => r.fyId === selectedFYId && r.month === selectedMonth && r.revenueHeadId === targetId);
                  if (!currentData || currentData.actual === 0) {
                    populatedCount++;
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
                }
              }
            }
          }`;

  // Insert globalSearchCode after `lines.forEach(line => { ... })`
  text = text.replace('lines.forEach((line) => {', globalSearchCode + '\n          lines.forEach((line) => {');
  
  fs.writeFileSync(filepath, text);
}

patch('src/components/financial/FinancialDashboard.tsx');
