function getRewardRules(env = process.env) {
  const profile = env.CARD_REWARD_PROFILE || 'standard';
  if (!['standard', 'quick'].includes(profile)) throw new Error('Invalid CARD_REWARD_PROFILE');
  if (profile === 'quick' && (!['development', 'test'].includes(env.NODE_ENV) || env.MONGO_DB_NAME !== 'inner-net-card-dev')) {
    throw new Error('Quick rewards require development/test and inner-net-card-dev');
  }
  const quick = profile === 'quick';
  return Object.freeze({
    profile, configVersion: `reward-v1-${profile}`, intervalMs: (quick ? 60 : 600) * 1000,
    heartbeatMs: (quick ? 5 : 30) * 1000, idleMs: (quick ? 20 : 120) * 1000,
    leaseMs: (quick ? 15 : 90) * 1000, dailyCap: 6, timezone: 'Asia/Ho_Chi_Minh',
    weights: [['common', 60], ['uncommon', 25], ['rare', 10], ['epic', 4], ['legendary', 1]],
  });
}
module.exports = { getRewardRules };
