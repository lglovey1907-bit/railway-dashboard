const fs = require('fs');
let text = fs.readFileSync('src/components/financial/FinancialDashboard.tsx', 'utf8');
text = text.replace('!store.records.some', '!allRecords.some');
fs.writeFileSync('src/components/financial/FinancialDashboard.tsx', text);
