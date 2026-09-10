const mongoose = require("mongoose");

async function connectDB() {
  if (!process.env.MONGO_URI) {
    throw new Error("MONGO_URI is not configured");
  }

  await mongoose.connect(process.env.MONGO_URI, {
    dbName: process.env.MONGO_DB_NAME || "inner-net",
    serverSelectionTimeoutMS: 10000,
  });

  console.log("MongoDB connected");
}

module.exports = connectDB;