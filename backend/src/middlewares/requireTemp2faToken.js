const { ROLES } = require("../shared/constants/roles");

/**
 * Only allows an admin token that is pending 2FA (tempToken).
 * Used for /api/auth/2fa/setup/* endpoints.
 */
function requireTemp2faToken(req, res, next) {
  const role = req.auth?.role;

  if (role !== ROLES.ADMIN) {
    return res.status(403).json({
      ok: false,
      error: { code: "FORBIDDEN", message: "Admin only" },
    });
  }

  if (req.auth?.twofa_pending !== true) {
    return res.status(403).json({
      ok: false,
      error: {
        code: "TEMP_TOKEN_REQUIRED",
        message: "Temp 2FA token required",
      },
    });
  }

  return next();
}

module.exports = { requireTemp2faToken };
