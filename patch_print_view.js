const fs = require('fs');
const filepath = 'src/components/financial/PrintView.tsx';
let text = fs.readFileSync(filepath, 'utf8');

// Replace the cumulative mode table with RevenueTable
// First, import RevenueTable at the top
if (!text.includes("import { RevenueTable }")) {
  text = text.replace("import type { Unit } from './RevenueTable';", "import { RevenueTable, type Unit } from './RevenueTable';");
}

// Find the cumulative mode section
const oldTableStart = '<table className="w-full border-collapse border border-slate-400 text-[10px]">';
const oldTableEnd = '</table>';

// We need to replace from oldTableStart to the matching oldTableEnd.
// Let's just use string replacement.
const startIdx = text.indexOf(oldTableStart);
if (startIdx > -1) {
  // Find the end of this table
  // Since there are other tables, we have to be careful
  // The cumulative table ends right before {/* ── MONTHLY STATEMENT MODE
  const modeEndIdx = text.indexOf('{/* ── MONTHLY STATEMENT MODE');
  if (modeEndIdx > -1) {
    const sectionToReplace = text.substring(startIdx, modeEndIdx);
    // Replace the table with RevenueTable
    const replacement = `<div className="print-revenue-table-wrapper">
              <RevenueTable 
                rows={rows} 
                upToMonth={upToMonth} 
                unit={unit} 
                fyLabel={fy.label}
                showMonthCols={true} 
              />
            </div>
            `;
    // We only want to replace the table part inside this section.
    // Let's replace the whole table block.
    // Find the last </table> before modeEndIdx
    const tableEndIdx = sectionToReplace.lastIndexOf('</table>') + '</table>'.length;
    if (tableEndIdx > -1) {
        const exactSection = sectionToReplace.substring(0, tableEndIdx);
        text = text.replace(exactSection, replacement);
        console.log('Patched PrintView cumulative mode.');
    }
  }
}

// Write the file
fs.writeFileSync(filepath, text);
