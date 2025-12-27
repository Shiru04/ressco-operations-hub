const { ProductionBoard } = require("./productionBoard.model");

const DEFAULT_COLUMNS = [
  { key: "queued", label: "Queued", order: 1 },
  { key: "cutting", label: "Cutting", order: 2 },
  { key: "fabrication", label: "Fabrication", order: 3 },
  { key: "qc", label: "QC", order: 4 },
  { key: "ready", label: "Ready", order: 5 },
  { key: "shipped", label: "Shipped", order: 6 },
];

async function getBoard() {
  let doc = await ProductionBoard.findOne({ singletonKey: "default" });
  if (!doc) {
    doc = await ProductionBoard.create({
      singletonKey: "default",
      columns: DEFAULT_COLUMNS,
    });
  }
  return mapBoard(doc);
}

async function updateBoard(columns) {
  const normalized = (columns || [])
    .filter((c) => c?.key && c?.label)
    .map((c, idx) => ({
      key: String(c.key).trim(),
      label: String(c.label).trim(),
      order: Number(c.order) || idx + 1,
      isActive: c.isActive !== false,
    }));

  const doc = await ProductionBoard.findOneAndUpdate(
    { singletonKey: "default" },
    { $set: { columns: normalized } },
    { upsert: true, new: true }
  );

  return mapBoard(doc);
}

function mapBoard(doc) {
  const cols = (doc.columns || [])
    .filter((c) => c.isActive !== false)
    .sort((a, b) => (a.order || 0) - (b.order || 0));

  return { id: doc._id, columns: cols };
}

module.exports = { getBoard, updateBoard };
