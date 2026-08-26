const fs = require('fs');
const filepath = 'src/lib/financial/financialStore.ts';
let text = fs.readFileSync(filepath, 'utf8');

text = text.replace(
  `{ id: 'rh-oc-tot', name: 'Other Coaching Total', code: 'OCT', order: 7, isTotal: true, isActive: true, color: '#4c1d95', isSubTotalFor: 'rh-oc-hdr' },`,
  `{ id: 'rh-oc-tot', name: 'Other Coaching Total', code: 'OCT', order: 27.1, isTotal: true, isActive: true, color: '#4c1d95', isSubTotalFor: 'rh-oc-hdr' },`
);

text = text.replace(
  `{ id: 'rh-sun-tot', name: 'Sundry Total', code: 'SUNT', order: 13, isTotal: true, isActive: true, color: '#164e63', isSubTotalFor: 'rh-sun-hdr' },`,
  `{ id: 'rh-sun-tot', name: 'Sundry Total', code: 'SUNT', order: 27.2, isTotal: true, isActive: true, color: '#164e63', isSubTotalFor: 'rh-sun-hdr' },`
);

text = text.replace(
  `{ id: 'rh-nfr-tot', name: 'Non Fare Total', code: 'NFRT', order: 26, isTotal: true, isActive: true, color: '#065f46', isSubTotalFor: 'rh-nfr-hdr' },`,
  `{ id: 'rh-nfr-tot', name: 'Non Fare Total', code: 'NFRT', order: 27.3, isTotal: true, isActive: true, color: '#065f46', isSubTotalFor: 'rh-nfr-hdr' },`
);

fs.writeFileSync(filepath, text);
