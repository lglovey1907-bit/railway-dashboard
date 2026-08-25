const fs = require('fs');

const text = fs.readFileSync('pdf_content_test.txt', 'utf8').replace(/\r/g, '');
const lines = text.split('\n');

const targetMap = {
  'Passenger Revenue': 'rh-pass',
  'Parcel/Luggage': 'rh-oc-parc',
  'Ticket Checking': 'rh-oc-tc',
  'Freight Revenue': 'rh-freight'
};

for (const name of Object.keys(targetMap)) {
  const lineIdx = lines.findIndex(l => l.toLowerCase().includes(name.toLowerCase()));
  if (lineIdx !== -1) {
    console.log('--- Found:', name);
    // Look at this line and the next 2 lines
    const searchLines = lines.slice(lineIdx, lineIdx + 3);
    
    // We expect the row of numbers to be a single string of numbers separated by spaces.
    // Or just extract all numbers from the next 2 lines.
    let nums = [];
    for (const l of searchLines) {
       const m = l.match(/-?[\d,]+\.\d{1,2}/g);
       if (m) nums.push(...m);
    }
    console.log(nums);
  }
}
