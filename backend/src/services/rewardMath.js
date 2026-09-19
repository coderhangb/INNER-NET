// UTC+7 has no daylight-saving transitions. All reward accounting uses server milliseconds.
const OFFSET = 7 * 3600 * 1000;
const DAY = 24 * 3600 * 1000;
function businessDay(now) {
  return {
    key: new Date(now + OFFSET).toISOString().slice(0, 10),
    start: Math.floor((now + OFFSET) / DAY) * DAY - OFFSET,
  };
}
function rollover(p, now) {
  const day = businessDay(now);
  if (p.dayKey !== day.key) {
    p.dayKey = day.key;
    p.dailyCount = 0;
  }
  return day;
}
function credit(p, now, rules) {
  const day = rollover(p, now);
  if (p.dailyCount >= rules.dailyCap) {
    p.remainderMs = 0;
    return 0;
  }
  if (p.remainderMs >= rules.intervalMs || p.lastHeartbeatAt == null) return 0;
  const last = +new Date(p.lastHeartbeatAt);
  const gap = now - last;
  if (gap <= 0 || gap >= rules.leaseMs) return 0;
  // At most one heartbeat; a midnight-spanning interval counts only its new-day part.
  const delta = Math.max(0, Math.min(gap, rules.heartbeatMs, now - day.start));
  p.remainderMs += delta;
  return delta;
}
function validWeights(weights) {
  return (
    weights.length === 5 &&
    new Set(weights.map((x) => x[0])).size === 5 &&
    weights.every((x) => Number.isInteger(x[1]) && x[1] > 0) &&
    weights.reduce((n, x) => n + x[1], 0) === 100
  );
}
function pickRarity(draw, weights) {
  if (
    !validWeights(weights) ||
    !Number.isInteger(draw) ||
    draw < 0 ||
    draw >= 100
  )
    throw new Error("Invalid reward draw/config");
  let end = 0;
  for (const [rarity, weight] of weights) {
    end += weight;
    if (draw < end) return rarity;
  }
}
module.exports = { businessDay, rollover, credit, validWeights, pickRarity };
