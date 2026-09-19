const mongoose = require("mongoose");
const { RARITIES } = require("../config/cardRules.js");
const schema = new mongoose.Schema(
  {
    slug: { type: String, required: true, immutable: true },
    version: { type: Number, required: true, min: 1, immutable: true },
    name: { type: String, required: true, immutable: true },
    rarity: { type: String, enum: RARITIES, required: true, immutable: true },
    description: { type: String, required: true, immutable: true },
    symbol: { type: String, required: true, immutable: true },
    imageUri: { type: String, default: "", immutable: true },
    active: { type: Boolean, default: true },
  },
  { timestamps: true },
);
schema.index({ slug: 1, version: 1 }, { unique: true });
module.exports = mongoose.model("CardTemplate", schema);
