const mongoose = require("mongoose");
const { randomBytes } = require("node:crypto");

const User = require("../models/User.js");
const Card = require("../models/CardInstance.js");
const AssetEvent = require("../models/AssetEvent.js");
const TradeProfile = require("../models/TradeProfile.js");
const TradeOffer = require("../models/TradeOffer.js");

const OFFER_DURATION_MS = 24 * 60 * 60 * 1000;
const MAX_PENDING = 10;

function fault(status, message) {
  return Object.assign(new Error(message), {
    status,
    tradeError: true,
  });
}

function same(a, b) {
  return String(a) === String(b);
}

async function requireStudent(userId, session = null) {
  const user = await User.findById(userId)
    .select("_id fullName role")
    .session(session)
    .lean();

  if (!user) {
    throw fault(401, "Tài khoản không còn tồn tại.");
  }

  if (user.role !== "student") {
    throw fault(403, "Chỉ tài khoản học sinh được trao đổi card.");
  }

  return user;
}

async function transaction(work) {
  const session = await mongoose.startSession();

  try {
    let result;

    await session.withTransaction(
      async () => {
        result = await work(session);
      },
      {
        readConcern: { level: "snapshot" },
        writeConcern: { w: "majority" },
      },
    );

    return result;
  } finally {
    await session.endSession();
  }
}

function publicOffer(offer) {
  return {
    _id: offer._id,
    proposerId: offer.proposerId,
    recipientId: offer.recipientId,
    offeredCardId: offer.offeredCardId,
    requestedCardId: offer.requestedCardId,
    offeredName: offer.offeredName,
    requestedName: offer.requestedName,
    status: offer.status,
    expiresAt: offer.expiresAt,
    createdAt: offer.createdAt,
    completedAt: offer.completedAt,
  };
}

async function getMyCode(userId) {
  await requireStudent(userId);

  let profile = await TradeProfile.findById(userId).lean();

  if (!profile) {
    for (let attempt = 0; attempt < 5; attempt += 1) {
      try {
        profile = await TradeProfile.create({
          _id: userId,
          code: randomBytes(8).toString("hex").toUpperCase(),
        });

        break;
      } catch (error) {
        if (error.code !== 11000) throw error;

        // Another request might have created the same user's profile.
        profile = await TradeProfile.findById(userId).lean();
        if (profile) break;
      }
    }
  }

  if (!profile) {
    throw fault(503, "Chưa tạo được mã trao đổi. Hãy thử lại.");
  }

  return { code: profile.code };
}

/*
 * Release only the card locked by THIS offer.
 * Never clear another trade's lock.
 */
async function finishWithoutTransfer(offer, status, session, now = new Date()) {
  await Card.updateOne(
    {
      _id: offer.offeredCardId,
      ownerId: offer.proposerId,
      status: "trade_locked",
      lockId: offer._id,
    },
    {
      $set: {
        status: "available",
        lockId: null,
      },
      $inc: { version: 1 },
    },
    { session, runValidators: true },
  );

  offer.status = status;
  offer.completedAt = now;

  await offer.save({ session });

  return publicOffer(offer);
}

async function expireOffer(offerId) {
  return transaction(async (session) => {
    const offer = await TradeOffer.findById(offerId).session(session);

    if (!offer || offer.status !== "pending") return false;
    if (+offer.expiresAt > Date.now()) return false;

    await finishWithoutTransfer(offer, "expired", session, new Date());

    return true;
  });
}

/*
 * Bounded batch.
 * The worker repeats batches, while user-facing operations also clean up
 * expired offers involving that user.
 */
async function expireBatch(userId = null) {
  const filter = {
    status: "pending",
    expiresAt: { $lte: new Date() },
  };

  if (userId) {
    filter.$or = [{ proposerId: userId }, { recipientId: userId }];
  }

  const offers = await TradeOffer.find(filter)
    .sort({ expiresAt: 1, _id: 1 })
    .limit(100)
    .select("_id")
    .lean();

  let expired = 0;

  for (const offer of offers) {
    if (await expireOffer(offer._id)) expired += 1;
  }

  return { scanned: offers.length, expired };
}

