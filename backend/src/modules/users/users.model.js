const mongoose = require("mongoose");
const { ROLES } = require("../../shared/constants/roles");

const TwoFASchema = new mongoose.Schema(
  {
    enabled: { type: Boolean, default: false },
    secret: { type: String, default: null }, // active base32
    pendingSecret: { type: String, default: null }, // base32 waiting confirmation
    enforcedAt: { type: Date, default: null },
  },
  { _id: false }
);

const ProductionQueueSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, trim: true },
    order: { type: Number, default: 9999, min: 0 },
    isActive: { type: Boolean, default: true },
  },
  { _id: false }
);

const UserSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    role: {
      type: String,
      enum: Object.values(ROLES),
      required: true,
    },
    isActive: { type: Boolean, default: true },
    passwordHash: { type: String, required: true },

    twoFA: { type: TwoFASchema, default: () => ({}) },

    // Production membership (manual assignment; auto-assign deprecated but field kept harmlessly)
    productionQueues: { type: [ProductionQueueSchema], default: [] },
    lastAutoAssignedAt: { type: Date, default: null },

    // NEW: portal linkage for client users
    customerIds: {
      type: [{ type: mongoose.Schema.Types.ObjectId, ref: "Customer" }],
      default: [],
    },
  },
  { timestamps: true }
);

const User = mongoose.model("User", UserSchema);

module.exports = { User };
