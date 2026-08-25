const fs = require('fs');
let text = fs.readFileSync('src/components/financial/RevenueTable.tsx', 'utf8');

// 1. Update Props and Function Signature
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
}: Props) {
  const months = FY_MONTHS.slice(0, upToMonth);`;

const NEW_FN = `export function RevenueTable({
  rows, upToMonth, showMonthCols, unit = 'cr',
  visibleCols = new Set(ALL_COLS), colLabels = DEFAULT_COL_LABELS,
  onUpdateColLabel, onUpdateHead, onClickHead, canManage, fyLabel = 'FY 2026-27'
}: Props) {
  const months = FY_MONTHS.slice(0, upToMonth);
  
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
  
  const curMonthShort = FY_MONTHS[upToMonth - 1].short.toUpperCase();`;
text = text.replace(OLD_FN, NEW_FN);

// 2. Replace the thead and tbody
// The entire <table ...> until </table> needs to be replaced.
const NEW_TABLE = `      <table className="w-full text-left border-collapse border border-slate-200">
        <thead className="bg-slate-50 text-slate-600 text-[11px] font-semibold sticky top-0 z-20 shadow-sm">
          <tr>
            <th className="px-3 py-2 text-left sticky left-0 bg-slate-50 border-r border-slate-200 border-b border-b-slate-200 min-w-[200px] z-30" rowSpan={2}>
              ITEMS
            </th>
            {showMonthCols && (
              <th className="px-2.5 py-2 text-center border-r border-slate-200 border-b border-b-slate-200" colSpan={12}>
                Monthly Actuals
              </th>
            )}
            <th className="px-3 py-1.5 text-center border-r border-slate-200 border-b border-b-slate-200" colSpan={2}>
              Actuals
            </th>
            <th className="px-3 py-1.5 text-center border-r border-slate-200 border-b border-b-slate-200" colSpan={3}>
              Target {cyFull}
            </th>
            <th className="px-3 py-1.5 text-center border-r border-slate-200 border-b border-b-slate-200" colSpan={3}>
              Current Month
            </th>
            <th className="px-3 py-1.5 text-center border-b border-b-slate-200" colSpan={3}>
              Cumulative Upto {curMonthShort}
            </th>
          </tr>
          <tr>
            {showMonthCols && months.map(m => (
              <th key={m.id} className="px-2.5 py-1.5 text-right border-r border-slate-200 border-b border-b-slate-200 font-medium">
                {m.short}
              </th>
            ))}
            <th className="px-3 py-1.5 text-right border-r border-slate-200 border-b border-b-slate-200 font-medium">
              {ppyFull}
            </th>
            <th className="px-3 py-1.5 text-right border-r border-slate-200 border-b border-b-slate-200 font-medium">{pyFull}</th>
            <th className="px-3 py-1.5 text-right border-r border-slate-200 border-b border-b-slate-200 font-medium">
              Month
            </th>
            <th className="px-3 py-1.5 text-right border-r border-slate-200 border-b border-b-slate-200 font-medium">{\`Upto \${curMonthShort}\`}</th>
            <th className="px-3 py-1.5 text-right border-r border-slate-200 border-b border-b-slate-200 font-medium">
              Yearly
            </th>
            <th className="px-3 py-1.5 text-right border-r border-slate-200 border-b border-b-slate-200 font-medium">
              {curMonthShort} '{pyFull.split('-')[1]}
            </th>
            <th className="px-3 py-1.5 text-right border-r border-slate-200 border-b border-b-slate-200 font-medium">
              {curMonthShort} '{cyFull.split('-')[1]}
            </th>
            <th className="px-3 py-1.5 text-right border-r border-slate-200 border-b border-b-slate-200 font-medium">
              % Var
            </th>
            <th className="px-3 py-1.5 text-right border-r border-slate-200 border-b border-b-slate-200 font-medium">
              {pyFull}
            </th>
            <th className="px-3 py-1.5 text-right border-r border-slate-200 border-b border-b-slate-200 font-medium">
              {cyFull}
            </th>
            <th className="px-3 py-1.5 text-right border-b border-b-slate-200 font-medium">
              % Var
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 bg-white">
          {rows.map(row => {
            const isTotal = row.isTotal;
            const isHdr = row.revenueHead.isHeader;
            const hBg = isTotal ? 'bg-slate-100 font-bold' : isHdr ? 'bg-slate-50 font-bold' : 'bg-inherit';
            
            return (
              <tr key={row.revenueHead.id} className={cn("group hover:bg-slate-50/50 transition-colors", hBg)}>
                <td className={cn(
                  'sticky left-0 z-10 px-3 py-2 whitespace-nowrap border-r border-slate-200',
                  hBg,
                  isHdr ? 'uppercase text-[11px] text-slate-700' : 'text-slate-800',
                  row.revenueHead.parentId ? 'pl-8 text-slate-600' : ''
                )} onClick={e => { e.stopPropagation(); if(onClickHead) onClickHead(row.revenueHead.id); }}>
                  <div className="flex items-center gap-2">
                    {!isTotal && !isHdr && (
                      <span className="inline-block w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: row.revenueHead.color }} />
                    )}
                    {canManage && !isTotal && onUpdateHead ? (
                      <EditableLabel
                        value={row.revenueHead.name}
                        onSave={v => onUpdateHead(row.revenueHead.id, v)}
                        className={isTotal ? 'uppercase tracking-wide text-[11px]' : ''}
                        inputClass="w-40"
                      />
                    ) : (
                      <span className={cn(isTotal ? 'uppercase tracking-wide text-[11px]' : '')}>
                        {row.revenueHead.name}
                      </span>
                    )}
                  </div>
                </td>

                {showMonthCols && months.map((m, i) => (
                  <td key={m.id} className="px-2.5 py-2 text-right text-slate-600 whitespace-nowrap text-[11px] border-r border-slate-200">
                    {isHdr ? '' : row.monthlyActuals[i] !== null ? fmt(row.monthlyActuals[i], unit) : '—'}
                  </td>
                ))}

                {/* Actuals */}
                <td className="px-3 py-2 text-right text-slate-600 whitespace-nowrap border-r border-slate-200">
                  {isHdr ? '' : row.actualsPrevPrevYear !== null ? fmt(row.actualsPrevPrevYear, unit) : '—'}
                </td>
                <td className="px-3 py-2 text-right text-slate-600 whitespace-nowrap border-r border-slate-200">
                  {isHdr ? '' : row.actualsPrevYear !== null ? fmt(row.actualsPrevYear, unit) : '—'}
                </td>

                {/* Target */}
                <td className="px-3 py-2 text-right text-indigo-700 whitespace-nowrap border-r border-slate-200">
                  {isHdr ? '' : row.targetMonth !== null ? fmt(row.targetMonth, unit) : '—'}
                </td>
                <td className="px-3 py-2 text-right text-indigo-700 whitespace-nowrap border-r border-slate-200">
                  {isHdr ? '' : row.targetUpto !== null ? fmt(row.targetUpto, unit) : '—'}
                </td>
                <td className="px-3 py-2 text-right text-indigo-700 whitespace-nowrap border-r border-slate-200">
                  {isHdr ? '' : row.targetYearly !== null ? fmt(row.targetYearly, unit) : '—'}
                </td>

                {/* Current Month */}
                <td className="px-3 py-2 text-right text-slate-600 whitespace-nowrap border-r border-slate-200">
                  {isHdr ? '' : row.currentMonthPY !== null ? fmt(row.currentMonthPY, unit) : '—'}
                </td>
                <td className="px-3 py-2 text-right text-slate-900 font-medium whitespace-nowrap border-r border-slate-200">
                  {isHdr ? '' : row.currentMonthCY !== null ? fmt(row.currentMonthCY, unit) : '—'}
                </td>
                <td className={cn("px-3 py-2 text-right font-semibold whitespace-nowrap border-r border-slate-200", getVariationColour(row.currentMonthVarPct))}>
                  {isHdr ? '' : row.currentMonthVarPct !== null ? formatPct(row.currentMonthVarPct) : '—'}
                </td>

                {/* Cumulative */}
                <td className="px-3 py-2 text-right text-slate-600 whitespace-nowrap border-r border-slate-200">
                  {isHdr ? '' : row.cumulativePreviousYear !== null ? fmt(row.cumulativePreviousYear, unit) : '—'}
                </td>
                <td className="px-3 py-2 text-right text-blue-900 font-semibold whitespace-nowrap bg-blue-50/30 border-r border-slate-200">
                  {isHdr ? '' : row.cumulativeCurrentYear !== null ? fmt(row.cumulativeCurrentYear, unit) : '—'}
                </td>
                <td className={cn("px-3 py-2 text-right font-bold whitespace-nowrap", getVariationColour(row.variationPct))}>
                  {isHdr ? '' : row.variationPct !== null ? formatPct(row.variationPct) : '—'}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>`;

const startTbl = text.indexOf('<table');
const endTbl = text.indexOf('</table>') + 8;

text = text.substring(0, startTbl) + NEW_TABLE + text.substring(endTbl);

fs.writeFileSync('src/components/financial/RevenueTable.tsx', text);
console.log('Patched RevenueTable cleanly');
