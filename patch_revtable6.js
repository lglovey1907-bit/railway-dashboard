const fs = require('fs');
let text = fs.readFileSync('src/components/financial/RevenueTable.tsx', 'utf8');

// Inject variables inside the function body
const INJECT = `  const match = (fyLabel || '').match(/20(\\d{2})-(\\d{2})/);
  let cyFull = '2026-27';
  let pyFull = '2025-26';
  let ppyFull = '2024-25';
  
  if (match) {
    const startYr = parseInt(match[1], 10);
    const endYr = parseInt(match[2], 10);
    cyFull = \`20\${startYr}-\${endYr}\`;
    pyFull = \`20\${startYr - 1}-\${endYr - 1}\`;
    ppyFull = \`20\${startYr - 2}-\${endYr - 2}\`;
  }
  
  const curMonthShort = FY_MONTHS[upToMonth - 1].short.toUpperCase();`;

text = text.replace('const months = FY_MONTHS.slice(0, upToMonth);', 'const months = FY_MONTHS.slice(0, upToMonth);\n' + INJECT);

// Also need to fix the props definition of RevenueTable to include fyLabel
text = text.replace('canManage = false,', 'canManage = false,\n  fyLabel = "FY 2026-27",');

fs.writeFileSync('src/components/financial/RevenueTable.tsx', text);
console.log('Injected variables');
