const { Router } = require("express");
const authController = require("../controllers/authController.js");
const authMiddleware = require("../middlewares/authMiddleware.js");

const router = Router();

router.route("/signup").post(authController.signupPost);

router.route("/login").post(authController.loginPost);

router.route("/logout").post(authController.logoutPost);

router.route("/check").get(authMiddleware, (req, res) => {
  res.status(200).json(req.user);
});

module.exports = router;
