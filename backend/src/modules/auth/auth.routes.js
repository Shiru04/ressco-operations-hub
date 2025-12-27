const express = require("express");

const {
  login,
  verify2fa,
  me,
  start2faSetup,
  confirm2faSetup,
  reset2faAsAdmin,
} = require("./auth.controller");
const { authRequired } = require("../../middlewares/authRequired");
const { requireRoles } = require("../../middlewares/rbac");
const { require2FAForAdmin } = require("../../middlewares/require2fa");
const {
  requireTemp2faToken,
} = require("../../middlewares/requireTemp2faToken");
const { ROLES } = require("../../shared/constants/roles");

const router = express.Router();

router.post("/login", login);
router.post("/2fa/verify", verify2fa);
router.get("/me", authRequired, me);

/**
 * 2FA setup flow (admin only):
 * - start: requires tempToken (twofa_pending=true)
 * - confirm: uses tempToken + code and returns full verified token
 */
router.post(
  "/2fa/setup/start",
  authRequired,
  requireTemp2faToken,
  start2faSetup
);
router.post("/2fa/setup/confirm", confirm2faSetup);

/**
 * Admin reset of another admin's 2FA (requires verified admin session)
 */
router.post(
  "/2fa/admin-reset",
  authRequired,
  requireRoles([ROLES.ADMIN]),
  require2FAForAdmin,
  reset2faAsAdmin
);

module.exports = router;
