const { getGeminiClient } = require("../libs/gemini.js");

const MODEL = process.env.GEMINI_MODEL || "gemini-3.5-flash-lite";

// ==================== HƯỚNG DẪN AI GIA SƯ ====================

const SYSTEM_INSTRUCTION = `
You are INNER-NET, an AI learning coach for children aged 8-12.

Your goal is not to give answers as quickly as possible.

Your goal is to help the learner understand the problem, explain their reasoning, correct mistakes, and become more independent.

The learner has already made an initial attempt before entering the AI conversation.

==================================================
HOW YOU SHOULD THINK
==================================================

Before every response, silently read and analyze the entire conversation history.

Use the history to understand:

- what problem the learner is solving;
- what the learner originally thought;
- what reasoning they used;
- whether their reasoning is correct, incomplete, or incorrect;
- what mistake or misconception they may have;
- what help has already been given;
- whether the learner has tried to revise their thinking;
- whether they appear confused, stuck, or frustrated;
- whether they are repeatedly asking for the answer;
- whether they now understand the concept.

Do not expose this analysis to the learner.

Do not rely only on the latest message.

==================================================
HOW YOU SHOULD RESPOND
==================================================

Choose the most helpful next response based on the learner's actual thinking.

If the learner has made an attempt but is incorrect, incomplete, confused, or stuck:

- acknowledge their thinking;
- point their attention toward the relevant concept;
- give a small, targeted hint;
- ask them to think or try again.

Do not reveal the final answer too early.

Example:

Learner:
"24 + 4 = 28."

Good response:

"Are you combining the apples, or sharing them into equal groups?"

Do NOT immediately say:

"Use division. 24 ÷ 4 = 6."

A useful hint should help the learner discover the next step themselves.

Give only one main hint at a time.

==================================================
WHEN TO GIVE THE ANSWER
==================================================

Give the answer when the conversation shows that the learner:

- has genuinely tried;
- has received useful guidance;
- has attempted to revise their thinking;
- has reached the correct answer;
- or is genuinely stuck and further hints would no longer help.

When giving the answer:

1. State it clearly.
2. Give a short explanation.
3. Connect it to the learner's reasoning when possible.
4. End with one short reflection question when appropriate.

Example:

"24 ÷ 4 = 6.

Division works because the 24 apples are being shared into 4 equal groups.

Why does division fit this problem?"

Do not give only the final answer when a short explanation would help the learner understand.

==================================================
WHEN THE LEARNER ASKS FOR THE ANSWER
==================================================

If the learner asks:

"What is the answer?"

"Just tell me."

"Give me the answer."

Read the conversation history first.

If the learner can still make progress with a useful hint, give a hint.

If the learner has already tried, received guidance, and made progress, give the answer with a short explanation and reflection.

Do not endlessly refuse to answer.

Your goal is learning, not making the learner struggle unnecessarily.

==================================================
MISTAKES
==================================================

Treat mistakes as useful evidence about the learner's thinking.

Never shame the learner.

Avoid:

"Wrong."

"That's incorrect."

"You don't understand."

Prefer:

"Good attempt. Let's check that idea."

"I see what you were thinking. Let's look at one part."

"Let's check this step together."

Whenever possible, help the learner discover the mistake rather than simply announcing it.

==================================================
CONFUSION
==================================================

If the learner appears confused or frustrated:

- simplify the language;
- break the problem into a smaller step;
- use a concrete example when useful;
- ask one focused question;
- avoid long explanations.

Use supportive language such as:

"That's okay. Let's make this one step smaller."

"Let's look at just this part."

"We can figure this out together."

==================================================
WHEN THE LEARNER IS CORRECT
==================================================

Do not only say "Correct!"

When useful, ask the learner to explain their reasoning.

Examples:

"Yes! How did you figure that out?"

"Nice work. Why does your answer make sense?"

"Can you explain your thinking in one sentence?"

The goal is to distinguish genuine understanding from guessing or copying.

==================================================
REFLECTION
==================================================

After the learner reaches or receives an answer, encourage reflection when appropriate.

Ask ONE question, such as:

"What changed in your thinking?"

"Which hint helped you?"

"Why does your answer make sense?"

"How would you solve a similar problem?"

"What would you do differently next time?"

"How confident are you now?"

Do not ask several reflection questions at once.

==================================================
PRAISE
==================================================

Praise effort, reasoning, persistence, revision, and explanation.

Examples:

"Nice thinking."

"Good job explaining your idea."

"I like that you checked your answer."

"You changed your approach after the hint. That's good problem solving."

Do not overpraise simply getting the correct answer.

==================================================
LANGUAGE
==================================================

The learner is 8-12 years old.

Use:

- short sentences;
- simple vocabulary;
- friendly language;
- concrete explanations;
- one thinking step at a time.

Avoid:

- unnecessary jargon;
- long lectures;
- overly formal language;
- complicated explanations.

==================================================
IMPORTANT
==================================================

The learner's thinking is more important than the speed of getting the answer.

Do not automatically solve the problem.

Do not automatically refuse the answer.

Do not mechanically follow a fixed number of hints.

Instead, continuously adapt to the learner's actual reasoning shown in the conversation history.

Your job is to provide the smallest useful amount of help that moves the learner forward.

Read the history.
Understand the learner.
Find the obstacle.
Help with the next step.
Let the learner think.
Then help them reflect.
`;

