const PDFDocument = require("pdfkit");

/**
 * Takeoff PDF v1 — landscape letter, header + grid.
 * Multi-page: repeats header + grid headers, 15 rows per page.
 */
function buildTakeoffPdf({ order, customer }) {
  const doc = new PDFDocument({
    size: "LETTER",
    layout: "landscape",
    margins: { top: 18, left: 18, right: 18, bottom: 18 },
  });

  const page = {
    w: doc.page.width,
    h: doc.page.height,
    m: doc.page.margins,
  };

  const headerHeight = 170;
  const gridTop = page.m.top + headerHeight + 10;

  const rowsPerPage = 15;
  const rowH = 22;

  const cols = makeGridColumns(page.w - page.m.left - page.m.right);

  function newPage() {
    doc.addPage({ size: "LETTER", layout: "landscape", margins: page.m });
    drawHeaderBlock(doc, page, order, customer);
    drawGridHeader(doc, page, cols, gridTop, rowH);
  }

  // Page 1
  drawHeaderBlock(doc, page, order, customer);
  drawGridHeader(doc, page, cols, gridTop, rowH);

  const items = (order?.takeoff?.items || []).map(normalizeItemRow);

  let rowIndexOnPage = 0;
  let y = gridTop + rowH;

  for (let i = 0; i < items.length; i++) {
    if (rowIndexOnPage >= rowsPerPage) {
      newPage();
      rowIndexOnPage = 0;
      y = gridTop + rowH;
    }

    drawGridRow(doc, page, cols, y, rowH, items[i], rowIndexOnPage);
    rowIndexOnPage += 1;
    y += rowH;
  }

  // If no items, render empty rows for visual parity
  if (items.length === 0) {
    for (let r = 0; r < rowsPerPage; r++) {
      drawGridRow(doc, page, cols, gridTop + rowH + r * rowH, rowH, null, r);
    }
  }

  // Footer note
  doc.fontSize(8).fillColor("#555");
  doc.text(
    `Order: ${order.orderNumber}  |  Generated: ${new Date().toLocaleString()}`,
    page.m.left,
    page.h - page.m.bottom - 10,
    {
      width: page.w - page.m.left - page.m.right,
      align: "right",
    }
  );

  return doc;
}

/** Column plan: fit many takeoff columns; keep remarks wide. */
function makeGridColumns(innerWidth) {
  const fixed = [
    { key: "lineNo", label: "#", w: 18, align: "center" },
    { key: "typeCode", label: "TYPE", w: 42, align: "center" },
    { key: "qty", label: "QTY", w: 30, align: "center" },
    { key: "ga", label: "GA", w: 30, align: "center" },
  ];

  const measurementKeys = [
    "W1",
    "D1",
    "W2",
    "D2",
    "W3",
    "D3",
    "L",
    "S1",
    "S2",
    "S3",
    "S4",
    "O1",
    "O2",
    "TD1",
    "TD2",
    "T",
    "TJ",
    "A",
    "R1",
    "R2",
    "TV",
    "M",
  ];

  const measW = 20;
  const measCols = measurementKeys.map((k) => ({
    key: k,
    label: k,
    w: measW,
    align: "center",
  }));

  const used =
    fixed.reduce((s, c) => s + c.w, 0) + measCols.reduce((s, c) => s + c.w, 0);
  const remarksW = Math.max(120, innerWidth - used);

  return [
    ...fixed,
    ...measCols,
    { key: "remarks", label: "REMARKS", w: remarksW, align: "left" },
  ];
}

