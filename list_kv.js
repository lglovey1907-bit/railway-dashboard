require('dotenv').config({ path: '.env.local' });
const { kv } = require('@vercel/kv');

async function main() {
  const keys = await kv.keys('*');
  console.log(keys);
}

main().catch(console.error);
