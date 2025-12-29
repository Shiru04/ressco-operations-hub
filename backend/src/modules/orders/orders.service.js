const mongoose = require("mongoose");
const { Order } = require("./orders.model");
const { Customer } = require("../customers/customers.model");
const { nextOrderNumber } = require("../../shared/utils/orderNumber");
const { writeAudit } = require("../../shared/utils/audit");
const {
  ORDER_STATUSES,
  STATUS_TRANSITIONS,
} = require("../../shared/constants/orderStatuses");
const {
  createNotification,
} = require("../notifications/notifications.service");

function normalizeContactSnapshot(c) {
  if (!c) return undefined;
  return {
    name: c.name ? String(c.name).trim() : null,
    email: c.email ? String(c.email).toLowerCase().trim() : null,
    phone: c.phone ? String(c.phone).trim() : null,
  };
}

function normalizeItems(items) {
  if (!Array.isArray(items)) return undefined;
  return items.map((i) => ({
    description: i.description.trim(),
    qty: i.qty ?? 1,
    unitPrice: i.unitPrice ?? 0,
    notes: i.notes ? String(i.notes).trim() : "",
  }));
}

function normalizeEstimate(e) {
  if (!e) return undefined;
  return {
    laborHours: e.laborHours ?? 0,
    laborRate: e.laborRate ?? 0,
    materialsCost: e.materialsCost ?? 0,
    overheadPct: e.overheadPct ?? 0,
  };
}

function computeDueAt(hoursTarget) {
  const now = new Date();
  const ms = (Number(hoursTarget) || 48) * 60 * 60 * 1000;
  return new Date(now.getTime() + ms);
}

async function assertCustomerExists(customerId) {
  if (!mongoose.isValidObjectId(customerId)) {
    const err = new Error("Invalid customer id");
    err.code = "INVALID_CUSTOMER_ID";
    err.statusCode = 400;
    throw err;
  }
  const exists = await Customer.exists({ _id: customerId });
  if (!exists) {
    const err = new Error("Customer not found");
    err.code = "CUSTOMER_NOT_FOUND";
    err.statusCode = 404;
    throw err;
  }
}

async function createOrder(payload, actor, req) {
  await assertCustomerExists(payload.customerId);

  const orderNumber = await nextOrderNumber();

  const hoursTarget = payload.sla?.hoursTarget ?? 48;
  const dueAt = payload.sla?.dueAt
    ? new Date(payload.sla.dueAt)
    : computeDueAt(hoursTarget);

  const doc = await Order.create({
    orderNumber,
    source: payload.source,
    customerId: payload.customerId,
    contactSnapshot: normalizeContactSnapshot(payload.contactSnapshot),
    priority: payload.priority ?? "normal",
    sla: { hoursTarget, dueAt },
    status: ORDER_STATUSES.RECEIVED,
    approvals: { required: 1, approvedBy: [] },
    estimate: normalizeEstimate(payload.estimate),
    items: normalizeItems(payload.items) || [],
    notes: payload.notes ? String(payload.notes).trim() : "",
    audit: { lastStatusChangedAt: new Date(), lastEditedAt: new Date() },
    createdBy: actor?.userId || null,
  });

  await writeAudit({
    entityType: "order",
    entityId: doc._id,
    action: "create",
    changes: { source: doc.source, status: doc.status },
    actorUserId: actor?.userId || null,
    actorRole: actor?.role || null,
    req,
  });

  return mapOrder(doc);
}

async function intakeOrder(payload, req) {
  // Website intake has no authenticated actor; still auditable with IP/UA.
  const created = await createOrder(
    { ...payload, source: "website" },
    { userId: null, role: "website" },
    req
  );
  return created;
}

async function listOrders({ q, status, customerId, page = 1, limit = 25 }) {
  const filter = {};

  if (q) {
    const s = String(q).trim();
    filter.$or = [
      { orderNumber: { $regex: s, $options: "i" } },
      { "contactSnapshot.name": { $regex: s, $options: "i" } },
      { "contactSnapshot.email": { $regex: s, $options: "i" } },
    ];
  }

  if (status) filter.status = status;

  if (customerId) {
    if (!mongoose.isValidObjectId(customerId)) {
      const err = new Error("Invalid customer id");
      err.code = "INVALID_CUSTOMER_ID";
      err.statusCode = 400;
      throw err;
    }
    filter.customerId = customerId;
  }

  const safeLimit = Math.min(Math.max(Number(limit) || 25, 1), 200);
  const safePage = Math.max(Number(page) || 1, 1);
  const skip = (safePage - 1) * safeLimit;

  const [items, total] = await Promise.all([
    Order.find(filter).sort({ createdAt: -1 }).skip(skip).limit(safeLimit),
    Order.countDocuments(filter),
  ]);

  return {
    items: items.map(mapOrder),
    page: safePage,
    limit: safeLimit,
    total,
  };
}

