const mongoose = require("mongoose");
const { Order } = require("./orders.model");
const { User } = require("../users/users.model");
const { writeAudit } = require("../../shared/utils/audit");
const { getIO } = require("../../realtime/socket");

function oid(id) {
  if (!id) return null;
  if (!mongoose.isValidObjectId(id)) return null;
  return mongoose.Types.ObjectId.createFromHexString(String(id));
}

async function countActivePiecesForUser(userId) {
  const uid = oid(userId);
  if (!uid) return 0;

  // Count takeoff items assigned to user with running/paused timers
  const pipeline = [
    { $match: { "takeoff.items.assignedTo": uid } },
    { $unwind: "$takeoff.items" },
    {
      $match: {
        "takeoff.items.assignedTo": uid,
        "takeoff.items.timer.state": { $in: ["running", "paused"] },
      },
    },
    { $count: "n" },
  ];

  const r = await Order.aggregate(pipeline);
  return r?.[0]?.n || 0;
}

async function pickNextUserForQueue(queueKey) {
  const candidates = await User.find({
    "productionQueues.key": queueKey,
    "productionQueues.isActive": true,
    isActive: { $ne: false },
  }).select("_id name role productionQueues lastAutoAssignedAt");

  if (!candidates.length) return null;

  // compute load per user
  const enriched = [];
  for (const u of candidates) {
    const q = (u.productionQueues || []).find((x) => x.key === queueKey) || {
      order: 9999,
    };
    const load = await countActivePiecesForUser(u._id);
    enriched.push({
      user: u,
      load,
      queueOrder: q.order ?? 9999,
      lastAuto: u.lastAutoAssignedAt
        ? new Date(u.lastAutoAssignedAt).getTime()
        : 0,
    });
  }

  enriched.sort((a, b) => {
    if (a.load !== b.load) return a.load - b.load;
    if (a.queueOrder !== b.queueOrder) return a.queueOrder - b.queueOrder;
    return a.lastAuto - b.lastAuto;
  });

  return enriched[0].user;
}

async function assignPiece({ orderId, itemId, actor, queueKey, userId }) {
  const order = await Order.findById(orderId);
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

  if (queueKey) {
    const next = String(queueKey).trim();
    item.assignedQueueKey = next;
    item.pieceStatus = next; // ✅ keep status in sync with queue
  }

  let assignedUser = null;

  if (userId === "auto") {
    assignedUser = await pickNextUserForQueue(
      item.assignedQueueKey || "cutting"
    );
    if (!assignedUser) {
      const err = new Error("No available users in queue");
      err.code = "NO_QUEUE_USERS";
      err.statusCode = 409;
      throw err;
    }
    item.assignedTo = assignedUser._id;
    item.assignedAt = new Date();
    item.assignedBy = oid(actor.userId);
    assignedUser.lastAutoAssignedAt = new Date();
    await assignedUser.save();
  } else if (userId) {
    const uid = oid(userId);
    if (!uid) {
      const err = new Error("Invalid userId");
      err.code = "INVALID_USER_ID";
      err.statusCode = 400;
      throw err;
    }
    item.assignedTo = uid;
    item.assignedAt = new Date();
    item.assignedBy = oid(actor.userId);
  } else {
    // unassign
    item.assignedTo = null;
    item.assignedAt = null;
    item.assignedBy = oid(actor.userId);
  }

  await order.save();

  await writeAudit({
    entityType: "order",
    entityId: order._id,
    action: "piece_assign",
    changes: {
      itemId,
      assignedQueueKey: item.assignedQueueKey,
      assignedTo: item.assignedTo,
    },
    actorUserId: actor.userId,
    actorRole: actor.role,
  });

  emitOrderUpdated(order._id);

  return {
    orderId: order._id,
    itemId,
    assignedQueueKey: item.assignedQueueKey,
    assignedTo: item.assignedTo,
    assignedAt: item.assignedAt,
  };
}

function nowSec() {
  return Math.floor(Date.now() / 1000);
}

async function timerStart({ orderId, itemId, actor }) {
  const order = await Order.findById(orderId);
  if (!order)
    throw Object.assign(new Error("Order not found"), {
      code: "ORDER_NOT_FOUND",
      statusCode: 404,
    });

  const item = order.takeoff?.items?.id(itemId);
  if (!item)
    throw Object.assign(new Error("Takeoff item not found"), {
      code: "TAKEOFF_ITEM_NOT_FOUND",
      statusCode: 404,
    });

  // enforce assignment for accountability
  if (!item.assignedTo) {
    throw Object.assign(
      new Error("Piece must be assigned before starting timer"),
      {
        code: "ASSIGN_REQUIRED",
        statusCode: 409,
      }
    );
  }

  if (item.timer.state === "running") return mapTimer(item);

  item.timer.state = "running";
  item.timer.startedAt = new Date();
  item.timer.pausedAt = null;

  await order.save();

  await writeAudit({
    entityType: "order",
    entityId: order._id,
    action: "piece_timer_start",
    changes: { itemId },
    actorUserId: actor.userId,
    actorRole: actor.role,
  });

  emitOrderUpdated(order._id);

  return mapTimer(item);
}

