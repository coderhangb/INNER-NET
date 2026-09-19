require("dotenv").config();

const assert = require("node:assert/strict");
const mongoose = require("mongoose");
const connectDB = require("../src/libs/db.js");

async function main() {
  // Script chỉ được phép ghi vào đúng DB thử này.
  if (
    process.env.NODE_ENV === "production" ||
    process.env.MONGO_DB_NAME !== "inner-net-card-dev"
  ) {
    throw new Error("Run this script only against inner-net-card-dev");
  }

  await connectDB();

  const collection = mongoose.connection.db.collection("_transaction_checks");

  const firstId = new mongoose.Types.ObjectId();
  const secondId = new mongoose.Types.ObjectId();

  const ids = [firstId, secondId];
  const session = await mongoose.startSession();

  try {
    // Tạo dữ liệu trước transaction.
    await collection.insertMany([
      { _id: firstId, value: 10 },
      { _id: secondId, value: 20 },
    ]);

    // Kiểm tra commit hai thay đổi.
    await session.withTransaction(async () => {
      await collection.updateOne(
        { _id: firstId },
        { $inc: { value: -3 } },
        { session },
      );

      await collection.updateOne(
        { _id: secondId },
        { $inc: { value: 3 } },
        { session },
      );
    });

    assert.equal((await collection.findOne({ _id: firstId })).value, 7);

    assert.equal((await collection.findOne({ _id: secondId })).value, 23);

    console.log("PASS: transaction committed both changes");

    // Cố tình gây lỗi sau thay đổi đầu tiên.
    const forcedError = new Error("FORCED_ROLLBACK");

    await assert.rejects(
      session.withTransaction(async () => {
        await collection.updateOne(
          { _id: firstId },
          { $inc: { value: -2 } },
          { session },
        );

        throw forcedError;
      }),
      (error) => error === forcedError,
    );

    // Thay đổi vừa rồi phải được hoàn tác.
    assert.equal((await collection.findOne({ _id: firstId })).value, 7);

    assert.equal((await collection.findOne({ _id: secondId })).value, 23);

    console.log("PASS: failed transaction rolled back");
  } finally {
    try {
      // Chỉ xóa hai document do lần chạy này tạo.
      await collection.deleteMany({
        _id: { $in: ids },
      });
    } finally {
      await session.endSession();
    }
  }
}

main()
  .catch((error) => {
    console.error("FAIL:", error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });
