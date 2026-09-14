require("dotenv").config();

const test = require("node:test");
const assert = require("node:assert/strict");
const mongoose = require("mongoose");
const { randomUUID } = require("node:crypto");

const User = require("../../src/models/User.js");
const Card = require("../../src/models/CardInstance.js");
const Event = require("../../src/models/AssetEvent.js");
const Profile = require("../../src/models/TradeProfile.js");
const Offer = require("../../src/models/TradeOffer.js");
const service = require("../../src/services/tradeService.js");

test("Trade transactions on isolated database", async t => {
  assert.equal(process.env.NODE_ENV, "test");
  assert.equal(
    process.env.MONGO_DB_NAME,
    "inner-net-trades-test",
  );

  await mongoose.connect(process.env.MONGO_URI, {
    dbName: process.env.MONGO_DB_NAME,
  });

  const userIds = [];
  const cardIds = [];

  async function user(role = "student") {
    const result = await User.create({
      fullName: `Trade test ${role}`,
      email: `${randomUUID()}@example.com`,
      password: "test-password-123",
      role,
    });

    userIds.push(result._id);

    return result;
  }

  async function card(ownerId) {
    const result = await Card.create({
      ownerId,
      templateId: new mongoose.Types.ObjectId(),
      templateVersion: 1,
      metadataSnapshot: {
        name: "Test card",
        rarity: "common",
        description: "Trade integration fixture",
        symbol: "⭐",
        imageUri: "",
      },
      sourceType: "fixture",
      fixtureKey: `trade-test:${randomUUID()}`,
      status: "available",
      lockId: null,
    });

    cardIds.push(result._id);

    return result;
  }

  async function proposal(a, b) {
    const ca = await card(a._id);
    const cb = await card(b._id);
    const profile = await service.getMyCode(b._id);

    const body = {
      recipientCode: profile.code,
      offeredCardId: String(ca._id),
      requestedCardId: String(cb._id),
      requestKey: randomUUID(),
    };

    const offer = await service.createOffer(a._id, body);

    return { ca, cb, body, offer };
  }

  try {
    for (const model of [User, Card, Event, Profile, Offer]) {
      await model.createIndexes();
    }

    const a = await user();
    const b = await user();
    const c = await user();
    const teacher = await user("teacher");

    await t.test("Create locks only offered card; replay is stable", async () => {
      const { ca, cb, body, offer } = await proposal(a, b);

      const locked = await Card.findById(ca._id).lean();
      const free = await Card.findById(cb._id).lean();

      assert.equal(locked.status, "trade_locked");
      assert.equal(String(locked.lockId), String(offer._id));
      assert.equal(free.status, "available");

      const replay = await service.createOffer(a._id, body);

      assert.equal(String(replay._id), String(offer._id));

      await service.actOnOffer(a._id, offer._id, "cancel");
    });

    await t.test("Concurrent accepts swap once and create two events", async () => {
      const { ca, cb, offer } = await proposal(a, b);

      const results = await Promise.all(
        Array.from({ length: 5 }, () =>
          service.actOnOffer(b._id, offer._id, "accept"),
        ),
      );

      assert.ok(results.every(x => x.status === "accepted"));

      const afterA = await Card.findById(ca._id).lean();
      const afterB = await Card.findById(cb._id).lean();

      assert.equal(String(afterA.ownerId), String(b._id));
      assert.equal(String(afterB.ownerId), String(a._id));
      assert.equal(afterA.status, "available");
      assert.equal(afterB.status, "available");
      assert.equal(afterA.lockId, null);
      assert.equal(afterB.lockId, null);

      assert.equal(
        await Event.countDocuments({
          operationId: `trade:${offer._id}`,
        }),
        2,
      );
    });

    await t.test("Unauthorized actions are blocked", async () => {
      const { offer } = await proposal(a, b);

      await assert.rejects(
        service.actOnOffer(c._id, offer._id, "accept"),
        error => error.status === 404,
      );

      await assert.rejects(
        service.actOnOffer(a._id, offer._id, "accept"),
        error => error.status === 403,
      );

      await assert.rejects(
        service.actOnOffer(b._id, offer._id, "cancel"),
        error => error.status === 403,
      );

      await service.actOnOffer(a._id, offer._id, "cancel");
    });

    await t.test("Decline releases offered card", async () => {
      const { ca, offer } = await proposal(a, b);

      const result = await service.actOnOffer(
        b._id,
        offer._id,
        "decline",
      );

      assert.equal(result.status, "declined");

      const after = await Card.findById(ca._id).lean();

      assert.equal(after.status, "available");
      assert.equal(after.lockId, null);
      assert.equal(String(after.ownerId), String(a._id));
    });

    await t.test("Failure after first transfer rolls back everything", async () => {
      const { ca, cb, offer } = await proposal(a, b);

      await assert.rejects(
        service.actOnOffer(
          b._id,
          offer._id,
          "accept",
          {
            failpoint: async () => {
              throw new Error("SIMULATED_FAILURE");
            },
          },
        ),
        /SIMULATED_FAILURE/,
      );

      const afterA = await Card.findById(ca._id).lean();
      const afterB = await Card.findById(cb._id).lean();
      const afterOffer = await Offer.findById(offer._id).lean();

      assert.equal(String(afterA.ownerId), String(a._id));
      assert.equal(String(afterB.ownerId), String(b._id));
      assert.equal(afterA.status, "trade_locked");
      assert.equal(afterB.status, "available");
      assert.equal(afterOffer.status, "pending");

      assert.equal(
        await Event.countDocuments({
          operationId: `trade:${offer._id}`,
        }),
        0,
      );

      await service.actOnOffer(a._id, offer._id, "cancel");
    });

    await t.test("Expired offer releases lock", async () => {
      const { ca, offer } = await proposal(a, b);

      // Only in this isolated test DB; no HTTP time override exists.
      await Offer.collection.updateOne(
        { _id: new mongoose.Types.ObjectId(offer._id) },
        { $set: { expiresAt: new Date(Date.now() - 1000) } },
      );

      await service.expireBatch(a._id);

      const after = await Offer.findById(offer._id).lean();
      const afterCard = await Card.findById(ca._id).lean();

      assert.equal(after.status, "expired");
      assert.equal(afterCard.status, "available");
      assert.equal(afterCard.lockId, null);
    });

    await t.test("Two offers competing for one requested card", async () => {
      const ca = await card(a._id);
      const cc = await card(c._id);
      const target = await card(b._id);
      const { code } = await service.getMyCode(b._id);

      const first = await service.createOffer(a._id, {
        recipientCode: code,
        offeredCardId: String(ca._id),
        requestedCardId: String(target._id),
        requestKey: randomUUID(),
      });

      const second = await service.createOffer(c._id, {
        recipientCode: code,
        offeredCardId: String(cc._id),
        requestedCardId: String(target._id),
        requestKey: randomUUID(),
      });

      const results = await Promise.all([
        service.actOnOffer(b._id, first._id, "accept"),
        service.actOnOffer(b._id, second._id, "accept"),
      ]);

      assert.equal(
        results.filter(x => x.status === "accepted").length,
        1,
      );

      assert.equal(
        results.filter(x => x.status === "invalid").length,
        1,
      );
    });

    await t.test("Teacher cannot get a trade profile", async () => {
      await assert.rejects(
        service.getMyCode(teacher._id),
        error => error.status === 403,
      );
    });
  } finally {
    // Delete only fixtures created by this run, not the whole database.
    try {
      await Event.deleteMany({ cardId: { $in: cardIds } });
      await Offer.deleteMany({ proposerId: { $in: userIds } });
      await Card.deleteMany({ _id: { $in: cardIds } });
      await Profile.deleteMany({ _id: { $in: userIds } });
      await User.deleteMany({ _id: { $in: userIds } });
    } finally {
      await mongoose.disconnect();
    }
  }
});