async function getOrderById(id) {
  if (!mongoose.isValidObjectId(id)) {
    const err = new Error("Invalid order id");
    err.code = "INVALID_ID";
    err.statusCode = 400;
    throw err;
  }

  const doc = await Order.findById(id);
  if (!doc) {
    const err = new Error("Order not found");
    err.code = "ORDER_NOT_FOUND";
    err.statusCode = 404;
    throw err;
  }
  return mapOrder(doc);
}

async function updateOrder(id, patch, actor, req) {
  if (!mongoose.isValidObjectId(id)) {
    const err = new Error("Invalid order id");
    err.code = "INVALID_ID";
    err.statusCode = 400;
    throw err;
  }

  const update = {};
  if (patch.priority !== undefined) update.priority = patch.priority;
  if (patch.sla !== undefined) {
    const hoursTarget = patch.sla?.hoursTarget;
    const dueAt =
      patch.sla?.dueAt === null
        ? null
        : patch.sla?.dueAt
        ? new Date(patch.sla.dueAt)
        : undefined;
    update.sla = {};
    if (hoursTarget !== undefined) update.sla.hoursTarget = hoursTarget;
    if (dueAt !== undefined) update.sla.dueAt = dueAt;
  }
  if (patch.estimate !== undefined)
    update.estimate = normalizeEstimate(patch.estimate);
  if (patch.items !== undefined)
    update.items = normalizeItems(patch.items) || [];
  if (patch.notes !== undefined)
    update.notes = patch.notes ? String(patch.notes).trim() : "";
  update["audit.lastEditedAt"] = new Date();

  const doc = await Order.findByIdAndUpdate(id, update, { new: true });
  if (!doc) {
    const err = new Error("Order not found");
    err.code = "ORDER_NOT_FOUND";
    err.statusCode = 404;
    throw err;
  }

  await writeAudit({
    entityType: "order",
    entityId: doc._id,
    action: "update",
    changes: update,
    actorUserId: actor?.userId || null,
    actorRole: actor?.role || null,
    req,
  });

  return mapOrder(doc);
}

function assertTransition(from, to) {
  // Phase 5B interim: allow any status -> any status
  // RBAC restrictions are enforced at the route/controller level.
  return true;
}

function assertRoleCanSetStatus(actorRole, nextStatus) {
  const privileged = ["admin", "supervisor"];

  if (nextStatus === "approved" && !privileged.includes(actorRole)) {
    const err = new Error("Only admin/supervisor can approve orders");
    err.code = "FORBIDDEN_APPROVE";
    err.statusCode = 403;
    throw err;
  }

  if (nextStatus === "received" && !privileged.includes(actorRole)) {
    const err = new Error(
      "Only admin/supervisor can move orders back to received"
    );
    err.code = "FORBIDDEN_RECEIVED";
    err.statusCode = 403;
    throw err;
  }
}

async function patchStatus(id, nextStatus, actor, req, note) {
  const doc = await Order.findById(id);
  if (!doc) {
    const err = new Error("Order not found");
    err.code = "ORDER_NOT_FOUND";
    err.statusCode = 404;
    throw err;
  }

  const current = doc.status;

  // guard: if moving to approved, require approval record exists
  if (nextStatus === ORDER_STATUSES.APPROVED) {
    const approvedCount = doc.approvals?.approvedBy?.length || 0;
    assertRoleCanSetStatus(actor?.role, nextStatus);
    if (approvedCount < (doc.approvals?.required || 1)) {
      const err = new Error(
        "Order requires supervisor approval before being approved"
      );
      err.code = "APPROVAL_REQUIRED";
      err.statusCode = 400;
      throw err;
    }
  }

  assertTransition(current, nextStatus);

  doc.status = nextStatus;
  doc.audit.lastStatusChangedAt = new Date();
  doc.audit.lastEditedAt = new Date();
  await doc.save();

  await writeAudit({
    entityType: "order",
    entityId: doc._id,
    action: "status_change",
    changes: { from: current, to: nextStatus, note: note || null },
    actorUserId: actor?.userId || null,
    actorRole: actor?.role || null,
    req,
  });

  return mapOrder(doc);
}

