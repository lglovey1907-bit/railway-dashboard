require('dotenv').config({ path: '.env.local' });
const { kv } = require('@vercel/kv');

const NEW_HEADS = [
  { id: 'rh-pass', name: 'Passenger Revenue', code: 'PASS', order: 1, isTotal: false, isActive: true, color: '#3b82f6' },
  
  { id: 'rh-oc-hdr', name: 'Other Coaching Revenue', code: 'OCH', order: 2, isTotal: false, isActive: true, color: '#8b5cf6', isHeader: true },
  { id: 'rh-oc-parc', name: 'Parcel/Luggage', code: 'PARC', order: 3, isTotal: false, isActive: true, color: '#8b5cf6', parentId: 'rh-oc-hdr' },
  { id: 'rh-oc-tc', name: 'Ticket Checking', code: 'TC', order: 4, isTotal: false, isActive: true, color: '#6366f1', parentId: 'rh-oc-hdr' },
  { id: 'rh-oc-pf', name: 'PF Tickets', code: 'PF', order: 5, isTotal: false, isActive: true, color: '#a855f7', parentId: 'rh-oc-hdr' },
  { id: 'rh-oc-misc', name: 'Other Misc', code: 'OCM', order: 6, isTotal: false, isActive: true, color: '#d946ef', parentId: 'rh-oc-hdr' },
  { id: 'rh-oc-tot', name: 'Other Coaching Total', code: 'OCT', order: 7, isTotal: true, isActive: true, color: '#4c1d95', isSubTotalFor: 'rh-oc-hdr' },
  
  { id: 'rh-freight', name: 'Freight Revenue', code: 'FRT', order: 8, isTotal: false, isActive: true, color: '#f59e0b' },
  
  { id: 'rh-sun-hdr', name: 'Sundry Revenue', code: 'SUN', order: 9, isTotal: false, isActive: true, color: '#06b6d4', isHeader: true },
  { id: 'rh-sun-park', name: 'Parking Contracts etc', code: 'PRK', order: 10, isTotal: false, isActive: true, color: '#06b6d4', parentId: 'rh-sun-hdr' },
  { id: 'rh-sun-adv', name: 'Commercial Advertisements etc (with ATM)', code: 'ADV', order: 11, isTotal: false, isActive: true, color: '#0ea5e9', parentId: 'rh-sun-hdr' },
  { id: 'rh-sun-misc', name: 'Misc Others', code: 'SUNM', order: 12, isTotal: false, isActive: true, color: '#38bdf8', parentId: 'rh-sun-hdr' },
  { id: 'rh-sun-tot', name: 'Sundry Total', code: 'SUNT', order: 13, isTotal: true, isActive: true, color: '#164e63', isSubTotalFor: 'rh-sun-hdr' },
  
  { id: 'rh-nfr-hdr', name: 'Non Fare Revenue', code: 'NFR', order: 14, isTotal: false, isActive: true, color: '#10b981', isHeader: true, excludeFromGrandTotal: true },
  { id: 'rh-nfr-park', name: 'Parking cum stacking', code: 'NPK', order: 15, isTotal: false, isActive: true, color: '#10b981', parentId: 'rh-nfr-hdr', excludeFromGrandTotal: true },
  { id: 'rh-nfr-bot', name: 'Revenue from BOT', code: 'BOT', order: 16, isTotal: false, isActive: true, color: '#059669', parentId: 'rh-nfr-hdr', excludeFromGrandTotal: true },
  { id: 'rh-nfr-wait', name: 'Outsourcing of waiting rooms', code: 'WAIT', order: 17, isTotal: false, isActive: true, color: '#34d399', parentId: 'rh-nfr-hdr', excludeFromGrandTotal: true },
  { id: 'rh-nfr-cloak', name: 'Outsourcing of Cloak Room', code: 'CLK', order: 18, isTotal: false, isActive: true, color: '#6ee7b7', parentId: 'rh-nfr-hdr', excludeFromGrandTotal: true },
  { id: 'rh-nfr-romt', name: 'ROMT', code: 'ROMT', order: 19, isTotal: false, isActive: true, color: '#a7f3d0', parentId: 'rh-nfr-hdr', excludeFromGrandTotal: true },
  { id: 'rh-nfr-atm', name: 'ATM', code: 'ATM', order: 20, isTotal: false, isActive: true, color: '#047857', parentId: 'rh-nfr-hdr', excludeFromGrandTotal: true },
  { id: 'rh-nfr-adv', name: 'Commercial Advertisements etc', code: 'NADV', order: 21, isTotal: false, isActive: true, color: '#065f46', parentId: 'rh-nfr-hdr', excludeFromGrandTotal: true },
  { id: 'rh-nfr-mot', name: 'MOT', code: 'MOT', order: 22, isTotal: false, isActive: true, color: '#064e3b', parentId: 'rh-nfr-hdr', excludeFromGrandTotal: true },
  { id: 'rh-nfr-pack', name: 'Parcel Packet Packing', code: 'PACK', order: 23, isTotal: false, isActive: true, color: '#022c22', parentId: 'rh-nfr-hdr', excludeFromGrandTotal: true },
  { id: 'rh-nfr-scan', name: 'Parcel Scanner', code: 'SCAN', order: 24, isTotal: false, isActive: true, color: '#86efac', parentId: 'rh-nfr-hdr', excludeFromGrandTotal: true },
  { id: 'rh-nfr-nrhp', name: 'Non Rail head parking', code: 'NRHP', order: 25, isTotal: false, isActive: true, color: '#bbf7d0', parentId: 'rh-nfr-hdr', excludeFromGrandTotal: true },
  { id: 'rh-nfr-tot', name: 'Non Fare Total', code: 'NFRT', order: 26, isTotal: true, isActive: true, color: '#065f46', isSubTotalFor: 'rh-nfr-hdr' },

  { id: 'rh-total', name: 'Over All Revenue', code: 'TOTAL', order: 27, isTotal: true, isActive: true, color: '#1e3a5f' },
  
  { id: 'rh-opt', name: 'Originating Passenger Traffic (Million)', code: 'OPT', order: 28, isTotal: false, isActive: true, color: '#f43f5e', excludeFromGrandTotal: true },
];

