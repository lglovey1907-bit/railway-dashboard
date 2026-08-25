const fs = require('fs');

const path = 'src/components/financial/FinancialDashboard.tsx';
let text = fs.readFileSync(path, 'utf8');

const effectOld = `  // Pull shared financial data on mount
  useEffect(() => {
    pullSharedFinancialData();`;

const effectNew = `  // Pull shared financial data on mount
  useEffect(() => {
    // Auto-rename OPT for existing users
    const optHead = store.revenueHeads.find(h => h.id === 'rh-opt');
    if (optHead && optHead.name === 'Originating Passenger Traffic (Million)') {
      store.updateRevenueHead('rh-opt', { name: 'Transportation Output' });
    }
    
    pullSharedFinancialData();`;

if (text.includes(effectOld)) {
  text = text.replace(effectOld, effectNew);
  fs.writeFileSync(path, text);
  console.log('Patched FinancialDashboard.tsx');
} else {
  console.log('Not found effectOld');
}
