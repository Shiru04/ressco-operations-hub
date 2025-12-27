const mongoose = require("mongoose");
const { AuditEvent } = require("../../modules/audit/audit.model");

async function writeAudit({
  entityType,
  entityId,
  action,
  changes = {},
  actorUserId = null,
  actorRole = null,
  req = null,
}) {
  const meta = req
    ? {
        ip: req.ip || null,
        userAgent: req.headers?.["user-agent"] || null,
      }
    : { ip: null, userAgent: null };

  return AuditEvent.create({
    entityType,
    entityId: mongoose.Types.ObjectId.createFromHexString(String(entityId)),
    action,
    changes,
    actorUserId: actorUserId
      ? mongoose.Types.ObjectId.createFromHexString(String(actorUserId))
      : null,
    actorRole,
    at: new Date(),
    meta,
  });
}

module.exports = { writeAudit };
