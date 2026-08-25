const fs = require('fs');
let text = fs.readFileSync('src/components/financial/FinancialDashboard.tsx', 'utf8');

text = text.replace('<RevenueTable', '<RevenueTable fyLabel={selectedFY?.label ?? ""}');

fs.writeFileSync('src/components/financial/FinancialDashboard.tsx', text);
console.log('Patched FinancialDashboard props');
