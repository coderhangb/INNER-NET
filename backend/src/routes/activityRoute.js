const { Router } = require("express");
const authMiddleware = require("../middlewares/authMiddleware.js");
const { getRewardRules } = require("../config/rewardRules.js");
const { createActivityService } = require("../services/activityService.js");
const rules = getRewardRules(); // Throws on unsafe quick profile during app import/startup.
const service = createActivityService({ rules });
const router = Router();
router.use(authMiddleware);
const uuid =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
function bad() {
  throw Object.assign(new Error("Dữ liệu hoạt động không hợp lệ."), {
    status: 400,
    code: "INVALID_INPUT",
  });
}
function object(body, keys) {
  if (
    !body ||
    typeof body !== "object" ||
    Array.isArray(body) ||
    Object.keys(body).some((k) => !keys.includes(k))
  )
    bad();
}
function handle(fn) {
  return async (req, res) => {
    try {
      res.json(await fn(req));
    } catch (e) {
      const known = [400, 401, 403, 409].includes(e.status);
      if (!known) console.error("[rewards]", e.name, e.code || "SERVICE_ERROR");
      res
        .status(known ? e.status : 503)
        .json({
          code: known ? e.code : "REWARD_SERVICE_UNAVAILABLE",
          message: known
            ? e.message
            : "Dịch vụ thưởng tạm gián đoạn. Tiến độ đã lưu vẫn được giữ.",
        });
    }
  };
}
router.post(
  "/sessions",
  handle((req) => {
    object(req.body || {}, []);
    return service.open(req.user._id);
  }),
);
router.post(
  "/heartbeat",
  handle((req) => {
    object(req.body, ["sessionId", "sequence", "visible", "active"]);
    const b = req.body;
    if (
      typeof b.sessionId !== "string" ||
      !uuid.test(b.sessionId) ||
      !Number.isSafeInteger(b.sequence) ||
      b.sequence < 1 ||
      typeof b.visible !== "boolean" ||
      typeof b.active !== "boolean"
    )
      bad();
    return service.heartbeat(req.user._id, b);
  }),
);
const rewardRouter = Router();
rewardRouter.use(authMiddleware);
rewardRouter.get(
  "/progress",
  handle((req) => {
    if (Object.keys(req.query).length) bad();
    return service.progress(req.user._id);
  }),
);
module.exports = { activityRoutes: router, rewardRoutes: rewardRouter };
