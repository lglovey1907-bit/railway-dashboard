const fs = require('fs');

const path = 'src/components/financial/FinancialDashboard.tsx';
let text = fs.readFileSync(path, 'utf8');

const effectOld = `  useEffect(() => {
    store.initializeDummyData();
  }, []);`;

const effectNew = `  useEffect(() => {
    store.initializeDummyData();
    const optHead = store.revenueHeads.find(h => h.id === 'rh-opt');
    if (optHead && optHead.name === 'Originating Passenger Traffic (Million)') {
      store.updateRevenueHead('rh-opt', { name: 'Transportation Output' });
    }
  }, [store]);`;

if (text.includes(effectOld)) {
  text = text.replace(effectOld, effectNew);
  fs.writeFileSync(path, text);
  console.log('Patched FinancialDashboard.tsx');
}
