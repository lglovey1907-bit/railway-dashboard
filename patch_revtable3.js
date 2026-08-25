const fs = require('fs');
let text = fs.readFileSync('src/components/financial/RevenueTable.tsx', 'utf8');

const OLD_PROPS = `  canManage?: boolean;
}`;
const NEW_PROPS = `  canManage?: boolean;
  fyLabel?: string;
}`;
text = text.replace(OLD_PROPS, NEW_PROPS);

const OLD_FN = `export function RevenueTable({
  rows, upToMonth, showMonthCols, unit = 'cr',
  visibleCols = new Set(ALL_COLS), colLabels = DEFAULT_COL_LABELS,
  onUpdateColLabel, onUpdateHead, onClickHead, canManage,
}: Props) {`;
const NEW_FN = `export function RevenueTable({
  rows, upToMonth, showMonthCols, unit = 'cr',
  visibleCols = new Set(ALL_COLS), colLabels = DEFAULT_COL_LABELS,
  onUpdateColLabel, onUpdateHead, onClickHead, canManage, fyLabel = 'FY 2026-27'
}: Props) {
  const months = FY_MONTHS.slice(0, upToMonth);
  
  // Parse fyLabel (e.g. "FY 2026-27") to get "2024-25", "2025-26", "2026-27"
  const match = fyLabel.match(/20(\\d{2})-(\\d{2})/);
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
  
  const curMonthShort = FY_MONTHS[upToMonth - 1].short.toUpperCase();
`;
text = text.replace(/export function RevenueTable\([\s\S]*?\) \{[\s\S]*?const months = FY_MONTHS\.slice\(0, upToMonth\);/, NEW_FN);

const OLD_HEADERS = `            <th className="px-3 py-1.5 text-center border-r border-slate-200 border-b border-b-slate-200" colSpan={3}>
              Target
            </th>`;
const NEW_HEADERS = `            <th className="px-3 py-1.5 text-center border-r border-slate-200 border-b border-b-slate-200" colSpan={3}>
              Target {cyFull}
            </th>`;
text = text.replace(OLD_HEADERS, NEW_HEADERS);

const OLD_HEADERS2 = `            <th className="px-3 py-1.5 text-center border-b border-b-slate-200" colSpan={3}>
              Cumulative Upto Month
            </th>`;
const NEW_HEADERS2 = `            <th className="px-3 py-1.5 text-center border-b border-b-slate-200" colSpan={3}>
              Cumulative Upto {curMonthShort}
            </th>`;
text = text.replace(OLD_HEADERS2, NEW_HEADERS2);


// Replace the specific text headers
text = text.replace('>Prev Prev Yr<', '>{ppyFull}<');
text = text.replace('>Prev Yr<', '>{pyFull}<');
text = text.replace('>Prev Yr Month<', `>{curMonthShort} '\${pyFull.split('-')[1]}<`);
text = text.replace('>Cur Yr Month<', `>{curMonthShort} '\${cyFull.split('-')[1]}<`);
text = text.replace('>Prev Yr (CY)<', '>{pyFull}<');
text = text.replace('>Cur Yr (CY)<', '>{cyFull}<');
text = text.replace('>Upto Month<', '>{`Upto ${curMonthShort}`}<');


fs.writeFileSync('src/components/financial/RevenueTable.tsx', text);
console.log('Patched RevenueTable headers with dynamic FYs');
