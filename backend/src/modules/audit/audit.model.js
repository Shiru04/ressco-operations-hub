const mongoose = require("mongoose");

const AuditEventSchema = new mongoose.Schema(
  {
    entityType: { type: String, required: true },
    entityId: { type: mongoose.Schema.Types.ObjectId, required: true },
    action: { type: String, required: true },
    changes: { type: Object, default: {} },
    actorUserId: { type: mongoose.Schema.Types.ObjectId, default: null },
    actorRole: { type: String, default: null },
    at: { type: Date, default: () => new Date() },
    meta: {
      ip: { type: String, default: null },
      userAgent: { type: String, default: null },
    },
  },
  { timestamps: true }
);

AuditEventSchema.index({ entityType: 1, entityId: 1, at: -1 });

const AuditEvent = mongoose.model("AuditEvent", AuditEventSchema);

module.exports = { AuditEvent };
