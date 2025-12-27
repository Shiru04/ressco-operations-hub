const mongoose = require("mongoose");
const { env } = require("./env");
const logger = require("./logger");

async function connectDB() {
  mongoose.set("strictQuery", true);

  await mongoose.connect(env.MONGODB_URI, {
    // Keep defaults; Atlas recommended settings are handled internally
  });

  logger.info("MongoDB connected");
}

module.exports = { connectDB };
