const fs = require('fs');

const path = 'src/components/workspace/WidgetRenderer.tsx';
let code = fs.readFileSync(path, 'utf8');

const regex = /const browserSections = useMemo\(\(\) => \{[\s\S]*?const switchStation = \(code: string\) => \{/m;

const replacement = `const browserSections = Object.keys(HARDCODED_SECTIONS);

  const [activeSection, setActiveSection] = useState<string>('');
  
  useEffect(() => {
    if (!activeSection && browserSections.length > 0) {
      // Find the section that contains the current station
      let foundSection = '';
      if (d.stationCode) {
        for (const [sec, stations] of Object.entries(HARDCODED_SECTIONS)) {
          if (stations.some(s => s.code.toUpperCase() === d.stationCode?.toUpperCase())) {
            foundSection = sec;
            break;
          }
        }
      }
      setActiveSection(foundSection || d.section || browserSections[0]);
    }
  }, [activeSection, browserSections, d.stationCode, d.section]);

  const browserStations = useMemo(() => {
    if (!activeSection || !HARDCODED_SECTIONS[activeSection]) return [];
    return [...HARDCODED_SECTIONS[activeSection]].sort((a,b) => a.name.localeCompare(b.name));
  }, [activeSection]);

  const switchStation = (code: string) => {`;

code = code.replace(regex, replacement);
fs.writeFileSync(path, code);
console.log("replaced browser logic");
