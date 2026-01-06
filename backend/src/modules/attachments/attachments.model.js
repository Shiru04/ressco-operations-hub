const mongoose = require("mongoose");

const AttachmentSchema = new mongoose.Schema(
  {
    // Parent order (always present for v1, even for piece attachments)
    orderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order",
      required: true,
      index: true,
    },

    // What this attachment is linked to
    entityType: {
      type: String,
      required: true,
      trim: true,
      enum: ["order", "piece"],
      index: true,
    },

    /**
     * entityId:
     * - entityType=order  => String(orderId)
     * - entityType=piece  => pieceUid (UUID string)
     */
    entityId: { type: String, required: true, trim: true, index: true },

    originalName: { type: String, required: true, trim: true },
    storageKey: { type: String, required: true, trim: true },

    // NEW (additive): allow multiple storage providers without breaking existing records
    storageProvider: {
      type: String,
      trim: true,
      enum: ["local", "r2"],
      default: "local",
      index: true,
    },
    bucket: { type: String, default: null, trim: true },
    etag: { type: String, default: null, trim: true },

    mimeType: { type: String, required: true, trim: true },
    sizeBytes: { type: Number, required: true, min: 0 },
    sha256: { type: String, default: null, trim: true },

    category: { type: String, default: "", trim: true },
    tags: { type: [String], default: [] },
    notes: { type: String, default: "", trim: true },

    uploadedByUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    uploadedByRole: { type: String, default: null, trim: true },

    deletedAt: { type: Date, default: null },
    deletedByUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  { timestamps: true }
);

AttachmentSchema.index({ orderId: 1, createdAt: -1 });
AttachmentSchema.index({ entityType: 1, entityId: 1, createdAt: -1 });

const Attachment = mongoose.model("Attachment", AttachmentSchema);

module.exports = { Attachment };
