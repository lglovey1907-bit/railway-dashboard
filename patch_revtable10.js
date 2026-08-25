const fs = require('fs');
let text = fs.readFileSync('src/components/financial/RevenueTable.tsx', 'utf8');

text = text.replace(
  '<th className="px-2.5 py-2 text-center border-r border-slate-800 border-b border-b-slate-800" colSpan={12}>\n                Monthly Actuals\n              </th>',
  '<th className="px-2.5 py-2 text-center border-r border-slate-800 border-b border-b-slate-800" colSpan={months.length}>\n                Monthly Actuals\n              </th>'
);

fs.writeFileSync('src/components/financial/RevenueTable.tsx', text);
