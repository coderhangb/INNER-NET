const mongoose = require("mongoose");
const schema = new mongoose.Schema(
  {
    cardId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "CardInstance",
      required: true,
    },
    operationId: { type: String, required: true },
    eventType: {
      type: String,
      enum: ["fixture_created", "reward_granted", "trade_transferred"],
      required: true,
    },
    fromOwnerId: { type: mongoose.Schema.Types.ObjectId, default: null },
    toOwnerId: { type: mongoose.Schema.Types.ObjectId, required: true },
    actorId: { type: mongoose.Schema.Types.ObjectId, default: null },
  },
  { timestamps: true },
);
schema.index({ operationId: 1, eventType: 1, cardId: 1 }, { unique: true });
module.exports = mongoose.model("AssetEvent", schema);
