require("dotenv").config();
const mongoose = require("mongoose");
const connectDB = require("../src/libs/db.js");
const { getRewardRules } = require("../src/config/rewardRules.js");
const models = [
  "RewardProgress",
  "RewardGrant",
  "CardTemplate",
  "CardInstance",
  "AssetEvent",
].map((name) => require(`../src/models/${name}.js`));
async function main() {
  const rules = getRewardRules();
  await connectDB();
  for (const model of models) {
    await model.createIndexes();
    console.log("INDEX OK:", model.modelName);
  }
  console.log("PROFILE:", rules.profile, rules.configVersion);
}
main()
  .catch((e) => {
    console.error("FAIL:", e.name, e.code || "", e.message);
    process.exitCode = 1;
  })
  .finally(() => mongoose.disconnect());
