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

const UserSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: {
      type: String,
      required: true,
      unique: true, // keep unique here
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
  },
  { timestamps: true }
);

// Remove this because unique:true already creates the index
// UserSchema.index({ email: 1 }, { unique: true });

const User = mongoose.model("User", UserSchema);

module.exports = { User };
