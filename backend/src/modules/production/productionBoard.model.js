const mongoose = require("mongoose");

const ColumnSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, trim: true }, // "queued"
    label: { type: String, required: true, trim: true }, // "Queued"
    order: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
  },
  { _id: false }
);

const ProductionBoardSchema = new mongoose.Schema(
  {
    // single-company: exactly one record in the collection
    singletonKey: {
      type: String,
      default: "default",
      unique: true,
      index: true,
    },
    columns: { type: [ColumnSchema], default: [] },
  },
  { timestamps: true }
);

const ProductionBoard = mongoose.model(
  "ProductionBoard",
  ProductionBoardSchema
);

module.exports = { ProductionBoard };
