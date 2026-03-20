import mongoose from "mongoose";
import dotenv from "dotenv";
import { resolveMongoUri } from "../src/config/dbConnect.js";
import { runDailySnapshot } from "../src/jobs/dailySnapshotJob.js";

dotenv.config();

async function main() {
  const uri = resolveMongoUri();
  if (!uri) {
    console.error("MongoDB connection string not configured. Set MONGO_URI or DB_USER/DB_PASSWORD (and optional DB_HOST/DB_NAME).");
    process.exit(1);
  }
  try {
    console.log("[CLI] Connecting to Mongo...");
    await mongoose.connect(uri);
    console.log("[CLI] Running daily snapshot at", new Date().toISOString());
    await runDailySnapshot();
  } catch (e) {
    console.error("[CLI] Error:", e);
    process.exitCode = 1;
  } finally {
    await mongoose.connection.close();
    console.log("[CLI] Connection closed.");
  }
}

main();