async function timerPause({ orderId, itemId, actor }) {
  const order = await Order.findById(orderId);
  if (!order)
    throw Object.assign(new Error("Order not found"), {
      code: "ORDER_NOT_FOUND",
      statusCode: 404,
    });

  const item = order.takeoff?.items?.id(itemId);
  if (!item)
    throw Object.assign(new Error("Takeoff item not found"), {
      code: "TAKEOFF_ITEM_NOT_FOUND",
      statusCode: 404,
    });

  if (item.timer.state !== "running") return mapTimer(item);

  const startedAt = item.timer.startedAt
    ? Math.floor(new Date(item.timer.startedAt).getTime() / 1000)
    : null;
  if (startedAt) {
    const delta = nowSec() - startedAt;
    item.timer.accumulatedSec =
      (item.timer.accumulatedSec || 0) + Math.max(0, delta);
  }

  item.timer.state = "paused";
  item.timer.pausedAt = new Date();
  item.timer.startedAt = null;

  await order.save();

  await writeAudit({
    entityType: "order",
    entityId: order._id,
    action: "piece_timer_pause",
    changes: { itemId },
    actorUserId: actor.userId,
    actorRole: actor.role,
  });

  emitOrderUpdated(order._id);

  return mapTimer(item);
}

async function timerResume({ orderId, itemId, actor }) {
  const order = await Order.findById(orderId);
  if (!order)
    throw Object.assign(new Error("Order not found"), {
      code: "ORDER_NOT_FOUND",
      statusCode: 404,
    });

  const item = order.takeoff?.items?.id(itemId);
  if (!item)
    throw Object.assign(new Error("Takeoff item not found"), {
      code: "TAKEOFF_ITEM_NOT_FOUND",
      statusCode: 404,
    });

  if (item.timer.state !== "paused") return mapTimer(item);

  item.timer.state = "running";
  item.timer.startedAt = new Date();
  item.timer.pausedAt = null;

  await order.save();

  await writeAudit({
    entityType: "order",
    entityId: order._id,
    action: "piece_timer_resume",
    changes: { itemId },
    actorUserId: actor.userId,
    actorRole: actor.role,
  });

  emitOrderUpdated(order._id);

  return mapTimer(item);
}

async function timerStop({ orderId, itemId, actor, notes = "" }) {
  const order = await Order.findById(orderId);
  if (!order)
    throw Object.assign(new Error("Order not found"), {
      code: "ORDER_NOT_FOUND",
      statusCode: 404,
    });

  const item = order.takeoff?.items?.id(itemId);
  if (!item)
    throw Object.assign(new Error("Takeoff item not found"), {
      code: "TAKEOFF_ITEM_NOT_FOUND",
      statusCode: 404,
    });

  // if running, finalize into accumulated
  if (item.timer.state === "running" && item.timer.startedAt) {
    const startedAt = Math.floor(
      new Date(item.timer.startedAt).getTime() / 1000
    );
    const delta = nowSec() - startedAt;
    item.timer.accumulatedSec =
      (item.timer.accumulatedSec || 0) + Math.max(0, delta);

    // add work session
    item.workLog.push({
      userId: item.assignedTo,
      startedAt: new Date(startedAt * 1000),
      endedAt: new Date(),
      durationSec: Math.max(0, delta),
      notes: notes || "",
    });
  }

  item.timer.state = "stopped";
  item.timer.startedAt = null;
  item.timer.pausedAt = null;

  await order.save();

  await writeAudit({
    entityType: "order",
    entityId: order._id,
    action: "piece_timer_stop",
    changes: { itemId },
    actorUserId: actor.userId,
    actorRole: actor.role,
  });

  emitOrderUpdated(order._id);

  return mapTimer(item);
}

function mapTimer(item) {
  return {
    itemId: String(item._id),
    state: item.timer?.state || "idle",
    startedAt: item.timer?.startedAt || null,
    pausedAt: item.timer?.pausedAt || null,
    accumulatedSec: item.timer?.accumulatedSec || 0,
  };
}

function emitOrderUpdated(orderId) {
  try {
    const io = getIO();
    io.emit("order:updated", { orderId: String(orderId) });
  } catch {
    // ignore
  }
}

module.exports = {
  assignPiece,
  timerStart,
  timerPause,
  timerResume,
  timerStop,
};