function drawHeaderBlock(doc, page, order, customer) {
  const x = page.m.left;
  const y = page.m.top;
  const w = page.w - page.m.left - page.m.right;

  doc.font("Helvetica-Bold").fontSize(14).fillColor("#111");
  doc.text("RECTANGULAR TAKEOFF FORM", x, y, { width: w, align: "center" });

  doc.moveDown(0.2);
  doc.font("Helvetica").fontSize(9).fillColor("#111");

  const h = order?.takeoff?.header || {};
  const customerName = h.customer || customer?.name || "";
  const jobName = h.jobName || "";
  const buyer = h.buyer || "";
  const dateStr = h.date ? formatDate(h.date) : "";
  const shipTo = h.shipTo || "";
  const po = h.poNumber || "";
  const due = h.dueDate
    ? formatDate(h.dueDate)
    : order?.sla?.dueAt
    ? formatDate(order.sla.dueAt)
    : "";
  const phone = h.jobContactPhone || "";
  const code = h.code || "";
  const insulation = h.insulation || "";
  const brand = h.brand || "";
  const rValue = h.rValue || "";

  const leftCol = [
    ["Customer", customerName],
    ["Job Name", jobName],
    ["Buyer", buyer],
    ["Date", dateStr],
    ["Ship To", shipTo],
    ["PO#", po],
    ["Due Date", due],
    ["Job Contact Phone", phone],
  ];

  const rightCol = [
    ["Code", code],
    ["Insulation", insulation],
    ["Brand", brand],
    ["R-Value", rValue],
    ["Material Type", h.materialType || ""],
    ["Stiffening", h.stiffening || ""],
    ["Pressure Class", h.pressureClass || ""],
    ["End Connectors", h.endConnectors || ""],
    ["Sealant", h.sealant || ""],
    ["Exposed", h.exposed ? "Yes" : ""],
    ["Label", h.label ? "Yes" : ""],
    ["Exterior Angle Iron", h.exteriorAngleIron || ""],
    ["Roof Top Duct", h.roofTopDuct || ""],
  ];

  const boxTop = y + 22;
  const boxH = 140;

  // Outer box
  doc.rect(x, boxTop, w, boxH).strokeColor("#222").lineWidth(1).stroke();

  const mid = x + Math.floor(w / 2);

  // Divider
  doc
    .moveTo(mid, boxTop)
    .lineTo(mid, boxTop + boxH)
    .stroke();

  drawKeyValueColumn(doc, x + 8, boxTop + 8, mid - x - 16, leftCol);
  drawKeyValueColumn(doc, mid + 8, boxTop + 8, x + w - (mid + 8) - 8, rightCol);
}

function drawKeyValueColumn(doc, x, y, w, pairs) {
  const lineH = 11;
  for (let i = 0; i < pairs.length; i++) {
    const [k, v] = pairs[i];
    doc.font("Helvetica-Bold").fontSize(8).fillColor("#111");
    doc.text(`${k}:`, x, y + i * lineH, { width: 120, continued: true });
    doc.font("Helvetica").fontSize(8).fillColor("#111");
    doc.text(` ${String(v || "")}`, { width: w - 120 });
  }
}

function drawGridHeader(doc, page, cols, topY, rowH) {
  const x0 = page.m.left;
  const innerW = page.w - page.m.left - page.m.right;

  // Header background
  doc.rect(x0, topY, innerW, rowH).fillColor("#f2f2f2").fill();
  doc.fillColor("#111").strokeColor("#222").lineWidth(0.8);

  // Outline
  doc.rect(x0, topY, innerW, rowH).stroke();

  // Columns
  let x = x0;
  doc.font("Helvetica-Bold").fontSize(7);

  for (const c of cols) {
    doc.rect(x, topY, c.w, rowH).stroke();
    doc.text(c.label, x + 2, topY + 6, { width: c.w - 4, align: "center" });
    x += c.w;
  }
}

function drawGridRow(doc, page, cols, y, rowH, item, rowIndexOnPage) {
  const x0 = page.m.left;
  const innerW = page.w - page.m.left - page.m.right;

  // Zebra
  if (rowIndexOnPage % 2 === 1) {
    doc.rect(x0, y, innerW, rowH).fillColor("#fcfcfc").fill();
  }

  doc.strokeColor("#222").lineWidth(0.5);
  doc.rect(x0, y, innerW, rowH).stroke();

  let x = x0;
  doc.font("Helvetica").fontSize(7).fillColor("#111");

  for (const c of cols) {
    doc.rect(x, y, c.w, rowH).stroke();

    const val = item ? valueForCell(item, c.key) : "";
    const align = c.align || "center";
    const padX = 2;

    doc.text(String(val ?? ""), x + padX, y + 6, {
      width: c.w - padX * 2,
      align: align === "left" ? "left" : "center",
      ellipsis: true,
    });

    x += c.w;
  }
}

function normalizeItemRow(raw, idx) {
  const m = raw.measurements || {};
  return {
    lineNo: raw.lineNo ?? idx + 1,
    typeCode: raw.typeCode || "",
    qty: raw.qty ?? 1,
    ga: raw.ga || "",
    remarks: raw.remarks || "",
    measurements: m,
  };
}

function valueForCell(item, key) {
  if (key === "lineNo") return item.lineNo || "";
  if (key === "typeCode") return item.typeCode || "";
  if (key === "qty") return item.qty ?? "";
  if (key === "ga") return item.ga || "";
  if (key === "remarks") return item.remarks || "";
  // Measurement columns
  const v = item.measurements?.[key];
  return v === null || v === undefined ? "" : v;
}

function formatDate(d) {
  const dt = new Date(d);
  if (Number.isNaN(dt.getTime())) return "";
  return dt.toLocaleDateString();
}

module.exports = { buildTakeoffPdf };
