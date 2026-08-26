const fs = require('fs');
const filepath = 'src/lib/financial/calculations.ts';
let text = fs.readFileSync(filepath, 'utf8');

text = text.replace(
  `return [...nonTotalRows, ...totalRows];`,
  `return [...nonTotalRows, ...totalRows].sort((a, b) => a.revenueHead.order - b.revenueHead.order);`
);

fs.writeFileSync(filepath, text);
