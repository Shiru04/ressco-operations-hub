const PDFDocument = require("pdfkit");

function money(n) {
  const x = Number(n || 0);
  return x.toLocaleString(undefined, { style: "currency", currency: "USD" });
}

function formatDate(d) {
  const dt = new Date(d);
  if (Number.isNaN(dt.getTime())) return "";
  return dt.toLocaleDateString();
}

function safe(v) {
  return v === null || v === undefined ? "" : String(v);
}

/**
 * Invoice PDF v1
 * - Uses order.items if present (quoting-style)
 * - Falls back to takeoff items summary if order.items is empty
 * - NO invoice numbering schema changes (out of scope). Uses orderNumber as reference.
 */
function buildInvoicePdf({ order, customer }) {
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

  // Header
  doc.font("Helvetica-Bold").fontSize(18).fillColor("#111");
  doc.text("INVOICE", page.m.left, page.m.top, { align: "right" });

  doc.font("Helvetica-Bold").fontSize(14).fillColor("#111");
  doc.text("Ressco Metals", page.m.left, page.m.top);

  doc.font("Helvetica").fontSize(9).fillColor("#333");
  doc.text("Operations Hub v1", page.m.left, page.m.top + 18);

  const refY = page.m.top + 48;
  const rightX = page.w - page.m.right - 220;

  doc.font("Helvetica-Bold").fontSize(9).fillColor("#111");
  doc.text("Invoice Ref:", rightX, refY);
  doc.font("Helvetica").fontSize(9).fillColor("#111");
  doc.text(safe(order.orderNumber), rightX + 70, refY);

  doc.font("Helvetica-Bold").fontSize(9).fillColor("#111");
  doc.text("Date:", rightX, refY + 14);
  doc.font("Helvetica").fontSize(9).fillColor("#111");
  doc.text(formatDate(new Date()), rightX + 70, refY + 14);

  doc.font("Helvetica-Bold").fontSize(9).fillColor("#111");
  doc.text("Due:", rightX, refY + 28);
  doc.font("Helvetica").fontSize(9).fillColor("#111");
  const due = order?.takeoff?.header?.dueDate || order?.sla?.dueAt || null;
  doc.text(due ? formatDate(due) : "—", rightX + 70, refY + 28);

  // Bill To block
  const blockTop = page.m.top + 86;
  const blockW = page.w - page.m.left - page.m.right;
  doc
    .rect(page.m.left, blockTop, blockW, 62)
    .strokeColor("#222")
    .lineWidth(1)
    .stroke();

  const customerName =
    order?.takeoff?.header?.customer ||
    customer?.name ||
    safe(order.contactSnapshot?.name);

  doc.font("Helvetica-Bold").fontSize(10).fillColor("#111");
  doc.text("Bill To", page.m.left + 10, blockTop + 8);

  doc.font("Helvetica").fontSize(9).fillColor("#111");
  doc.text(customerName || "—", page.m.left + 10, blockTop + 24);

  const shipTo = order?.takeoff?.header?.shipToAddress;
  const shipLine =
    shipTo?.formatted ||
    [shipTo?.line1, shipTo?.city, shipTo?.state, shipTo?.zip]
      .filter(Boolean)
      .join(", ");

  doc.font("Helvetica").fontSize(8).fillColor("#333");
  if (shipLine) doc.text(shipLine, page.m.left + 10, blockTop + 38);

  const po = order?.takeoff?.header?.poNumber;
  doc.font("Helvetica").fontSize(8).fillColor("#333");
  if (po) doc.text(`PO: ${safe(po)}`, page.m.left + 10, blockTop + 50);

  // Line items
  const tableTop = blockTop + 78;
  const tableW = blockW;

  const cols = [
    {
      key: "desc",
      label: "Description",
      w: Math.floor(tableW * 0.5),
      align: "left",
    },
    { key: "qty", label: "Qty", w: Math.floor(tableW * 0.1), align: "right" },
    {
      key: "unitPrice",
      label: "Unit Price",
      w: Math.floor(tableW * 0.2),
      align: "right",
    },
    {
      key: "lineTotal",
      label: "Line Total",
      w: tableW - Math.floor(tableW * 0.8),
      align: "right",
    },
  ];

  drawTableHeader(doc, page.m.left, tableTop, cols);

  const sourceItems = normalizeInvoiceItems(order);
  const rowH = 18;

  let y = tableTop + 18;
  let subtotal = 0;

  if (!sourceItems.length) {
    drawEmptyRow(
      doc,
      page.m.left,
      y,
      cols,
      rowH,
      "No billable items recorded."
    );
    y += rowH;
  } else {
    for (let i = 0; i < sourceItems.length; i++) {
      const it = sourceItems[i];
      subtotal += it.lineTotal;
      drawRow(doc, page.m.left, y, cols, rowH, it, i);
      y += rowH;

      if (y > page.h - page.m.bottom - 140) {
        doc.addPage({ size: "LETTER", layout: "portrait", margins: page.m });
        y = page.m.top;
        drawTableHeader(doc, page.m.left, y, cols);
        y += 18;
      }
    }
  }

  // Totals block
  const totalsTop = Math.min(y + 16, page.h - page.m.bottom - 110);
  const totalsX = page.w - page.m.right - 220;

  const tax = 0; // v1: tax rules are out of scope
  const total = subtotal + tax;

  doc.strokeColor("#222").lineWidth(1);
  doc.rect(totalsX, totalsTop, 220, 74).stroke();

  doc.font("Helvetica-Bold").fontSize(9).fillColor("#111");
  doc.text("Subtotal", totalsX + 10, totalsTop + 10);
  doc.text(money(subtotal), totalsX + 10, totalsTop + 10, {
    width: 200,
    align: "right",
  });

  doc.font("Helvetica-Bold").fontSize(9).fillColor("#111");
  doc.text("Tax", totalsX + 10, totalsTop + 28);
  doc.text(money(tax), totalsX + 10, totalsTop + 28, {
    width: 200,
    align: "right",
  });

  doc.font("Helvetica-Bold").fontSize(10).fillColor("#111");
  doc.text("Total", totalsX + 10, totalsTop + 48);
  doc.text(money(total), totalsX + 10, totalsTop + 48, {
    width: 200,
    align: "right",
  });

  // Footer
  doc.font("Helvetica").fontSize(8).fillColor("#555");
  doc.text(
    `Order: ${safe(
      order.orderNumber
    )}  |  Generated: ${new Date().toLocaleString()}`,
    page.m.left,
    page.h - page.m.bottom - 10,
    { width: blockW, align: "right" }
  );

  return doc;
}

