const mongoose = require("mongoose");

const { INVENTORY_TX_TYPES } = require("./inventory.constants");

const InventoryTransactionSchema = new mongoose.Schema(
  {
    materialId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Material",
      required: true,
      index: true,
    },

    type: {
      type: String,
      enum: Object.values(INVENTORY_TX_TYPES),
      required: true,
      index: true,
    },

    qtyDelta: { type: Number, required: true },
    unitCost: { type: Number, default: null },
    notes: { type: String, default: "" },

    ref: {
      entityType: { type: String, default: null },
      entityId: { type: mongoose.Schema.Types.ObjectId, default: null },
      orderId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Order",
        default: null,
        index: true,
      },
      orderNumber: { type: String, default: null },
    },

    actorUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    at: { type: Date, default: Date.now, index: true },

    balanceAfter: { type: Number, default: null },
  },
  { timestamps: true }
);

InventoryTransactionSchema.index({ materialId: 1, at: -1 });
InventoryTransactionSchema.index({ "ref.orderId": 1, at: -1 });

const InventoryTransaction = mongoose.model(
  "InventoryTransaction",
  InventoryTransactionSchema
);

module.exports = { InventoryTransaction };
