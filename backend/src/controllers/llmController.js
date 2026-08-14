const { GoogleGenAI } = require("@google/genai");

const chatWithLLM = async (req, res) => {
  try {
    const { message } = req.body;

    if (!message || !message.trim()) {
      return res.status(400).json({
        success: false,
        message: "Message is required",
      });
    }

    if (!process.env.GEMINI_API_KEY) {
      return res.status(500).json({
        success: false,
        message: "GEMINI_API_KEY is missing",
      });
    }

    const ai = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
    });

    const interaction = await ai.interactions.create({
      model: process.env.GEMINI_MODEL || "gemini-3.5-flash-lite",

      system_instruction: `
You are INNER-NET, an AI learning assistant for children aged 8-12.

Your goal is not simply to give answers.
Your goal is to help the learner think independently.

Rules:
1. Use simple, child-friendly language.
2. When possible, guide the learner with questions or hints before giving the final answer.
3. Encourage the learner to explain their own reasoning.
4. Do not overwhelm the learner with long explanations.
5. If the learner is confused, break the problem into smaller steps.
6. Praise effort and reasoning rather than simply whether the answer is correct.
`,

      input: message,
    });

    return res.status(200).json({
      success: true,
      reply: interaction.output_text,
    });
  } catch (error) {
    console.error("Gemini error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to get response from LLM",
      error: error.message,
    });
  }
};

module.exports = {
  chatWithLLM,
};