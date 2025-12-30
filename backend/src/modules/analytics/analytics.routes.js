const express = require("express");

const { authRequired } = require("../../middlewares/authRequired");
const { requireRoles } = require("../../middlewares/rbac");
const { require2FAForAdmin } = require("../../middlewares/require2fa");
const { ROLES } = require("../../shared/constants/roles");

const {
  getProductionOverview,
  getProductionQueues,
  getProductionUsers,
  getOrdersAnalytics,
} = require("./analytics.controller");

const router = express.Router();

router.use(authRequired);

// dashboards: admin + supervisor (+ sales for read)
router.get(
  "/production/overview",
  requireRoles([ROLES.ADMIN, ROLES.SUPERVISOR, ROLES.SALES]),
  require2FAForAdmin,
  getProductionOverview
);

router.get(
  "/production/queues",
  requireRoles([ROLES.ADMIN, ROLES.SUPERVISOR, ROLES.SALES]),
  require2FAForAdmin,
  getProductionQueues
);

router.get(
  "/production/users",
  requireRoles([ROLES.ADMIN, ROLES.SUPERVISOR, ROLES.SALES]),
  require2FAForAdmin,
  getProductionUsers
);

router.get(
  "/orders",
  requireRoles([ROLES.ADMIN, ROLES.SUPERVISOR, ROLES.SALES]),
  require2FAForAdmin,
  getOrdersAnalytics
);

module.exports = router;
