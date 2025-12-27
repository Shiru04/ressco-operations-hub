const express = require("express");

const { authRequired } = require("../../middlewares/authRequired");
const { requireRoles } = require("../../middlewares/rbac");
const { require2FAForAdmin } = require("../../middlewares/require2fa");
const { ROLES } = require("../../shared/constants/roles");

const {
  getCustomers,
  postCustomer,
  getCustomer,
  patchCustomer,
  getCustomerOrderHistory,
} = require("./customers.controller");

const router = express.Router();

// CRM is operational: Admin, Sales, Supervisor can access.
// Admin must be 2FA-verified.
router.use(authRequired);

router.get(
  "/",
  requireRoles([ROLES.ADMIN, ROLES.SALES, ROLES.SUPERVISOR]),
  require2FAForAdmin,
  getCustomers
);
router.post(
  "/",
  requireRoles([ROLES.ADMIN, ROLES.SALES]),
  require2FAForAdmin,
  postCustomer
);
router.get(
  "/:id",
  requireRoles([ROLES.ADMIN, ROLES.SALES, ROLES.SUPERVISOR]),
  require2FAForAdmin,
  getCustomer
);
router.patch(
  "/:id",
  requireRoles([ROLES.ADMIN, ROLES.SALES]),
  require2FAForAdmin,
  patchCustomer
);

// history endpoint is stable now; will return real data once Orders exist
router.get(
  "/:id/orders",
  requireRoles([ROLES.ADMIN, ROLES.SALES, ROLES.SUPERVISOR]),
  require2FAForAdmin,
  getCustomerOrderHistory
);

module.exports = router;