async function findPartner(userId, code, cursor = null) {
  await requireStudent(userId);

  const profile = await TradeProfile.findOne({ code }).lean();

  if (!profile) {
    throw fault(404, "Không tìm thấy mã trao đổi.");
  }

  if (same(profile._id, userId)) {
    throw fault(400, "Không thể trao đổi với chính mình.");
  }

  const partner = await requireStudent(profile._id);

  await expireBatch(partner._id);

  const filter = {
    ownerId: partner._id,
    status: "available",
    lockId: null,
  };

  if (cursor) {
    filter._id = { $lt: new mongoose.Types.ObjectId(cursor) };
  }

  const cards = await Card.find(filter)
    .sort({ _id: -1 })
    .limit(7)
    .select("_id metadataSnapshot status")
    .lean();

  const hasMore = cards.length > 6;
  const items = cards.slice(0, 6);

  return {
    partner: {
      code,
      fullName: partner.fullName,
    },
    items,
    nextCursor: hasMore ? String(items[items.length - 1]._id) : null,
  };
}

function checkReplay(offer, body, recipientId) {
  if (
    !same(offer.offeredCardId, body.offeredCardId) ||
    !same(offer.requestedCardId, body.requestedCardId) ||
    !same(offer.recipientId, recipientId)
  ) {
    throw fault(409, "Mã yêu cầu đã được dùng cho nội dung trao đổi khác.");
  }

  return publicOffer(offer);
}

async function createOffer(userId, body) {
  await requireStudent(userId);
  await getMyCode(userId);
  await expireBatch(userId);

  const profile = await TradeProfile.findOne({
    code: body.recipientCode,
  }).lean();

  if (!profile) {
    throw fault(404, "Không tìm thấy người nhận.");
  }

  const recipientId = profile._id;

  if (same(userId, recipientId)) {
    throw fault(400, "Không thể trao đổi với chính mình.");
  }

  if (same(body.offeredCardId, body.requestedCardId)) {
    throw fault(400, "Phải chọn hai bản card khác nhau.");
  }

  // Keep the same ID if MongoDB retries the transaction callback.
  const offerId = new mongoose.Types.ObjectId();

  try {
    return await transaction(async (session) => {
      await requireStudent(userId, session);
      await requireStudent(recipientId, session);

      /*
       * Serialize offer creation per proposer so concurrent requests cannot
       * both pass the MAX_PENDING check.
       */
      await TradeProfile.updateOne(
        { _id: userId },
        { $inc: { revision: 1 } },
        { session },
      );

      const existing = await TradeOffer.findOne({
        proposerId: userId,
        requestKey: body.requestKey,
      }).session(session);

      if (existing) {
        return checkReplay(existing, body, recipientId);
      }

      const count = await TradeOffer.countDocuments({
        proposerId: userId,
        status: "pending",
      }).session(session);

      if (count >= MAX_PENDING) {
        throw fault(
          409,
          `Bạn đang có ${MAX_PENDING} đề nghị chờ. Hãy hủy bớt.`,
        );
      }

      const offered = await Card.findOne({
        _id: body.offeredCardId,
        ownerId: userId,
        status: "available",
        lockId: null,
      }).session(session);

      if (!offered) {
        throw fault(409, "Card bạn đưa ra không còn sẵn sàng.");
      }

      const requested = await Card.findOne({
        _id: body.requestedCardId,
        ownerId: recipientId,
        status: "available",
        lockId: null,
      }).session(session);

      if (!requested) {
        throw fault(409, "Card muốn nhận không còn sẵn sàng.");
      }

      offered.status = "trade_locked";
      offered.lockId = offerId;
      offered.version += 1;

      await offered.save({ session });

      const [offer] = await TradeOffer.create(
        [
          {
            _id: offerId,
            proposerId: userId,
            recipientId,
            offeredCardId: offered._id,
            requestedCardId: requested._id,
            offeredName: offered.metadataSnapshot.name,
            requestedName: requested.metadataSnapshot.name,
            requestKey: body.requestKey,
            expiresAt: new Date(Date.now() + OFFER_DURATION_MS),
          },
        ],
        { session },
      );

      return publicOffer(offer);
    });
  } catch (error) {
    // Recover a concurrent insert using the unique request key.
    if (error.code === 11000) {
      const existing = await TradeOffer.findOne({
        proposerId: userId,
        requestKey: body.requestKey,
      }).lean();

      if (existing) {
        return checkReplay(existing, body, recipientId);
      }
    }

    throw error;
  }
}

