const fs = require('fs');

const filepath = 'src/components/financial/FinancialDashboard.tsx';
let text = fs.readFileSync(filepath, 'utf8');

const oldMapCode = `        const targetMap: Record<string, string> = {
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
            const chunk = fullText.substring(idx, idx + 400);`;

const newMapCode = `        // Build targetMap from ALL active revenue heads
        const targetMap: Record<string, string> = {};
        store.revenueHeads.forEach(rh => {
          if (!rh.isTotal && !rh.isHeader) {
             targetMap[rh.name.toLowerCase().trim()] = rh.id;
             // also handle "(with ATM)"
             if (rh.name.includes('(with ATM)')) {
               targetMap[rh.name.replace('(with ATM)', '').toLowerCase().trim()] = rh.id;
             }
          }
        });
        
        for (const [name, targetId] of Object.entries(targetMap)) {
          const idx = fullText.toLowerCase().indexOf(name);
          if (idx !== -1) {
            // Only take the next 150 chars to avoid capturing the next row's numbers
            const chunk = fullText.substring(idx, idx + 150);`;

text = text.replace(oldMapCode, newMapCode);

const oldParsing = `              if (nums.length >= 10) {
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
              }`;

const newParsing = `              // Try to intelligently map the array based on its length and the row name
              if (nums.length >= 10 || name.includes('passenger revenue') || name.includes('parcel/luggage') || name.includes('freight revenue')) {
                // These rows usually have Targets in the PDF, so PY/CY are shifted to index 5 and 6
                // even if some trailing numbers are truncated.
                aPrevPrev = parseFloat(nums[0].replace(/,/g, ''));
                aPrev = parseFloat(nums[1].replace(/,/g, ''));
                if (nums.length >= 7) {
                  tMonth = parseFloat(nums[2].replace(/,/g, ''));
                  tUpto = parseFloat(nums[3].replace(/,/g, ''));
                  tYear = parseFloat(nums[4].replace(/,/g, ''));
                  pyStr = nums[5].replace(/,/g, '');
                  cyStr = nums[6].replace(/,/g, '');
                } else {
                  // Smashed old format fallback
                  cyStr = nums[0].replace(/,/g, '');
                  pyStr = nums[1].replace(/,/g, '');
                }
              } else if (nums.length >= 4) {
                // These rows typically don't have Targets in the PDF (like Ticket Checking, Sundry items), 
                // so the targets are missing, and PY/CY are at index 2 and 3.
                aPrevPrev = parseFloat(nums[0].replace(/,/g, ''));
                aPrev = parseFloat(nums[1].replace(/,/g, ''));
                pyStr = nums[2].replace(/,/g, '');
                cyStr = nums[3].replace(/,/g, '');
              } else {
                cyStr = nums[0].replace(/,/g, '');
                pyStr = nums[1].replace(/,/g, '');
              }`;

text = text.replace(oldParsing, newParsing);

fs.writeFileSync(filepath, text);
console.log('Fixed PDF mapping logic');
