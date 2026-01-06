const mongoose = require("mongoose");

const {
  INVENTORY_PRESETS,
  CONSUMPTION_MODES,
  NEGATIVE_STOCK_POLICIES,
} = require("./inventory.constants");

const InventorySettingsSchema = new mongoose.Schema(
  {
    active: { type: Boolean, default: true },

    preset: {
      type: String,
      enum: Object.values(INVENTORY_PRESETS),
      default: INVENTORY_PRESETS.ASSISTED,
      required: true,
    },

    consumptionMode: {
      type: String,
      enum: Object.values(CONSUMPTION_MODES),
      default: CONSUMPTION_MODES.BOM_ASSISTED,
      required: true,
    },

    negativeStockPolicy: {
      type: String,
      enum: Object.values(NEGATIVE_STOCK_POLICIES),
      default: NEGATIVE_STOCK_POLICIES.ALLOW_AND_ALERT,
      required: true,
    },

    qtyPrecision: {
      maxDecimals: { type: Number, default: 3 },
    },

    lowStockRules: {
      enableReorderPoint: { type: Boolean, default: true },
      alertOnNegative: { type: Boolean, default: true },
      alertCooldownMinutes: { type: Number, default: 1440 },
    },

    alertRecipients: {
      roles: { type: [String], default: ["admin", "supervisor"] },
      includeOrderOwner: { type: Boolean, default: true },
      orderOwnerFieldPriority: {
        type: [String],
        default: ["ownerUserId", "createdBy", "salesRepUserId"],
      },
      fallbackToRolesOnly: { type: Boolean, default: true },
    },

    permissions: {
      productionCanConsume: { type: Boolean, default: true },
      productionCanReceive: { type: Boolean, default: false },
      productionCanAdjust: { type: Boolean, default: false },
    },
  },
  { timestamps: true }
);

const InventorySettings = mongoose.model(
  "InventorySettings",
  InventorySettingsSchema
);

module.exports = { InventorySettings };
