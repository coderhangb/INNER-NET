const mongoose = require("mongoose");
const CardInstance = require("../models/CardInstance.js");
const CardTemplate = require("../models/CardTemplate.js");
const { RARITIES, STATUSES } = require("../config/cardRules.js");
const isId = (value) => typeof value === "string" && /^[a-fA-F0-9]{24}$/.test(value);
function paging(query, allowed) {
  if (Object.keys(query).some((key) => !allowed.includes(key))) throw new Error("INVALID_QUERY");
  const { cursor, limit = "12" } = query;
  if (typeof limit !== "string" || !/^[1-9]\d?$/.test(limit) || Number(limit) > 50) throw new Error("INVALID_QUERY");
  if (cursor !== undefined && !isId(cursor)) throw new Error("INVALID_QUERY");
  return { limit: Number(limit), cursor };
}
const fields = "_id templateId templateVersion metadataSnapshot status createdAt";
async function listMine(req, res, next) {
  try {
    const { limit, cursor } = paging(req.query, ["cursor", "limit", "rarity", "status"]);
    const { rarity, status } = req.query;
    if (rarity !== undefined && !RARITIES.includes(rarity)) throw new Error("INVALID_QUERY");
    if (status !== undefined && !STATUSES.includes(status)) throw new Error("INVALID_QUERY");
    const filter = { ownerId: req.user._id };
    if (rarity) filter["metadataSnapshot.rarity"] = rarity;
    if (status) filter.status = status;
    const pageFilter = { ...filter };
    if (cursor) pageFilter._id = { $lt: new mongoose.Types.ObjectId(cursor) };
    const [rows, total] = await Promise.all([
      CardInstance.find(pageFilter).select(fields).sort({ _id: -1 }).limit(limit + 1).lean(),
      CardInstance.countDocuments(filter),
    ]);
    const hasMore = rows.length > limit;
    const items = rows.slice(0, limit);
    return res.json({ items, total, nextCursor: hasMore ? String(items.at(-1)._id) : null });
  } catch (error) {
    if (error.message === "INVALID_QUERY") return res.status(400).json({ code: "INVALID_QUERY", message: "Invalid filters or pagination" });
    return next(error);
  }
}
async function getMine(req, res, next) {
  try {
    if (!isId(req.params.id)) return res.status(400).json({ message: "Invalid card ID" });
    const item = await CardInstance.findOne({ _id: req.params.id, ownerId: req.user._id }).select(fields).lean();
    if (!item) return res.status(404).json({ message: "Card not found" });
    return res.json({ item });
  } catch (error) { return next(error); }
}
async function listTemplates(req, res, next) {
  try {
    const { limit, cursor } = paging(req.query, ["cursor", "limit"]);
    const filter = { active: true };
    if (cursor) filter._id = { $lt: new mongoose.Types.ObjectId(cursor) };
    const rows = await CardTemplate.find(filter).select("_id slug version name rarity description symbol imageUri").sort({ _id: -1 }).limit(limit + 1).lean();
    const items = rows.slice(0, limit);
    return res.json({ items, nextCursor: rows.length > limit ? String(items.at(-1)._id) : null });
  } catch (error) {
    if (error.message === "INVALID_QUERY") return res.status(400).json({ message: "Invalid pagination" });
    return next(error);
  }
}
module.exports = { listMine, getMine, listTemplates };
