const { Router } = require("express");
const authMiddleware = require("../middlewares/authMiddleware.js");
const {
  listMine,
  getMine,
  listTemplates,
} = require("../controllers/cardController.js");
const router = Router();
router.use(authMiddleware);
router.get("/templates", listTemplates);
router.get("/me", listMine);
router.get("/:id", getMine);
module.exports = router;