async function approveOrder(id, actor, req) {
  // Idempotent: if same supervisor already approved, return unchanged.
  const doc = await Order.findById(id);
  if (!doc) {
    const err = new Error("Order not found");
    err.code = "ORDER_NOT_FOUND";
    err.statusCode = 404;
    throw err;
  }

  const userId = actor?.userId;
  if (!userId) {
    const err = new Error("Approval requires an authenticated supervisor");
    err.code = "UNAUTHORIZED";
    err.statusCode = 401;
    throw err;
  }

  const already = (doc.approvals?.approvedBy || []).some(
    (a) => String(a.userId) === String(userId)
  );
  if (already) return mapOrder(doc);

  doc.approvals.approvedBy.push({ userId, at: new Date() });
  doc.audit.lastEditedAt = new Date();
  await doc.save();

  await writeAudit({
    entityType: "order",
    entityId: doc._id,
    action: "approve",
    changes: { approvedByUserId: String(userId) },
    actorUserId: userId,
    actorRole: actor?.role || null,
    req,
  });

  // Notify operational roles: adjust roles if you want more/less
  await createNotification({
    type: "order_created",
    title: "New Order Created",
    message: `Order ${doc.orderNumber} created (${doc.source}).`,
    entityType: "order",
    entityId: doc._id,
    orderNumber: doc.orderNumber,
    roles: ["admin", "sales", "supervisor", "production"],
  });

  return mapOrder(doc);
}
async function unapproveOrder(orderId, { actor, req }) {
  const doc = await Order.findById(orderId);
  if (!doc) {
    const err = new Error("Order not found");
    err.code = "ORDER_NOT_FOUND";
    err.statusCode = 404;
    throw err;
  }

  // Clear approvals but do not force status here (frontend will set status explicitly)
  if (doc.approvals) {
    doc.approvals.approvedBy = [];
    doc.approvals.count = 0; // if you store count
    doc.approvals.lastApprovedAt = null; // if present
  }

  doc.audit.lastEditedAt = new Date();
  await doc.save();

  await writeAudit({
    entityType: "order",
    entityId: doc._id,
    action: "unapprove",
    changes: { approvalsCleared: true },
    actorUserId: actor?.userId || null,
    actorRole: actor?.role || null,
    req,
  });

  return mapOrder(doc);
}

function mapOrder(o) {
  return {
    id: o._id,
    orderNumber: o.orderNumber,
    source: o.source,
    customerId: o.customerId,
    contactSnapshot: o.contactSnapshot || {},
    priority: o.priority,
    sla: o.sla || {},
    status: o.status,

    takeoff: {
      header: o.takeoff?.header || {},
      items: (o.takeoff?.items || []).map((it) => ({
        _id: it._id,
        id: it._id, // compatibility for older UI code
        pieceUid: it.pieceUid || null,
        pieceRef: it.pieceRef || null,
        clientItemId: it.clientItemId || null,

        lineNo: it.lineNo ?? 0,
        typeCode: it.typeCode,
        qty: it.qty ?? 1,
        ga: it.ga ?? null,
        material: it.material ?? null,
        measurements: it.measurements || {},
        remarks: it.remarks || "",

        pieceStatus: it.pieceStatus,
        assignedQueueKey: it.assignedQueueKey,
        assignedTo: it.assignedTo || null,
        assignedAt: it.assignedAt || null,
        assignedBy: it.assignedBy || null,

        timer: it.timer || {},
        workLog: it.workLog || [],
      })),
    },

    approvals: {
      required: o.approvals?.required ?? 1,
      approvedBy: (o.approvals?.approvedBy || []).map((a) => ({
        userId: a.userId,
        at: a.at,
      })),
    },

    estimate: o.estimate || {},
    items: (o.items || []).map((i) => ({
      id: i._id,
      description: i.description,
      qty: i.qty,
      unitPrice: i.unitPrice,
      notes: i.notes,
    })),

    notes: o.notes || "",
    audit: o.audit || {},
    createdBy: o.createdBy || null,
    createdAt: o.createdAt,
    updatedAt: o.updatedAt,
  };
}

module.exports = {
  createOrder,
  intakeOrder,
  listOrders,
  getOrderById,
  updateOrder,
  patchStatus,
  approveOrder,
  unapproveOrder,
};
