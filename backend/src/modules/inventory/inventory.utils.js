const mongoose = require("mongoose");

function safeObjectId(id) {
  if (!id) return null;
  if (!mongoose.isValidObjectId(id)) return null;
  return mongoose.Types.ObjectId.createFromHexString(String(id));
}

function clampNumber(n, { min = -Infinity, max = Infinity } = {}) {
  const num = Number(n);
  if (Number.isNaN(num) || !Number.isFinite(num)) return null;
  return Math.min(Math.max(num, min), max);
}

function roundToDecimals(value, maxDecimals = 3) {
  const v = Number(value);
  if (Number.isNaN(v) || !Number.isFinite(v)) return null;
  const d = Math.max(0, Math.min(Number(maxDecimals) || 0, 8));
  const factor = Math.pow(10, d);
  return Math.round(v * factor) / factor;
}

module.exports = {
  safeObjectId,
  clampNumber,
  roundToDecimals,
};
