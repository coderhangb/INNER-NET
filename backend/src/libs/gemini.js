let client;

function getGeminiClient() {
  if (!process.env.GEMINI_API_KEY) {
    const error = new Error("Gemini is not configured");
    error.code = "GEMINI_NOT_CONFIGURED";
    throw error;
  }

  if (!client) {
    const { GoogleGenAI } = require("@google/genai");

    client = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
    });
  }

  return client;
}

module.exports = {
  getGeminiClient,
};