async function listOffers(userId, cursor = null) {
  await requireStudent(userId);
  await expireBatch(userId);

  const filter = {
    $or: [{ proposerId: userId }, { recipientId: userId }],
  };

  if (cursor) {
    filter._id = { $lt: new mongoose.Types.ObjectId(cursor) };
  }

  const offers = await TradeOffer.find(filter)
    .sort({ _id: -1 })
    .limit(21)
    .lean();

  const hasMore = offers.length > 20;
  const items = offers.slice(0, 20);

  return {
    items: items.map(publicOffer),
    nextCursor: hasMore ? String(items[items.length - 1]._id) : null,
  };
}

/*
 * failpoint is only a service-level test hook.
 * It is not accepted by the HTTP API.
 */
async function actOnOffer(
  userId,
  offerId,
  action,
  { failpoint = async () => {} } = {},
) {
  if (!["accept", "decline", "cancel"].includes(action)) {
    throw fault(400, "Thao tác không hợp lệ.");
  }

  return transaction(async (session) => {
    await requireStudent(userId, session);

    const offer = await TradeOffer.findById(offerId).session(session);

    if (
      !offer ||
      (!same(userId, offer.proposerId) && !same(userId, offer.recipientId))
    ) {
      throw fault(404, "Không tìm thấy đề nghị.");
    }

    const isProposer = same(userId, offer.proposerId);
    const isRecipient = same(userId, offer.recipientId);

    if (action === "cancel" && !isProposer) {
      throw fault(403, "Chỉ người gửi được hủy đề nghị.");
    }

    if (["accept", "decline"].includes(action) && !isRecipient) {
      throw fault(403, "Chỉ người nhận được xử lý đề nghị.");
    }

    const targetStatus = {
      accept: "accepted",
      decline: "declined",
      cancel: "cancelled",
    }[action];

    if (offer.status !== "pending") {
      if (offer.status === targetStatus) {
        return publicOffer(offer);
      }

      throw fault(409, `Đề nghị đã kết thúc: ${offer.status}.`);
    }

    const now = new Date();

    if (+offer.expiresAt <= +now) {
      return finishWithoutTransfer(offer, "expired", session, now);
    }

    if (action !== "accept") {
      return finishWithoutTransfer(offer, targetStatus, session, now);
    }

    /*
     * A user might have changed roles since creation.
     * End the offer and release its lock if either side is no longer eligible.
     */
    const eligible = await User.countDocuments({
      _id: { $in: [offer.proposerId, offer.recipientId] },
      role: "student",
    }).session(session);

    if (eligible !== 2) {
      return finishWithoutTransfer(offer, "invalid", session, now);
    }

    const offered = await Card.findOne({
      _id: offer.offeredCardId,
      ownerId: offer.proposerId,
      status: "trade_locked",
      lockId: offer._id,
    }).session(session);

    const requested = await Card.findOne({
      _id: offer.requestedCardId,
      ownerId: offer.recipientId,
      status: "available",
      lockId: null,
    }).session(session);

    if (!offered || !requested) {
      return finishWithoutTransfer(offer, "invalid", session, now);
    }

    /*
     * Both card writes and both history entries are in this transaction.
     * Concurrent accept/cancel/other trades will conflict and be retried.
     */
    offered.ownerId = offer.recipientId;
    offered.status = "available";
    offered.lockId = null;
    offered.version += 1;

    await offered.save({ session });

    await failpoint("afterFirstCard");

    requested.ownerId = offer.proposerId;
    requested.status = "available";
    requested.lockId = null;
    requested.version += 1;

    await requested.save({ session });

    await AssetEvent.create(
      [
        {
          cardId: offered._id,
          operationId: `trade:${offer._id}`,
          eventType: "trade_transferred",
          fromOwnerId: offer.proposerId,
          toOwnerId: offer.recipientId,
          actorId: userId,
        },
        {
          cardId: requested._id,
          operationId: `trade:${offer._id}`,
          eventType: "trade_transferred",
          fromOwnerId: offer.recipientId,
          toOwnerId: offer.proposerId,
          actorId: userId,
        },
      ],
      { session, ordered: true },
    );

    offer.status = "accepted";
    offer.completedAt = now;

    await offer.save({ session });

    return publicOffer(offer);
  });
}

module.exports = {
  getMyCode,
  findPartner,
  createOffer,
  listOffers,
  actOnOffer,
  expireBatch,
};
