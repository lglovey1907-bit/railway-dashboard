const fs = require('fs');
const filepath = 'src/components/financial/DataEntryModal.tsx';
let text = fs.readFileSync(filepath, 'utf8');

text = text.replace(
  `setForm({ actualsPrevPrevYear: '', actualsPrevYear: '', targetMonth: '', targetUpto: '', targetYearly: '', currentMonthPY: '', actual: '', remarks: '' })`,
  `setForm({ actualsPrevPrevYear: '', actualsPrevYear: '', targetMonth: '', targetUpto: '', targetYearly: '', currentMonthPY: '', actual: '', cumulPY: '', cumulCY: '', remarks: '' })`
);

fs.writeFileSync(filepath, text);
