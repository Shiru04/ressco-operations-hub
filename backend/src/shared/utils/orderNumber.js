const { Counter } = require("../../modules/audit/counter.model");

async function nextOrderNumber() {
  const counter = await Counter.findOneAndUpdate(
    { key: "orders" },
    { $inc: { seq: 1 } },
    { new: true, upsert: true }
  );

  return `JOB-${String(counter.seq).padStart(6, "0")}`;
}

module.exports = { nextOrderNumber };
