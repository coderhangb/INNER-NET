require("dotenv").config();

const mongoose = require("mongoose");
const TradeProfile = require("../src/models/TradeProfile.js");
const TradeOffer = require("../src/models/TradeOffer.js");
const Card = require("../src/models/CardInstance.js");
const AssetEvent = require("../src/models/AssetEvent.js");

async function main() {
  if (!process.env.MONGO_URI || !process.env.MONGO_DB_NAME) {
    throw new Error("Missing MONGO_URI or MONGO_DB_NAME");
  }

  await mongoose.connect(process.env.MONGO_URI, {
    dbName: process.env.MONGO_DB_NAME,
  });

  for (const model of [
    TradeProfile,
    TradeOffer,
    Card,
    AssetEvent,
  ]) {
    await model.createIndexes();
    console.log(`INDEX OK: ${model.modelName}`);
  }
}

main()
  .catch(error => {
    console.error(error.message);
    process.exitCode = 1;
  })
  .finally(() => mongoose.disconnect());