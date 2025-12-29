const mongoose = require("mongoose");
const { AuditEvent } = require("./audit.model");
const { User } = require("../users/users.model");

function objectIdTimestamp(id) {
  try {
    const oid = mongoose.Types.ObjectId.createFromHexString(String(id));
    return oid.getTimestamp();
  } catch {
    return null;
  }
}

async function listAuditEvents({
  entityType,
  entityId,
  page = 1,
  limit = 100,
}) {
  const et = String(entityType || "").trim();
  const eid =
    entityId === undefined || entityId === null ? "" : String(entityId).trim();

  if (!et) {
    const err = new Error("entityType is required");
    err.code = "VALIDATION_ERROR";
    err.statusCode = 400;
    throw err;
  }

  if (!eid) {
    const err = new Error("Invalid entityId");
    err.code = "INVALID_ID";
    err.statusCode = 400;
    throw err;
  }

  const safeLimit = Math.min(Math.max(Number(limit) || 100, 1), 500);
  const safePage = Math.max(Number(page) || 1, 1);
  const skip = (safePage - 1) * safeLimit;

  const filter = { entityType: et, entityId: eid };

  const [items, total] = await Promise.all([
    AuditEvent.find(filter)
      .sort({ at: -1, _id: -1 })
      .skip(skip)
      .limit(safeLimit)
      .lean(),
    AuditEvent.countDocuments(filter),
  ]);

  const actorIds = Array.from(
    new Set(
      (items || [])
        .map((x) => (x.actorUserId ? String(x.actorUserId) : null))
        .filter(Boolean)
    )
  );

  let usersById = {};
  if (actorIds.length) {
    const users = await User.find({ _id: { $in: actorIds } })
      .select("_id name email role")
      .lean();

    usersById = (users || []).reduce((acc, u) => {
      acc[String(u._id)] = u;
      return acc;
    }, {});
  }

  return {
    items: (items || []).map((x) => {
      const actorUserId = x.actorUserId ? String(x.actorUserId) : null;
      const u = actorUserId ? usersById[actorUserId] : null;

      // GUARANTEED timestamp fallback
      const at = x.at || objectIdTimestamp(x._id) || null;

      return {
        id: String(x._id),
        entityType: x.entityType,
        entityId: x.entityId,
        action: x.action,
        changes: x.changes || {},
        actorUserId,
        actorRole: x.actorRole || u?.role || null,
        actorName: u?.name || u?.email || null,
        at,
      };
    }),
    page: safePage,
    limit: safeLimit,
    total,
  };
}

module.exports = { listAuditEvents };
