const fs = require('fs');
const text = fs.readFileSync('pdf_content_test.txt', 'utf8');

const targetMap = {
  'Passenger Revenue': 'passenger',
  'Other Coaching Revenue': 'other_coaching',
  'Freight Revenue': 'freight',
  'Sundry Revenue': 'sundry',
  'Non Fare Revenue': 'nfr',
  'Over All Revenue': 'total_revenue'
};

const results = {};

for (const [name, targetId] of Object.entries(targetMap)) {
  // Find the index of the name
  const idx = text.toLowerCase().indexOf(name.toLowerCase());
  if (idx !== -1) {
    // Get the substring starting from the name to 300 chars ahead
    const chunk = text.substring(idx, idx + 500);
    // Find all numbers in this chunk
    const nums = chunk.match(/-?[\d,]+\.\d{1,2}/g);
    
    console.log(name, nums ? nums.length : 0, 'nums found');
    if (nums && nums.length >= 10) {
      const cyStr = nums[6].replace(/,/g, '');
      const pyStr = nums[5].replace(/,/g, '');
      console.log(' -> CY:', cyStr, 'PY:', pyStr);
    }
  }
}
