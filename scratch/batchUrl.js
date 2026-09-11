const fs = require('fs');
const path = 'src/components/workspace/WidgetRenderer.tsx';
let code = fs.readFileSync(path, 'utf8');

const hookStr = `  const [batchUrl, setBatchUrl] = useState('');
  const [batchSyncStatus, setBatchSyncStatus] = useState('');`;

const newHookStr = `  const [batchUrl, setBatchUrl] = useState('');
  const [batchSyncStatus, setBatchSyncStatus] = useState('');

  // Load section-specific batch URL
  useEffect(() => {
    if (activeSection && activeSection !== 'All Sections') {
      import('@/lib/config/sharedSync').then(({ sharedRead }) => {
        sharedRead(\`handout_batch_url_\${activeSection}\`).then((val) => {
          if (typeof val === 'string') setBatchUrl(val);
          else setBatchUrl('');
        });
      });
    } else {
      setBatchUrl('');
    }
  }, [activeSection]);`;

code = code.replace(hookStr, newHookStr);

const inputStr = `          <input 
            type="text" 
            placeholder="Paste Google Doc URL here..." 
            value={batchUrl}
            onChange={e => setBatchUrl(e.target.value)}`;

const newInputStr = `          <input 
            type="text" 
            placeholder="Paste Google Doc URL here..." 
            value={batchUrl}
            onChange={e => setBatchUrl(e.target.value)}
            onBlur={() => {
              if (activeSection && activeSection !== 'All Sections') {
                import('@/lib/config/sharedSync').then(({ sharedWrite }) => {
                  sharedWrite(\`handout_batch_url_\${activeSection}\`, batchUrl);
                });
              }
            }}`;

code = code.replace(inputStr, newInputStr);

fs.writeFileSync(path, code);
console.log("Updated batchUrl to be section-wise");
