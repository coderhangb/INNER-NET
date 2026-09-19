require("dotenv").config();
const mongoose = require("mongoose");
const connectDB = require("../src/libs/db.js");
const User = require("../src/models/User.js");
const CardTemplate = require("../src/models/CardTemplate.js");
const CardInstance = require("../src/models/CardInstance.js");
const AssetEvent = require("../src/models/AssetEvent.js");
const { RARITIES } = require("../src/config/cardRules.js");
const catalog = [
  ["seed", "Mầm xanh", "🌱"],
  ["leaf", "Chiếc lá", "🍃"],
  ["flower", "Hoa nhỏ", "🌸"],
  ["mushroom", "Nấm rừng", "🍄"],
  ["moon", "Trăng non", "🌙"],
  ["comet", "Sao chổi", "☄️"],
  ["crystal", "Tinh thể", "💎"],
  ["dragon", "Rồng nhỏ", "🐉"],
  ["sun", "Mặt trời", "☀️"],
  ["crown", "Vương miện", "👑"],
];
async function main() {
  if (
    process.env.NODE_ENV === "production" ||
    process.env.MONGO_DB_NAME !== "inner-net-card-dev"
  )
    throw new Error("Run only against inner-net-card-dev");
  const ids = [...new Set(process.argv.slice(2))];
  if (
    ids.length < 2 ||
    ids.length > 5 ||
    ids.some((id) => !/^[a-fA-F0-9]{24}$/.test(id))
  )
    throw new Error("Provide 2 to 5 different student user IDs");
  await connectDB();
  if (mongoose.connection.name !== "inner-net-card-dev")
    throw new Error("Actual database is not inner-net-card-dev");
  const users = await User.find({ _id: { $in: ids } })
    .select("_id role")
    .lean();
  if (
    users.length !== ids.length ||
    users.some((user) => user.role !== "student")
  )
    throw new Error(
      "All IDs must belong to existing students in this database",
    );
  // Create actual unique indexes before any fixture writes.
  for (const model of [CardTemplate, CardInstance, AssetEvent])
    await model.createIndexes();
  const session = await mongoose.startSession();
  try {
    await session.withTransaction(async () => {
      const templates = [];
      for (let i = 0; i < catalog.length; i++) {
        const [slug, name, symbol] = catalog[i];
        const key = { slug: `demo-${slug}`, version: 1 };
        let template = await CardTemplate.findOne(key).session(session);
        if (!template) {
          [template] = await CardTemplate.create(
            [
              {
                ...key,
                name,
                symbol,
                rarity: RARITIES[Math.floor(i / 2)],
                description: `Card mẫu ${name} của INNER-NET.`,
                imageUri: "",
                active: true,
              },
            ],
            { session },
          );
        }
        templates.push(template);
      }
      for (const user of users) {
        for (let slot = 0; slot < 12; slot++) {
          const fixtureKey = `card-demo-v1:${user._id}:${slot}`;
          // Never reset ownership/status of an existing fixture after a trade.
          if (await CardInstance.exists({ fixtureKey }).session(session))
            continue;
          const t = templates[slot % templates.length];
          const [card] = await CardInstance.create(
            [
              {
                ownerId: user._id,
                templateId: t._id,
                templateVersion: t.version,
                metadataSnapshot: {
                  name: t.name,
                  rarity: t.rarity,
                  description: t.description,
                  symbol: t.symbol,
                  imageUri: t.imageUri,
                },
                sourceType: "fixture",
                fixtureKey,
                status: "available",
                lockId: null,
              },
            ],
            { session },
          );
          await AssetEvent.create(
            [
              {
                cardId: card._id,
                operationId: fixtureKey,
                eventType: "fixture_created",
                fromOwnerId: null,
                toOwnerId: user._id,
                actorId: null,
              },
            ],
            { session },
          );
        }
      }
    });
    console.log(
      `PASS: demo catalog ready; 12 fixture slots per student (${users.length} students).`,
    );
    console.log("Existing cards, owners and statuses were preserved.");
  } finally {
    await session.endSession();
  }
}
main()
  .catch((error) => {
    console.error("FAIL:", error.message);
    process.exitCode = 1;
  })
  .finally(() => mongoose.disconnect());
