const express = require("express");

const { authRequired } = require("../../middlewares/authRequired");
const { requireRoles } = require("../../middlewares/rbac");
const { ROLES } = require("../../shared/constants/roles");

const ctrl = require("./portal.controller");

const router = express.Router();

router.use(authRequired);
router.use(requireRoles([ROLES.CUSTOMER]));

// Customers linked to this portal user
router.get("/customers", ctrl.listCustomers);

// Orders for linked customers
router.get("/orders", ctrl.listOrders);
router.get("/orders/:id", ctrl.getOrder);

// Create initial request order (status: received)
router.post("/orders", ctrl.createOrderRequest);

// Save takeoff against an existing portal order (reuses existing takeoff patch service)
router.patch("/orders/:id/takeoff", ctrl.patchOrderTakeoff);

module.exports = router;
