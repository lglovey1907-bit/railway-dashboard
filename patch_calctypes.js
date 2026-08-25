const fs = require('fs');
let text = fs.readFileSync('src/lib/financial/calculations.ts', 'utf8');

text = text.replace('const r = getRecord(records, fyId, m, rh.id);', 'const r = getRecord(records, fyId, m as FYMonth, rh.id);');

fs.writeFileSync('src/lib/financial/calculations.ts', text);
console.log('Fixed FYMonth type issue');
