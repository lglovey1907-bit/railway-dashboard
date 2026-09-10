const fs = require('fs');
const path = 'src/components/workspace/WidgetRenderer.tsx';
let code = fs.readFileSync(path, 'utf8');

// Add multiData state
code = code.replace(
  "const [d, setD] = useState<HD>(() => {",
  "const [multiData, setMultiData] = useState<HD[]>([]);\n  const [d, setD] = useState<HD>(() => {"
);

// Update switchStation
const oldSwitch = `  const switchStation = (code: string) => {
    if (!code) return;`;

const newSwitch = `  const switchStation = (code: string) => {
    if (!code) return;

    if (code === 'ALL') {
      const stations = HARDCODED_SECTIONS[activeSection] || [];
      const codes = stations.map(s => s.code.toUpperCase());
      import('@/lib/config/sharedSync').then(async ({ sharedRead }) => {
        const loaded: HD[] = [];
        for (const stnCode of codes) {
          const val = await sharedRead(\`handout_\${stnCode}\`);
          if (val && typeof val === 'object') {
            loaded.push(val as HD);
          } else {
             const stn = stations.find(s => s.code === stnCode);
             const sk = mkHD(); sk.stationCode = stnCode; sk.stationName = stn?.name||''; sk.section = activeSection;
             loaded.push(sk);
          }
        }
        setMultiData(loaded);
        const dummyAll = mkHD();
        dummyAll.stationCode = 'ALL';
        setD(dummyAll);
        onUpdate({ handoutData: dummyAll } as any);
        setEditing(false);
      });
      return;
    }`;

code = code.replace(oldSwitch, newSwitch);

// Add option to the station dropdown
const oldStnSelect = `<option value="" disabled>Select Station...</option>`;
const newStnSelect = `<option value="" disabled>Select Station...</option>
            {activeSection !== 'All Sections' && <option value="ALL" className="font-bold text-amber-800 bg-amber-100">-- ALL STATIONS IN {activeSection} --</option>}`;

code = code.replace(oldStnSelect, newStnSelect);

fs.writeFileSync(path, code);
console.log("Added multiData and switchStation logic");
