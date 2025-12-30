const mongoose = require("mongoose");
const crypto = require("crypto");
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

// Server-authoritative timer persisted on each takeoff item.
// IMPORTANT: Keep types consistent with existing frontend expectations (strings).
const PieceTimerSchema = new mongoose.Schema(
  {
    state: {
      type: String,
      enum: ["idle", "running", "paused", "stopped"],
      default: "idle",
      trim: true,
    },
    startedAt: { type: Date, default: null },
    pausedAt: { type: Date, default: null },
    accumulatedSec: { type: Number, default: 0, min: 0 },

    // Session bookkeeping so "stop while paused" can still produce a correct workLog entry.
    sessionStartedAt: { type: Date, default: null },
    sessionStartAccumulatedSec: { type: Number, default: 0, min: 0 },
  },
  { _id: false }
);

const PieceWorkLogEntrySchema = new mongoose.Schema(
  {
    userId: { type: String, default: null, trim: true }, // keep string for v1 consistency
    startedAt: { type: Date, default: null },
    endedAt: { type: Date, default: null },
    durationSec: { type: Number, default: 0, min: 0 },
    notes: { type: String, default: "", trim: true },
  },
  { _id: false }
);

function uuid() {
  // Node supports crypto.randomUUID() in modern versions; safe for Render
  try {
    return crypto.randomUUID();
  } catch {
    // fallback: 24-hex (still stable)
    return new mongoose.Types.ObjectId().toHexString();
  }
}

function pad2(n) {
  const x = Number(n) || 0;
  return x < 10 ? `0${x}` : String(x);
}

// Add near the top of orders.model.js (above TakeoffItemSchema)
const WorkLogSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    startedAt: { type: Date, default: null },
    endedAt: { type: Date, default: null },
    durationSec: { type: Number, default: 0, min: 0 },
    notes: { type: String, default: "", trim: true },
  },
  { _id: true }
);

const TimerSchema = new mongoose.Schema(
  {
    state: {
      type: String,
      enum: ["idle", "running", "paused", "stopped"],
      default: "idle",
    },
    startedAt: { type: Date, default: null },
    pausedAt: { type: Date, default: null },
    accumulatedSec: { type: Number, default: 0, min: 0 },
  },
  { _id: false }
);

// Replace ONLY your current TakeoffItemSchema with this:
const TakeoffItemSchema = new mongoose.Schema(
  {
    lineNo: { type: Number, default: 0 }, // display ordering
    typeCode: { type: String, required: true, trim: true }, // e.g., "F-1"
    qty: { type: Number, default: 1, min: 0 },
    ga: { type: String, default: null, trim: true }, // gauge
    material: { type: String, default: null, trim: true }, // optional
    measurements: { type: Object, default: {} },
    remarks: { type: String, default: "", trim: true },

    // Queue + status invariant (DO NOT change behavior elsewhere)
    pieceStatus: { type: String, default: "queued", trim: true },
    assignedQueueKey: { type: String, default: "queued", trim: true },

    // Assignment
    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    assignedAt: { type: Date, default: null },
    assignedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    // Timer + labor tracking
    timer: { type: TimerSchema, default: () => ({}) },
    workLog: { type: [WorkLogSchema], default: [] },
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

/**
 * Auto-ensure stable pieceUid and human pieceRef.
 * - pieceUid: generated once if missing.
 * - pieceRef: generated once if missing (per typeCode counter).
 *
 * This runs whenever the order is saved, including takeoff patch flows that call doc.save().
 */
OrderSchema.pre("save", function ensurePieceIds(next) {
  try {
    const items = this.takeoff?.items || [];
    if (!Array.isArray(items) || items.length === 0) return next();

    // ensure pieceUid exists
    for (const it of items) {
      if (!it.pieceUid) it.pieceUid = uuid();
    }

    // generate pieceRef if missing (stable once set)
    const counters = {};
    // First pass: count existing refs to avoid collisions when mixing old/new
    for (const it of items) {
      const tc = (it.typeCode || "").trim() || "X";
      if (!counters[tc]) counters[tc] = 0;

      if (it.pieceRef) {
        // if pieceRef is like "F-1-03", try to set counter >= 3
        const m = String(it.pieceRef).match(/-(\d{1,3})$/);
        if (m) {
          const n = Number(m[1]);
          if (Number.isFinite(n) && n > counters[tc]) counters[tc] = n;
        }
      }
    }

    // Second pass: assign refs to missing ones
    for (const it of items) {
      if (it.pieceRef) continue;
      const tc = (it.typeCode || "").trim() || "X";
      if (!counters[tc]) counters[tc] = 0;
      counters[tc] += 1;
      it.pieceRef = `${tc}-${pad2(counters[tc])}`;
    }

    return next();
  } catch (e) {
    return next(e);
  }
});

OrderSchema.index({ customerId: 1, createdAt: -1 });
OrderSchema.index({ status: 1, createdAt: -1 });

// for fast lookup by stable uid
OrderSchema.index({ "takeoff.items.pieceUid": 1 });

const Order = mongoose.model("Order", OrderSchema);

module.exports = { Order };
