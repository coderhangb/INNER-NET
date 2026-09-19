const mongoose = require("mongoose");
const { RARITIES, STATUSES } = require("../config/cardRules.js");
const snapshotSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    rarity: { type: String, enum: RARITIES, required: true },
    description: { type: String, required: true },
    symbol: { type: String, required: true },
    imageUri: { type: String, default: "" },
  },
  { _id: false },
);
const schema = new mongoose.Schema(
  {
    ownerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    templateId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "CardTemplate",
      required: true,
      immutable: true,
    },
    templateVersion: { type: Number, required: true, immutable: true },
    metadataSnapshot: { type: snapshotSchema, required: true, immutable: true },
    sourceType: {
      type: String,
      enum: ["fixture", "reward"],
      required: true,
      immutable: true,
    },
    fixtureKey: { type: String, immutable: true },
    sourceGrantId: { type: mongoose.Schema.Types.ObjectId, immutable: true },
    status: {
      type: String,
      enum: STATUSES,
      default: "available",
      required: true,
    },
    lockId: { type: mongoose.Schema.Types.ObjectId, default: null },
    version: { type: Number, default: 0, required: true },
  },
  { timestamps: true },
);
schema.index(
  { fixtureKey: 1 },
  {
    unique: true,
    partialFilterExpression: { fixtureKey: { $type: "string" } },
  },
);
schema.index(
  { sourceGrantId: 1 },
  {
    unique: true,
    partialFilterExpression: { sourceGrantId: { $type: "objectId" } },
  },
);
schema.index({ ownerId: 1, _id: -1 });
schema.index({ ownerId: 1, status: 1, "metadataSnapshot.rarity": 1, _id: -1 });
schema.pre("validate", function () {
  if (
    this.sourceType === "fixture" &&
    (!this.fixtureKey || this.sourceGrantId)
  ) {
    this.invalidate(
      "fixtureKey",
      "Fixture requires fixtureKey and no sourceGrantId",
    );
  }
  if (
    this.sourceType === "reward" &&
    (!this.sourceGrantId || this.fixtureKey)
  ) {
    this.invalidate(
      "sourceGrantId",
      "Reward requires sourceGrantId and no fixtureKey",
    );
  }
  const locked = ["trade_locked", "export_locked"].includes(this.status);
  if (locked !== Boolean(this.lockId))
    this.invalidate("lockId", "Lock does not match status");
});
module.exports = mongoose.model("CardInstance", schema);
