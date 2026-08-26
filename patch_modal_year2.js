const fs = require('fs');
const filepath = 'src/components/financial/DataEntryModal.tsx';
let text = fs.readFileSync(filepath, 'utf8');

text = text.replace(
  `  const records      = store.getAllRecords(localFyId);

  const [localFyId, setLocalFyId] = useState<string>(fyId);`,
  `  const [localFyId, setLocalFyId] = useState<string>(fyId);
  const records      = store.getAllRecords(localFyId);`
);

fs.writeFileSync(filepath, text);
