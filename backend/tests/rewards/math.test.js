const { test } = require('node:test');
const assert = require('node:assert/strict');
const { getRewardRules } = require('../../src/config/rewardRules.js');
const { businessDay, rollover, credit, pickRarity, validWeights } = require('../../src/services/rewardMath.js');
const r = getRewardRules({});
const start = Date.parse('2026-09-11T01:00:00Z');
function progress() { return { remainderMs: 0, dailyCount: 0, dayKey: businessDay(start).key, lastHeartbeatAt: null }; }
test('ACT-01/02/07: first heartbeat zero; 599 then 600; interval capped', () => {
  const p = progress(); assert.equal(credit(p, start, r), 0); p.lastHeartbeatAt = new Date(start);
  for (let s = 1; s <= 599; s++) { credit(p, start+s*1000, r); p.lastHeartbeatAt = new Date(start+s*1000); }
  assert.equal(p.remainderMs, 599000); credit(p, start+600000, r); assert.equal(p.remainderMs, 600000);
  const q = progress(); q.lastHeartbeatAt = new Date(start);
  assert.equal(credit(q, start+60000, r), 30000);
  assert.equal(credit(q, start+3600000, r), 0);
});
test('DROP-02: preserve 25-second remainder at a milestone', () => {
  const p = progress(); p.remainderMs = 595000; p.lastHeartbeatAt = new Date(start);
  credit(p, start+30000, r); assert.equal(p.remainderMs-r.intervalMs, 25000);
});
test('ACT-09/10: cap and Vietnam midnight', () => {
  const p = progress(); p.dailyCount = 6; p.remainderMs = 9000; p.lastHeartbeatAt = new Date(start);
  credit(p, start+1000, r); assert.equal(p.remainderMs, 0);
  const before = Date.parse('2026-09-11T16:59:50Z');
  p.dayKey = businessDay(before).key; p.dailyCount = 2; p.remainderMs = 125000; p.lastHeartbeatAt = new Date(before);
  credit(p, before+20000, r);
  assert.equal(p.dailyCount, 0); assert.equal(p.remainderMs, 135000); assert.equal(p.dayKey, '2026-09-12');
  rollover(p, before+30000); assert.equal(p.remainderMs, 135000);
});
test('DROP-05: every rarity boundary and invalid weights', () => {
  const expected = ['common','common','uncommon','uncommon','rare','rare','epic','epic','legendary'];
  [0,59,60,84,85,94,95,98,99].forEach((n,i) => assert.equal(pickRarity(n,r.weights),expected[i]));
  assert.equal(validWeights([['common',100]]),false); assert.throws(() => pickRarity(100,r.weights));
});
test('OPS-01: reject unsafe quick profile; standard is 600 seconds', () => {
  assert.equal(r.intervalMs,600000);
  assert.throws(() => getRewardRules({ CARD_REWARD_PROFILE:'quick', NODE_ENV:'production', MONGO_DB_NAME:'inner-net-card-dev' }));
  assert.throws(() => getRewardRules({ CARD_REWARD_PROFILE:'quick', NODE_ENV:'development', MONGO_DB_NAME:'inner-net' }));
  assert.equal(getRewardRules({ CARD_REWARD_PROFILE:'quick', NODE_ENV:'development', MONGO_DB_NAME:'inner-net-card-dev' }).intervalMs,60000);
});
