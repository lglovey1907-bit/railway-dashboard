const fs = require('fs');
let text = fs.readFileSync('src/components/financial/FinancialDashboard.tsx', 'utf8');

text = text.replace('const [colMenuOpen, setColMenuOpen] = useState(false);', '');

fs.writeFileSync('src/components/financial/FinancialDashboard.tsx', text);
console.log('Removed colMenuOpen');
