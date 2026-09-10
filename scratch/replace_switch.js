const fs = require('fs');
const path = 'src/components/workspace/WidgetRenderer.tsx';
let code = fs.readFileSync(path, 'utf8');

const regex = /const switchStation = \(code: string\) => \{[\s\S]*?catch\(\(\) => \{\}\);\n  \};\n/m;

const replacement = `const switchStation = (code: string) => {
    if (!code) return;
    
    // Find station details from HARDCODED_SECTIONS first
    let stationDetails = null;
    let foundSec = '';
    for (const [sec, stations] of Object.entries(HARDCODED_SECTIONS)) {
      const s = stations.find(x => x.code.toUpperCase() === code.toUpperCase());
      if (s) {
        stationDetails = s;
        foundSec = sec;
        break;
      }
    }
    
    // Fallback to ovRows if not in HARDCODED_SECTIONS
    const row = ovRows.find(r => (colCode ? String(r[colCode] ?? '').trim().toUpperCase() : '') === code.toUpperCase());

    import('@/lib/config/sharedSync').then(({ sharedRead }) => {
      sharedRead(\`handout_\${code.toUpperCase()}\`).then((val: unknown) => {
        if (val && typeof val === 'object') {
          const hd = val as HD;
          // Ensure it has the section matching our mapped list
          if (foundSec && hd.section !== foundSec) hd.section = foundSec;
          setD(hd);
          onUpdate({ handoutData: hd } as any);
        } else {
          const skeleton = mkHD();
          skeleton.stationCode = code.toUpperCase();
          
          if (stationDetails) {
            skeleton.stationName = stationDetails.name;
            skeleton.category = stationDetails.category;
            skeleton.section = foundSec;
            // Best effort extraction from ovRows for other fields
            if (row) {
              skeleton.state = colState ? String(row[colState] ?? '') : '';
              skeleton.cmi = colCMI ? String(row[colCMI] ?? '') : '';
            }
          } else if (row) {
            skeleton.stationName = colName ? String(row[colName] ?? '') : '';
            skeleton.category = colCat ? String(row[colCat] ?? '') : '';
            skeleton.state = colState ? String(row[colState] ?? '') : '';
            skeleton.section = colSec ? String(row[colSec] ?? '') : '';
            skeleton.cmi = colCMI ? String(row[colCMI] ?? '') : '';
          }
          
          setD(skeleton);
          onUpdate({ handoutData: skeleton } as any);
        }
        setEditing(false);
      }).catch(() => {});
    }).catch(() => {});
  };
`;

code = code.replace(regex, replacement);
fs.writeFileSync(path, code);
console.log("replaced switchStation");
