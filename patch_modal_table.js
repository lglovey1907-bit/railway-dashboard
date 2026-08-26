const fs = require('fs');
const filepath = 'src/components/financial/DataEntryModal.tsx';
let text = fs.readFileSync(filepath, 'utf8');

// Update table headers
text = text.replace(
  '<th className="px-2 py-1 border-r border-b border-[#1e3a5f] text-center" colSpan={2}>Current Month</th>',
  '<th className="px-2 py-1 border-r border-b border-[#1e3a5f] text-center" colSpan={2}>Current Month</th>\n                        <th className="px-2 py-1 border-r border-b border-[#1e3a5f] text-center" colSpan={1}>Cumul</th>'
);

text = text.replace(
  '<th className="px-2 py-1 border-r border-[#1e3a5f] font-medium">PY</th>\n                        <th className="px-2 py-1 border-r border-[#1e3a5f] font-medium">CY</th>\n                      </tr>',
  '<th className="px-2 py-1 border-r border-[#1e3a5f] font-medium">PY</th>\n                        <th className="px-2 py-1 border-r border-[#1e3a5f] font-medium">CY</th>\n                        <th className="px-2 py-1 border-r border-[#1e3a5f] font-medium">PY Ovr</th>\n                      </tr>'
);

// Update editing row
text = text.replace(
  '<td className="px-1 py-1 border-r border-slate-200"><input type="number" value={form.actual} onChange={e => setForm(f => ({ ...f, actual: e.target.value }))} className="w-16 px-1 py-0.5 rounded border border-blue-300 text-right text-xs font-semibold" /></td>',
  '<td className="px-1 py-1 border-r border-slate-200"><input type="number" value={form.actual} onChange={e => setForm(f => ({ ...f, actual: e.target.value }))} className="w-16 px-1 py-0.5 rounded border border-blue-300 text-right text-xs font-semibold" /></td>\n                              <td className="px-1 py-1 border-r border-slate-200"><input type="number" value={form.cumulPY} onChange={e => setForm(f => ({ ...f, cumulPY: e.target.value }))} placeholder="Auto" className="w-16 px-1 py-0.5 rounded border border-slate-200 text-right text-xs bg-amber-50" /></td>'
);

// Update view row
text = text.replace(
  '<td className="px-2 py-2 text-right font-semibold text-slate-900 border-r border-slate-200">{isHdr ? \'\' : rec?.actual?.toFixed(2) ?? \'—\'}</td>',
  '<td className="px-2 py-2 text-right font-semibold text-slate-900 border-r border-slate-200">{isHdr ? \'\' : rec?.actual?.toFixed(2) ?? \'—\'}</td>\n                            <td className="px-2 py-2 text-right text-amber-700 border-r border-slate-200 bg-amber-50/30">{isHdr ? \'\' : rec?.cumulPY?.toFixed(2) ?? \'—\'}</td>'
);

fs.writeFileSync(filepath, text);
