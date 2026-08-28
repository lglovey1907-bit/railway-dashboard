import sys

with open('src/components/workspace/WidgetRenderer.tsx', 'r') as f:
    lines = f.readlines()

out = []
i = 0
while i < len(lines):
    line = lines[i]
    if 'if (!hasData && canManage) return (' in line:
        i += 11 # skip the early returns
        continue
    
    if '<div className="space-y-3">' in line and lines[i-1].strip() == '{/* Header */}':
        pass # Wait, header is inside space-y-3
    
    if '    <div className="space-y-3">' in line and lines[i+1].strip() == '{/* Header */}':
        out.append('    {!hasData ? (\n')
        out.append('      canManage ? (\n')
        out.append('        <div className="text-center py-8 space-y-3">\n')
        out.append('          <p className="text-4xl">🗂️</p>\n')
        out.append('          <p className="text-slate-300 text-sm italic">No station data yet</p>\n')
        out.append('          <div className="flex items-center justify-center gap-2">\n')
        out.append('            <button onClick={startEditing}\n')
        out.append('              className="px-4 py-2 text-xs bg-amber-600 text-white rounded-lg hover:bg-amber-700">\n')
        out.append('              Fill Station Data\n')
        out.append('            </button>\n')
        out.append('            <button onClick={()=>setShowDataSources(true)} title="Linked Data Sources"\n')
        out.append('              className="px-4 py-2 text-xs bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg flex items-center gap-1 border border-slate-200 shadow-sm">\n')
        out.append('              🔗 Link Source\n')
        out.append('            </button>\n')
        out.append('          </div>\n')
        out.append('        </div>\n')
        out.append('      ) : (\n')
        out.append('        <p className="text-xs text-slate-300 italic text-center py-4">No station data</p>\n')
        out.append('      )\n')
        out.append('    ) : (\n')
        out.append('      <>\n')
        out.append(line)
        i += 1
        continue

    if '{/* ── Cell Config Modal (admin only) ──────────────────────────────────── */}' in line:
        out.append('      </>\n')
        out.append('    )}\n\n')
        out.append(line)
        i += 1
        continue
        
    out.append(line)
    i += 1

with open('src/components/workspace/WidgetRenderer.tsx', 'w') as f:
    f.writelines(out)

print("Done")
