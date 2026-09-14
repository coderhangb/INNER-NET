const mongoose = require("mongoose");

const ObjectId = mongoose.Schema.Types.ObjectId;

const schema = new mongoose.Schema(
  {
    proposerId: {
      type: ObjectId,
      ref: "User",
      required: true,
      immutable: true,
    },
    recipientId: {
      type: ObjectId,
      ref: "User",
      required: true,
      immutable: true,
    },
    offeredCardId: {
      type: ObjectId,
      ref: "CardInstance",
      required: true,
      immutable: true,
    },
    requestedCardId: {
      type: ObjectId,
      ref: "CardInstance",
      required: true,
      immutable: true,
    },
    offeredName: {
      type: String,
      required: true,
      immutable: true,
    },
    requestedName: {
      type: String,
      required: true,
      immutable: true,
    },
    requestKey: {
      type: String,
      required: true,
      immutable: true,
    },
    status: {
      type: String,
      enum: [
        "pending",
        "accepted",
        "declined",
        "cancelled",
        "expired",
        "invalid",
      ],
      default: "pending",
      required: true,
    },
    expiresAt: {
      type: Date,
      required: true,
      immutable: true,
    },
    completedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true },
);

schema.index(
  { proposerId: 1, requestKey: 1 },
  { unique: true },
);

schema.index({ proposerId: 1, _id: -1 });
schema.index({ recipientId: 1, _id: -1 });
schema.index({ status: 1, expiresAt: 1 });

module.exports = mongoose.model("TradeOffer", schema);