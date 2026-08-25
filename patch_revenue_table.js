const fs = require('fs');
const filepath = 'src/components/financial/RevenueTable.tsx';
let text = fs.readFileSync(filepath, 'utf8');

// I will just replace the default export export function RevenueTable with the new logic.
// First, find everything from "export function RevenueTable" to the end of the file.

const parts = text.split('export function RevenueTable(');
if (parts.length !== 2) {
  console.log('Error splitting');
  process.exit(1);
}

const headerPart = parts[0];

const newTableCode = `export function RevenueTable({
  rows, upToMonth,
  showMonthCols = true, unit = 'cr',
  visibleCols, colLabels,
  onUpdateColLabel, onUpdateHead, onClickHead,
  canManage, fyLabel
}: Props) {
  const months = FY_MONTHS.slice(0, upToMonth);
  const match = (fyLabel || '').match(/20(\\d{2})-(\\d{2})/);
  let cyFull = '2026-27';
  let pyFull = '2025-26';
  let ppyFull = '2024-25';
  
  const curMonthData = FY_MONTHS[upToMonth - 1];
  const curMonthShort = curMonthData.short.toUpperCase();
  
  let cyYr = 26;
  let pyYr = 25;
  if (match) {
    const startYr = parseInt(match[1], 10);
    const endYr = parseInt(match[2], 10);
    cyFull = \`20\${startYr}-\${endYr}\`;
    pyFull = \`20\${startYr - 1}-\${endYr - 1}\`;
    ppyFull = \`20\${startYr - 2}-\${endYr - 2}\`;
    if (curMonthData.calMonth >= 4) {
      cyYr = startYr;
      pyYr = startYr - 1;
    } else {
      cyYr = endYr;
      pyYr = endYr - 1;
    }
  }
  
  const unitSuffix = unit === 'lacs' ? 'Lacs' : 'Cr';
  const labels = { ...DEFAULT_COL_LABELS, ...colLabels };
  const vis = visibleCols ?? new Set<ColKey>(ALL_COLS);

  // Group rows by top-level category
  const groups: CumulativeRow[][] = [];
  let currentGroup: CumulativeRow[] = [];

  rows.forEach(row => {
    const isTopLevelStart = !row.revenueHead.parentId && !row.revenueHead.isSubTotalFor && !row.revenueHead.isTotal;
    const isGrandTotal = row.revenueHead.isTotal && !row.revenueHead.isSubTotalFor;
    
    if (isTopLevelStart || isGrandTotal) {
      if (currentGroup.length > 0) groups.push(currentGroup);
      currentGroup = [row];
    } else {
      currentGroup.push(row);
    }
  });
  if (currentGroup.length > 0) groups.push(currentGroup);

  // The Header component to reuse across cards
  const TableHeader = () => (
    <thead className="bg-slate-900 text-slate-100 text-[11px] uppercase tracking-wider sticky top-0 z-20">
      <tr>
        <th className="px-2 py-1.5 text-center border-r border-slate-800 border-b border-b-slate-800 font-semibold w-10 sticky left-0 bg-slate-900 z-30" rowSpan={2}>
          S.No.
        </th>
        <th className="px-3 py-1.5 text-left border-r border-slate-800 border-b border-b-slate-800 font-semibold w-64 sticky left-[48px] bg-slate-900 z-30" rowSpan={2}>
          ITEMS
        </th>
        {showMonthCols && (
          <th className="px-3 py-1.5 text-center border-r border-slate-800 border-b border-b-slate-800" colSpan={months.length}>
            Monthly Actuals
          </th>
        )}
        <th className="px-3 py-1.5 text-center border-r border-slate-800 border-b border-b-slate-800" colSpan={2}>
          Achieved in year
        </th>
        <th className="px-3 py-1.5 text-center border-r border-slate-800 border-b border-b-slate-800" colSpan={3}>
          Target {cyFull}
        </th>
        <th className="px-3 py-1.5 text-center border-r border-slate-800 border-b border-b-slate-800" colSpan={3}>
          Current Month
        </th>
        <th className="px-3 py-1.5 text-center border-b border-b-slate-800" colSpan={3}>
          Cummulative Upto {curMonthShort} {cyYr.toString().padStart(2, '0')}
        </th>
      </tr>
      <tr>
        {showMonthCols && months.map(m => (
          <th key={m.id} className="px-2.5 py-1.5 text-right border-r border-slate-800 border-b border-b-slate-800 font-medium bg-slate-800">
            {m.short}
          </th>
        ))}
        <th className="px-3 py-1.5 text-right border-r border-slate-800 border-b border-b-slate-800 font-medium bg-slate-800">
          {ppyFull}
        </th>
        <th className="px-3 py-1.5 text-right border-r border-slate-800 border-b border-b-slate-800 font-medium bg-slate-800">{pyFull}</th>
        <th className="px-3 py-1.5 text-right border-r border-slate-800 border-b border-b-slate-800 font-medium bg-slate-800">Month</th>
        <th className="px-3 py-1.5 text-right border-r border-slate-800 border-b border-b-slate-800 font-medium bg-slate-800">{\`Upto \${curMonthShort}\`}</th>
        <th className="px-3 py-1.5 text-right border-r border-slate-800 border-b border-b-slate-800 font-medium bg-slate-800">Yearly</th>
        <th className="px-3 py-1.5 text-right border-r border-slate-800 border-b border-b-slate-800 font-medium bg-slate-800">
          {curMonthShort}'{pyYr.toString().padStart(2, '0')}
        </th>
        <th className="px-3 py-1.5 text-right border-r border-slate-800 border-b border-b-slate-800 font-medium bg-slate-800">
          {curMonthShort}'{cyYr.toString().padStart(2, '0')}
        </th>
        <th className="px-3 py-1.5 text-right border-r border-slate-800 border-b border-b-slate-800 font-medium bg-slate-800">%Variation</th>
        <th className="px-3 py-1.5 text-right border-r border-slate-800 border-b border-b-slate-800 font-medium bg-slate-800">{pyFull}</th>
        <th className="px-3 py-1.5 text-right border-r border-slate-800 border-b border-b-slate-800 font-medium bg-slate-800">{cyFull}</th>
        <th className="px-3 py-1.5 text-right border-b border-b-slate-800 font-medium bg-slate-800">%Variation</th>
      </tr>
    </thead>
  );

  return (
    <div className="space-y-8 pb-12">
      {groups.map((group, gIdx) => {
        const topRow = group[0];
        const title = topRow.revenueHead.isTotal ? topRow.revenueHead.name : (topRow.revenueHead.name || 'Category');
        const isGrandTotal = topRow.revenueHead.isTotal && !topRow.revenueHead.isSubTotalFor;
        
        // Find the summary row for the header badge (if available)
        const summaryRow = isGrandTotal ? topRow : group.find(r => r.revenueHead.isSubTotalFor === topRow.revenueHead.id) || topRow;
        
        return (
          <div key={topRow.revenueHead.id} className={cn("bg-white rounded-xl shadow-sm border overflow-hidden", isGrandTotal ? "border-indigo-200 shadow-md ring-1 ring-indigo-50" : "border-slate-200")}>
            
            {/* Card Header */}
            <div className={cn("px-4 py-3 flex items-center justify-between border-b", isGrandTotal ? "bg-indigo-50/50 border-indigo-100" : "bg-slate-50/80 border-slate-200")}>
              <div className="flex items-center gap-3">
                {!isGrandTotal && <span className="w-3 h-3 rounded-full shadow-sm" style={{ backgroundColor: topRow.revenueHead.color || '#94a3b8' }} />}
                <h3 className={cn("font-bold text-slate-800 text-lg", isGrandTotal ? "text-indigo-900 uppercase tracking-wide" : "")}>{title}</h3>
              </div>
              
              {summaryRow.variationPct !== null && (
                <div className="flex items-center gap-4 text-sm font-medium">
                  <div className="flex flex-col items-end">
                    <span className="text-slate-500 text-[10px] uppercase tracking-wider">Cumul. {cyFull}</span>
                    <span className="text-slate-900">{fmt(summaryRow.cumulativeCurrentYear, unit)} {unitSuffix}</span>
                  </div>
                  <div className={cn("px-2.5 py-1 rounded-md text-sm font-bold flex items-center gap-1", summaryRow.variationPct > 0 ? "bg-emerald-100 text-emerald-800" : summaryRow.variationPct < 0 ? "bg-rose-100 text-rose-800" : "bg-slate-100 text-slate-800")}>
                    {getArrow(summaryRow.variationPct)}
                    {formatPct(summaryRow.variationPct)}
                  </div>
                </div>
              )}
            </div>

            {/* Card Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <TableHeader />
                <tbody className="divide-y divide-slate-100 bg-white">
                  {group.map(row => {
                    const isTotal = row.revenueHead.isTotal;
                    const isHdr = row.revenueHead.isHeader;
                    const hBg = isTotal ? 'bg-slate-100 font-bold' : isHdr ? 'bg-slate-50 font-bold' : 'bg-inherit';
                    
                    return (
                      <tr key={row.revenueHead.id} className={cn("group hover:bg-slate-50/80 transition-colors", hBg)}>
                        <td className={cn(
                          'sticky left-0 z-10 px-2 py-2 text-center text-[11px] whitespace-nowrap border-r border-slate-200 font-medium',
                          hBg, 'text-slate-700'
                        )}>
                          {row.revenueHead.sNo || ''}
                        </td>
                        <td className={cn(
                          'sticky left-[48px] z-10 px-3 py-2 whitespace-nowrap border-r border-slate-200',
                          hBg,
                          isHdr ? 'uppercase text-[11px] text-slate-700' : 'text-slate-800',
                          row.revenueHead.parentId ? 'pl-8 text-slate-600' : ''
                        )} onClick={e => { e.stopPropagation(); if(onClickHead) onClickHead(row.revenueHead.id); }}>
                          <div className="flex items-center gap-2">
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
                          <td key={m.id} className="px-2.5 py-2 text-right text-slate-600 whitespace-nowrap text-[11px] border-r border-slate-100 group-hover:border-slate-200">
                            {isHdr ? '' : row.monthlyActuals[i] !== null ? fmt(row.monthlyActuals[i], unit) : '—'}
                          </td>
                        ))}

                        {/* Actuals */}
                        <td className="px-3 py-2 text-right text-slate-600 whitespace-nowrap border-r border-slate-100 group-hover:border-slate-200">
                          {isHdr ? '' : row.actualsPrevPrevYear !== null ? fmt(row.actualsPrevPrevYear, unit) : '—'}
                        </td>
                        <td className="px-3 py-2 text-right text-slate-600 whitespace-nowrap border-r border-slate-200 bg-slate-50/30">
                          {isHdr ? '' : row.actualsPrevYear !== null ? fmt(row.actualsPrevYear, unit) : '—'}
                        </td>

                        {/* Target */}
                        <td className="px-3 py-2 text-right text-indigo-700 whitespace-nowrap border-r border-slate-100 group-hover:border-slate-200">
                          {isHdr ? '' : row.targetMonth !== null ? fmt(row.targetMonth, unit) : '—'}
                        </td>
                        <td className="px-3 py-2 text-right text-indigo-700 whitespace-nowrap border-r border-slate-100 group-hover:border-slate-200">
                          {isHdr ? '' : row.targetUpto !== null ? fmt(row.targetUpto, unit) : '—'}
                        </td>
                        <td className="px-3 py-2 text-right text-indigo-700 whitespace-nowrap border-r border-slate-200 bg-indigo-50/10">
                          {isHdr ? '' : row.targetYearly !== null ? fmt(row.targetYearly, unit) : '—'}
                        </td>

                        {/* Current Month */}
                        <td className="px-3 py-2 text-right text-slate-600 whitespace-nowrap border-r border-slate-100 group-hover:border-slate-200">
                          {isHdr ? '' : row.currentMonthPY !== null ? fmt(row.currentMonthPY, unit) : '—'}
                        </td>
                        <td className="px-3 py-2 text-right text-slate-900 font-medium whitespace-nowrap border-r border-slate-100 group-hover:border-slate-200">
                          {isHdr ? '' : row.currentMonthCY !== null ? fmt(row.currentMonthCY, unit) : '—'}
                        </td>
                        <td className={cn("px-3 py-2 text-right font-semibold whitespace-nowrap border-r border-slate-200", getVariationColour(row.currentMonthVarPct ?? null))}>
                          {isHdr ? '' : row.currentMonthVarPct !== null ? formatPct(row.currentMonthVarPct ?? null) : '—'}
                        </td>

                        {/* Cumulative */}
                        <td className="px-3 py-2 text-right text-slate-600 whitespace-nowrap border-r border-slate-100 group-hover:border-slate-200">
                          {isHdr ? '' : row.cumulativePreviousYear !== null ? fmt(row.cumulativePreviousYear, unit) : '—'}
                        </td>
                        <td className="px-3 py-2 text-right text-blue-900 font-semibold whitespace-nowrap bg-blue-50/30 border-r border-slate-100 group-hover:border-slate-200">
                          {isHdr ? '' : row.cumulativeCurrentYear !== null ? fmt(row.cumulativeCurrentYear, unit) : '—'}
                        </td>
                        <td className={cn("px-3 py-2 text-right font-bold whitespace-nowrap", getVariationColour(row.variationPct))}>
                          {isHdr ? '' : row.variationPct !== null ? formatPct(row.variationPct) : '—'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        );
      })}
    </div>
  );
}
`;

fs.writeFileSync(filepath, headerPart + newTableCode);
console.log('Replaced RevenueTable with modular cards layout.');
