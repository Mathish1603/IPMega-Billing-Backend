require("dotenv").config();
const mongoose = require("mongoose");
const { fixExistingGstData } = require("../helpers/gstMigration");

(async () => {
  const url = process.env.MONGO_URL || "mongodb://127.0.0.1:27017/ipmegaBilling";
  try {
    await mongoose.connect(url);
    console.log("Connected. Running 26 KG GST fix...");
    await fixExistingGstData();
    console.log("Done.");
  } catch (err) {
    console.error("Migration failed:", err.message);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect().catch(() => {});
  }
})();
