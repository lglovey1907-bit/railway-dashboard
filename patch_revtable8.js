const fs = require('fs');
let text = fs.readFileSync('src/components/financial/RevenueTable.tsx', 'utf8');

// First, fix the headers text:
// Current Month -> JUL'25 (remove space)
text = text.replace(/{curMonthShort} '\{pyFull\.split\('-'\)\[1\]}/g, "{curMonthShort}'{pyFull.split('-')[1]}");
text = text.replace(/{curMonthShort} '\{cyFull\.split\('-'\)\[1\]}/g, "{curMonthShort}'{cyFull.split('-')[1]}");

// Upto JUL'26
text = text.replace(/{\`Upto \\\${curMonthShort}\`}/g, "{`Upto ${curMonthShort}'${cyFull.split('-')[1]}`}");

// % Var -> %Variation
text = text.replace(/>\s*% Var\s*</g, '>%Variation<');

// Cumulative Upto JUL 26
text = text.replace(/Cumulative Upto \{curMonthShort\}/g, "Cummulative Upto {curMonthShort} {cyFull.split('-')[1]}");

// 1. Add S.No. to thead
const theadItemsOld = `            <th className="px-3 py-2 text-left sticky left-0 bg-slate-50 border-r border-slate-200 border-b border-b-slate-200 min-w-[200px] z-30" rowSpan={2}>
              ITEMS
            </th>`;
const theadItemsNew = `            <th className="px-2 py-2 text-center sticky left-0 bg-slate-50 border-r border-slate-200 border-b border-b-slate-200 w-12 z-30" rowSpan={2}>
              S.No.
            </th>
            <th className="px-3 py-2 text-left sticky left-[48px] bg-slate-50 border-r border-slate-200 border-b border-b-slate-200 min-w-[200px] z-30" rowSpan={2}>
              ITEMS
            </th>`;
text = text.replace(theadItemsOld, theadItemsNew);

// 2. Add S.No. to tbody
const tbodyItemsOld = `                <td className={cn(
                  'sticky left-0 z-10 px-3 py-2 whitespace-nowrap border-r border-slate-200',`;
                  
const tbodyItemsNew = `                <td className={cn(
                  'sticky left-0 z-10 px-2 py-2 text-center text-[11px] whitespace-nowrap border-r border-slate-200 font-medium',
                  hBg, 'text-slate-700'
                )}>
                  {row.revenueHead.sNo || ''}
                </td>
                <td className={cn(
                  'sticky left-[48px] z-10 px-3 py-2 whitespace-nowrap border-r border-slate-200',`;
                  
text = text.replace(tbodyItemsOld, tbodyItemsNew);

// Apply hard black borders to match the PDF perfectly
// We will change border-slate-200 to border-slate-400 or border-black/20 to make them more pronounced, but let's just stick to Tailwind border-black for a very PDF-like feel.
text = text.replace(/border-slate-200/g, 'border-slate-800');
text = text.replace(/border-b-slate-200/g, 'border-b-slate-800');
text = text.replace(/border-slate-100/g, 'border-slate-800');

fs.writeFileSync('src/components/financial/RevenueTable.tsx', text);
console.log('Patched RevenueTable for S.No and PDF exact text');
