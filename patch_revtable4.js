const fs = require('fs');
let text = fs.readFileSync('src/components/financial/RevenueTable.tsx', 'utf8');

text = text.replace(/Prev Prev Yr/g, '{ppyFull}');
text = text.replace(/>\s*Prev Yr\s*</g, '>{pyFull}<');
text = text.replace(/Prev Yr Month/g, "{curMonthShort} '{pyFull.split('-')[1]}");
text = text.replace(/Cur Yr Month/g, "{curMonthShort} '{cyFull.split('-')[1]}");
text = text.replace(/Prev Yr \(CY\)/g, '{pyFull}');
text = text.replace(/Cur Yr \(CY\)/g, '{cyFull}');
text = text.replace(/>\s*Upto Month\s*</g, '>{`Upto ${curMonthShort}`}<');

fs.writeFileSync('src/components/financial/RevenueTable.tsx', text);
console.log('Fixed regex replacements');
