const mongoose = require("mongoose");

const AuditEventSchema = new mongoose.Schema(
  {
    entityType: { type: String, required: true, trim: true, index: true },

    // IMPORTANT: entityId must support BOTH ObjectId (orders/users) and UUID (pieces)
    entityId: { type: String, required: true, trim: true, index: true },

    action: { type: String, required: true, trim: true },

    changes: { type: Object, default: {} },

    actorUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    actorRole: { type: String, default: null, trim: true },

    at: { type: Date, default: () => new Date(), index: true },
  },
  { timestamps: false }
);

AuditEventSchema.index({ entityType: 1, entityId: 1, at: -1 });

const AuditEvent = mongoose.model("AuditEvent", AuditEventSchema);

module.exports = { AuditEvent };
