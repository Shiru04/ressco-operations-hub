const mongoose = require("mongoose");

const { User } = require("../users/users.model");
const { Customer } = require("../customers/customers.model");
const { Order } = require("../orders/orders.model");
const { ORDER_STATUSES } = require("../../shared/constants/orderStatuses");

const { patchTakeoffSchema } = require("../orders/orders.takeoff.dto");
const { patchOrderTakeoff } = require("../orders/orders.takeoff.service");

/**
 * Load full portal user doc (customerIds are authoritative here, not JWT).
 */
async function loadPortalUser(auth) {
  const userId = auth?.sub;
  if (!mongoose.isValidObjectId(userId)) {
    const err = new Error("Missing or invalid auth subject");
    err.statusCode = 401;
    err.code = "UNAUTHORIZED";
    throw err;
  }

  const user = await User.findById(userId).select(
    "_id role customerIds email name isActive"
  );
  if (!user || user.isActive === false) {
    const err = new Error("User not found or disabled");
    err.statusCode = 401;
    err.code = "UNAUTHORIZED";
    throw err;
  }

  return user;
}

function assertCustomerAccess(user, customerId) {
  const allowed = (user.customerIds || []).some(
    (id) => String(id) === String(customerId)
  );
  if (!allowed) {
    const err = new Error("Insufficient permissions");
    err.statusCode = 403;
    err.code = "FORBIDDEN";
    throw err;
  }
}

function assertOrderAccess(user, order) {
  if (!order?.customerId) {
    const err = new Error("Insufficient permissions");
    err.statusCode = 403;
    err.code = "FORBIDDEN";
    throw err;
  }
  assertCustomerAccess(user, order.customerId);
}

function actorFromAuth(auth) {
  return {
    userId: auth?.sub || null,
    role: auth?.role || "customer",
  };
}

async function listCustomersForPortal(auth) {
  const user = await loadPortalUser(auth);
  const ids = (user.customerIds || []).filter((x) =>
    mongoose.isValidObjectId(x)
  );
  if (!ids.length) return [];

  const rows = await Customer.find({ _id: { $in: ids } })
    .select("_id name email phone")
    .sort({ name: 1 });

  return rows.map((c) => ({
    id: String(c._id),
    name: c.name || "",
    email: c.email || "",
    phone: c.phone || "",
  }));
}

async function listOrdersForPortal(auth) {
  const user = await loadPortalUser(auth);

  return Order.find({
    customerId: { $in: user.customerIds || [] },
  })
    .sort({ createdAt: -1 })
    .select("_id orderNumber status createdAt updatedAt");
}

async function getOrderForPortal(auth, orderId) {
  const user = await loadPortalUser(auth);

  if (!mongoose.isValidObjectId(orderId)) {
    const err = new Error("Invalid order id");
    err.statusCode = 400;
    err.code = "INVALID_ID";
    throw err;
  }

  const order = await Order.findById(orderId);
  if (!order) {
    const err = new Error("Order not found");
    err.statusCode = 404;
    err.code = "ORDER_NOT_FOUND";
    throw err;
  }

  assertOrderAccess(user, order);
  return order;
}

/**
 * Creates a request order in RECEIVED status.
 * IMPORTANT: do not alter approval logic; ops will approve using existing endpoints/flow.
 *
 * Note: Order model source enum in ZIP is ["pos","website","internal"], so we use "website"
 * to avoid enum churn and keep changes minimal/compatible.
 */
async function createOrderRequest(auth, body, req) {
  const user = await loadPortalUser(auth);
  const { customerId } = body || {};

  if (!mongoose.isValidObjectId(customerId)) {
    const err = new Error("Invalid customerId");
    err.statusCode = 400;
    err.code = "VALIDATION_ERROR";
    throw err;
  }

  assertCustomerAccess(user, customerId);

  const customer = await Customer.findById(customerId);
  if (!customer) {
    const err = new Error("Customer not found");
    err.statusCode = 404;
    err.code = "CUSTOMER_NOT_FOUND";
    throw err;
  }

  const order = await Order.create({
    source: "website",
    customerId,
    contactSnapshot: {
      name: customer.name || null,
      email: customer.email || null,
      phone: customer.phone || null,
    },
    status: ORDER_STATUSES.RECEIVED,
    takeoff: { header: {}, items: [] },
    createdBy: user._id,
  });

  return {
    id: String(order._id),
    orderNumber: order.orderNumber,
    status: order.status,
    takeoff: order.takeoff || { header: {}, items: [] },
  };
}

/**
 * Save takeoff for a portal order using the same schema + patch service as ops.
 * This keeps auditing consistent and avoids duplicating business logic.
 */
async function patchOrderTakeoffForPortal(auth, orderId, body, req) {
  const user = await loadPortalUser(auth);

  if (!mongoose.isValidObjectId(orderId)) {
    const err = new Error("Invalid order id");
    err.statusCode = 400;
    err.code = "INVALID_ID";
    throw err;
  }

  const order = await Order.findById(orderId).select("_id customerId status");
  if (!order) {
    const err = new Error("Order not found");
    err.statusCode = 404;
    err.code = "ORDER_NOT_FOUND";
    throw err;
  }

  assertOrderAccess(user, order);

  // Validate payload with same DTO used by ops
  const patch = patchTakeoffSchema.parse(body);

  // Persist via shared takeoff patch service (writes audit event takeoff_patch)
  const updated = await patchOrderTakeoff(
    orderId,
    patch,
    actorFromAuth(auth),
    req
  );

  return {
    id: String(updated.id),
    orderNumber: updated.orderNumber,
    takeoff: updated.takeoff,
    updatedAt: updated.updatedAt,
  };
}

module.exports = {
  listCustomersForPortal,
  listOrdersForPortal,
  getOrderForPortal,
  createOrderRequest,
  patchOrderTakeoff: patchOrderTakeoffForPortal,
};
