require('dotenv').config({ path: '.env.local' });
const { kv } = require('@vercel/kv');

async function main() {
  const key = 'user:_shared_:config:financial_v1';
  let stateStr = await kv.get(key);
  let state = typeof stateStr === 'string' ? JSON.parse(stateStr) : stateStr;
  
  if (state && state.financialYears) {
    console.log(state.financialYears.map(y => `${y.yearString} - ${y.division}`));
  }
}

main().catch(console.error);
