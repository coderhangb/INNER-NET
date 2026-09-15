const mongoose = require('mongoose');
const schema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  milestone: { type: Number, required: true, min: 1 },
  cardInstanceId: { type: mongoose.Schema.Types.ObjectId, ref: 'CardInstance', required: true },
  templateId: { type: mongoose.Schema.Types.ObjectId, required: true },
  templateVersion: { type: Number, required: true },
  rarity: { type: String, required: true },
  name: { type: String, required: true },
  symbol: { type: String, required: true },
  configVersion: { type: String, required: true },
  dayKey: { type: String, required: true },
}, { timestamps: true });
schema.index({ userId: 1, milestone: 1 }, { unique: true });
schema.index({ cardInstanceId: 1 }, { unique: true });
module.exports = mongoose.model('RewardGrant', schema);
