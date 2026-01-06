const PDFDocument = require("pdfkit");

function safe(v) {
  return v === null || v === undefined ? "" : String(v);
}

function formatDate(d) {
  const dt = new Date(d);
  if (Number.isNaN(dt.getTime())) return "";
  return dt.toLocaleDateString();
}

/**
 * Packing Slip v1
 * - Lists takeoff items (pieceRef/type/qty/ga/remarks)
 * - Ship-to from takeoff header if present
 */
function buildPackingSlipPdf({ order, customer }) {
  const doc = new PDFDocument({
    size: "LETTER",
    layout: "portrait",
    margins: { top: 36, left: 36, right: 36, bottom: 36 },
  });

  const page = {
    w: doc.page.width,
    h: doc.page.height,
    m: doc.page.margins,
  };

  doc.font("Helvetica-Bold").fontSize(18).fillColor("#111");
  doc.text("PACKING SLIP", page.m.left, page.m.top, { align: "right" });

  doc.font("Helvetica-Bold").fontSize(14).fillColor("#111");
  doc.text("Ressco Metals", page.m.left, page.m.top);

  const headerY = page.m.top + 44;

  const shipTo = order?.takeoff?.header?.shipToAddress;
  const shipLine =
    shipTo?.formatted ||
    [shipTo?.line1, shipTo?.city, shipTo?.state, shipTo?.zip]
      .filter(Boolean)
      .join(", ");

  const customerName =
    order?.takeoff?.header?.customer ||
    customer?.name ||
    safe(order.contactSnapshot?.name);

  doc.font("Helvetica").fontSize(9).fillColor("#111");
  doc.text(`Order: ${safe(order.orderNumber)}`, page.m.left, headerY);
  doc.text(`Date: ${formatDate(new Date())}`, page.m.left, headerY + 14);

  doc.font("Helvetica-Bold").fontSize(9).fillColor("#111");
  doc.text("Ship To:", page.m.left, headerY + 34);
  doc.font("Helvetica").fontSize(9).fillColor("#111");
  doc.text(customerName || "—", page.m.left + 52, headerY + 34);

  if (shipLine) {
    doc.font("Helvetica").fontSize(8).fillColor("#333");
    doc.text(shipLine, page.m.left + 52, headerY + 48, {
      width: page.w - page.m.left - page.m.right - 52,
    });
  }

  // Items table
  const tableTop = headerY + 78;
  const tableW = page.w - page.m.left - page.m.right;

  const cols = [
    {
      key: "pieceRef",
      label: "Piece",
      w: Math.floor(tableW * 0.18),
      align: "left",
    },
    {
      key: "typeCode",
      label: "Type",
      w: Math.floor(tableW * 0.12),
      align: "left",
    },
    { key: "qty", label: "Qty", w: Math.floor(tableW * 0.1), align: "right" },
    { key: "ga", label: "GA", w: Math.floor(tableW * 0.1), align: "center" },
    {
      key: "remarks",
      label: "Remarks",
      w: tableW - Math.floor(tableW * 0.5),
      align: "left",
    },
  ];

  drawTableHeader(doc, page.m.left, tableTop, cols);

  const items = normalizePackingItems(order);
  const rowH = 18;
  let y = tableTop + 18;

  if (!items.length) {
    drawEmptyRow(doc, page.m.left, y, cols, rowH, "No takeoff items found.");
    y += rowH;
  } else {
    for (let i = 0; i < items.length; i++) {
      drawRow(doc, page.m.left, y, cols, rowH, items[i], i);
      y += rowH;

      if (y > page.h - page.m.bottom - 60) {
        doc.addPage({ size: "LETTER", layout: "portrait", margins: page.m });
        y = page.m.top;
        drawTableHeader(doc, page.m.left, y, cols);
        y += 18;
      }
    }
  }

  // Footer
  doc.font("Helvetica").fontSize(8).fillColor("#555");
  doc.text(
    `Order: ${safe(
      order.orderNumber
    )}  |  Generated: ${new Date().toLocaleString()}`,
    page.m.left,
    page.h - page.m.bottom - 10,
    { width: tableW, align: "right" }
  );

  return doc;
}

function normalizePackingItems(order) {
  const takeoff = Array.isArray(order?.takeoff?.items)
    ? order.takeoff.items
    : [];
  return takeoff.map((x) => ({
    pieceRef: safe(x.pieceRef || ""),
    typeCode: safe(x.typeCode || ""),
    qty: Number(x.qty || 0),
    ga: safe(x.ga || ""),
    remarks: safe(x.remarks || ""),
  }));
}

function drawTableHeader(doc, x, y, cols) {
  const h = 18;
  doc
    .rect(
      x,
      y,
      cols.reduce((s, c) => s + c.w, 0),
      h
    )
    .fillColor("#f2f2f2")
    .fill();
  doc.fillColor("#111").strokeColor("#222").lineWidth(0.8);
  doc
    .rect(
      x,
      y,
      cols.reduce((s, c) => s + c.w, 0),
      h
    )
    .stroke();

  doc.font("Helvetica-Bold").fontSize(8);

  let cx = x;
  for (const c of cols) {
    doc.rect(cx, y, c.w, h).stroke();
    doc.text(c.label, cx + 4, y + 6, {
      width: c.w - 8,
      align:
        c.align === "right"
          ? "right"
          : c.align === "center"
          ? "center"
          : "left",
    });
    cx += c.w;
  }
}

function drawRow(doc, x, y, cols, h, row, idx) {
  const totalW = cols.reduce((s, c) => s + c.w, 0);

  if (idx % 2 === 1) doc.rect(x, y, totalW, h).fillColor("#fcfcfc").fill();

  doc.fillColor("#111").strokeColor("#222").lineWidth(0.5);
  doc.rect(x, y, totalW, h).stroke();

  doc.font("Helvetica").fontSize(8).fillColor("#111");

  let cx = x;
  for (const c of cols) {
    doc.rect(cx, y, c.w, h).stroke();
    const v = row[c.key];
    doc.text(safe(v), cx + 4, y + 5, {
      width: c.w - 8,
      align:
        c.align === "right"
          ? "right"
          : c.align === "center"
          ? "center"
          : "left",
      ellipsis: true,
    });
    cx += c.w;
  }
}

function drawEmptyRow(doc, x, y, cols, h, msg) {
  const totalW = cols.reduce((s, c) => s + c.w, 0);
  doc.strokeColor("#222").lineWidth(0.5);
  doc.rect(x, y, totalW, h).stroke();
  doc.font("Helvetica").fontSize(8).fillColor("#555");
  doc.text(msg, x + 6, y + 5, { width: totalW - 12, align: "left" });
}

module.exports = { buildPackingSlipPdf };
