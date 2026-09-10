const fs = require('fs');
const path = 'src/components/workspace/WidgetRenderer.tsx';
let code = fs.readFileSync(path, 'utf8');

const regex = /const BrowserToolbar = browserSections\.length > 0 \? \([\s\S]*?\) : null;\n/m;

const replacement = `const [batchUrl, setBatchUrl] = useState('');
  const [batchSyncStatus, setBatchSyncStatus] = useState('');
  
  const handleToolbarBatchSync = async () => {
    if (!batchUrl) return;
    const exportUrl = toDocHtmlUrl(batchUrl);
    if (!exportUrl) {
      setBatchSyncStatus('⚠ Invalid Google Doc URL');
      return;
    }
    setBatchSyncStatus('⏳ Fetching master document...');
    try {
      const res = await fetch(\`/api/fetch-doc?url=\${encodeURIComponent(exportUrl)}\`);
      const data: { content?: string; error?: string } = await res.json();
      if (!res.ok || data.error) throw new Error(data.error ?? \`HTTP \${res.status}\`);
      const rawHtml = data.content ?? '';

      if (rawHtml.includes('accounts.google.com') || rawHtml.includes('ServiceLogin') || rawHtml.includes('signin/oauth')) {
        throw new Error('Google is asking for sign-in. Make sure the document is shared with "Anyone with the link can view".');
      }

      setBatchSyncStatus('⏳ Parsing stations...');
      const hrBlocks = rawHtml.split(/<hr[^>]*\\/?>/gi);
      let updatedCount = 0;
      let newCodes: string[] = [];

      for (const blk of hrBlocks) {
        const extracted = parseDocForHandout(blk, '');
        const code = extracted.stationCode?.toUpperCase().trim();
        
        if (code) {
          // Verify if code belongs to current activeSection in HARDCODED_SECTIONS
          const validStations = HARDCODED_SECTIONS[activeSection] || [];
          if (!validStations.some(s => s.code.toUpperCase() === code)) {
             continue; // Only update stations belonging to the currently selected section
          }

          let existing = mkHD();
          existing.stationCode = code;
          
          const { sharedRead, sharedWrite } = await import('@/lib/config/sharedSync');
          try {
            const val: any = await sharedRead(\`handout_\${code}\`);
            if (val && typeof val === 'object') existing = { ...existing, ...val };
          } catch { /* ignore */ }

          const simpleKeys: (keyof DocFields)[] = ['stationCode','stationName','category','state','section','cmi','division','platforms','fob','waitingRooms','sanitation','earningBifurcation'];
          const merged: any = { ...existing };
          simpleKeys.forEach(k => { if (extracted[k]) merged[k] = extracted[k]; });
          
          if (extracted.ff) merged.ff = extracted.ff;
          if (extracted.ffComp) merged.ffComp = extracted.ffComp;
          if (extracted.trains) merged.trains = extracted.trains;
          if (extracted.primes) merged.primes = extracted.primes;
          if (extracted.stationEarning) merged.stationEarning = extracted.stationEarning;
          if (extracted.commercial?.length) merged.commercial = extracted.commercial;
          
          if (extracted.counterHeads?.length) {
            const byName = new Map<string, CounterHead>();
            for (const ch of existing.counterHeads) if (ch.name?.trim()) byName.set(ch.name.trim().toLowerCase(), ch);
            for (const ch of extracted.counterHeads) {
              const key = ch.name.trim().toLowerCase();
              const exist = byName.get(key);
              byName.set(key, exist ? { ...exist, ...ch, extraFields: exist.extraFields, sides: ch.sides, sideMode: ch.sideMode } : ch as any);
            }
            const named = [...byName.values()];
            const blanks = existing.counterHeads.filter(ch => !ch.name?.trim());
            merged.counterHeads = [...named, ...blanks];
          }
          
          // Force set the correct section
          merged.section = activeSection;

          if (code === (d.stationCode?.toUpperCase().trim())) {
            setD(merged);
            onUpdate({ handoutData: merged } as any);
          }
          
          await sharedWrite(\`handout_\${code}\`, merged);
          updatedCount++;
          newCodes.push(code);
        }
      }

      if (newCodes.length > 0) {
        try {
          const { sharedRead, sharedWrite } = await import('@/lib/config/sharedSync');
          const codesVal: any = await sharedRead('handout_codes');
          const serverCodes: string[] = Array.isArray(codesVal) ? codesVal : [];
          const allCodes = [...new Set([...serverCodes, ...newCodes])];
          await sharedWrite('handout_codes', allCodes);
        } catch { /* ignore */ }
      }

      setBatchSyncStatus(\`✅ Section Batch Sync complete! Updated \${updatedCount} stations in \${activeSection}.\`);
      setTimeout(() => setBatchSyncStatus(''), 5000);
    } catch (e) {
      setBatchSyncStatus(\`⚠ \${e instanceof Error ? e.message : String(e)}\`);
      setTimeout(() => setBatchSyncStatus(''), 8000);
    }
  };

  const BrowserToolbar = browserSections.length > 0 ? (
    <div className="flex flex-col gap-2 mb-4 bg-slate-50 border border-slate-200 p-2 rounded-xl">
      {/* Batch Sync Row */}
      {canManage && (
        <div className="flex flex-wrap items-center gap-2 p-2 bg-amber-50 rounded-lg border border-amber-200">
          <span className="text-[10px] font-bold text-amber-700 uppercase">Section Batch Sync:</span>
          <input 
            type="text" 
            placeholder="Paste Google Doc URL here..." 
            value={batchUrl}
            onChange={e => setBatchUrl(e.target.value)}
            className="flex-1 min-w-[200px] text-[10px] px-2 py-1 rounded border border-amber-300 focus:outline-none focus:border-amber-500 bg-white"
          />
          <button 
            onClick={handleToolbarBatchSync}
            disabled={!batchUrl || batchSyncStatus.includes('⏳')}
            className="bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white text-[10px] px-3 py-1 font-bold rounded shadow-sm transition-colors"
          >
            {batchSyncStatus.includes('⏳') ? 'Syncing...' : 'Start Batch Sync'}
          </button>
          {batchSyncStatus && (
            <span className={\`text-[10px] font-medium \${batchSyncStatus.startsWith('⚠') ? 'text-red-600' : 'text-green-700'}\`}>
              {batchSyncStatus}
            </span>
          )}
        </div>
      )}
      
      {/* Selection Row */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-2 flex-1 min-w-[150px]">
          <FolderOpen size={14} className="text-amber-600" />
          <select 
            value={activeSection} 
            onChange={e => { setActiveSection(e.target.value); switchStation(''); }}
            className="bg-white border border-slate-200 text-xs font-medium text-slate-700 px-2 py-1.5 rounded-lg focus:outline-none focus:border-amber-400 w-full"
          >
            {browserSections.map(s => <option key={s} value={s}>{s || 'Unknown Section'}</option>)}
          </select>
        </div>
        <div className="flex items-center gap-2 flex-1 min-w-[150px]">
          <MapPin size={14} className="text-amber-600" />
          <select 
            value={d.stationCode || ''}
            onChange={e => switchStation(e.target.value)}
            className="bg-white border border-slate-200 text-xs font-medium text-slate-700 px-2 py-1.5 rounded-lg focus:outline-none focus:border-amber-400 w-full"
          >
            <option value="" disabled>Select Station...</option>
            {browserStations.map(s => <option key={s.code} value={s.code}>{s.name} ({s.code})</option>)}
          </select>
        </div>
      </div>
    </div>
  ) : null;
`;

code = code.replace(regex, replacement);
fs.writeFileSync(path, code);
console.log("replaced BrowserToolbar");
