const fs = require('fs');

let text = fs.readFileSync('src/components/financial/FinancialDashboard.tsx', 'utf8');

const OLD = `  const handleFetchSheet = async (src: any) => {`;

const NEW = `  const handleFetchDoc = async (src: any) => {
    setFetchingDsId(src.id);
    try {
      if (src.type === 'pdf') {
        // PDF flow
        const pdfId = new URL(src.url, window.location.origin).searchParams.get('id');
        if (!pdfId) throw new Error('Invalid PDF URL ID');
        
        const res = await fetch(\`/api/parse-pdf?id=\${pdfId}\`);
        if (!res.ok) throw new Error('Failed to parse PDF');
        
        const data = await res.json();
        
        // Use regex to find values based on the new seed heads structure
        // e.g., Passenger Revenue \\d+\\.\\d+ ... \\d+\\.\\d+ \\d+\\.\\d+
        // Very basic stub parser:
        const lines = data.text.split('\\n');
        lines.forEach((line: string) => {
          let targetId = '';
          const l = line.toLowerCase();
          if (l.includes('passenger revenue')) targetId = 'rh-pass';
          else if (l.includes('parcel/luggage')) targetId = 'rh-oc-parc';
          else if (l.includes('ticket checking')) targetId = 'rh-oc-tc';
          else if (l.includes('pf tickets')) targetId = 'rh-oc-pf';
          else if (l.includes('freight revenue')) targetId = 'rh-freight';
          else if (l.includes('parking contracts')) targetId = 'rh-sun-park';
          
          if (targetId) {
            // Find last two numbers (usually CY and PY)
            const nums = line.match(/[\\d,]+\\.\\d+/g);
            if (nums && nums.length >= 2) {
              const cyStr = nums[nums.length - 1].replace(/,/g, '');
              const pyStr = nums[nums.length - 2].replace(/,/g, '');
              const cy = parseFloat(cyStr);
              const py = parseFloat(pyStr);
              
              if (!isNaN(cy) && !isNaN(py)) {
                store.upsertRecord({
                  fyId: selectedFYId,
                  month: selectedMonth,
                  revenueHeadId: targetId,
                  actual: cy,
                  previousYearActual: py,
                  status: 'published',
                  targetStatus: 'available'
                }, 'Auto-Fill from PDF');
              }
            }
          }
        });
        alert('PDF Parsed and data mapped (some fields may require manual check)');
      } else {
        alert('Google Docs parsing not fully implemented for this widget yet.');
      }
    } catch (err: any) {
      alert('Error fetching doc: ' + err.message);
    } finally {
      setFetchingDsId(null);
    }
  };

  const handleFetchSheet = async (src: any) => {`;

text = text.replace(OLD, NEW);

// Now update the JSX prop
text = text.replace('onFetchDoc={handleFetchSheet}', 'onFetchDoc={handleFetchDoc}');

fs.writeFileSync('src/components/financial/FinancialDashboard.tsx', text);
console.log('Patched FinancialDashboard.tsx');
