const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const speakeasy = require("speakeasy");

const { env } = require("../../config/env");
const { User } = require("../users/users.model");
const { ROLES } = require("../../shared/constants/roles");

function signAccessToken(payload, overrides = {}) {
  return jwt.sign(payload, env.JWT_ACCESS_SECRET, {
    expiresIn: env.JWT_ACCESS_EXPIRES_IN,
    ...overrides,
  });
}

/**
 * Step 1: email/password validation
 * - If user is admin AND has 2FA enabled => return tempToken with twofa_pending = true
 * - Else return full access token
 */
async function loginWithPassword({ email, password }) {
  const user = await User.findOne({ email: email.toLowerCase().trim() });

  if (!user || !user.isActive) {
    const err = new Error("Invalid credentials");
    err.code = "INVALID_CREDENTIALS";
    err.statusCode = 401;
    throw err;
  }

  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) {
    const err = new Error("Invalid credentials");
    err.code = "INVALID_CREDENTIALS";
    err.statusCode = 401;
    throw err;
  }

  // Admin 2FA enforcement behavior:
  const adminNeeds2fa = user.role === ROLES.ADMIN && user.twoFA?.enabled;

  if (adminNeeds2fa) {
    const hasSecret = !!user.twoFA?.secret;

    const tempToken = signAccessToken(
      {
        sub: String(user._id),
        role: user.role,
        twofa_pending: true,
        twofa_verified: false,
      },
      { expiresIn: "10m" }
    );

    return {
      requires2fa: true,
      needs2faSetup: !hasSecret,
      tempToken,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    };
  }

  const token = signAccessToken({
    sub: String(user._id),
    role: user.role,
    twofa_pending: false,
    twofa_verified: false, // non-admin can remain false
  });

  return {
    requires2fa: false,
    token,
    user: { id: user._id, name: user.name, email: user.email, role: user.role },
  };
}

/**
 * Step 2: verify TOTP for admin with tempToken.
 * Returns full token with twofa_verified = true.
 */
async function verify2FA({ tempToken, code }) {
  let payload;
  try {
    payload = jwt.verify(tempToken, env.JWT_ACCESS_SECRET);
  } catch (_e) {
    const err = new Error("Invalid or expired temp token");
    err.code = "INVALID_TEMP_TOKEN";
    err.statusCode = 401;
    throw err;
  }

  if (!payload?.twofa_pending || payload?.role !== ROLES.ADMIN) {
    const err = new Error("2FA verification not applicable");
    err.code = "TWOFA_NOT_APPLICABLE";
    err.statusCode = 400;
    throw err;
  }

  const userId = payload.sub;
  const user = await User.findById(userId);

  if (!user || !user.isActive) {
    const err = new Error("User not found or disabled");
    err.code = "USER_NOT_FOUND";
    err.statusCode = 404;
    throw err;
  }

  if (!user.twoFA?.enabled || !user.twoFA?.secret) {
    const err = new Error("2FA not configured for this user");
    err.code = "TWOFA_NOT_CONFIGURED";
    err.statusCode = 400;
    throw err;
  }

  const verified = speakeasy.totp.verify({
    secret: user.twoFA.secret,
    encoding: "base32",
    token: String(code).trim(),
    window: 1,
  });

  if (!verified) {
    const err = new Error("Invalid 2FA code");
    err.code = "INVALID_TWOFA_CODE";
    err.statusCode = 401;
    throw err;
  }

  const token = signAccessToken({
    sub: String(user._id),
    role: user.role,
    twofa_pending: false,
    twofa_verified: true,
  });

  return {
    token,
    user: { id: user._id, name: user.name, email: user.email, role: user.role },
  };
}

/**
 * Minimal "me" helper — used by frontend to restore session.
 */
async function getMe(userId) {
  const user = await User.findById(userId).select(
    "_id name email role isActive twoFA.enabled"
  );
  if (!user || !user.isActive) return null;
  return {
    id: user._id,
    name: user.name,
    email: user.email,
    role: user.role,
    twoFAEnabled: !!user.twoFA?.enabled,
  };
}

