const { ok } = require("../../shared/http/apiResponse");
const { Order } = require("./orders.model");
const { writeAudit } = require("../../shared/utils/audit");

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

    const item = order.takeoff?.items?.id(itemId);
    if (!item) {
      const err = new Error("Takeoff item not found");
      err.code = "TAKEOFF_ITEM_NOT_FOUND";
      err.statusCode = 404;
      throw err;
    }

    const from = item.pieceStatus || "queued";
    const next = String(pieceStatus).trim();

    item.pieceStatus = next;
    item.assignedQueueKey = next; // ✅ keep queue in sync with status

    order.audit.lastEditedAt = new Date();
    await order.save();

    await writeAudit({
      entityType: "order",
      entityId: order._id,
      action: "piece_status_change",
      changes: { itemId, from, to: item.pieceStatus },
      actorUserId: req.auth?.sub || null,
      actorRole: req.auth?.role || null,
      req,
    });

    return ok(res, {
      orderId: order._id,
      itemId,
      pieceStatus: item.pieceStatus,
      assignedQueueKey: item.assignedQueueKey,
    });
  } catch (err) {
    return next(err);
  }
}

module.exports = { patchTakeoffItemStatus };
