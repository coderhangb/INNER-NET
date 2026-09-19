const mongoose = require("mongoose");
const schema = new mongoose.Schema(
  {
    // The document ID IS the user ID: MongoDB's built-in unique _id index serializes one user.
    _id: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    remainderMs: { type: Number, default: 0, min: 0 },
    nextMilestone: { type: Number, default: 1, min: 1 },
    dayKey: { type: String, required: true },
    dailyCount: { type: Number, default: 0, min: 0 },
    activeSessionId: { type: String, default: null },
    leaseUntil: { type: Date, default: null },
    lastHeartbeatAt: { type: Date, default: null },
    lastSequence: { type: Number, default: 0 },
    configVersion: { type: String, required: true },
    pauseReason: { type: String, default: null },
    version: { type: Number, default: 0 },
  },
  { timestamps: true },
);
module.exports = mongoose.model("RewardProgress", schema);
