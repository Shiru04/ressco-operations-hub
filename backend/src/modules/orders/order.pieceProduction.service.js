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

function findTakeoffItem(order, itemIdOrUid) {
  const items = order?.takeoff?.items || [];
  if (!itemIdOrUid) return null;

  const raw = String(itemIdOrUid);

  // Try Mongo subdoc _id first (backward compatible)
  if (mongoose.isValidObjectId(raw)) {
    const byId = order.takeoff?.items?.id(raw);
    if (byId) return byId;
  }

  // Then try stable pieceUid
  const byUid = items.find((it) => String(it.pieceUid || "") === raw);
  if (byUid) return byUid;

  // Optional: also support legacy clientItemId if present
  const byClient = items.find((it) => String(it.clientItemId || "") === raw);
  if (byClient) return byClient;

  return null;
}

async function countActivePiecesForUser(userId) {
  const uid = oid(userId);
  if (!uid) return 0;

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

function ensureTimer(item) {
  if (!item.timer) item.timer = {};
  if (!item.timer.state) item.timer.state = "idle";
  if (typeof item.timer.accumulatedSec !== "number")
    item.timer.accumulatedSec = 0;
  if (!("startedAt" in item.timer)) item.timer.startedAt = null;
  if (!("pausedAt" in item.timer)) item.timer.pausedAt = null;

  if (!("sessionStartedAt" in item.timer)) item.timer.sessionStartedAt = null;
  if (typeof item.timer.sessionStartAccumulatedSec !== "number") {
    item.timer.sessionStartAccumulatedSec = 0;
  }
}

function ensureWorkLog(item) {
  if (!Array.isArray(item.workLog)) item.workLog = [];
}

async function assignPiece({ orderId, itemId, actor, queueKey, userId }) {
  const order = await Order.findById(orderId);
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

  ensureTimer(item);
  ensureWorkLog(item);

  // === DO NOT CHANGE QUEUE LOGIC ===
  if (queueKey) {
    const next = String(queueKey).trim();
    item.assignedQueueKey = next;
    item.pieceStatus = next; // ✅ keep status in sync with queue
  }

  // Auto assignment is disabled going forward
  if (userId === "auto") {
    const err = new Error("Auto assignment is disabled");
    err.code = "AUTO_ASSIGN_DISABLED";
    err.statusCode = 400;
    throw err;
  }

  if (userId) {
    const uid = oid(userId);
    if (!uid) {
      const err = new Error("Invalid userId");
      err.code = "INVALID_USER_ID";
      err.statusCode = 400;
      throw err;
    }
    item.assignedTo = String(uid); // keep string storage
    item.assignedAt = new Date().toISOString();
    item.assignedBy = oid(actor.userId);
  } else {
    item.assignedTo = null;
    item.assignedAt = null;
    item.assignedBy = oid(actor.userId);
  }

  await order.save();

  // Audit with stable itemId = pieceUid for long-term traceability
  await writeAudit({
    entityType: "order",
    entityId: order._id,
    action: "piece_assign",
    changes: {
      itemId: String(item.pieceUid || item._id),
      mongoItemId: String(item._id),
      pieceUid: String(item.pieceUid || ""),
      pieceRef: item.pieceRef || null,
      assignedQueueKey: item.assignedQueueKey,
      pieceStatus: item.pieceStatus,
      assignedTo: item.assignedTo,
    },
    actorUserId: actor.userId,
    actorRole: actor.role,
  });

  emitOrderUpdated(order._id);

  return {
    orderId: order._id,
    // keep backward compatible fields, add stable ones
    itemId: String(item.pieceUid || item._id),
    mongoItemId: String(item._id),
    pieceUid: String(item.pieceUid || ""),
    pieceRef: item.pieceRef || null,
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

  const item = findTakeoffItem(order, itemId);
  if (!item)
    throw Object.assign(new Error("Takeoff item not found"), {
      code: "TAKEOFF_ITEM_NOT_FOUND",
      statusCode: 404,
    });

  ensureTimer(item);
  ensureWorkLog(item);

  if (!item.assignedTo) {
    throw Object.assign(
      new Error("Piece must be assigned before starting timer"),
      { code: "ASSIGN_REQUIRED", statusCode: 409 }
    );
  }

  if (item.timer.state === "running") return mapTimer(item);
  if (item.timer.state === "paused") {
    throw Object.assign(new Error("Timer is paused. Use resume."), {
      code: "TIMER_PAUSED",
      statusCode: 409,
    });
  }

  item.timer.state = "running";
  item.timer.startedAt = new Date();
  item.timer.pausedAt = null;

  item.timer.sessionStartedAt = item.timer.startedAt;
  item.timer.sessionStartAccumulatedSec = item.timer.accumulatedSec || 0;

  await order.save();

  await writeAudit({
    entityType: "piece",
    entityId: String(itemId),
    action: "piece_timer_start", // (or pause/resume/stop)
    changes: { orderId: String(order._id), itemId },
    actorUserId: actor.userId,
    actorRole: actor.role,
  });

  emitOrderUpdated(order._id);

  return { ...mapTimer(item), workLog: item.workLog || [] };
}

async function timerPause({ orderId, itemId, actor }) {
  const order = await Order.findById(orderId);
  if (!order)
    throw Object.assign(new Error("Order not found"), {
      code: "ORDER_NOT_FOUND",
      statusCode: 404,
    });

  const item = findTakeoffItem(order, itemId);
  if (!item)
    throw Object.assign(new Error("Takeoff item not found"), {
      code: "TAKEOFF_ITEM_NOT_FOUND",
      statusCode: 404,
    });

  ensureTimer(item);
  ensureWorkLog(item);

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
    entityType: "piece",
    entityId: String(itemId),
    action: "piece_timer_pause", // (or pause/resume/stop)
    changes: { orderId: String(order._id), itemId },
    actorUserId: actor.userId,
    actorRole: actor.role,
  });

  emitOrderUpdated(order._id);

  return { ...mapTimer(item), workLog: item.workLog || [] };
}

