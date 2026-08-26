const fs = require('fs');
const filepath = 'src/components/financial/DataEntryModal.tsx';
let text = fs.readFileSync(filepath, 'utf8');

text = text.replace(
  `    currentMonthPY: '',
    actual: '', // Current Month CY
    remarks: '',`,
  `    currentMonthPY: '',
    actual: '', // Current Month CY
    cumulPY: '',
    cumulCY: '',
    remarks: '',`
);

text = text.replace(
  `      currentMonthPY: rec.currentMonthPY?.toString() ?? '',
      actual: rec.actual?.toString() ?? '',
      remarks: rec.remarks ?? '',`,
  `      currentMonthPY: rec.currentMonthPY?.toString() ?? '',
      actual: rec.actual?.toString() ?? '',
      cumulPY: rec.cumulPY?.toString() ?? '',
      cumulCY: rec.cumulCY?.toString() ?? '',
      remarks: rec.remarks ?? '',`
);

text = text.replace(
  `        previousYearActual: parseNum(form.currentMonthPY), // Must sync for cumulative calcs!
        actual: parseNum(form.actual),
        remarks: form.remarks,`,
  `        previousYearActual: parseNum(form.currentMonthPY), // Must sync for cumulative calcs!
        actual: parseNum(form.actual),
        cumulPY: parseNum(form.cumulPY),
        cumulCY: parseNum(form.cumulCY),
        remarks: form.remarks,`
);

const htmlGridOld = `                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="text-[10px] uppercase text-slate-500 font-bold mb-1 block">Month PY</label>
                            <input
                              type="number" step="0.01"
                              value={form.currentMonthPY} onChange={e => setForm({...form, currentMonthPY: e.target.value})}
                              className="w-full px-2 py-1.5 text-sm bg-white border border-slate-200 rounded focus:border-rail-400 focus:outline-none"
                            />
                          </div>
                          <div>
                            <label className="text-[10px] uppercase text-slate-500 font-bold mb-1 block">Month CY</label>
                            <input
                              type="number" step="0.01"
                              value={form.actual} onChange={e => setForm({...form, actual: e.target.value})}
                              className="w-full px-2 py-1.5 text-sm bg-white border border-slate-200 rounded focus:border-rail-400 focus:outline-none font-semibold text-slate-900"
                            />
                          </div>
                        </div>`;

const htmlGridNew = `                        <div className="grid grid-cols-4 gap-3">
                          <div>
                            <label className="text-[10px] uppercase text-slate-500 font-bold mb-1 block">Month PY</label>
                            <input
                              type="number" step="0.01"
                              value={form.currentMonthPY} onChange={e => setForm({...form, currentMonthPY: e.target.value})}
                              className="w-full px-2 py-1.5 text-sm bg-white border border-slate-200 rounded focus:border-rail-400 focus:outline-none"
                            />
                          </div>
                          <div>
                            <label className="text-[10px] uppercase text-slate-500 font-bold mb-1 block">Month CY</label>
                            <input
                              type="number" step="0.01"
                              value={form.actual} onChange={e => setForm({...form, actual: e.target.value})}
                              className="w-full px-2 py-1.5 text-sm bg-white border border-slate-200 rounded focus:border-rail-400 focus:outline-none font-semibold text-slate-900"
                            />
                          </div>
                          <div>
                            <label className="text-[10px] uppercase text-slate-500 font-bold mb-1 block">Cumul PY</label>
                            <input
                              type="number" step="0.01"
                              value={form.cumulPY} onChange={e => setForm({...form, cumulPY: e.target.value})}
                              className="w-full px-2 py-1.5 text-sm bg-white border border-slate-200 rounded focus:border-rail-400 focus:outline-none"
                            />
                          </div>
                          <div>
                            <label className="text-[10px] uppercase text-slate-500 font-bold mb-1 block">Cumul CY</label>
                            <input
                              type="number" step="0.01"
                              value={form.cumulCY} onChange={e => setForm({...form, cumulCY: e.target.value})}
                              className="w-full px-2 py-1.5 text-sm bg-white border border-slate-200 rounded focus:border-rail-400 focus:outline-none font-semibold text-slate-900"
                            />
                          </div>
                        </div>`;

text = text.replace(htmlGridOld, htmlGridNew);

fs.writeFileSync(filepath, text);
console.log('Patched DataEntryModal');
