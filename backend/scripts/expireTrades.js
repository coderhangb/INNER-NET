require("dotenv").config();

const mongoose = require("mongoose");
const { expireBatch } = require("../src/services/tradeService.js");

let stopping = false;

process.on("SIGINT", () => {
  stopping = true;
});

process.on("SIGTERM", () => {
  stopping = true;
});

async function main() {
  if (!process.env.MONGO_URI || !process.env.MONGO_DB_NAME) {
    throw new Error("Missing MONGO_URI or MONGO_DB_NAME");
  }

  await mongoose.connect(process.env.MONGO_URI, {
    dbName: process.env.MONGO_DB_NAME,
  });

  const watch = process.argv.includes("--watch");

  do {
    const result = await expireBatch();

    console.log(
      new Date().toISOString(),
      `Checked ${result.scanned}; expired ${result.expired}`,
    );

    if (!watch || stopping) break;

    // Drain remaining batches sooner when a full batch was found.
    const delay = result.scanned === 100 ? 1000 : 30000;

    await new Promise(resolve => setTimeout(resolve, delay));
  } while (!stopping);
}

main()
  .catch(error => {
    console.error(error.message);
    process.exitCode = 1;
  })
  .finally(() => mongoose.disconnect());