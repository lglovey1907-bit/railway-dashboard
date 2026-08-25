const fs = require('fs');

const filepath = 'src/lib/financial/calculations.ts';
let text = fs.readFileSync(filepath, 'utf8');

text = text.replace('actualsPrevYear: hasPY ? actualsPrevYear : null,', 'actualsPrevYear,');
text = text.replace('actualsPrevPrevYear: null,', 'actualsPrevPrevYear,');

fs.writeFileSync(filepath, text);
