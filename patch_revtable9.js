const fs = require('fs');
let text = fs.readFileSync('src/components/financial/RevenueTable.tsx', 'utf8');

text = text.replace(
  '<th className="px-3 py-1.5 text-center border-r border-slate-800 border-b border-b-slate-800" colSpan={2}>\n              Actuals\n            </th>',
  '<th className="px-3 py-1.5 text-center border-r border-slate-800 border-b border-b-slate-800" colSpan={2}>\n              Achieved in year\n            </th>'
);

fs.writeFileSync('src/components/financial/RevenueTable.tsx', text);
