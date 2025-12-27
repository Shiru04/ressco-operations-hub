const mongoose = require("mongoose");
const { ORDER_STATUSES } = require("../../shared/constants/orderStatuses");

const ApprovalSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: "User",
    },
    at: { type: Date, required: true, default: () => new Date() },
  },
  { _id: false }
);

const EstimateSchema = new mongoose.Schema(
  {
    laborHours: { type: Number, default: 0, min: 0 },
    laborRate: { type: Number, default: 0, min: 0 },
    materialsCost: { type: Number, default: 0, min: 0 },
    overheadPct: { type: Number, default: 0, min: 0 }, // 0..100
  },
  { _id: false }
);

const OrderItemSchema = new mongoose.Schema(
  {
    description: { type: String, required: true, trim: true },
    qty: { type: Number, default: 1, min: 0 },
    unitPrice: { type: Number, default: 0, min: 0 },
    notes: { type: String, default: "", trim: true },
  },
  { _id: true }
);

const TakeoffHeaderSchema = new mongoose.Schema(
  {
    // Header fields from form
    customer: { type: String, default: null, trim: true },
    jobName: { type: String, default: null, trim: true },
    buyer: { type: String, default: null, trim: true },
    date: { type: Date, default: null },

    shipToAddress: {
      placeId: { type: String, default: null, trim: true },
      formatted: { type: String, default: null, trim: true },
      line1: { type: String, default: null, trim: true },
      city: { type: String, default: null, trim: true },
      state: { type: String, default: null, trim: true },
      zip: { type: String, default: null, trim: true },
    },
    poNumber: { type: String, default: null, trim: true },
    dueDate: { type: Date, default: null },
    jobContactPhone: { type: String, default: null, trim: true },

    code: {
      type: String,
      enum: ["SMACNA", "UMC", "Other", null],
      default: null,
    },
    insulation: { type: String, default: null, trim: true },
    brand: { type: String, default: null, trim: true },
    rValue: { type: String, default: null, trim: true },

    duct: {
      assembled: { type: Boolean, default: false },
      pitts: { type: Boolean, default: false },
      snapLock: { type: Boolean, default: false },
      bead: { type: Boolean, default: false },
      crossBreak: { type: Boolean, default: false },
    },

    stiffening: { type: String, default: null, trim: true }, // optional free text
    materialType: { type: String, default: null, trim: true },

    pressureClass: { type: String, default: null, trim: true }, // "Negative" / "Positive" / custom
    endConnectors: { type: String, default: null, trim: true }, // TDC / S&D / Ductmate etc.
    sealant: { type: String, default: null, trim: true }, // "In Seams" + yes/no can be encoded here for v1
    exposed: { type: Boolean, default: false },
    label: { type: Boolean, default: false },
    exteriorAngleIron: { type: String, default: null, trim: true }, // "Installed" / "Yes" / "No" / "None"
    roofTopDuct: { type: String, enum: ["Yes", "No", null], default: null },
  },
  { _id: false }
);

const TakeoffItemSchema = new mongoose.Schema(
  {
    lineNo: { type: Number, default: 0 }, // display ordering
    typeCode: { type: String, required: true, trim: true }, // e.g., "F-1"
    qty: { type: Number, default: 1, min: 0 },
    ga: { type: String, default: null, trim: true }, // gauge
    material: { type: String, default: null, trim: true }, // optional
    measurements: { type: Object, default: {} }, // keys: W1,D1,...,M (string/number safe)
    remarks: { type: String, default: "", trim: true },
    pieceStatus: { type: String, default: "queued", trim: true },
    assignedTo: { type: String, default: null, trim: true },
    assignedAt: { type: String, default: null, trim: true },
  },
  { _id: true }
);

const OrderSchema = new mongoose.Schema(
  {
    orderNumber: { type: String, required: true, unique: true, index: true },

    source: {
      type: String,
      enum: ["pos", "website", "internal"],
      required: true,
    },

    customerId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: "Customer",
    },

    contactSnapshot: {
      name: { type: String, default: null, trim: true },
      email: { type: String, default: null, trim: true, lowercase: true },
      phone: { type: String, default: null, trim: true },
    },

    priority: {
      type: String,
      enum: ["low", "normal", "high", "critical"],
      default: "normal",
    },

    sla: {
      hoursTarget: { type: Number, default: 48, min: 1 },
      dueAt: { type: Date, default: null },
    },

    status: {
      type: String,
      enum: Object.values(ORDER_STATUSES),
      default: ORDER_STATUSES.RECEIVED,
    },

    approvals: {
      required: { type: Number, default: 1, min: 1, max: 2 },
      approvedBy: { type: [ApprovalSchema], default: [] },
    },

    estimate: { type: EstimateSchema, default: () => ({}) },

    // Existing items[] stays for generic quoting; fabrication uses takeoffItems[]
    takeoff: {
      header: { type: TakeoffHeaderSchema, default: () => ({}) },
      items: { type: [TakeoffItemSchema], default: [] },
    },

    items: { type: [OrderItemSchema], default: [] },

    notes: { type: String, default: "", trim: true },

    audit: {
      lastStatusChangedAt: { type: Date, default: null },
      lastEditedAt: { type: Date, default: null },
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
      ref: "User",
    },
  },
  { timestamps: true }
);

OrderSchema.index({ customerId: 1, createdAt: -1 });
OrderSchema.index({ status: 1, createdAt: -1 });

const Order = mongoose.model("Order", OrderSchema);

module.exports = { Order };