function normalizeInvoiceItems(order) {
  const items = Array.isArray(order?.items) ? order.items : [];
  if (items.length > 0) {
    return items.map((x) => {
      const qty = Number(x.qty || 0);
      const unitPrice = Number(x.unitPrice || 0);
      return {
        desc: safe(x.description),
        qty,
        unitPrice,
        lineTotal: qty * unitPrice,
      };
    });
  }

  // Fallback: summarize takeoff items so invoice is still usable in v1
  const takeoff = Array.isArray(order?.takeoff?.items)
    ? order.takeoff.items
    : [];
  if (!takeoff.length) return [];

  return takeoff.map((x) => ({
    desc: `${safe(x.pieceRef || x.typeCode || "Piece")}  GA:${safe(
      x.ga || ""
    )}  ${safe(x.remarks || "")}`.trim(),
    qty: Number(x.qty || 0),
    unitPrice: 0,
    lineTotal: 0,
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
      align: c.align === "left" ? "left" : "right",
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
    const text =
      c.key === "unitPrice" || c.key === "lineTotal"
        ? money(v)
        : c.key === "qty"
        ? String(v ?? "")
        : safe(v);

    doc.text(text, cx + 4, y + 5, {
      width: c.w - 8,
      align: c.align === "left" ? "left" : "right",
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

module.exports = { buildInvoicePdf };
