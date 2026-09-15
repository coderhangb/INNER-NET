const mongoose = require("mongoose");

const schema = new mongoose.Schema(
  {
    _id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    code: {
      type: String,
      required: true,
      unique: true,
    },
    revision: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true },
);

module.exports = mongoose.model("TradeProfile", schema);