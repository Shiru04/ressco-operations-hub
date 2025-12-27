const mongoose = require("mongoose");

const CounterSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, unique: true },
    seq: { type: Number, required: true, default: 0 },
  },
  { timestamps: true }
);

CounterSchema.index({ key: 1 }, { unique: true });

const Counter = mongoose.model("Counter", CounterSchema);

module.exports = { Counter };
