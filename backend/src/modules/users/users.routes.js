const express = require("express");

const { authRequired } = require("../../middlewares/authRequired");
const { requireRoles } = require("../../middlewares/rbac");
const { require2FAForAdmin } = require("../../middlewares/require2fa");
const { ROLES } = require("../../shared/constants/roles");

const {
  getUsers,
  postUser,
  patchUser,
  patchDisableUser,
  patchEnforce2fa,
  patchUserProductionQueues,
  patchUserPassword,
} = require("./users.controller");

const router = express.Router();

// All user management is admin-only
router.use(authRequired, requireRoles([ROLES.ADMIN]), require2FAForAdmin);

router.get("/", getUsers);
router.post("/", postUser);
router.patch("/:id", patchUser);
router.patch("/:id/disable", patchDisableUser);
router.patch("/:id/2fa/enforce", patchEnforce2fa);
router.patch("/:id/production-queues", patchUserProductionQueues);

// NEW: reset password (admin-only)
router.patch("/:id/password", patchUserPassword);

module.exports = router;
