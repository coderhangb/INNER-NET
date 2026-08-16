const express = require("express");
const { chatWithLLM } = require("../controllers/llmController.js");
const authMiddleware = require("../middlewares/authMiddleware.js");

const router = express.Router();

router.post("/chat", authMiddleware, chatWithLLM);

module.exports = router;
