const fs = require('fs');

const text = fs.readFileSync('pdf_content_test.txt', 'utf8').replace(/\r/g, '');
const lines = text.split('\n');

const targetMap = {
  'Ticket Checking': 'rh-oc-tc',
};

for (const name of Object.keys(targetMap)) {
  const lineIdx = lines.findIndex(l => l.toLowerCase().includes(name.toLowerCase()));
  if (lineIdx !== -1) {
    console.log('--- Found:', name);
    const searchLines = lines.slice(lineIdx, lineIdx + 3);
    for (const l of searchLines) {
       console.log(JSON.stringify(l));
    }
  }
}
