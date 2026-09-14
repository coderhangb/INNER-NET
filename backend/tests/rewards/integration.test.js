require('dotenv').config();
const { test } = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');
const { randomUUID } = require('node:crypto');
const User = require('../../src/models/User.js');
const Progress = require('../../src/models/RewardProgress.js');
const Grant = require('../../src/models/RewardGrant.js');
const Template = require('../../src/models/CardTemplate.js');
const Card = require('../../src/models/CardInstance.js');
const Event = require('../../src/models/AssetEvent.js');
const { getRewardRules } = require('../../src/config/rewardRules.js');
const { createActivityService } = require('../../src/services/activityService.js');
const { businessDay } = require('../../src/services/rewardMath.js');
test('Real MongoDB reward transactions (isolated test DB)', { timeout: 180000 }, async t => {
  assert.ok(['development','test'].includes(process.env.NODE_ENV), 'Use development/test');
  assert.equal(process.env.MONGO_DB_NAME, 'inner-net-rewards-test', 'Only inner-net-rewards-test is allowed');
  assert.ok(process.env.MONGO_URI, 'MONGO_URI required');
  const userIds = [], templateIds = [];
  try {
    await mongoose.connect(process.env.MONGO_URI, { dbName: 'inner-net-rewards-test', serverSelectionTimeoutMS:10000 });
    assert.equal(mongoose.connection.name, 'inner-net-rewards-test');
    for (const M of [Progress,Grant,Template,Card,Event]) {
      assert.equal(await M.countDocuments(), 0, `Test DB must be empty: ${M.modelName}. No automatic deletion of existing data.`);
      await M.createIndexes();
    }
    const rules = getRewardRules({});
    let now = Date.parse('2026-09-11T01:00:00Z');
    const clock = { now: () => now };
    const service = createActivityService({ rules, clock, rng:{ randomInt: () => 0 } });
    for (const [rarity] of rules.weights) for (let i=0;i<2;i++) {
      const id = new mongoose.Types.ObjectId(); templateIds.push(id);
      await Template.create({ _id:id, slug:`test-${randomUUID()}`, version:1, name:`Test ${rarity}`, rarity, description:'test', symbol:'*', active:true });
    }
    async function user(role='student') {
      const id=new mongoose.Types.ObjectId(); userIds.push(id);
      // Internal test principals only, never exposed as login fixtures; no password bypass API.
      await User.collection.insertOne({ _id:id, role, email:`${id}@example.invalid`, publicCode:`test-${id}` });
      return id;
    }
    async function session(id, svc=service) {
      const opened=await svc.open(id); assert.ok(opened.sessionId);
      let seq=0;
      return { sid:opened.sessionId, send:(extra={}, n=++seq) => svc.heartbeat(id,{sessionId:opened.sessionId,sequence:n,visible:true,active:true,...extra}) };
    }
    async function near(id) { await Progress.updateOne({_id:id},{$set:{remainderMs:599000}}); }
    await t.test('ACT-01/02/03/05 DROP-01/03/04 DATA-02: first zero, concurrent threshold and replay', async () => {
      const id=await user(); const s=await session(id);
      assert.equal((await s.send()).remainderSeconds,0);
      assert.equal((await service.open(id)).leaseBusy,true);
      await near(id); now+=1000;
      const body={sessionId:s.sid,sequence:2,visible:true,active:true};
      const results=await Promise.all(Array.from({length:20},()=>service.heartbeat(id,body)));
      assert.ok(results.every(r=>r.dailyCount===1 && r.remainderSeconds===0));
      assert.equal(await Grant.countDocuments({userId:id}),1);
      const g=await Grant.findOne({userId:id}).lean();
      assert.equal(await Card.countDocuments({sourceGrantId:g._id}),1);
      assert.equal(await Event.countDocuments({operationId:`reward:${g._id}`}),1);
      now+=1000; assert.equal((await s.send({},1)).dailyCount,1);
      const copy={...g,_id:new mongoose.Types.ObjectId(),cardInstanceId:new mongoose.Types.ObjectId()};
      await assert.rejects(Grant.create(copy),e=>e.code===11000);
      const card=await Card.findOne({sourceGrantId:g._id}).lean();
      await assert.rejects(Card.create({...card,_id:new mongoose.Types.ObjectId()}),e=>e.code===11000);
      const other=await user(); await service.open(other);
      await assert.rejects(service.heartbeat(other,body),e=>e.code==='SESSION_EXPIRED');
    });
    await t.test('ACT-04/06/07/08: pause, resume, expired lease and preserved remainder', async () => {
      const id=await user(); const s=await session(id); await s.send();
      await Progress.updateOne({_id:id},{$set:{remainderMs:125000}});
      await s.send({visible:false,active:false}); now+=3600000;
      const next=await session(id); assert.equal((await next.send()).remainderSeconds,125);
      await assert.rejects(s.send(),e=>e.code==='SESSION_EXPIRED');
      now+=rules.leaseMs; const newer=await session(id);
      assert.equal((await newer.send()).remainderSeconds,125);
      const restarted=createActivityService({rules,clock});
      assert.equal((await restarted.progress(id)).remainderSeconds,125);
    });
    await t.test('DROP-07: unavailable pool preserves threshold, bounded debt and recovery', async () => {
      const id=await user(); const s=await session(id); await s.send(); await near(id);
      await Template.updateMany({rarity:'legendary'},{$set:{active:false}});
      now+=1000; let r=await s.send(); assert.equal(r.pauseReason,'reward_unavailable'); assert.equal(r.remainderSeconds,600);
      now+=30000; r=await s.send(); assert.equal(r.remainderSeconds,600); assert.equal(r.dailyCount,0);
      await Template.updateMany({rarity:'legendary'},{$set:{active:true}});
      now+=30000; r=await s.send(); assert.equal(r.dailyCount,1); assert.equal(r.remainderSeconds,0);
    });
    await t.test('DROP-08: rollback on hard failure and stable IDs/draw through transient retry', async () => {
      const id=await user(); const s=await session(id); await s.send(); await near(id); now+=1000;
      const body={sessionId:s.sid,sequence:2,visible:true,active:true};
      for (const stage of ['afterGrant','beforeEvent']) {
        const broken=createActivityService({rules,clock,failpoint:async name=>{if(name===stage)throw new Error('injected');}});
        await assert.rejects(broken.heartbeat(id,body),/injected/);
        assert.equal(await Grant.countDocuments({userId:id}),0); assert.equal(await Card.countDocuments({ownerId:id}),0);
        assert.equal((await service.progress(id)).remainderSeconds,599);
      }
      let attempts=0, rngCalls=0; const draws=[];
      const retry=createActivityService({rules,clock,rng:{randomInt:()=>{rngCalls++;return 0;}},failpoint:async (stage,draw)=>{
        if(stage!=='afterGrant')return;
        draws.push(String(draw.grantId));
        if(attempts++===0)throw new mongoose.mongo.MongoServerError({message:'test conflict',code:112,errorLabels:['TransientTransactionError']});
      }});
      const r=await retry.heartbeat(id,body);
      assert.equal(r.dailyCount,1); assert.equal(rngCalls,2); assert.ok(attempts>=2); assert.equal(new Set(draws).size,1);
      assert.equal(await Event.countDocuments({toOwnerId:id,eventType:'reward_granted'}),1);
    });
    await t.test('ACT-09/10: daily cap, next day and non-resetting milestone', async () => {
      const id=await user(); const s=await session(id); await s.send();
      await Progress.updateOne({_id:id},{$set:{remainderMs:599000,dailyCount:5,nextMilestone:6}});
      now+=1000; let r=await s.send(); assert.equal(r.dailyCount,6); assert.equal(r.nextMilestone,7);
      now+=30000; r=await s.send(); assert.equal(r.remainderSeconds,0); assert.equal(r.dailyCount,6);
      now=Date.parse('2026-09-12T17:00:10Z');
      const n=await session(id); r=await n.send(); assert.equal(r.dailyCount,0); assert.equal(r.nextMilestone,7); assert.equal(r.remainderSeconds,0);
      const before=Date.parse('2026-09-13T16:59:50Z'); now=before;
      await Progress.updateOne({_id:id},{$set:{dayKey:businessDay(now).key,remainderMs:125000,dailyCount:2,lastHeartbeatAt:new Date(now),leaseUntil:new Date(now+90000)}});
      now+=20000; r=await n.send(); assert.equal(r.remainderSeconds,135); assert.equal(r.dailyCount,0);
    });
    await t.test('ACT-02 DROP-02: full 599/600/625 server-second progression', async () => {
      const id=await user(); const s=await session(id); await s.send();
      for(let i=0;i<19;i++){now+=30000;await s.send();}
      now+=29000;let r=await s.send();assert.equal(r.remainderSeconds,599);assert.equal(r.dailyCount,0);
      now+=1000;r=await s.send();assert.equal(r.dailyCount,1);assert.equal(r.remainderSeconds,0);
      now+=25000;r=await s.send();assert.equal(r.remainderSeconds,25);assert.equal(r.dailyCount,1);
    });
    await t.test('DROP-06/07: last active template, snapshot and invalid weights', async () => {
      const id=await user();
      const end=createActivityService({rules,clock,rng:{randomInt:max=>max-1}});
      const s=await session(id,end);await s.send();await near(id);now+=1000;
      const expected=await Template.findOne({active:true,rarity:'legendary'}).sort({_id:-1}).lean();
      let r=await s.send();assert.equal(r.dailyCount,1);
      const c=await Card.findOne({ownerId:id}).lean();
      assert.equal(String(c.templateId),String(expected._id));assert.equal(c.metadataSnapshot.name,expected.name);
      assert.equal(c.templateVersion,expected.version);
      await Template.updateOne({_id:expected._id},{$set:{active:false}});
      assert.deepEqual((await Card.findById(c._id).lean()).metadataSnapshot,c.metadataSnapshot);
      const second=await user();const u=await session(second,end);await u.send();await near(second);now+=1000;
      await u.send();const c2=await Card.findOne({ownerId:second}).lean();assert.notEqual(String(c2.templateId),String(expected._id));
      await Template.updateOne({_id:expected._id},{$set:{active:true}});
      const badId=await user();const bad=createActivityService({rules:{...rules,weights:[['common',100]]},clock});
      const b=await session(badId,bad);await b.send();await near(badId);now+=1000;
      r=await b.send();assert.equal(r.pauseReason,'reward_unavailable');assert.equal(r.dailyCount,0);assert.equal(r.remainderSeconds,600);
      const mismatch=createActivityService({rules:{...rules,configVersion:'different'},clock});
      await assert.rejects(mismatch.progress(badId),e=>e.code==='PROFILE_MISMATCH');
    });
    await t.test('SEC-07: teachers/parents blocked by DB role', async () => {
      for(const role of ['teacher','parents']) {
        const id=await user(role); await assert.rejects(service.open(id),e=>e.status===403);
        assert.equal(await Progress.countDocuments({_id:id}),0);
      }
    });
  } finally {
    if(mongoose.connection.readyState===1) {
      // Delete only principals and records created by this run. Never drop a database.
      if(userIds.length) {
        await Event.deleteMany({toOwnerId:{$in:userIds}}); await Card.deleteMany({ownerId:{$in:userIds}});
        await Grant.deleteMany({userId:{$in:userIds}}); await Progress.deleteMany({_id:{$in:userIds}});
        await User.collection.deleteMany({_id:{$in:userIds}});
      }
      if(templateIds.length) await Template.deleteMany({_id:{$in:templateIds}});
    }
    await mongoose.disconnect();
  }
});
