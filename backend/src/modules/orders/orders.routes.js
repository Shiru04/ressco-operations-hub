const express = require("express");

const { authRequired } = require("../../middlewares/authRequired");
const { requireRoles } = require("../../middlewares/rbac");
const { require2FAForAdmin } = require("../../middlewares/require2fa");
const { ROLES } = require("../../shared/constants/roles");
const { patchTakeoff } = require("./orders.takeoff.controller");
const { getTakeoffPdf } = require("./orders.pdf.controller");

const { intakeLimiter } = require("./orders.rateLimit");
const {
  getOrders,
  postOrder,
  postIntake,
  getOrder,
  patchOrder,
  patchOrderStatus,
  postApprove,
  postUnapprove,
  getOrderCosting,
} = require("./orders.controller");
const { patchTakeoffItemStatus } = require("./orders.pieces.controller");
const {
  patchAssignPiece,
  postTimerStart,
  postTimerPause,
  postTimerResume,
  postTimerStop,
} = require("./orders.pieceProduction.controller");

const router = express.Router();

/**
 * Website intake (no login)
 */
router.post("/intake", intakeLimiter, postIntake);

/**
 * Authenticated ops routes:
 * - Sales: create/update
 * - Supervisor: approve + status changes
 * - Production: read (later) + production module
 */
router.use(authRequired);

// List / view: admin, sales, supervisor, production
router.get(
  "/",
  requireRoles([ROLES.ADMIN, ROLES.SALES, ROLES.SUPERVISOR, ROLES.PRODUCTION]),
  require2FAForAdmin,
  getOrders
);
router.get(
  "/:id",
  requireRoles([ROLES.ADMIN, ROLES.SALES, ROLES.SUPERVISOR, ROLES.PRODUCTION]),
  require2FAForAdmin,
  getOrder
);
//Costing route
router.get("/:id/costing", authRequired, require2FAForAdmin, getOrderCosting);

// Takeoff PDF (auth required)
router.get(
  "/:id/pdf/takeoff",
  requireRoles([ROLES.ADMIN, ROLES.SALES, ROLES.SUPERVISOR, ROLES.PRODUCTION]),
  require2FAForAdmin,
  getTakeoffPdf
);

// Create: admin, sales, supervisor (POS/internal)
router.post(
  "/",
  requireRoles([ROLES.ADMIN, ROLES.SALES, ROLES.SUPERVISOR]),
  require2FAForAdmin,
  postOrder
);
// Unapproved option to make the order go back to received
router.post(
  "/:id/unapprove",
  requireRoles([ROLES.ADMIN]),
  require2FAForAdmin,
  postUnapprove
);

// Update fields: admin, sales
router.patch(
  "/:id",
  requireRoles([ROLES.ADMIN, ROLES.SALES]),
  require2FAForAdmin,
  patchOrder
);

// Approve: supervisor (and admin)
router.post(
  "/:id/approve",
  requireRoles([ROLES.ADMIN, ROLES.SUPERVISOR]),
  require2FAForAdmin,
  postApprove
);

// Status change: supervisor (and admin)
router.patch(
  "/:id/status",
  requireRoles([ROLES.ADMIN, ROLES.SUPERVISOR, ROLES.SALES, ROLES.PRODUCTION]),
  require2FAForAdmin,
  patchOrderStatus
);

// Takeoff patch: admin, sales, supervisor
router.patch(
  "/:id/takeoff",
  requireRoles([ROLES.ADMIN, ROLES.SALES, ROLES.SUPERVISOR]),
  require2FAForAdmin,
  patchTakeoff
);

router.patch(
  "/:id/takeoff/items/:itemId/status",
  requireRoles([ROLES.ADMIN, ROLES.SALES, ROLES.SUPERVISOR, ROLES.PRODUCTION]),
  require2FAForAdmin,
  patchTakeoffItemStatus
);

router.patch(
  "/:id/takeoff/items/:itemId/assign",
  requireRoles([ROLES.ADMIN, ROLES.SALES, ROLES.SUPERVISOR, ROLES.PRODUCTION]),
  require2FAForAdmin,
  patchAssignPiece
);

router.post(
  "/:id/takeoff/items/:itemId/timer/start",
  requireRoles([ROLES.ADMIN, ROLES.SUPERVISOR, ROLES.PRODUCTION]),
  require2FAForAdmin,
  postTimerStart
);
router.post(
  "/:id/takeoff/items/:itemId/timer/pause",
  requireRoles([ROLES.ADMIN, ROLES.SUPERVISOR, ROLES.PRODUCTION]),
  require2FAForAdmin,
  postTimerPause
);
router.post(
  "/:id/takeoff/items/:itemId/timer/resume",
  requireRoles([ROLES.ADMIN, ROLES.SUPERVISOR, ROLES.PRODUCTION]),
  require2FAForAdmin,
  postTimerResume
);
router.post(
  "/:id/takeoff/items/:itemId/timer/stop",
  requireRoles([ROLES.ADMIN, ROLES.SUPERVISOR, ROLES.PRODUCTION]),
  require2FAForAdmin,
  postTimerStop
);

module.exports = router;
