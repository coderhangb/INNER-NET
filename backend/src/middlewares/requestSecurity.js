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

  function isAllowedRequest(req) {
    const origin = req.get("Origin");
    const host = req.get("Host");
    const protocol = req.protocol;
    const selfOrigin = `${protocol}://${host}`;

    if (!origin) {
      return true;
    }

    return origin === selfOrigin || allowedOrigins.has(origin);
  }

  function originGuard(req, res, next) {
    const origin = req.get("Origin");

    if (origin && !isAllowedRequest(req)) {
      return res.status(403).json({
        message: "Origin is not allowed",
      });
    }

    return next();
  }

  const corsMiddleware = cors({
    origin(origin, callback) {
      if (!origin || allowedOrigins.has(origin)) {
        return callback(null, true);
      }
      return callback(null, false);
    },
    credentials: true,
    methods: ["GET", "HEAD", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "X-CSRF-Protection", "Idempotency-Key"],
  });

  function csrfGuard(req, res, next) {
    const safeMethods = ["GET", "HEAD", "OPTIONS"];

    if (safeMethods.includes(req.method)) {
      return next();
    }

    if (!isAllowedRequest(req)) {
      return res.status(403).json({
        message: "CSRF check failed: invalid origin",
      });
    }

    const csrfHeader = req.get("X-CSRF-Protection");
    const isSameOrigin =
      !req.get("Origin") ||
      req.get("Origin") === `${req.protocol}://${req.get("Host")}`;

    if (csrfHeader === "1" || isSameOrigin) {
      return next();
    }

    return res.status(403).json({
      message: "CSRF check failed: missing protection header",
    });
  }

  return {
    originGuard,
    corsMiddleware,
    csrfGuard,
  };
}

module.exports = createRequestSecurity;
