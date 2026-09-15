const { isEmail } = require("validator");

function isObject(value) {
  return (
    value !== null &&
    typeof value === "object" &&
    !Array.isArray(value)
  );
}

function validateAuthInput(mode) {
  return (req, res, next) => {
    if (!isObject(req.body)) {
      return res.status(400).json({
        message: "Request body must be a JSON object",
      });
    }

    const { email, password, fullName, role } = req.body;

    if (
      typeof email !== "string" ||
      email.trim().length > 254 ||
      !isEmail(email.trim())
    ) {
      return res.status(400).json({
        email: "Please enter a valid email",
      });
    }

    // bcrypt chỉ xử lý tối đa 72 byte mật khẩu.
    if (
      typeof password !== "string" ||
      password.length === 0 ||
      Buffer.byteLength(password, "utf8") > 72
    ) {
      return res.status(400).json({
        password: "Password must contain between 1 and 72 bytes",
      });
    }

    if (mode === "signup") {
      if (
        typeof fullName !== "string" ||
        fullName.trim().length < 1 ||
        fullName.trim().length > 100
      ) {
        return res.status(400).json({
          fullName: "Name must contain between 1 and 100 characters",
        });
      }

      if (password.length < 6) {
        return res.status(400).json({
          password: "Password must have at least 6 characters",
        });
      }

      if (!["student", "parents", "teacher"].includes(role)) {
        return res.status(400).json({
          role: "Invalid role",
        });
      }
    }

    // Chỉ chuyển các trường được phép xuống controller.
    req.body = {
      email: email.trim().toLowerCase(),
      password,
      ...(mode === "signup"
        ? {
            fullName: fullName.trim(),
            role,
          }
        : {}),
    };

    return next();
  };
}

function validateChatInput(req, res, next) {
  if (!isObject(req.body)) {
    return res.status(400).json({
      message: "Request body must be a JSON object",
    });
  }

  const { conversationId, message } = req.body;

  if (
    typeof conversationId !== "string" ||
    !/^[a-zA-Z0-9_-]{1,100}$/.test(conversationId)
  ) {
    return res.status(400).json({
      message: "Invalid conversation ID",
    });
  }

  if (
    typeof message !== "string" ||
    message.trim().length === 0 ||
    message.length > 2000
  ) {
    return res.status(400).json({
      message: "Message must contain between 1 and 2000 characters",
    });
  }

  req.body = {
    conversationId,
    message: message.trim(),
  };

  return next();
}

module.exports = {
  validateAuthInput,
  validateChatInput,
};