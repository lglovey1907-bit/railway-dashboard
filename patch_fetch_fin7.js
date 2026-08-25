const fs = require('fs');

const filepath = 'src/components/financial/FinancialDashboard.tsx';
let text = fs.readFileSync(filepath, 'utf8');

const oldLogic = `        const lines = data.text.split('\\n');
        lines.forEach((line: string) => {
          let targetId = '';
          const l = line.toLowerCase();
          if (l.includes('passenger revenue')) targetId = 'rh-pass';
          else if (l.includes('parcel/luggage')) targetId = 'rh-oc-parc';
          else if (l.includes('ticket checking')) targetId = 'rh-oc-tc';
          else if (l.includes('pf tickets')) targetId = 'rh-oc-pf';
          else if (l.includes('freight revenue')) targetId = 'rh-freight';
          else if (l.includes('parking contracts')) targetId = 'rh-sun-park';
          
          if (targetId) {
            // Find last two numbers (usually CY and PY)
            const nums = line.match(/-?[\\d,]+\\.\\d{1,2}/g);
            if (nums && nums.length >= 2) {
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
              
              if (!isNaN(cy) && !isNaN(py) && !allRecords.some(r => r.fyId === selectedFYId && r.month === selectedMonth && r.revenueHeadId === targetId)) {
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
        });`;

const newLogic = `        // Parse full text rather than per-line, as PDF formatting often breaks lines unpredictably
        const fullText = data.text.replace(/\\r/g, '');
        const targetMap: Record<string, string> = {
          'passenger revenue': 'rh-pass',
          'parcel/luggage': 'rh-oc-parc',
          'ticket checking': 'rh-oc-tc',
          'pf tickets': 'rh-oc-pf',
          'freight revenue': 'rh-freight',
          'parking contracts': 'rh-sun-park'
        };

        for (const [name, targetId] of Object.entries(targetMap)) {
          const idx = fullText.toLowerCase().indexOf(name);
          if (idx !== -1) {
            // Look ahead for the numbers belonging to this row
            const chunk = fullText.substring(idx, idx + 400);
            const nums = chunk.match(/-?[\\d,]+\\.\\d{1,2}/g);
            if (nums && nums.length >= 2) {
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
              
              if (!isNaN(cy) && !isNaN(py) && !allRecords.some(r => r.fyId === selectedFYId && r.month === selectedMonth && r.revenueHeadId === targetId)) {
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

if (text.includes(oldLogic)) {
  text = text.replace(oldLogic, newLogic);
  fs.writeFileSync(filepath, text);
  console.log('Patched FinancialDashboard.tsx');
} else {
  console.log('Failed to find oldLogic');
}
