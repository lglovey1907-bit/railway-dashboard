import re

path = 'src/components/workspace/WidgetRenderer.tsx'
with open(path, 'r') as f:
    content = f.read()

view_marker = "// ── VIEW MODE ──────────────────────────────────────────────────────────────"
idx = content.find(view_marker)
if idx == -1:
    print("Could not find VIEW MODE")
    exit(1)

# Find the end of the HandoutWidget function.
# It ends with:
#     </div>
#   );
# }

end_marker = "  );\n}"
end_idx = content.find(end_marker, idx)
if end_idx == -1:
    print("Could not find end of HandoutWidget")
    exit(1)

view_code = content[idx:end_idx+6] # include `  );\n`

# Replace view code with a map over viewModeData
replacement = """  // ── VIEW MODE ──────────────────────────────────────────────────────────────
  const viewModeData = d.stationCode === 'ALL' ? multiData : [d];

  return (
    <>
    {BrowserToolbar}
    {checkDialog && (
      <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/30 backdrop-blur-sm"
        onClick={()=>setCheckDialog(null)}>
        <div className="bg-white rounded-2xl shadow-2xl p-5 w-72 space-y-3" onClick={e=>e.stopPropagation()}>
          <p className="text-sm font-bold text-slate-700">Mark as Checked</p>
          <p className="text-[11px] text-slate-400">Enter your name to record that you verified this section.</p>
          <input value={checkDialog.name}
            onChange={e=>setCheckDialog(p=>p?{...p,name:e.target.value}:p)}
            placeholder="Your name (e.g. Joginder Kumar)"
            autoFocus
            onKeyDown={e=>{ if(e.key==='Enter' && checkDialog.name.trim()) saveCheck(checkDialog.sec, checkDialog.name); }}
            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-amber-400"/>
          <div className="flex justify-end gap-2">
            <button onClick={()=>setCheckDialog(null)}
              className="px-3 py-1.5 text-xs text-slate-500 hover:bg-slate-100 rounded-lg">Cancel</button>
            <button onClick={()=>saveCheck(checkDialog.sec, checkDialog.name)}
              disabled={!checkDialog.name.trim()}
              className="px-3 py-1.5 text-xs bg-green-600 text-white rounded-lg disabled:opacity-40 hover:bg-green-700">
              ✓ Confirm Check
            </button>
          </div>
        </div>
      </div>
    )}
    <div className="flex flex-col gap-12">
      {viewModeData.map((stationData, idx) => {
        const d = stationData;
        const hasData = !!(d.stationName || d.stationCode);
        const visibleCH = d.counterHeads.filter(ch =>
          ch.name && (
            ch.total || ch.M || ch.E || ch.N ||
            ch.mpSanctioned || ch.mpOnRoll || ch.mpActual ||
            (ch.sides && ch.sides.some(s => s.count || s.M || s.E || s.N)) ||
            (ch.extraFields && ch.extraFields.some(ef => ef.value))
          )
        );
        const SecMeta = ({ meta, sec }: { meta?: SectionMeta; sec: string }) => {
          const { upd: updStr, chk } = fmtMeta(meta);
          return (
            <div className="flex items-center gap-1.5 flex-wrap">
              {updStr && <span className="text-[9px] text-slate-400 italic">✎ {updStr}</span>}
              {chk    && <span className="text-[9px] text-green-600 font-medium">✓ {chk}</span>}
              {canManage && (
                <button onClick={()=>setCheckDialog({sec, name:''})}
                  className="text-[9px] text-slate-300 hover:text-green-600 transition-colors border border-dashed border-slate-200 hover:border-green-400 rounded px-1 py-0.5">
                  ✓ Check
                </button>
              )}
            </div>
          );
        };
        return (
          <div key={d.stationCode || idx} className="space-y-5 bg-white border border-slate-200 shadow-sm p-4 rounded-xl">
            <div className="flex items-center justify-between border-b pb-2 mb-2">
               <h2 className="text-sm font-bold text-slate-800">{d.stationName} ({d.stationCode})</h2>
            </div>
            """

# We need to extract the actual inner JSX of the View Mode!
