const fs = require('fs');

const filepath = 'src/components/financial/FinancialDashboard.tsx';
let text = fs.readFileSync(filepath, 'utf8');

const buggyCheck = `if (!isNaN(cy) && !isNaN(py) && !allRecords.some(r => r.fyId === selectedFYId && r.month === selectedMonth && r.revenueHeadId === targetId)) {`;
const newCheck = `const currentData = allRecords.find(r => r.fyId === selectedFYId && r.month === selectedMonth && r.revenueHeadId === targetId);
              if (!isNaN(cy) && !isNaN(py) && (!currentData || !currentData.actual)) {`;

if (text.includes(buggyCheck)) {
  text = text.replace(buggyCheck, newCheck);
  fs.writeFileSync(filepath, text);
  console.log('Fixed upsert check logic.');
} else {
  console.log('Could not find buggy check.');
}
