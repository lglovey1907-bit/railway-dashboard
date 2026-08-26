const fs = require('fs');
const filepath = 'src/components/financial/DataEntryModal.tsx';
let text = fs.readFileSync(filepath, 'utf8');

// 1. Add localFyId state
text = text.replace(
  `  const [selectedMonth, setSelectedMonth] = useState<FYMonth>(1);`,
  `  const [localFyId, setLocalFyId] = useState<string>(fyId);
  const [selectedMonth, setSelectedMonth] = useState<FYMonth>(1);`
);

// 2. Change records to use localFyId
text = text.replace(
  `  const records      = store.getAllRecords(fyId);`,
  `  const records      = store.getAllRecords(localFyId);`
);

// 3. Change save function to use localFyId
text = text.replace(
  `        fyId, month: selectedMonth, revenueHeadId: rhId,`,
  `        fyId: localFyId, month: selectedMonth, revenueHeadId: rhId,`
);

// 4. Add the Year dropdown
const monthDropdownHtml = `            <div className="relative">
              <select
                value={selectedMonth}`;

const dropdownHtml = `            <div className="relative">
              <select
                value={localFyId}
                onChange={e => { setLocalFyId(e.target.value); setEditingId(null); }}
                className="pl-3 pr-7 py-1.5 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-rail-400 appearance-none font-semibold text-slate-800"
              >
                {store.financialYears.map(fy => (
                  <option key={fy.id} value={fy.id}>{fy.label}</option>
                ))}
              </select>
              <ChevronDown size={14} className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400"/>
            </div>
            <div className="relative">
              <select
                value={selectedMonth}`;

text = text.replace(monthDropdownHtml, dropdownHtml);

fs.writeFileSync(filepath, text);
console.log('Added Year selector to DataEntryModal');
