const express = require("express");
const {
  chatWithLLM,
} = require("../controllers/llmController.js");
const authMiddleware = require("../middlewares/authMiddleware.js");
const {
  validateChatInput,
} = require("../middlewares/validateInput.js");

const router = express.Router();

router.post(
  "/chat",
  authMiddleware,
  validateChatInput,
  chatWithLLM,
);

module.exports = router;