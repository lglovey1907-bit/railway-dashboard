import re

path = 'src/components/workspace/WidgetRenderer.tsx'
with open(path, 'r') as f:
    content = f.read()

# Replace Batch Sync block conditionally
old_batch = """      {canManage && (
        <div className="flex flex-wrap items-center gap-2 p-2 bg-amber-50 rounded-lg border border-amber-200">"""
new_batch = """      {canManage && activeSection !== 'All Sections' && (
        <div className="flex flex-wrap items-center gap-2 p-2 bg-amber-50 rounded-lg border border-amber-200">"""
content = content.replace(old_batch, new_batch)


# Find the BrowserToolbar definition
match = re.search(r'const BrowserToolbar = browserSections\.length > 0 \? \([\s\S]*?\) : null;\n', content)
if not match:
    print("Could not find BrowserToolbar")
    exit(1)

toolbar_code = match.group(0)

# Replace section select
old_sec_select = """          <select 
            value={activeSection} 
            onChange={e => { setActiveSection(e.target.value); switchStation(''); }}
            className="bg-white border border-slate-200 text-xs font-medium text-slate-700 px-2 py-1.5 rounded-lg focus:outline-none focus:border-amber-400 w-full"
          >
            {browserSections.map(s => <option key={s} value={s}>{s || 'Unknown Section'}</option>)}
          </select>"""
new_sec_select = """          <select 
            value={activeSection} 
            onChange={e => { setActiveSection(e.target.value); switchStation(''); }}
            className="bg-white border border-slate-200 text-xs font-medium text-slate-700 px-2 py-1.5 rounded-lg focus:outline-none focus:border-amber-400 w-full"
          >
            <option value="All Sections">All Sections</option>
            {browserSections.map(s => <option key={s} value={s}>{s || 'Unknown Section'}</option>)}
          </select>"""
toolbar_code = toolbar_code.replace(old_sec_select, new_sec_select)

# Replace station select
old_stn_select = """          <select 
            value={d.stationCode || ''}
            onChange={e => switchStation(e.target.value)}
            className="bg-white border border-slate-200 text-xs font-medium text-slate-700 px-2 py-1.5 rounded-lg focus:outline-none focus:border-amber-400 w-full"
          >
            <option value="" disabled>Select Station...</option>
            {browserStations.map(s => <option key={s.code} value={s.code}>{s.name} ({s.code})</option>)}
          </select>"""
new_stn_select = """          <select 
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
          </select>"""
toolbar_code = toolbar_code.replace(old_stn_select, new_stn_select)

content = content[:match.start()] + toolbar_code + content[match.end():]

with open(path, 'w') as f:
    f.write(content)
print("Replaced toolbar logic safely")
