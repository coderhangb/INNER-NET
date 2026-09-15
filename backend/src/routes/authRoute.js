const { Router } = require("express");
const authController = require("../controllers/authController.js");
const authMiddleware = require("../middlewares/authMiddleware.js");
const {
  validateAuthInput,
} = require("../middlewares/validateInput.js");

const router = Router();

router.post(
  "/signup",
  validateAuthInput("signup"),
  authController.signupPost,
);

router.post(
  "/login",
  validateAuthInput("login"),
  authController.loginPost,
);

router.post("/logout", authController.logoutPost);

router.get("/check", authMiddleware, (req, res) => {
  res.status(200).json(req.user);
});

module.exports = router;