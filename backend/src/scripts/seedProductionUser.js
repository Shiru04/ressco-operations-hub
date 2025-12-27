const mongoose = require("mongoose");
const { env } = require("../config/env");
const logger = require("../config/logger");
const { User } = require("../modules/users/users.model");
const { hashPassword } = require("../shared/utils/password");
const { ROLES } = require("../shared/constants/roles");

async function run() {
  await mongoose.connect(env.MONGODB_URI);

  const tempPassword = process.env.SEED_PROD_PASSWORD || "TempPass123!";

  const users = [
    {
      name: "Prod - Cutting 01",
      email: "prod.cutting01@ressco.local",
    },
    {
      name: "Prod - Assembly 01",
      email: "prod.assembly01@ressco.local",
    },
    {
      name: "Prod - QA 01",
      email: "prod.qa01@ressco.local",
    },
  ];

  for (const u of users) {
    const email = u.email.toLowerCase().trim();

    const existing = await User.findOne({ email });
    if (existing) {
      logger.info(
        { email },
        "Production user already exists. No action taken."
      );
      continue;
    }

    const user = await User.create({
      name: u.name,
      email,
      role: ROLES.PRODUCTION,
      isActive: true,
      passwordHash: await hashPassword(tempPassword),

      // 🔒 IMPORTANT RULE:
      // 2FA is NOT enabled for production users
      twoFA: {
        enabled: false,
        secret: null,
        pendingSecret: null,
        enforcedAt: null,
      },
    });

    logger.info({ id: user._id, email: user.email }, "Production user seeded");
  }

  logger.info({ count: users.length }, "Production user seeding completed");

  await mongoose.disconnect();
}

run().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exit(1);
});
