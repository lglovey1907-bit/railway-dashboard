const fs = require('fs');

const text = fs.readFileSync('pdf_content_test.txt', 'utf8').replace(/\r/g, '');
const lines = text.split('\n');

const targetMap = {
  'Passenger Revenue': 'rh-pass',
  'Parcel/Luggage': 'rh-oc-parc',
  'Ticket Checking': 'rh-oc-tc',
  'Freight Revenue': 'rh-freight',
  'Other Misc': 'rh-oc-misc'
};

for (const name of Object.keys(targetMap)) {
  const lineIdx = lines.findIndex(l => l.toLowerCase().includes(name.toLowerCase()));
  if (lineIdx !== -1) {
    console.log('--- Found:', name);
    const searchLines = lines.slice(lineIdx, lineIdx + 3);
    
    let tokens = [];
    for (const l of searchLines) {
       // Match a number or a dash
       // Number: -?\d{1,3}(,\d{3})*\.\d+ or -?\d+\.\d+
       // Dash: \b-\b or just a lone dash surrounded by spaces
       const m = l.match(/-?[\d,]+\.\d{1,2}|(?<=\s)-(?=\s)|(?<=^)-(?=\s)/g);
       if (m) tokens.push(...m);
    }
    console.log(tokens);
  }
}
