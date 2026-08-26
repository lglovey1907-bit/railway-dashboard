const fs = require('fs');
const filepath = 'src/components/financial/DataEntryModal.tsx';
let text = fs.readFileSync(filepath, 'utf8');

text = text.replace(
  `        targetMonth: parseNum(form.targetMonth),
        targetUpto: parseNum(form.targetUpto),
        targetYearly: parseNum(form.targetYearly),`,
  `        targetMonth: parseNum(form.targetMonth),
        target: parseNum(form.targetMonth), // ALWAYS sync target with targetMonth
        targetUpto: parseNum(form.targetUpto),
        targetYearly: parseNum(form.targetYearly),`
);

fs.writeFileSync(filepath, text);
