const mongoose = require("mongoose");

const MaterialSchema = new mongoose.Schema(
  {
    sku: { type: String, required: true, trim: true, unique: true, index: true },
    name: { type: String, required: true, trim: true },
    category: { type: String, default: "", trim: true, index: true },
    unit: { type: String, required: true, trim: true },

    spec: { type: mongoose.Schema.Types.Mixed, default: {} },

    isActive: { type: Boolean, default: true },

    defaultUnitCost: { type: Number, default: 0 },
    avgUnitCost: { type: Number, default: 0 },

    onHandQty: { type: Number, default: 0 },

    reorderPointQty: { type: Number, default: 0 },
    reorderTargetQty: { type: Number, default: 0 },

    lowStock: {
      isLow: { type: Boolean, default: false },
      lastAlertAt: { type: Date, default: null },
      lastAlertQty: { type: Number, default: null },
    },

    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
  },
  { timestamps: true }
);

MaterialSchema.index({ name: "text", sku: "text" });

const Material = mongoose.model("Material", MaterialSchema);

module.exports = { Material };
