const mongoose = require("mongoose");

const NotificationSchema = new mongoose.Schema(
  {
    type: { type: String, required: true }, // "order_created"
    title: { type: String, required: true },
    message: { type: String, default: "" },
    entityType: { type: String, default: null }, // "order"
    entityId: { type: mongoose.Schema.Types.ObjectId, default: null },
    orderNumber: { type: String, default: null },

    // who should see it
    audience: {
      roles: { type: [String], default: [] }, // ["admin","sales","supervisor","production"]
    },

    // per-user read tracking
    readBy: { type: [mongoose.Schema.Types.ObjectId], default: [] }, // userIds
  },
  { timestamps: true }
);

NotificationSchema.index({ createdAt: -1 });
NotificationSchema.index({ "audience.roles": 1, createdAt: -1 });

const Notification = mongoose.model("Notification", NotificationSchema);

module.exports = { Notification };
