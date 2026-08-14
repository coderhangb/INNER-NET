const express = require("express");
const { chatWithLLM } = require("../controllers/llmController.js");

const router = express.Router();

router.post("/chat", chatWithLLM);

module.exports = router;