const mongoose = require("mongoose");
const { Order } = require("./orders.model");
const { writeAudit } = require("../../shared/utils/audit");

function normalizeHeader(h) {
  if (!h) return undefined;
  return {
    ...h,
    date: h.date ? new Date(h.date) : h.date === null ? null : undefined,
    dueDate: h.dueDate
      ? new Date(h.dueDate)
      : h.dueDate === null
      ? null
      : undefined,
  };
}

function normalizeItems(items) {
  if (!Array.isArray(items)) return undefined;

  return items.map((it, idx) => ({
    lineNo: it.lineNo ?? idx + 1,
    typeCode: it.typeCode.trim(),
    qty: it.qty ?? 1,
    ga: it.ga ? String(it.ga).trim() : null,
    material: it.material ? String(it.material).trim() : null,
    measurements: it.measurements || {},
    remarks: it.remarks ? String(it.remarks).trim() : "",
  }));
}

async function patchOrderTakeoff(orderId, patch, actor, req) {
  if (!mongoose.isValidObjectId(orderId)) {
    const err = new Error("Invalid order id");
    err.code = "INVALID_ID";
    err.statusCode = 400;
    throw err;
  }

  const doc = await Order.findById(orderId);
  if (!doc) {
    const err = new Error("Order not found");
    err.code = "ORDER_NOT_FOUND";
    err.statusCode = 404;
    throw err;
  }

  const changes = {};

  if (patch.header !== undefined) {
    doc.takeoff = doc.takeoff || {};
    doc.takeoff.header = {
      ...(doc.takeoff.header?.toObject?.() || doc.takeoff.header || {}),
      ...normalizeHeader(patch.header),
    };
    changes["takeoff.header"] = true;
  }

  if (patch.items !== undefined) {
    doc.takeoff = doc.takeoff || {};
    doc.takeoff.items = normalizeItems(patch.items);
    changes["takeoff.items.count"] = doc.takeoff.items.length;
  }

  doc.audit.lastEditedAt = new Date();
  await doc.save();

  await writeAudit({
    entityType: "order",
    entityId: doc._id,
    action: "takeoff_patch",
    changes,
    actorUserId: actor?.userId || null,
    actorRole: actor?.role || null,
    req,
  });

  // Return minimal updated takeoff for UI
  return {
    id: doc._id,
    orderNumber: doc.orderNumber,
    takeoff: {
      header: doc.takeoff?.header || {},
      items: doc.takeoff?.items || [],
    },
    updatedAt: doc.updatedAt,
  };
}

module.exports = { patchOrderTakeoff };
