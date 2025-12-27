const mongoose = require("mongoose");
const { env } = require("../config/env");
const logger = require("../config/logger");
const { User } = require("../modules/users/users.model");
const { hashPassword } = require("../shared/utils/password");
const { ROLES } = require("../shared/constants/roles");

async function run() {
  const email = process.env.SEED_ADMIN_EMAIL;
  const password = process.env.SEED_ADMIN_PASSWORD;
  const name = process.env.SEED_ADMIN_NAME || "Ressco Admin";

  if (!email || !password) {
    throw new Error("Missing SEED_ADMIN_EMAIL or SEED_ADMIN_PASSWORD");
  }

  await mongoose.connect(env.MONGODB_URI);

  const existing = await User.findOne({ email: email.toLowerCase().trim() });
  if (existing) {
    logger.info({ email }, "Admin already exists. No action taken.");
    await mongoose.disconnect();
    return;
  }

  const user = await User.create({
    name,
    email: email.toLowerCase().trim(),
    role: ROLES.ADMIN,
    isActive: true,
    passwordHash: await hashPassword(password),
    twoFA: { enabled: true, secret: null, enforcedAt: new Date() }, // enforced; secret configured in next phase
  });

  logger.info({ id: user._id, email: user.email }, "Seed admin created");
  await mongoose.disconnect();
}

run().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exit(1);
});
