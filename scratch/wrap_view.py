import re

path = 'src/components/workspace/WidgetRenderer.tsx'
with open(path, 'r') as f:
    content = f.read()

view_marker = "// ── VIEW MODE ──────────────────────────────────────────────────────────────"
idx = content.find(view_marker)

# Replace the beginning of the return statement
old_return = """  return (
    <>
    {BrowserToolbar}
    {/* Check dialog — renders over view mode */}"""

new_return = """  const viewModeData = d.stationCode === 'ALL' ? multiData : [d];

  return (
    <>
    {BrowserToolbar}
    {/* Check dialog — renders over view mode */}"""

content = content.replace(old_return, new_return)

# Now find where {!hasData ? ( starts
has_data_idx = content.find("{!hasData ? (", idx)

old_has_data_def = "  const hasData = !!(d.stationName || d.stationCode);"
content = content.replace(old_has_data_def, "")

old_visible_ch_def = """  const visibleCH = d.counterHeads.filter(ch =>
    ch.name && (
      ch.total || ch.M || ch.E || ch.N ||
      ch.mpSanctioned || ch.mpOnRoll || ch.mpActual ||
      (ch.sides && ch.sides.some(s => s.count || s.M || s.E || s.N)) ||
      (ch.extraFields && ch.extraFields.some(ef => ef.value))
    )
  );"""
content = content.replace(old_visible_ch_def, "")

# Now find where we render the checkDialog and after it
check_dialog_end = "    )}\n\n    {!hasData ? ("

new_check_dialog_end = """    )}

    <div className="flex flex-col gap-12">
    {viewModeData.map((item_d, map_idx) => {
      const d = item_d;
      const hasData = !!(d.stationName || d.stationCode);
      const visibleCH = d.counterHeads.filter(ch =>
        ch.name && (
          ch.total || ch.M || ch.E || ch.N ||
          ch.mpSanctioned || ch.mpOnRoll || ch.mpActual ||
          (ch.sides && ch.sides.some(s => s.count || s.M || s.E || s.N)) ||
          (ch.extraFields && ch.extraFields.some(ef => ef.value))
        )
      );
      return (
        <div key={d.stationCode || map_idx} className="relative space-y-5">
          {viewModeData.length > 1 && (
            <div className="sticky top-0 z-10 bg-amber-100 border-b border-amber-300 px-3 py-2 -mx-2 mb-4 rounded-t-lg shadow-sm">
              <h2 className="text-sm font-bold text-amber-900">{d.stationName} ({d.stationCode})</h2>
            </div>
          )}
          {!hasData ? ("""

content = content.replace(check_dialog_end, new_check_dialog_end)

# Regex to find the end of HandoutWidget:
# We look for the exact sequence before `function EmbedWidget`
content = re.sub(r'(\s*</div>\s*</div>\s*</div>\s*\)\}\s*</>\s*\);\s*\})', r'\1', content) # just testing

old_end = r'(          </div>\n        </div>\n      </div>\n    \)\}\n    </>\n  \);\n\})'
new_end = r'          </div>\n        </div>\n      </div>\n    )}\n        </div>\n      );\n    })}\n    </div>\n    </>\n  );\n}'

content = re.sub(old_end, new_end, content, count=1)

with open(path, 'w') as f:
    f.write(content)
print("Wrapped View Mode in map correctly")