async function start2FASetupForAdmin(userId, label) {
  const user = await User.findById(userId);
  if (!user || !user.isActive) {
    const err = new Error("User not found or disabled");
    err.code = "USER_NOT_FOUND";
    err.statusCode = 404;
    throw err;
  }

  if (user.role !== ROLES.ADMIN) {
    const err = new Error("2FA setup only allowed for admins");
    err.code = "TWOFA_ADMIN_ONLY";
    err.statusCode = 400;
    throw err;
  }

  // If setup already started, reuse pendingSecret to avoid changing QR each request
  if (user.twoFA?.pendingSecret) {
    const otpauthUrl = speakeasy.otpauthURL({
      secret: user.twoFA.pendingSecret,
      label: label || `${env.TOTP_ISSUER}:${user.email}`,
      issuer: env.TOTP_ISSUER,
      encoding: "base32",
    });

    return {
      issuer: env.TOTP_ISSUER,
      accountName: user.email,
      otpauthUrl,
      secretBase32: user.twoFA.pendingSecret,
    };
  }

  // Generate a fresh secret only if no pendingSecret exists
  const secret = speakeasy.generateSecret({
    name: label || `${env.TOTP_ISSUER}:${user.email}`,
    issuer: env.TOTP_ISSUER,
    length: 20,
  });

  user.twoFA = user.twoFA || {};
  user.twoFA.pendingSecret = secret.base32;
  await user.save();

  return {
    issuer: env.TOTP_ISSUER,
    accountName: user.email,
    otpauthUrl: secret.otpauth_url,
    secretBase32: secret.base32,
  };
}

async function confirm2FASetupForAdmin({ tempToken, code }) {
  let payload;
  try {
    payload = jwt.verify(tempToken, env.JWT_ACCESS_SECRET);
  } catch (_e) {
    const err = new Error("Invalid or expired temp token");
    err.code = "INVALID_TEMP_TOKEN";
    err.statusCode = 401;
    throw err;
  }

  if (!payload?.twofa_pending || payload?.role !== ROLES.ADMIN) {
    const err = new Error("Temp token required for 2FA setup");
    err.code = "TEMP_TOKEN_REQUIRED";
    err.statusCode = 403;
    throw err;
  }

  const userId = payload.sub;
  const user = await User.findById(userId);

  if (!user || !user.isActive) {
    const err = new Error("User not found or disabled");
    err.code = "USER_NOT_FOUND";
    err.statusCode = 404;
    throw err;
  }

  const pending = user.twoFA?.pendingSecret;
  if (!pending) {
    const err = new Error("2FA setup not started");
    err.code = "TWOFA_SETUP_NOT_STARTED";
    err.statusCode = 400;
    throw err;
  }

  const verified = speakeasy.totp.verify({
    secret: pending,
    encoding: "base32",
    token: String(code).trim(),
    window: 1,
  });

  if (!verified) {
    const err = new Error("Invalid 2FA code");
    err.code = "INVALID_TWOFA_CODE";
    err.statusCode = 401;
    throw err;
  }

  // Commit secret
  user.twoFA.secret = pending;
  user.twoFA.pendingSecret = null;
  user.twoFA.enabled = true;
  user.twoFA.enforcedAt = user.twoFA.enforcedAt || new Date();
  await user.save();

  // Return full verified token immediately (better UX)
  const token = signAccessToken({
    sub: String(user._id),
    role: user.role,
    twofa_pending: false,
    twofa_verified: true,
  });

  return {
    token,
    user: { id: user._id, name: user.name, email: user.email, role: user.role },
  };
}

async function adminReset2FA({ adminUserId, targetUserId }) {
  // Caller must be admin and 2FA-verified at route level; still validate existence.
  const target = await User.findById(targetUserId);
  if (!target) {
    const err = new Error("Target user not found");
    err.code = "USER_NOT_FOUND";
    err.statusCode = 404;
    throw err;
  }

  if (target.role !== ROLES.ADMIN) {
    const err = new Error("2FA reset only applicable to admin users");
    err.code = "TWOFA_ADMIN_ONLY";
    err.statusCode = 400;
    throw err;
  }

  target.twoFA = target.twoFA || {};
  target.twoFA.secret = null;
  target.twoFA.pendingSecret = null;
  target.twoFA.enabled = true; // enforced remains true, but needs setup again
  target.twoFA.enforcedAt = target.twoFA.enforcedAt || new Date();
  await target.save();

  return { ok: true, userId: String(target._id) };
}

module.exports = {
  loginWithPassword,
  verify2FA,
  getMe,
  start2FASetupForAdmin,
  confirm2FASetupForAdmin,
  adminReset2FA,
};
