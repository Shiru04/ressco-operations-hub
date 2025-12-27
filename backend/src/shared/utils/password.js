const bcrypt = require("bcryptjs");

async function hashPassword(plain) {
  const salt = await bcrypt.genSalt(12);
  return bcrypt.hash(plain, salt);
}

module.exports = { hashPassword };
