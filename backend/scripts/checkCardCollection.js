require('dotenv').config();
const assert = require('node:assert/strict');
const jwt = require('jsonwebtoken');
async function main() {
  if (process.env.NODE_ENV === 'production' || process.env.MONGO_DB_NAME !== 'inner-net-card-dev') throw new Error('Run only with development configuration');
  const [a, b] = process.argv.slice(2);
  if (![a, b].every(id => typeof id === 'string' && /^[a-fA-F0-9]{24}$/.test(id)) || a === b) throw new Error('Provide two different seeded user IDs');
  const cookies = Object.fromEntries([a, b].map(id => [id, 'jwt=' + jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '5m' })]));
  async function get(path, id) {
    const response = await fetch('http://localhost:3000/api/cards' + path, { headers: id ? { Cookie: cookies[id] } : {}, signal: AbortSignal.timeout(10000) });
    return { status: response.status, data: await response.json() };
  }
  assert.equal((await get('/me')).status, 401);
  console.log('PASS: unauthenticated access blocked');
  const A = await get('/me?limit=50', a);
  const B = await get('/me?limit=50', b);
  assert.equal(A.status, 200); assert.equal(B.status, 200);
  assert.ok(A.data.items.length >= 12 && B.data.items.length >= 12, 'Seed both users first');
  const idsA = new Set(A.data.items.map(x => x._id));
  assert.ok(B.data.items.every(x => !idsA.has(x._id)));
  const card = A.data.items[0];
  assert.equal((await get('/' + card._id, a)).status, 200);
  assert.equal((await get('/' + card._id, b)).status, 404);
  console.log('PASS: separate collections and cross-user detail blocked');
  assert.equal((await get('/me?userId=' + a, b)).status, 400);
  assert.equal((await get('/me?rarity=invalid', a)).status, 400);
  assert.equal((await get('/me?limit=0', a)).status, 400);
  assert.equal((await get('/me?cursor=invalid', a)).status, 400);
  console.log('PASS: invalid queries rejected');
  const filtered = await get('/me?rarity=common&status=available&limit=50', a);
  assert.equal(filtered.status, 200); assert.ok(filtered.data.items.length > 0);
  assert.ok(filtered.data.items.every(x => x.metadataSnapshot.rarity === 'common' && x.status === 'available'));
  console.log('PASS: rarity and status filters');
  const seen = new Set(); let cursor = null; let total;
  for (let page = 0; page < 1000; page++) {
    const result = await get('/me?limit=5' + (cursor ? '&cursor=' + cursor : ''), a);
    assert.equal(result.status, 200);
    total ??= result.data.total;
    assert.equal(result.data.total, total, 'Collection changed during test; use a stable fixture');
    for (const item of result.data.items) { assert.ok(!seen.has(item._id), 'Duplicate pagination ID'); seen.add(item._id); }
    cursor = result.data.nextCursor;
    if (!cursor) break;
  }
  assert.equal(cursor, null); assert.equal(seen.size, total);
  console.log('PASS: pagination has no duplicates or omissions on stable data');
  const templates = await get('/templates?limit=50', a);
  assert.equal(templates.status, 200); assert.ok(templates.data.items.length >= 10);
  const groups = new Map();
  for (const c of A.data.items) groups.set(c.templateId, (groups.get(c.templateId) || 0) + 1);
  assert.ok([...groups.values()].some(n => n > 1));
  console.log('PASS: catalog and multiple distinct copies of a template');
}
main().catch(e => { console.error('FAIL:', e.message); process.exitCode = 1; });
