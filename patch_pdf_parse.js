const fs = require('fs');
const filepath = 'src/components/financial/FinancialDashboard.tsx';
let text = fs.readFileSync(filepath, 'utf8');

const oldLogic = `              // Try to intelligently map the array based on its length and the row name
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

const newLogic = `              // Only these 4 specific rows have Targets in the PDF
              const hasTargetsInPDF = ['rh-pass', 'rh-oc-parc', 'rh-freight', 'rh-opt'].includes(targetId);

              if (hasTargetsInPDF) {
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
              }`;

text = text.replace(oldLogic, newLogic);
fs.writeFileSync(filepath, text);
console.log('Fixed PDF parse logic');
