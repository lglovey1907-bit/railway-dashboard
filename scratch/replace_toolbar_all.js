const fs = require('fs');
const path = 'src/components/workspace/WidgetRenderer.tsx';
let code = fs.readFileSync(path, 'utf8');

// Replace selection row in BrowserToolbar
const selectionRowRegex = /<select [\s\S]*?value=\{activeSection\}[\s\S]*?>\s*\{browserSections\.map\([\s\S]*?<\/select>/;

const selectionRowReplacement = `<select 
            value={activeSection} 
            onChange={e => { setActiveSection(e.target.value); switchStation(''); }}
            className="bg-white border border-slate-200 text-xs font-medium text-slate-700 px-2 py-1.5 rounded-lg focus:outline-none focus:border-amber-400 w-full"
          >
            <option value="All Sections">All Sections</option>
            {browserSections.map(s => <option key={s} value={s}>{s || 'Unknown Section'}</option>)}
          </select>`;

code = code.replace(selectionRowRegex, selectionRowReplacement);

const stationRowRegex = /<select [\s\S]*?value=\{d.stationCode \|\| ''\}[\s\S]*?>\s*<option value="" disabled>Select Station\.\.\.<\/option>\s*\{browserStations\.map\([\s\S]*?<\/select>/;

const stationRowReplacement = `<select 
            value={d.stationCode || ''}
            onChange={e => switchStation(e.target.value)}
            className="bg-white border border-slate-200 text-xs font-medium text-slate-700 px-2 py-1.5 rounded-lg focus:outline-none focus:border-amber-400 w-full"
          >
            <option value="" disabled>Select Station...</option>
            {activeSection === 'All Sections' ? (
              browserSections.map(sec => (
                <optgroup key={sec} label={sec}>
                  {[...(HARDCODED_SECTIONS[sec] || [])]
                    .sort((a,b) => a.name.localeCompare(b.name))
                    .map(s => <option key={s.code} value={s.code}>{s.name} ({s.code})</option>)}
                </optgroup>
              ))
            ) : (
              browserStations.map(s => <option key={s.code} value={s.code}>{s.name} ({s.code})</option>)
            )}
          </select>`;

code = code.replace(stationRowRegex, stationRowReplacement);

// Hide Batch sync if 'All Sections'
const batchSyncRegex = /\{canManage && \(/;
const batchSyncReplacement = `{canManage && activeSection !== 'All Sections' && (`;

code = code.replace(batchSyncRegex, batchSyncReplacement);

fs.writeFileSync(path, code);
console.log("replaced toolbar logic");
