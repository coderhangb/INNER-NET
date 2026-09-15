const cors = require("cors");

function createRequestSecurity() {
  const configuredOrigins = process.env.CLIENT_URL;

  if (!configuredOrigins) {
    throw new Error("CLIENT_URL is not configured");
  }

  const allowedOrigins = new Set(
    configuredOrigins
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean)
      .map((value) => {
        const url = new URL(value);

        // Chỉ chấp nhận origin, ví dụ http://localhost:5173.
        if (
          !["http:", "https:"].includes(url.protocol) ||
          value !== url.origin
        ) {
          throw new Error(
            "CLIENT_URL must contain exact origins without paths or trailing slashes",
          );
        }

        return url.origin;
      }),
  );

  if (allowedOrigins.size === 0) {
    throw new Error("CLIENT_URL must contain at least one origin");
  }

  // Chặn nguồn không được phép trước khi request vào routes.
  function originGuard(req, res, next) {
    const origin = req.get("Origin");

    if (origin && !allowedOrigins.has(origin)) {
      return res.status(403).json({
        message: "Origin is not allowed",
      });
    }

    return next();
  }

  const corsMiddleware = cors({
    origin(origin, callback) {
      callback(null, Boolean(origin && allowedOrigins.has(origin)));
    },
    credentials: true,
    methods: ["GET", "HEAD", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: [
      "Content-Type",
      "X-CSRF-Protection",
      "Idempotency-Key",
    ],
  });

  function csrfGuard(req, res, next) {
    const safeMethods = ["GET", "HEAD", "OPTIONS"];

    if (safeMethods.includes(req.method)) {
      return next();
    }

    const origin = req.get("Origin");

    // Yêu cầu ghi dữ liệu phải có Origin hợp lệ.
    if (!origin || !allowedOrigins.has(origin)) {
      return res.status(403).json({
        message: "CSRF check failed: invalid origin",
      });
    }

    if (req.get("X-CSRF-Protection") !== "1") {
      return res.status(403).json({
        message: "CSRF check failed: missing protection header",
      });
    }

    return next();
  }

  return {
    originGuard,
    corsMiddleware,
    csrfGuard,
  };
}

module.exports = createRequestSecurity;