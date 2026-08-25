const { kv } = require('@vercel/kv');
const pdfParse = require('pdf-parse');
require('dotenv').config({ path: '.env.local' });

async function test() {
  const keys = await kv.keys('pdf_*');
  if (keys.length === 0) { console.log('No PDFs found'); return; }
  
  const id = keys[0];
  console.log('Testing PDF:', id);
  const base64 = await kv.get(id);
  if (!base64) { console.log('Empty base64'); return; }
  
  try {
    const buffer = Buffer.from(base64, 'base64');
    const data = await pdfParse(buffer);
    console.log('Parsed text length:', data.text.length);
    console.log(data.text.substring(0, 100));
  } catch (err) {
    console.error('pdfParse error:', err);
  }
}
test().catch(console.error);
