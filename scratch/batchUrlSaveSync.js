const fs = require('fs');
const path = 'src/components/workspace/WidgetRenderer.tsx';
let code = fs.readFileSync(path, 'utf8');

const syncStart = `  const handleToolbarBatchSync = async () => {
    if (!batchUrl) return;`;

const newSyncStart = `  const handleToolbarBatchSync = async () => {
    if (!batchUrl) return;
    
    // Auto-save the URL for this section before starting sync
    if (activeSection && activeSection !== 'All Sections') {
      import('@/lib/config/sharedSync').then(({ sharedWrite }) => {
        sharedWrite(\`handout_batch_url_\${activeSection}\`, batchUrl);
      });
    }`;

code = code.replace(syncStart, newSyncStart);
fs.writeFileSync(path, code);
