const express = require("express");
const cookieParser = require("cookie-parser");
const cors = require("cors");
const path = require("path");
const authRoutes = require("./routes/authRoute.js");
require("dotenv").config();

const llmRoutes = require("./routes/llmRoute.js");

const app = express();

const connectDB = require("./libs/db.js");

const PORT = process.env.PORT || 3000;

app.use(
  cors({
    origin: process.env.CLIENT_URL || true,
    credentials: true,
  }),
);
app.use(cookieParser());
app.use(express.json());

// Routes API
app.use("/public", express.static(path.join(__dirname, "public")));
app.use("/api/auth", authRoutes);
app.use("/api/llm", llmRoutes);

const distPath = path.join(__dirname, "../../frontend/dist");
app.use(express.static(distPath));

app.get("/*splat", (req, res) => {
  res.sendFile(path.join(distPath, "index.html"));
});

app.listen(PORT, () => {
  console.log(`Server is listening on port ${PORT}`);
  connectDB();
});
