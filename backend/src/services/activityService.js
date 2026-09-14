const mongoose = require('mongoose');
const { randomUUID, randomInt } = require('node:crypto');
const User = require('../models/User.js');
const Progress = require('../models/RewardProgress.js');
const Grant = require('../models/RewardGrant.js');
const Template = require('../models/CardTemplate.js');
const Card = require('../models/CardInstance.js');
const Event = require('../models/AssetEvent.js');
const { businessDay, rollover, credit, validWeights, pickRarity } = require('./rewardMath.js');
function fault(status, code, message) { return Object.assign(new Error(message), { status, code }); }
function createActivityService({ rules, clock = { now: () => Date.now() }, rng = { randomInt }, failpoint = async () => {} }) {
  async function student(userId, session) {
    const u = await User.findById(userId).select('_id role').session(session || null).lean();
    if (!u) throw fault(401, 'AUTH_REQUIRED', 'Tài khoản không còn tồn tại.');
    if (u.role !== 'student') throw fault(403, 'STUDENT_ONLY', 'Chỉ tài khoản học sinh được nhận card.');
  }
  async function ensure(userId) {
    await student(userId);
    try {
      await Progress.updateOne({ _id: userId }, { $setOnInsert: {
        _id: userId, configVersion: rules.configVersion, dayKey: businessDay(clock.now()).key,
      } }, { upsert: true });
    } catch (e) { if (e.code !== 11000) throw e; }
  }
  function checkConfig(p) {
    if (p && p.configVersion !== rules.configVersion) throw fault(409, 'PROFILE_MISMATCH', 'Tiến độ thuộc cấu hình khác. Khôi phục profile cũ hoặc dùng tài khoản thử mới.');
  }
  async function response(userId, extra = {}) {
    const p = await Progress.findById(userId).lean();
    checkConfig(p);
    const today = businessDay(clock.now()).key;
    const dailyCount = p?.dayKey === today ? p.dailyCount : 0;
    const recentGrants = await Grant.find({ userId }).sort({ milestone: -1 }).limit(20)
      .select('_id milestone cardInstanceId name symbol rarity configVersion createdAt').lean();
    return { profile: rules.profile, configVersion: rules.configVersion,
      intervalSeconds: rules.intervalMs / 1000, heartbeatSeconds: rules.heartbeatMs / 1000,
      idleSeconds: rules.idleMs / 1000, leaseSeconds: rules.leaseMs / 1000,
      remainderSeconds: (p?.remainderMs || 0) / 1000, dailyCount, dailyCap: rules.dailyCap,
      nextMilestone: p?.nextMilestone || 1, timezone: rules.timezone,
      pauseReason: dailyCount >= rules.dailyCap ? 'daily_cap' : (p?.pauseReason === 'daily_cap' ? null : p?.pauseReason || null),
      recentGrants, ...extra };
  }
  async function transact(userId, action) {
    const session = await mongoose.startSession();
    let output;
    try {
      await session.withTransaction(async () => {
        await student(userId, session);
        const p = await Progress.findById(userId).session(session);
        if (!p) throw fault(409, 'SESSION_EXPIRED', 'Hãy mở phiên hoạt động mới.');
        checkConfig(p);
        output = await action(p, session, clock.now());
      }, { readConcern: { level: 'snapshot' }, writeConcern: { w: 'majority' } });
    } finally { await session.endSession(); }
    return response(userId, output);
  }
  async function open(userId) {
    await ensure(userId);
    const sessionId = randomUUID();
    return transact(userId, async (p, session, now) => {
      if (p.activeSessionId && +p.leaseUntil > now) return { sessionId: null, leaseBusy: true };
      rollover(p, now);
      p.activeSessionId = sessionId; p.lastHeartbeatAt = null; p.lastSequence = 0;
      p.leaseUntil = new Date(now + rules.leaseMs); p.pauseReason = null; p.version++;
      await p.save({ session });
      return { sessionId, leaseBusy: false };
    });
  }
  async function heartbeat(userId, body) {
    // Stable draw + IDs across MongoDB's internal callback retries. Never supplied by HTTP.
    let draw = null;
    return transact(userId, async (p, session, now) => {
      if (p.activeSessionId !== body.sessionId) throw fault(409, 'SESSION_EXPIRED', 'Phiên hoạt động đã thay đổi.');
      if (body.sequence <= p.lastSequence) return { duplicate: true };
      if (+p.leaseUntil <= now) throw fault(409, 'SESSION_EXPIRED', 'Phiên hoạt động đã hết hạn.');
      rollover(p, now);
      p.lastSequence = body.sequence;
      if (!body.visible || !body.active) {
        p.lastHeartbeatAt = null; p.leaseUntil = new Date(now); p.activeSessionId = null;
        p.pauseReason = 'inactive'; p.version++; await p.save({ session }); return {};
      }
      credit(p, now, rules);
      p.lastHeartbeatAt = new Date(now); p.leaseUntil = new Date(now + rules.leaseMs);
      p.pauseReason = null;
      if (p.dailyCount >= rules.dailyCap) { p.remainderMs = 0; p.pauseReason = 'daily_cap'; }
      else if (p.remainderMs >= rules.intervalMs) {
        const pool = await Template.find({ active: true }).sort({ _id: 1 }).session(session).lean();
        const valid = validWeights(rules.weights) && rules.weights.every(([r]) => pool.some(t => t.rarity === r));
        if (!valid) {
          // Preserve the already credited remainder, but cap future accrual until the pool is fixed.
          p.pauseReason = 'reward_unavailable';
        } else {
          if (!draw) {
            const rarity = pickRarity(rng.randomInt(100), rules.weights);
            const group = pool.filter(t => t.rarity === rarity);
            draw = { template: group[rng.randomInt(group.length)], grantId: new mongoose.Types.ObjectId(), cardId: new mongoose.Types.ObjectId(), eventId: new mongoose.Types.ObjectId() };
          }
          // If the chosen template was deactivated during a retry, do not reroll.
          const t = pool.find(t => String(t._id) === String(draw.template._id));
          if (!t) p.pauseReason = 'reward_unavailable';
          else {
            await Grant.create([{ _id: draw.grantId, userId, milestone: p.nextMilestone,
              cardInstanceId: draw.cardId, templateId: t._id, templateVersion: t.version,
              rarity: t.rarity, name: t.name, symbol: t.symbol, configVersion: rules.configVersion, dayKey: p.dayKey }], { session });
            await failpoint('afterGrant', draw);
            await Card.create([{ _id: draw.cardId, ownerId: userId, templateId: t._id, templateVersion: t.version,
              metadataSnapshot: { name: t.name, rarity: t.rarity, description: t.description, symbol: t.symbol, imageUri: t.imageUri },
              sourceType: 'reward', sourceGrantId: draw.grantId, status: 'available', lockId: null }], { session });
            await failpoint('beforeEvent', draw);
            await Event.create([{ _id: draw.eventId, cardId: draw.cardId, operationId: `reward:${draw.grantId}`,
              eventType: 'reward_granted', fromOwnerId: null, toOwnerId: userId, actorId: userId }], { session });
            p.remainderMs -= rules.intervalMs; p.nextMilestone++; p.dailyCount++;
            if (p.dailyCount >= rules.dailyCap) { p.remainderMs = 0; p.pauseReason = 'daily_cap'; }
          }
        }
      }
      p.version++;
      await p.save({ session });
      return { duplicate: false };
    });
  }
  return { open, heartbeat, progress: async userId => { await student(userId); return response(userId); } };
}
module.exports = { createActivityService };
