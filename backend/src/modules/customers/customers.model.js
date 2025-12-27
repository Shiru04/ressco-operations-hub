const mongoose = require("mongoose");

const ContactSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, default: null, trim: true, lowercase: true },
    phone: { type: String, default: null, trim: true },
    title: { type: String, default: null, trim: true },
  },
  { _id: true }
);

const SLASchema = new mongoose.Schema(
  {
    hoursTarget: { type: Number, default: 48, min: 1 },
    priority: {
      type: String,
      enum: ["low", "normal", "high", "critical"],
      default: "normal",
    },
  },
  { _id: false }
);

const AddressSchema = new mongoose.Schema(
  {
    line1: { type: String, default: null, trim: true },
    line2: { type: String, default: null, trim: true },
    city: { type: String, default: null, trim: true },
    state: { type: String, default: null, trim: true },
    zip: { type: String, default: null, trim: true },
    country: { type: String, default: "USA", trim: true },
  },
  { _id: false }
);

const CustomerSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    billingAddress: { type: AddressSchema, default: () => ({}) },
    shippingAddress: { type: AddressSchema, default: () => ({}) },
    contacts: { type: [ContactSchema], default: [] },
    sla: { type: SLASchema, default: () => ({}) },
    notes: { type: String, default: "", trim: true },
  },
  { timestamps: true }
);

CustomerSchema.index({ name: 1 });

const Customer = mongoose.model("Customer", CustomerSchema);

module.exports = { Customer };
