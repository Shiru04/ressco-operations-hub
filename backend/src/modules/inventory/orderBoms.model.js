const mongoose = require("mongoose");

const BomLineSchema = new mongoose.Schema(
  {
    lineId: {
      type: mongoose.Schema.Types.ObjectId,
      default: () => new mongoose.Types.ObjectId(),
    },
    materialId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Material",
      required: true,
    },
    materialSnapshot: {
      sku: { type: String, default: "" },
      name: { type: String, default: "" },
      unit: { type: String, default: "" },
      spec: { type: mongoose.Schema.Types.Mixed, default: {} },
    },
    plannedQty: { type: Number, default: 0 },
    consumedQty: { type: Number, default: 0 },
    scrapPct: { type: Number, default: 0 },
    notes: { type: String, default: "" },
    unplanned: { type: Boolean, default: false },
    consumptionTxnIds: { type: [mongoose.Schema.Types.ObjectId], default: [] },
  },
  { _id: false }
);

const OrderBomSchema = new mongoose.Schema(
  {
    orderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order",
      required: true,
      unique: true,
      index: true,
    },
    orderNumber: { type: String, default: "" },

    status: {
      type: String,
      enum: ["draft", "locked", "completed"],
      default: "draft",
    },

    lines: { type: [BomLineSchema], default: [] },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  { timestamps: true }
);

const OrderBom = mongoose.model("OrderBom", OrderBomSchema);

module.exports = { OrderBom };
