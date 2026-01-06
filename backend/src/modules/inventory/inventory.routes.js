const express = require("express");

const { authRequired } = require("../../middlewares/authRequired");
const { requireRoles } = require("../../middlewares/rbac");
const { require2FAForAdmin } = require("../../middlewares/require2fa");
const { ROLES } = require("../../shared/constants/roles");

const {
  getSettings,
  patchSettings,
  listMaterials,
  postMaterial,
  getMaterial,
  patchMaterial,
  getMaterialLedger,
  postReceive,
  postAdjust,
  getOrderBom,
  upsertOrderBom,
  postConsume,
} = require("./inventory.controller");

const router = express.Router();

router.use(authRequired);

// Settings (admin)
router.get(
  "/settings",
  requireRoles([ROLES.ADMIN]),
  require2FAForAdmin,
  getSettings
);
router.patch(
  "/settings",
  requireRoles([ROLES.ADMIN]),
  require2FAForAdmin,
  patchSettings
);

// Materials
router.get(
  "/materials",
  requireRoles([ROLES.ADMIN, ROLES.SUPERVISOR, ROLES.SALES, ROLES.PRODUCTION]),
  require2FAForAdmin,
  listMaterials
);
router.post(
  "/materials",
  requireRoles([ROLES.ADMIN, ROLES.SUPERVISOR]),
  require2FAForAdmin,
  postMaterial
);
router.get(
  "/materials/:id",
  requireRoles([ROLES.ADMIN, ROLES.SUPERVISOR, ROLES.SALES, ROLES.PRODUCTION]),
  require2FAForAdmin,
  getMaterial
);
router.patch(
  "/materials/:id",
  requireRoles([ROLES.ADMIN, ROLES.SUPERVISOR]),
  require2FAForAdmin,
  patchMaterial
);
router.get(
  "/materials/:id/ledger",
  requireRoles([ROLES.ADMIN, ROLES.SUPERVISOR, ROLES.SALES, ROLES.PRODUCTION]),
  require2FAForAdmin,
  getMaterialLedger
);

// Stock movements
router.post(
  "/materials/:id/receive",
  requireRoles([ROLES.ADMIN, ROLES.SUPERVISOR]),
  require2FAForAdmin,
  postReceive
);
router.post(
  "/materials/:id/adjust",
  requireRoles([ROLES.ADMIN, ROLES.SUPERVISOR]),
  require2FAForAdmin,
  postAdjust
);

// Order BOM + consumption
router.get(
  "/orders/:orderId/bom",
  requireRoles([ROLES.ADMIN, ROLES.SUPERVISOR, ROLES.SALES, ROLES.PRODUCTION]),
  require2FAForAdmin,
  getOrderBom
);

router.patch(
  "/orders/:orderId/bom",
  requireRoles([ROLES.ADMIN, ROLES.SUPERVISOR]),
  require2FAForAdmin,
  upsertOrderBom
);

router.post(
  "/orders/:orderId/consume",
  requireRoles([ROLES.ADMIN, ROLES.SUPERVISOR, ROLES.PRODUCTION]),
  require2FAForAdmin,
  postConsume
);

module.exports = router;
