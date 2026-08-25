const fs = require('fs');

const filepath = 'src/lib/financial/financialStore.ts';
let text = fs.readFileSync(filepath, 'utf8');

const buggyLogic = `? { ...x, ...r, updatedBy, updatedAt: nowIso, version: (x.version ?? 1) + 1, status: 'draft' as const }`;
const fixedLogic = `? { ...x, ...r, updatedBy, updatedAt: nowIso, version: (x.version ?? 1) + 1, status: r.status ?? 'draft' }`;

if (text.includes(buggyLogic)) {
  text = text.replace(buggyLogic, fixedLogic);
  fs.writeFileSync(filepath, text);
  console.log('Fixed upsertRecord draft overwrite');
} else {
  console.log('Could not find buggyLogic');
}
