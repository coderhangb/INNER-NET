require("dotenv").config();

const mongoose = require("mongoose");
const connectDB = require("./libs/db.js");

async function startServer() {
  if (!process.env.JWT_SECRET) {
    throw new Error("JWT_SECRET is not configured");
  }

  const port = Number(process.env.PORT || 3000);

  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error("PORT must be an integer between 1 and 65535");
  }

  // Import sau khi dotenv đã nạp cấu hình.
  const app = require("./app.js");

  // DB phải kết nối thành công trước.
  await connectDB();

  await new Promise((resolve, reject) => {
    const server = app.listen(port, () => {
      console.log(`Server is listening on port ${port}`);
      resolve();
    });

    server.once("error", reject);
  });
}

startServer().catch(async (error) => {
  console.error("Failed to start server:", error.message);

  await mongoose.disconnect().catch(() => {});

  process.exitCode = 1;
});
