require('dotenv').config({ path: '.env.local' });
const { kv } = require('@vercel/kv');

async function main() {
  const key = 'user:_shared_:config:financial_v1';
  let stateStr = await kv.get(key);
  let state = typeof stateStr === 'string' ? JSON.parse(stateStr) : stateStr;
  
  if (state && state.state && state.state.financialYears) {
    console.log("Using state.state");
    console.log(state.state.financialYears.map(y => `${y.yearString} - ${y.division} (${y.id})`));
  } else if (state && state.financialYears) {
    console.log("Using state directly");
    console.log(state.financialYears[0]);
  } else {
    console.log("Keys in top level:", Object.keys(state));
  }
}

main().catch(console.error);