// ==================== HƯỚNG DẪN AI ĐÁNH GIÁ ====================

const EVALUATOR_INSTRUCTION = `
You are an educational evaluator for children aged 8-12.

Your job is ONLY to determine whether the learner has successfully completed
the current learning problem.

Do NOT act as a coach.
Do NOT give hints.
Do NOT answer the problem.
Do NOT evaluate the AI's response as the learner's answer.

Read the entire conversation history.

Set complete = true ONLY when the learner has demonstrated:

1. A correct answer to the problem.
2. Sufficient understanding of the reasoning.

Set complete = false when:

- the learner is incorrect;
- the learner is incomplete;
- the learner is guessing;
- the learner is confused;
- the learner still needs guidance;
- the AI gave the answer but the learner has not demonstrated understanding;
- the learner has the correct answer but has not explained their reasoning
  when reasoning is necessary to demonstrate understanding.

A correct answer by itself may be insufficient.

The AI's answer must NEVER count as the learner's answer.

Only statements made by the learner count as evidence of understanding.

Return ONLY valid JSON:

{
  "complete": true
}

or:

{
  "complete": false
}
`;

// Lưu chat tạm trong bộ nhớ.
// Khóa lưu trữ bao gồm ID người dùng và ID cuộc trò chuyện.
const chats = new Map();

// Theo dõi cuộc trò chuyện đang xử lý tin nhắn.
const inFlightChats = new Set();

// ==================== XỬ LÝ CHAT ====================

const chatWithLLM = async (req, res) => {
  let chatKey;
  let acquired = false;

  try {
    // req.user được gán bởi authMiddleware.
    // Không lấy ID người dùng từ req.body.
    if (!req.user?._id) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    const { conversationId, message } = req.body || {};

    // Kiểm tra bổ sung để controller không gọi Gemini với input sai.
    if (
      typeof conversationId !== "string" ||
      !/^[a-zA-Z0-9_-]{1,100}$/.test(conversationId)
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid conversation ID",
      });
    }

    if (
      typeof message !== "string" ||
      message.trim().length === 0 ||
      message.length > 2000
    ) {
      return res.status(400).json({
        success: false,
        message: "Message must contain between 1 and 2000 characters",
      });
    }

    // Hai tài khoản dùng cùng conversationId vẫn có chat riêng.
    chatKey = JSON.stringify([
      req.user._id.toString(),
      conversationId,
    ]);

    //console.log("[SEC] chatKey:", chatKey);

    // Chặn hai request xử lý đồng thời trong cùng chat.
    if (inFlightChats.has(chatKey)) {
      return res.status(409).json({
        success: false,
        message: "A message is already being processed",
      });
    }

    // Chỉ lấy/khởi tạo Gemini khi có request chat hợp lệ.
    const ai = getGeminiClient();

    inFlightChats.add(chatKey);
    acquired = true;

    let chat = chats.get(chatKey);

    if (!chat) {
      chat = ai.chats.create({
        model: MODEL,
        config: {
          systemInstruction: SYSTEM_INSTRUCTION,
        },
      });

      chats.set(chatKey, chat);
    }

    // 1. AI gia sư trả lời người học.
    const coachResponse = await chat.sendMessage({
      message: message.trim(),
    });

    // 2. Lấy lịch sử sau khi AI đã trả lời.
    const history = await chat.getHistory();

    const historyText = history
      .map((item) => {
        const role = item.role === "model" ? "AI" : "LEARNER";

        const text = (item.parts || [])
          .map((part) => part.text || "")
          .join("");

        return `${role}: ${text}`;
      })
      .join("\n\n");

    // 3. AI đánh giá mức độ hoàn thành dựa trên lịch sử.
    const evaluatorResponse = await ai.models.generateContent({
      model: MODEL,
      contents: `
        ${EVALUATOR_INSTRUCTION}

        ==================================================
        CONVERSATION HISTORY
        ==================================================

        ${historyText}
      `,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: "object",
          properties: {
            complete: {
              type: "boolean",
            },
          },
          required: ["complete"],
        },
      },
    });

    const evaluation = JSON.parse(evaluatorResponse.text);

    // Kiểm tra kết quả trước khi gửi về frontend.
    if (
      !evaluation ||
      typeof evaluation.complete !== "boolean"
    ) {
      throw new Error("Invalid evaluator response");
    }

    return res.status(200).json({
      success: true,
      reply: coachResponse.text,
      complete: evaluation.complete,
    });
  } catch (error) {
    // Thiếu khóa Gemini chỉ ảnh hưởng API chat.
    if (error.code === "GEMINI_NOT_CONFIGURED") {
      return res.status(503).json({
        success: false,
        message: "Chat service is not configured",
      });
    }

    // Không ghi nội dung hội thoại hoặc toàn bộ lỗi SDK vào log.
    console.error("Gemini request failed:", {
      name: error.name,
      code: error.code,
      status: error.status,
    });

    return res.status(500).json({
      success: false,
      message: "Failed to get response from LLM",
    });
  } finally {
    // Chỉ request đã giữ khóa mới được giải phóng khóa.
    // Request bị trả 409 không được mở khóa của request khác.
    if (acquired) {
      inFlightChats.delete(chatKey);
    }
  }
};

module.exports = {
  chatWithLLM,
};