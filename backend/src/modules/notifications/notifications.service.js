const mongoose = require("mongoose");
const { Notification } = require("./notifications.model");
const { getIO } = require("../../realtime/socket");

function safeObjectId(id) {
  if (!id) return null;
  if (!mongoose.isValidObjectId(id)) return null;
  return mongoose.Types.ObjectId.createFromHexString(String(id));
}

async function createNotification(payload) {
  const doc = await Notification.create({
    type: payload.type,
    title: payload.title,
    message: payload.message || "",
    entityType: payload.entityType || null,
    entityId: safeObjectId(payload.entityId),
    orderNumber: payload.orderNumber || null,
    audience: { roles: payload.roles || [] },
    readBy: [],
  });

  // realtime emit to role rooms
  try {
    const io = getIO();
    (payload.roles || []).forEach((r) => {
      io.to(`role:${r}`).emit("notification:new", mapNotification(doc));
    });
  } catch {
    // if socket not initialized, do not fail business flow
  }

  return mapNotification(doc);
}

async function listNotificationsForUser({ userId, role, limit = 30 }) {
  const safeLimit = Math.min(Math.max(Number(limit) || 30, 1), 200);

  const docs = await Notification.find({
    "audience.roles": role,
  })
    .sort({ createdAt: -1 })
    .limit(safeLimit);

  const mapped = docs.map(mapNotification);
  const unreadCount = mapped.filter(
    (n) => !n.readBy.includes(String(userId))
  ).length;

  return { items: mapped, unreadCount };
}

async function markAllRead({ userId, role }) {
  const uid = safeObjectId(userId);
  if (!uid) {
    const err = new Error("Invalid user id");
    err.code = "INVALID_USER_ID";
    err.statusCode = 400;
    throw err;
  }

  await Notification.updateMany(
    { "audience.roles": role, readBy: { $ne: uid } },
    { $addToSet: { readBy: uid } }
  );

  return { ok: true };
}

async function markOneRead({ notificationId, userId }) {
  const nid = safeObjectId(notificationId);
  const uid = safeObjectId(userId);

  if (!nid || !uid) {
    const err = new Error("Invalid id");
    err.code = "INVALID_ID";
    err.statusCode = 400;
    throw err;
  }

  await Notification.updateOne({ _id: nid }, { $addToSet: { readBy: uid } });
  const doc = await Notification.findById(nid);
  if (!doc) {
    const err = new Error("Notification not found");
    err.code = "NOTIFICATION_NOT_FOUND";
    err.statusCode = 404;
    throw err;
  }
  return mapNotification(doc);
}

function mapNotification(n) {
  return {
    id: n._id,
    type: n.type,
    title: n.title,
    message: n.message,
    entityType: n.entityType,
    entityId: n.entityId,
    orderNumber: n.orderNumber,
    roles: n.audience?.roles || [],
    readBy: (n.readBy || []).map(String),
    createdAt: n.createdAt,
  };
}

module.exports = {
  createNotification,
  listNotificationsForUser,
  markAllRead,
  markOneRead,
};
