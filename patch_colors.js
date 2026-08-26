const fs = require('fs');
const filepath = 'src/components/financial/RevenueTable.tsx';
let text = fs.readFileSync(filepath, 'utf8');

// Replace TableHeader colors
text = text.replace(/className="bg-slate-900/g, 'className="bg-[#0f2847]');
text = text.replace(/bg-slate-900/g, 'bg-[#0f2847]');
text = text.replace(/border-slate-800/g, 'border-[#1e3a5f]');
text = text.replace(/border-b-slate-800/g, 'border-b-[#1e3a5f]');
text = text.replace(/bg-slate-800/g, 'bg-[#153457]');

// Card Titles
text = text.replace(/bg-slate-50\/80 border-b border-slate-200/g, 'bg-[#f4f7fa] border-b border-[#e2e8f0]');
text = text.replace(/text-slate-800 text-sm/g, 'text-[#0f2847] text-[15px]');

// Data Row colors
text = text.replace(/hover:bg-slate-50\/50/g, 'hover:bg-[#f8fafc]');
text = text.replace(/border-slate-200/g, 'border-[#e2e8f0]');
text = text.replace(/bg-slate-50\/50/g, 'bg-[#f8fafc]');
text = text.replace(/bg-indigo-50\/30/g, 'bg-[#f0f4ff]');

fs.writeFileSync(filepath, text);

const dataEntryFile = 'src/components/financial/DataEntryModal.tsx';
let dataText = fs.readFileSync(dataEntryFile, 'utf8');
dataText = dataText.replace(/bg-slate-800/g, 'bg-[#0f2847]');
dataText = dataText.replace(/border-slate-700/g, 'border-[#1e3a5f]');
dataText = dataText.replace(/bg-slate-50\/80/g, 'bg-[#f4f7fa]');
dataText = dataText.replace(/hover:bg-slate-50\/50/g, 'hover:bg-[#f8fafc]');
fs.writeFileSync(dataEntryFile, dataText);

console.log('Colors updated');
