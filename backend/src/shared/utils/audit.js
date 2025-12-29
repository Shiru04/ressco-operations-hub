const mongoose = require("mongoose");
const { AuditEvent } = require("../../modules/audit/audit.model");

function toObjectIdMaybe(v) {
  if (!v) return null;
  const s = String(v);
  if (!mongoose.isValidObjectId(s)) return null;
  return mongoose.Types.ObjectId.createFromHexString(s);
}

async function writeAudit({
  entityType,
  entityId,
  action,
  changes = {},
  actorUserId = null,
  actorRole = null,
}) {
  const et = String(entityType || "").trim();
  const eid =
    entityId === undefined || entityId === null ? "" : String(entityId).trim();
  const act = String(action || "").trim();

  if (!et || !eid || !act) return;

  await AuditEvent.create({
    entityType: et,
    entityId: eid,
    action: act,
    changes: changes || {},
    actorUserId: toObjectIdMaybe(actorUserId),
    actorRole: actorRole ? String(actorRole) : null,
    at: new Date(), // ALWAYS
  });
}

module.exports = { writeAudit };
