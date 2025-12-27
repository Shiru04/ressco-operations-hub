const { ROLES } = require("../shared/constants/roles");

/**
 * Enforces that admins must have completed 2FA step-up (TOTP),
 * except when they are holding a temporary token (twofa_pending).
 */
function require2FAForAdmin(req, res, next) {
  const role = req.auth?.role;

  if (role !== ROLES.ADMIN) return next();

  // If admin token is "pending 2FA", block protected routes.
  if (req.auth?.twofa_pending) {
    return res.status(403).json({
      ok: false,
      error: { code: "TWOFA_REQUIRED", message: "2FA verification required" },
    });
  }

  // If admin is expected to have 2FA verified, ensure flag.
  if (req.auth?.twofa_verified !== true) {
    return res.status(403).json({
      ok: false,
      error: { code: "TWOFA_REQUIRED", message: "2FA verification required" },
    });
  }

  return next();
}

module.exports = { require2FAForAdmin };
