const fs = require('fs');

let text = fs.readFileSync('src/components/monthly/MonthlyReportWidget.tsx', 'utf8');

const OLD = `  const handleFetchSheet = async (src: DataSource) => {`;

const NEW = `  const handleFetchDoc = async (src: DataSource) => {
    setFetchingDsId(src.id);
    try {
      if (src.type === 'pdf') {
        const pdfId = new URL(src.url, window.location.origin).searchParams.get('id');
        if (!pdfId) throw new Error('Invalid PDF URL ID');
        
        const res = await fetch(\`/api/parse-pdf?id=\${pdfId}\`);
        if (!res.ok) throw new Error('Failed to parse PDF');
        const data = await res.json();
        
        const newMonths = { ...report?.months };
        if (!newMonths[selectedMonth]) newMonths[selectedMonth] = { month: selectedMonth, heads: {} };

        const lines = data.text.split('\\n');
        lines.forEach((line: string) => {
          let targetId = '';
          const l = line.toLowerCase();
          if (l.includes('passenger revenue')) targetId = 'pass';
          else if (l.includes('other coaching revenue') || (l.includes('total') && l.includes('coaching'))) targetId = 'oc';
          else if (l.includes('freight revenue') || l.includes('goods revenue')) targetId = 'goods';
          else if (l.includes('sundry revenue') && l.includes('total')) targetId = 'sundry';
          
          if (targetId) {
            const nums = line.match(/[\\d,]+\\.\\d+/g);
            if (nums && nums.length >= 2) {
              const cyStr = nums[nums.length - 1].replace(/,/g, '');
              const pyStr = nums[nums.length - 2].replace(/,/g, '');
              const cy = parseFloat(cyStr);
              const py = parseFloat(pyStr);
              
              if (!isNaN(cy) && !isNaN(py)) {
                if (!newMonths[selectedMonth].heads[targetId]) {
                  newMonths[selectedMonth].heads[targetId] = { cy: 0, py: 0 };
                }
                newMonths[selectedMonth].heads[targetId].cy = cy;
                newMonths[selectedMonth].heads[targetId].py = py;
              }
            }
          }
        });
        
        await fetch(\`/api/monthly?division=\${division}&fyYear=\${fyYear}\`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            division,
            fyYear,
            months: newMonths,
            updatedAt: new Date().toISOString()
          })
        });
        alert('PDF Parsed and data mapped for Monthly Statement!');
        refresh();
      } else {
        alert('Google Docs parsing not implemented here.');
      }
    } catch (err: any) {
      alert('Error: ' + err.message);
    } finally {
      setFetchingDsId(null);
    }
  };

  const handleFetchSheet = async (src: DataSource) => {`;

text = text.replace(OLD, NEW);
text = text.replace('onFetchDoc={handleFetchSheet}', 'onFetchDoc={handleFetchDoc}');

fs.writeFileSync('src/components/monthly/MonthlyReportWidget.tsx', text);
console.log('Patched MonthlyReportWidget.tsx');
