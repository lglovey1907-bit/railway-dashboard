const fs = require('fs');
let text = fs.readFileSync('src/components/financial/FinancialDashboard.tsx', 'utf8');

const OLD_EYE = `          <div className="relative">
            <button
              onClick={() => setColMenuOpen(!colMenuOpen)}
              className="p-1.5 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
              title="Columns"
            >
              <Columns size={16} />
            </button>
            {colMenuOpen && (
              <div className="absolute right-0 top-full mt-1 w-48 bg-white rounded-lg shadow-xl border border-slate-100 p-2 z-[100]">
                {ALL_COLS.map(key => (
                  <label key={key} className="flex items-center gap-2 p-1.5 hover:bg-slate-50 rounded cursor-pointer">
                    <input
                      type="checkbox"
                      checked={visibleCols.has(key)}
                      onChange={() => toggleCol(key)}
                      className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-xs text-slate-700">{colLabels[key]}</span>
                  </label>
                ))}
              </div>
            )}
          </div>`;

const NEW_EYE = `          <button
            onClick={() => toggleCol('monthly')}
            className={cn(
              "p-1.5 rounded-lg transition-colors text-xs font-medium flex items-center gap-1",
              visibleCols.has('monthly') ? "bg-blue-50 text-blue-600" : "text-slate-500 hover:text-slate-700 hover:bg-slate-100"
            )}
            title="Toggle Monthly Breakdown"
          >
            <Columns size={14} />
            {visibleCols.has('monthly') ? 'Hide Months' : 'Show Months'}
          </button>`;

text = text.replace(OLD_EYE, NEW_EYE);

fs.writeFileSync('src/components/financial/FinancialDashboard.tsx', text);
console.log('Patched FinancialDashboard.tsx');
