const { kv } = require('@vercel/kv');
require('dotenv').config({ path: '.env.local' });

async function check() {
  const data = await kv.get('user:_shared_:config:financial_v1');
  console.log(JSON.stringify(data).substring(0, 500));
}
check().catch(console.error);