async function main() {
  const key = 'user:_shared_:config:financial_v1';
  let stateStr = await kv.get(key);
  let state = typeof stateStr === 'string' ? JSON.parse(stateStr) : stateStr;

  if (state) {
    state.revenueHeads = NEW_HEADS;
    
    // We also should populate the data from the PDF for FY 26-27 Month 4
    const fy = state.financialYears.find(y => y.label === 'FY 2026-27');
    if (fy) {
      const month = 4; // July
      const data = [
        // Passenger
        { targetId: 'rh-pass', cy: 638.90, py: 609.96 },
        
        // Other Coaching
        { targetId: 'rh-oc-parc', cy: 41.31, py: 40.31 },
        { targetId: 'rh-oc-tc', cy: 4.78, py: 3.68 },
        { targetId: 'rh-oc-pf', cy: 0.90, py: 0.93 },
        { targetId: 'rh-oc-misc', cy: 9.76, py: 42.34 },
        
        // Freight
        { targetId: 'rh-freight', cy: 233.46, py: 224.71 },
        
        // Sundry
        { targetId: 'rh-sun-park', cy: 7.41, py: 4.58 },
        { targetId: 'rh-sun-adv', cy: 3.60, py: 1.76 },
        { targetId: 'rh-sun-misc', cy: 37.77, py: 96.54 },
        
        // NFR
        { targetId: 'rh-nfr-park', cy: 0.00, py: 0.58 },
        { targetId: 'rh-nfr-bot', cy: 0.12, py: 0.10 },
        { targetId: 'rh-nfr-wait', cy: 0.00, py: 0.00 },
        { targetId: 'rh-nfr-cloak', cy: 0.21, py: 0.42 },
        { targetId: 'rh-nfr-romt', cy: 0.40, py: 0.40 },
        { targetId: 'rh-nfr-atm', cy: 0.12, py: 0.32 },
        { targetId: 'rh-nfr-adv', cy: 3.48, py: 1.44 },
        { targetId: 'rh-nfr-mot', cy: 0.00, py: 0.00 },
        { targetId: 'rh-nfr-pack', cy: 0.09, py: 0.00 },
        { targetId: 'rh-nfr-scan', cy: 0.07, py: 0.07 },
        { targetId: 'rh-nfr-nrhp', cy: 0.74, py: 0.00 },
        
        // OPT
        { targetId: 'rh-opt', cy: 17.40, py: 17.90 },
      ];

      for (const d of data) {
        let rec = state.monthlyRecords.find(r => r.fyId === fy.id && r.month === month && r.revenueHeadId === d.targetId);
        if (rec) {
          rec.actual = d.cy;
          rec.previousYearActual = d.py;
          rec.status = 'published';
        } else {
          state.monthlyRecords.push({
            id: `rec-${fy.id}-${month}-${d.targetId}`,
            fyId: fy.id,
            month,
            revenueHeadId: d.targetId,
            targetStatus: 'available',
            status: 'published',
            actual: d.cy,
            previousYearActual: d.py,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          });
        }
      }
    }

    await kv.set(key, JSON.stringify(state));
    console.log("Updated KV with new headers and populated data for July");
  }
}

main().catch(console.error);
