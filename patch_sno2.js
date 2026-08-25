const { kv } = require('@vercel/kv');
require('dotenv').config({ path: '.env.local' });

async function patch() {
  const data = await kv.get('user:_shared_:config:financial_v1');
  if (!data || !data.revenueHeads) {
    console.log('No data'); return;
  }
  
  const heads = data.revenueHeads;
  const sNoMap = {
    'rh-pass': 'A',
    'rh-oc-hdr': 'B',
    'rh-oc-parc': 'i',
    'rh-oc-tc': 'ii',
    'rh-oc-pf': 'iii',
    'rh-oc-misc': 'iv',
    'rh-oc-tot': 'v',
    'rh-freight': 'c',
    'rh-sun-hdr': 'd',
    'rh-sun-park': 'i',
    'rh-sun-atm': 'ii',
    'rh-sun-misc': 'iii',
    'rh-sun-tot': 'iv',
    'rh-nf-hdr': 'e',
    'rh-nf-stack': 'i',
    'rh-nf-bot': 'ii',
    'rh-nf-wait': 'iii',
    'rh-nf-cloak': 'iv',
    'rh-nf-romt': 'v',
    'rh-nf-atm': 'vi',
    'rh-nf-com': 'vii',
    'rh-nf-mot': 'viii',
    'rh-nf-pack': 'iX',
    'rh-nf-scan': 'X',
    'rh-nf-nonrail': 'xi',
    'rh-nf-tot': 'xii',
    'rh-total': 'f'
  };
  
  for (const h of heads) {
    if (sNoMap[h.id]) {
      h.sNo = sNoMap[h.id];
    }
  }
  
  await kv.set('user:_shared_:config:financial_v1', data);
  console.log('Patched KV store with sNo');
}
patch().catch(console.error);
