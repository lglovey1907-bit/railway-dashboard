const fs = require('fs');
let text = fs.readFileSync('src/components/financial/RevenueTable.tsx', 'utf8');

const OLD_THEAD = `        <thead className="bg-slate-50 text-slate-600 text-[11px] font-semibold sticky top-0 z-20">`;
// We will replace everything from OLD_THEAD to </thead>

const endThead = text.indexOf('</thead>') + 8;
const beforeThead = text.substring(0, text.indexOf(OLD_THEAD));
const afterThead = text.substring(endThead);

const NEW_THEAD = `        <thead className="bg-slate-50 text-slate-600 text-[11px] font-semibold sticky top-0 z-20 shadow-sm">
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
              Target
            </th>
            <th className="px-3 py-1.5 text-center border-r border-slate-200 border-b border-b-slate-200" colSpan={3}>
              Current Month
            </th>
            <th className="px-3 py-1.5 text-center border-b border-b-slate-200" colSpan={3}>
              Cumulative Upto Month
            </th>
          </tr>
          <tr>
            {showMonthCols && months.map(m => (
              <th key={m.id} className="px-2.5 py-1.5 text-right border-r border-slate-200 border-b border-b-slate-200 font-medium">
                {m.short}
              </th>
            ))}
            <th className="px-3 py-1.5 text-right border-r border-slate-200 border-b border-b-slate-200 font-medium">
              Prev Prev Yr
            </th>
            <th className="px-3 py-1.5 text-right border-r border-slate-200 border-b border-b-slate-200 font-medium">
              Prev Yr
            </th>
            <th className="px-3 py-1.5 text-right border-r border-slate-200 border-b border-b-slate-200 font-medium">
              Month
            </th>
            <th className="px-3 py-1.5 text-right border-r border-slate-200 border-b border-b-slate-200 font-medium">
              Upto Month
            </th>
            <th className="px-3 py-1.5 text-right border-r border-slate-200 border-b border-b-slate-200 font-medium">
              Yearly
            </th>
            <th className="px-3 py-1.5 text-right border-r border-slate-200 border-b border-b-slate-200 font-medium">
              Prev Yr Month
            </th>
            <th className="px-3 py-1.5 text-right border-r border-slate-200 border-b border-b-slate-200 font-medium">
              Cur Yr Month
            </th>
            <th className="px-3 py-1.5 text-right border-r border-slate-200 border-b border-b-slate-200 font-medium">
              % Var
            </th>
            <th className="px-3 py-1.5 text-right border-r border-slate-200 border-b border-b-slate-200 font-medium">
              Prev Yr (CY)
            </th>
            <th className="px-3 py-1.5 text-right border-r border-slate-200 border-b border-b-slate-200 font-medium">
              Cur Yr (CY)
            </th>
            <th className="px-3 py-1.5 text-right border-b border-b-slate-200 font-medium">
              % Var
            </th>
          </tr>
        </thead>`;

let newText = beforeThead + NEW_THEAD + afterThead;

// Now rewrite the `<td>` mapping.
// Find `<tbody>` up to `</tbody>`
const tbodyStart = newText.indexOf('<tbody>');
const tbodyEnd = newText.indexOf('</tbody>') + 8;
const beforeTbody = newText.substring(0, tbodyStart);
const afterTbody = newText.substring(tbodyEnd);

const NEW_TBODY = `        <tbody className="divide-y divide-slate-100 bg-white">
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
                )} onClick={e => e.stopPropagation()}>
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
        </tbody>`;

newText = beforeTbody + NEW_TBODY + afterTbody;

fs.writeFileSync('src/components/financial/RevenueTable.tsx', newText);
console.log('Patched RevenueTable.tsx');
