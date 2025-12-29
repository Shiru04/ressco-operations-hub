const express = require("express");

const { authRequired } = require("../../middlewares/authRequired");
const { requireRoles } = require("../../middlewares/rbac");
const { require2FAForAdmin } = require("../../middlewares/require2fa");
const { ROLES } = require("../../shared/constants/roles");

const { getAuditEvents } = require("./audit.controller");

const router = express.Router();

router.use(authRequired);

router.get(
  "/",
  requireRoles([ROLES.ADMIN, ROLES.SALES, ROLES.SUPERVISOR]),
  require2FAForAdmin,
  getAuditEvents
);

module.exports = router;
