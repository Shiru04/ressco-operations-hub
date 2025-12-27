const express = require("express");
const { authRequired } = require("../../middlewares/authRequired");
const { requireRoles } = require("../../middlewares/rbac");
const { require2FAForAdmin } = require("../../middlewares/require2fa");
const { ROLES } = require("../../shared/constants/roles");
const {
  getProductionBoard,
  putProductionBoard,
} = require("./productionBoard.controller");

const router = express.Router();

router.use(authRequired);
router.use(require2FAForAdmin);

router.get(
  "/board",
  requireRoles([ROLES.ADMIN, ROLES.SALES, ROLES.SUPERVISOR, ROLES.PRODUCTION]),
  getProductionBoard
);

router.put("/board", requireRoles([ROLES.ADMIN]), putProductionBoard);

module.exports = router;
