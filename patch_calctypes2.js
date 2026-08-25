const fs = require('fs');
let text = fs.readFileSync('src/lib/financial/calculations.ts', 'utf8');

text = text.replace("    const targetMonth = curRec?.target ?? null;", "    const aprRec = getRecord(records, fyId, 1, rh.id);\n    const targetMonth = curRec?.target ?? null;");
text = text.replace("    const aprRec = getRecord(records, fyId, 1, rh.id);\n    const budget = aprRec?.budgetEstimate ?? null;", "    const budget = aprRec?.budgetEstimate ?? null;");

fs.writeFileSync('src/lib/financial/calculations.ts', text);
console.log('Fixed aprRec order');
