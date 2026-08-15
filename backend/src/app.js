const express = require("express");
const cookieParser = require("cookie-parser");
const authRoutes = require("./routes/authRoute.js");
require("dotenv").config();

const llmRoutes = require("./routes/llmRoute.js");

const app = express();

const connectDB = require("./libs/db.js");

const PORT = process.env.PORT || 3000;

app.use(cookieParser());
app.use(express.json());
app.use("/public", express.static("src/public"));
app.use("/api/auth", authRoutes);
app.use("/api/llm", llmRoutes);

//Bao loi nen tam tat di
app.listen(PORT, () => {
  console.log(`Server is listening on port ${PORT}`);
  // connectDB();
});
