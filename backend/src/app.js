const { activityRoutes, rewardRoutes } = require("./routes/activityRoute.js");

const express = require("express");
const cookieParser = require("cookie-parser");
const path = require("path");

const authRoutes = require("./routes/authRoute.js");
const llmRoutes = require("./routes/llmRoute.js");
const createRequestSecurity = require("./middlewares/requestSecurity.js");
const cardRoutes = require("./routes/cardRoute.js");
const tradeRoutes = require("./routes/tradeRoute.js");

const app = express();

const { originGuard, corsMiddleware, csrfGuard } = createRequestSecurity();

if (process.env.TRUST_PROXY === "1" || process.env.NODE_ENV === "production") {
  app.set("trust proxy", 1);
}

const distPath = path.join(__dirname, "../../frontend/dist");

app.use(corsMiddleware);
app.use(cookieParser());

app.use(express.static(distPath));
app.use("/public", express.static(path.join(__dirname, "public")));

app.get("/api/health", (req, res) => {
  res.status(200).json({ status: "ok" });
});

app.use("/api", originGuard);
app.use("/api", csrfGuard);
app.use("/api", express.json({ limit: "32kb" }));

app.use("/api/auth", authRoutes);
app.use("/api/llm", llmRoutes);
app.use("/api/cards", cardRoutes);
app.use("/api/activity", activityRoutes);
app.use("/api/rewards", rewardRoutes);
app.use("/api/trades", tradeRoutes);

app.use(/^\/api\/(.*)/, (req, res) => {
  res.status(404).json({ message: "API endpoint not found" });
});

app.get(/^(?!\/api).*/, (req, res, next) => {
  res.sendFile(path.join(distPath, "index.html"), (error) => {
    if (error) next(error);
  });
});

app.use((error, req, res, next) => {
  if (res.headersSent) {
    return next(error);
  }

  if (error.type === "entity.parse.failed") {
    return res.status(400).json({ message: "Invalid JSON body" });
  }

  if (error.type === "entity.too.large") {
    return res.status(413).json({ message: "Request body is too large" });
  }

  if (error.status === 404 || error.code === "ENOENT") {
    return res.status(404).json({ message: "Resource not found" });
  }

  console.error("Unhandled request error:", error);

  return res.status(500).json({ message: "Server error" });
});

module.exports = app;
