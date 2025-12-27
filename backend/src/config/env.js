const dotenv = require("dotenv");
dotenv.config();

function requireEnv(name) {
  const v = process.env[name];
  if (!v) throw new Error(`Missing required env var: ${name}`);
  return v;
}

const env = {
  PORT: Number(process.env.PORT || 5000),
  NODE_ENV: process.env.NODE_ENV || "development",
  APP_NAME: process.env.APP_NAME || "Ressco Operations Hub",

  CORS_ORIGIN: process.env.CORS_ORIGIN || "http://localhost:5173",

  MONGODB_URI: requireEnv("MONGODB_URI"),

  JWT_ACCESS_SECRET: requireEnv("JWT_ACCESS_SECRET"),
  JWT_ACCESS_EXPIRES_IN: process.env.JWT_ACCESS_EXPIRES_IN || "12h",

  TOTP_ISSUER: process.env.TOTP_ISSUER || "ResscoOperationsHub",
};

module.exports = { env };
