const fs = require('fs');

const filepath = 'src/components/financial/FinancialDashboard.tsx';
let text = fs.readFileSync(filepath, 'utf8');

const buggyLogic = `              const currentData = allRecords.find(r => r.fyId === selectedFYId && r.month === selectedMonth && r.revenueHeadId === targetId);
              if (!isNaN(cy) && !isNaN(py) && (!currentData || !currentData.actual)) {
                const newRec: any = {`;

const fixedLogic = `              const currentData = allRecords.find(r => r.fyId === selectedFYId && r.month === selectedMonth && r.revenueHeadId === targetId);
              if (!isNaN(cy) && !isNaN(py)) {
                const newRec: any = {`;

if (text.includes(buggyLogic)) {
  text = text.replace(buggyLogic, fixedLogic);
  fs.writeFileSync(filepath, text);
  console.log('Fixed overwrite logic in FinancialDashboard.tsx');
} else {
  console.log('Could not find buggyLogic');
}
