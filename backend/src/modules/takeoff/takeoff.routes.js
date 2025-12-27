const express = require("express");
const { authRequired } = require("../../middlewares/authRequired");
const { requireRoles } = require("../../middlewares/rbac");
const { require2FAForAdmin } = require("../../middlewares/require2fa");
const { ROLES } = require("../../shared/constants/roles");
const { getCatalog } = require("./takeoff.controller");

const router = express.Router();

router.use(authRequired);

// Operational roles can access catalog
router.get(
  "/catalog",
  requireRoles([ROLES.ADMIN, ROLES.SALES, ROLES.SUPERVISOR, ROLES.PRODUCTION]),
  require2FAForAdmin,
  getCatalog
);

module.exports = router;
