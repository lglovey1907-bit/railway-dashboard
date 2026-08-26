const r = { fyId: '1', month: 4, revenueHeadId: 'rh-oc-tc', target: null, targetUpto: null };
const existing = { fyId: '1', month: 4, revenueHeadId: 'rh-oc-tc', target: 3.68, targetUpto: 4.78 };

const updated = {
  ...existing,
  ...r,
};
console.log(updated);
