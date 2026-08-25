const fs = require('fs');

const storePath = 'src/lib/financial/financialStore.ts';
let storeText = fs.readFileSync(storePath, 'utf8');

if (storeText.includes("Originating Passenger Traffic (Million)")) {
  storeText = storeText.replace("Originating Passenger Traffic (Million)", "Transportation Output");
  fs.writeFileSync(storePath, storeText);
  console.log('Renamed in financialStore.ts');
}

const dashboardPath = 'src/components/financial/FinancialDashboard.tsx';
let dashText = fs.readFileSync(dashboardPath, 'utf8');

const mapLogicOld = `        // Build targetMap from ALL active revenue heads
        const targetMap: Record<string, string> = {};
        store.revenueHeads.forEach(rh => {
          if (!rh.isTotal && !rh.isHeader) {
             targetMap[rh.name.toLowerCase().trim()] = rh.id;
             // also handle "(with ATM)"
             if (rh.name.includes('(with ATM)')) {
               targetMap[rh.name.replace('(with ATM)', '').toLowerCase().trim()] = rh.id;
             }
          }
        });`;

const mapLogicNew = `        // Build targetMap from ALL active revenue heads
        const targetMap: Record<string, string> = {};
        store.revenueHeads.forEach(rh => {
          if (!rh.isTotal && !rh.isHeader) {
             targetMap[rh.name.toLowerCase().trim()] = rh.id;
             // also handle "(with ATM)"
             if (rh.name.includes('(with ATM)')) {
               targetMap[rh.name.replace('(with ATM)', '').toLowerCase().trim()] = rh.id;
             }
             // Alias for Transportation Output in PDF
             if (rh.id === 'rh-opt') {
               targetMap['originating passenger traffic'] = rh.id;
             }
          }
        });`;

if (dashText.includes(mapLogicOld)) {
  dashText = dashText.replace(mapLogicOld, mapLogicNew);
  fs.writeFileSync(dashboardPath, dashText);
  console.log('Added alias in FinancialDashboard.tsx');
} else {
  console.log('Could not find mapLogicOld in FinancialDashboard.tsx');
}
