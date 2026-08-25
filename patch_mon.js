const fs = require('fs');
let text = fs.readFileSync('src/components/monthly/MonthlyReportWidget.tsx', 'utf8');

text = text.replace(/newMonths\[selectedMonth\]\.heads/g, 'newMonths[selectedMonth]!.heads');

fs.writeFileSync('src/components/monthly/MonthlyReportWidget.tsx', text);
console.log('Fixed undefined in Monthly');
