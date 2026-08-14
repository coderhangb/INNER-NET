# INNER-NET Backend – LLM Integration Update

This README documents the latest backend updates made to integrate an LLM into the INNER-NET project.

## 1. What was added

The backend now has a new API route for sending user messages to an LLM.

### New endpoint

```http
POST /api/llm/chat
```

Example request body:

```json
{
  "message": "Why is the sky blue?"
}
```

Example successful response:

```json
{
  "success": true,
  "reply": "..."
}
```

The route is intended to support INNER-NET's learning flow for children aged 8–12, where the AI should guide thinking instead of immediately giving the final answer.

---

## 2. Current backend flow

```text
Frontend / Postman
        ↓
POST /api/llm/chat
        ↓
llmRoute.js
        ↓
llmController.js
        ↓
Gemini API
        ↓
LLM response
        ↓
JSON returned to client
```

---

## 3. New files

### `src/routes/llmRoute.js`

Defines the LLM route:

```js
const express = require("express");
const { chatWithLLM } = require("../controllers/llmController.js");

const router = express.Router();

router.post("/chat", chatWithLLM);

module.exports = router;
```

### `src/controllers/llmController.js`

Handles the request, calls Gemini, and returns the response.

Current controller structure:

```js
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
```

---

## 4. Changes in `src/app.js`

The environment variables must be loaded before importing routes that use them.

Recommended order:

```js
require("dotenv").config();

const express = require("express");
const cookieParser = require("cookie-parser");

const authRoutes = require("./routes/authRoute.js");
const llmRoutes = require("./routes/llmRoute.js");

const app = express();

const PORT = process.env.PORT || 3000;

app.use(cookieParser());
app.use(express.json());

app.use("/public", express.static("src/public"));

app.use("/api/auth", authRoutes);
app.use("/api/llm", llmRoutes);

app.listen(PORT, () => {
  console.log(`Server is listening on port ${PORT}`);
});
```

Important:

```js
require("dotenv").config();
```

must run before:

```js
const llmRoutes = require("./routes/llmRoute.js");
```

Otherwise `process.env.GEMINI_API_KEY` may be `undefined`.

---

## 5. Gemini dependency

The project uses the official Gemini JavaScript SDK:

```bash
npm install @google/genai
```

If the old OpenAI SDK is no longer needed, it can be removed:

```bash
npm uninstall openai
```

The backend currently uses CommonJS, so imports use `require()` instead of ES Module `import`.

---

## 6. Environment variables

Create a `.env` file inside the backend root:

```text
INNER-NET/
└── backend/
    ├── .env
    ├── package.json
    └── src/
```

Example:

```env
GEMINI_API_KEY=your_gemini_api_key_here
GEMINI_MODEL=gemini-3.5-flash-lite
```

Do not commit the real `.env` file to GitHub.

Recommended `.gitignore`:

```gitignore
node_modules/
.env
```

Recommended `.env.example`:

```env
GEMINI_API_KEY=your_api_key_here
GEMINI_MODEL=gemini-3.5-flash-lite
PORT=3000
```

---

## 7. Running the backend

From the backend directory:

```bash
node src/app.js
```

Expected output:

```text
Server is listening on port 3000
```

If `package.json` has a start script:

```json
"scripts": {
  "start": "node src/app.js"
}
```

then the backend can also be started with:

```bash
npm start
```

---

## 8. Testing with Postman Desktop

Use Postman Desktop App.

### Request

Method:

```text
POST
```

URL:

```text
http://localhost:3000/api/llm/chat
```

Body → raw → JSON:

```json
{
  "message": "Why is the sky blue?"
}
```

### Expected successful response

```json
{
  "success": true,
  "reply": "..."
}
```

A successful test has already been completed with Gemini.

---

## 9. Why Gemini is currently used

OpenAI API integration was tested first, but the API returned:

```text
429 insufficient_quota
```

This means the OpenAI API account did not have available billing quota.

For development and testing, the project was switched to Gemini so the LLM route could be tested using a free-tier option.

The route design remains provider-independent:

```text
POST /api/llm/chat
```

This means the frontend does not need to know whether the backend uses Gemini, OpenAI, or another provider.

---

## 10. Current INNER-NET LLM behavior

The current system instruction tells the model to:

- use simple language for children aged 8–12;
- avoid immediately giving answers when possible;
- ask guiding questions;
- provide hints;
- encourage the learner to explain their reasoning;
- break difficult problems into smaller steps;
- praise effort and reasoning.

This is an early version of the INNER-NET cognitive layer.

---

## 11. Suggested next step

The current API returns:

```json
{
  "success": true,
  "reply": "..."
}
```

A future version should return structured learning states, for example:

```json
{
  "success": true,
  "mode": "GUIDE",
  "reply": "Why do you think blue light scatters more?",
  "hint": "Think about the different colors of light.",
  "shouldRevealAnswer": false
}
```

Possible learning modes:

```text
GUIDE    → ask a guiding question
HINT     → give a small hint
EXPLAIN  → explain the concept
REFLECT  → ask the learner to summarize or reason
```

This would allow INNER-NET to behave as a real cognitive learning layer instead of only being a chatbot interface.

---

## 12. Security notes

Never expose API keys in frontend code.

Correct:

```text
Frontend
   ↓
INNER-NET backend
   ↓
Gemini API
```

Incorrect:

```text
Frontend
   ↓
Gemini API directly with secret key
```

Also:

- keep `.env` in `.gitignore`;
- never commit a real API key;
- if a key is accidentally pushed to GitHub, revoke it and create a new one;
- do not log the full API key to the terminal.

---

## 13. Current status

```text
Express server        ✅
POST /api/llm/chat    ✅
Gemini API            ✅
Environment variables ✅
Postman test          ✅
LLM system prompt     ✅
MongoDB               Not part of this LLM test flow
Frontend integration  Next step
Structured modes      Future improvement
```
