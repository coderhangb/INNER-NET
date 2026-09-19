const { Router } = require("express");
const authMiddleware = require("../middlewares/authMiddleware.js");
const service = require("../services/tradeService.js");

const router = Router();

router.use(authMiddleware);

function bad(message) {
  throw Object.assign(new Error(message), {
    status: 400,
    tradeError: true,
  });
}

function objectId(value, name) {
  if (typeof value !== "string" || !/^[a-fA-F0-9]{24}$/.test(value)) {
    bad(`${name} không hợp lệ.`);
  }

  return value;
}

function exactBody(body, keys) {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    bad("Body phải là một object.");
  }

  const actual = Object.keys(body);

  if (
    actual.length !== keys.length ||
    actual.some((key) => !keys.includes(key))
  ) {
    bad("Body thiếu trường hoặc có trường không được phép.");
  }
}

function cursorQuery(query) {
  if (Object.keys(query).some((key) => key !== "cursor")) {
    bad("Query không được hỗ trợ.");
  }

  return query.cursor ? objectId(query.cursor, "Cursor") : null;
}

function code(value) {
  if (typeof value !== "string") {
    bad("Mã trao đổi không hợp lệ.");
  }

  const normalized = value.trim().toUpperCase();

  if (!/^[A-F0-9]{16}$/.test(normalized)) {
    bad("Mã trao đổi phải gồm 16 ký tự.");
  }

  return normalized;
}

function endpoint(handler) {
  return async (req, res, next) => {
    try {
      await handler(req, res);
    } catch (error) {
      if (error.tradeError) {
        return res.status(error.status).json({
          message: error.message,
        });
      }

      next(error);
    }
  };
}

router.post(
  "/profile",
  endpoint(async (req, res) => {
    exactBody(req.body, []);

    res.json(await service.getMyCode(req.user._id));
  }),
);

router.get(
  "/partners/:code",
  endpoint(async (req, res) => {
    res.json(
      await service.findPartner(
        req.user._id,
        code(req.params.code),
        cursorQuery(req.query),
      ),
    );
  }),
);

router.get(
  "/",
  endpoint(async (req, res) => {
    res.json(await service.listOffers(req.user._id, cursorQuery(req.query)));
  }),
);

router.post(
  "/",
  endpoint(async (req, res) => {
    exactBody(req.body, [
      "recipientCode",
      "offeredCardId",
      "requestedCardId",
      "requestKey",
    ]);

    const body = {
      recipientCode: code(req.body.recipientCode),
      offeredCardId: objectId(req.body.offeredCardId, "Card đưa ra"),
      requestedCardId: objectId(req.body.requestedCardId, "Card muốn nhận"),
      requestKey: req.body.requestKey,
    };

    if (
      typeof body.requestKey !== "string" ||
      !/^[a-fA-F0-9-]{36}$/.test(body.requestKey)
    ) {
      bad("Mã yêu cầu không hợp lệ.");
    }

    res.json(await service.createOffer(req.user._id, body));
  }),
);

for (const action of ["accept", "decline", "cancel"]) {
  router.post(
    `/:id/${action}`,
    endpoint(async (req, res) => {
      exactBody(req.body, []);

      res.json(
        await service.actOnOffer(
          req.user._id,
          objectId(req.params.id, "Mã đề nghị"),
          action,
        ),
      );
    }),
  );
}

module.exports = router;
