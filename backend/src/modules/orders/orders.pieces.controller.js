const mongoose = require("mongoose");
const { ok } = require("../../shared/http/apiResponse");
const { Order } = require("./orders.model");
const { writeAudit } = require("../../shared/utils/audit");

function findTakeoffItem(order, itemIdOrUid) {
  if (!order?.takeoff?.items?.length) return null;
  const raw = String(itemIdOrUid || "");

  // 1) Back-compat: Mongo subdoc _id lookup
  if (mongoose.isValidObjectId(raw)) {
    const byId = order.takeoff.items.id(raw);
    if (byId) return byId;
  }

  // 2) New: stable uid lookup
  const byUid = order.takeoff.items.find(
    (it) => String(it.pieceUid || "") === raw
  );
  if (byUid) return byUid;

  // 3) Optional: legacy client id (if present)
  const byClient = order.takeoff.items.find(
    (it) => String(it.clientItemId || "") === raw
  );
  if (byClient) return byClient;

  return null;
}

async function patchTakeoffItemStatus(req, res, next) {
  try {
    const { id, itemId } = req.params;
    const { pieceStatus } = req.body || {};

    if (!pieceStatus || typeof pieceStatus !== "string") {
      const err = new Error("pieceStatus is required");
      err.code = "VALIDATION_ERROR";
      err.statusCode = 400;
      throw err;
    }

    const order = await Order.findById(id);
    if (!order) {
      const err = new Error("Order not found");
      err.code = "ORDER_NOT_FOUND";
      err.statusCode = 404;
      throw err;
    }

    const item = findTakeoffItem(order, itemId);
    if (!item) {
      const err = new Error("Takeoff item not found");
      err.code = "TAKEOFF_ITEM_NOT_FOUND";
      err.statusCode = 404;
      throw err;
    }

    const from = item.pieceStatus || item.assignedQueueKey || "queued";
    const nextStatus = String(pieceStatus).trim();

    // IMPORTANT: keep status + queue synced (non-negotiable)
    item.pieceStatus = nextStatus;
    item.assignedQueueKey = nextStatus;

    order.audit.lastEditedAt = new Date();
    await order.save();

    // Write audit with stable ID for long-term traceability
    await writeAudit({
      entityType: "order",
      entityId: order._id,
      action: "piece_status_change",
      changes: {
        itemId: String(item.pieceUid || item._id), // ✅ stable
        mongoItemId: String(item._id),
        pieceUid: String(item.pieceUid || ""),
        pieceRef: item.pieceRef || null,
        from,
        to: item.pieceStatus,
      },
      actorUserId: req.auth?.sub || null,
      actorRole: req.auth?.role || null,
      req,
    });

    return ok(res, {
      orderId: order._id,
      itemId: String(item.pieceUid || item._id), // return stable
      mongoItemId: String(item._id),
      pieceUid: String(item.pieceUid || ""),
      pieceRef: item.pieceRef || null,
      pieceStatus: item.pieceStatus,
      assignedQueueKey: item.assignedQueueKey,
    });
  } catch (err) {
    return next(err);
  }
}

module.exports = { patchTakeoffItemStatus };
