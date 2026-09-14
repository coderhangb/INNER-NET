const { activityRoutes, rewardRoutes } = require("./routes/activityRoute.js");

const express = require("express");
const cookieParser = require("cookie-parser");
const path = require("path");

const authRoutes = require("./routes/authRoute.js");
const llmRoutes = require("./routes/llmRoute.js");
const createRequestSecurity = require(
  "./middlewares/requestSecurity.js",
);

const cardRoutes = require("./routes/cardRoute.js");

const app = express();

const {
  originGuard,
  corsMiddleware,
  csrfGuard,
} = createRequestSecurity();

// Chỉ bật nếu triển khai sau một reverse proxy tin cậy.
if (process.env.TRUST_PROXY === "1") {
  app.set("trust proxy", 1);
}

app.use(originGuard);
app.use(corsMiddleware);

app.use(cookieParser());

// Bảo vệ toàn bộ API, gồm cả login, signup và logout.
app.use("/api", csrfGuard);

// Giới hạn kích thước JSON để tránh body quá lớn.
app.use(express.json({ limit: "32kb" }));

app.use(
  "/public",
  express.static(path.join(__dirname, "public")),
);

app.get("/api/health", (req, res) => {
  res.status(200).json({
    status: "ok",
  });
});

app.use("/api/auth", authRoutes);
app.use("/api/llm", llmRoutes);
app.use("/api/cards", cardRoutes);

app.use("/api/activity", activityRoutes);
app.use("/api/rewards", rewardRoutes);


// API không tồn tại phải trả JSON 404,
// không trả nhầm index.html của frontend.
app.use("/api", (req, res) => {
  res.status(404).json({
    message: "API endpoint not found",
  });
});

const distPath = path.join(__dirname, "../../frontend/dist");

app.use(express.static(distPath));

// Dự án đang dùng Express 5.
app.get("/{*splat}", (req, res, next) => {
  res.sendFile(path.join(distPath, "index.html"), (error) => {
    if (error) next(error);
  });
});

// Middleware lỗi phải đặt cuối cùng.
app.use((error, req, res, next) => {
  if (res.headersSent) {
    return next(error);
  }

  if (error.type === "entity.parse.failed") {
    return res.status(400).json({
      message: "Invalid JSON body",
    });
  }

  if (error.type === "entity.too.large") {
    return res.status(413).json({
      message: "Request body is too large",
    });
  }

  if (error.status === 404) {
    return res.status(404).json({
      message: "Resource not found",
    });
  }

  console.error("Unhandled request error:", error);

  return res.status(500).json({
    message: "Server error",
  });
});

module.exports = app;