async function timerResume({ orderId, itemId, actor }) {
  const order = await Order.findById(orderId);
  if (!order)
    throw Object.assign(new Error("Order not found"), {
      code: "ORDER_NOT_FOUND",
      statusCode: 404,
    });

  const item = findTakeoffItem(order, itemId);
  if (!item)
    throw Object.assign(new Error("Takeoff item not found"), {
      code: "TAKEOFF_ITEM_NOT_FOUND",
      statusCode: 404,
    });

  ensureTimer(item);
  ensureWorkLog(item);

  if (item.timer.state !== "paused") return mapTimer(item);

  item.timer.state = "running";
  item.timer.startedAt = new Date();
  item.timer.pausedAt = null;

  await order.save();

  await writeAudit({
    entityType: "piece",
    entityId: String(itemId),
    action: "piece_timer_resume", // (or pause/resume/stop)
    changes: { orderId: String(order._id), itemId },
    actorUserId: actor.userId,
    actorRole: actor.role,
  });

  emitOrderUpdated(order._id);

  return { ...mapTimer(item), workLog: item.workLog || [] };
}

async function timerStop({ orderId, itemId, actor, notes = "" }) {
  const order = await Order.findById(orderId);
  if (!order)
    throw Object.assign(new Error("Order not found"), {
      code: "ORDER_NOT_FOUND",
      statusCode: 404,
    });

  const item = findTakeoffItem(order, itemId);
  if (!item)
    throw Object.assign(new Error("Takeoff item not found"), {
      code: "TAKEOFF_ITEM_NOT_FOUND",
      statusCode: 404,
    });

  ensureTimer(item);
  ensureWorkLog(item);

  const sessionStart = item.timer.sessionStartedAt || null;
  const sessionStartAccum = item.timer.sessionStartAccumulatedSec || 0;

  if (item.timer.state === "running" && item.timer.startedAt) {
    const startedAt = Math.floor(
      new Date(item.timer.startedAt).getTime() / 1000
    );
    const delta = nowSec() - startedAt;
    item.timer.accumulatedSec =
      (item.timer.accumulatedSec || 0) + Math.max(0, delta);
  }

  const sessionDuration = Math.max(
    0,
    (item.timer.accumulatedSec || 0) - sessionStartAccum
  );

  const endedAt =
    item.timer.state === "paused" && item.timer.pausedAt
      ? item.timer.pausedAt
      : new Date();

  if (sessionDuration > 0 || (notes && String(notes).trim())) {
    // ✅ Prefer real timer.startedAt (authoritative when running)
    let startedAtForLog = item.timer.startedAt
      ? new Date(item.timer.startedAt)
      : null;

    // fallback: session bookkeeping (if present)
    if (!startedAtForLog && item.timer.sessionStartedAt) {
      startedAtForLog = new Date(item.timer.sessionStartedAt);
    }

    // last resort: derive from endedAt - duration (never allow null)
    if (!startedAtForLog && sessionDuration > 0) {
      startedAtForLog = new Date(
        new Date(endedAt).getTime() - sessionDuration * 1000
      );
    }

    item.workLog.push({
      userId: item.assignedTo || null,
      startedAt: startedAtForLog,
      endedAt,
      durationSec: sessionDuration,
      notes: notes || "",
    });
  }

  item.timer.state = "stopped";
  item.timer.startedAt = null;
  item.timer.pausedAt = null;

  item.timer.sessionStartedAt = null;
  item.timer.sessionStartAccumulatedSec = 0;

  await order.save();

  await writeAudit({
    entityType: "piece",
    entityId: String(itemId),
    action: "piece_timer_stop", // (or pause/resume/stop)
    changes: { orderId: String(order._id), itemId },
    actorUserId: actor.userId,
    actorRole: actor.role,
  });

  emitOrderUpdated(order._id);

  return { ...mapTimer(item), workLog: item.workLog || [] };
}

function mapTimer(item) {
  return {
    // stable id for frontend; keep mongo id as extra
    itemId: String(item.pieceUid || item._id),
    mongoItemId: String(item._id),
    pieceUid: String(item.pieceUid || ""),
    pieceRef: item.pieceRef || null,

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
