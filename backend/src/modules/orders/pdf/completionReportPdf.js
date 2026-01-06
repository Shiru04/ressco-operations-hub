const PDFDocument = require("pdfkit");

function safe(v) {
  return v === null || v === undefined ? "" : String(v);
}

function formatDateTime(d) {
  if (!d) return "—";
  const dt = new Date(d);
  if (Number.isNaN(dt.getTime())) return "—";
  return dt.toLocaleString();
}

function secondsToHms(sec) {
  const s = Math.max(0, Number(sec || 0));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const r = Math.floor(s % 60);
  return `${h}h ${m}m ${r}s`;
}

/**
 * Production Completion Report v1
 * - Summarizes piece statuses + timer/workLog totals per piece
 * - Does NOT modify production logic; reads existing fields only
 */
function buildCompletionReportPdf({ order, customer }) {
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
  doc.text("PRODUCTION COMPLETION REPORT", page.m.left, page.m.top, {
    align: "right",
  });

  doc.font("Helvetica-Bold").fontSize(14).fillColor("#111");
  doc.text("Ressco Metals", page.m.left, page.m.top);

  const customerName =
    order?.takeoff?.header?.customer ||
    customer?.name ||
    safe(order.contactSnapshot?.name);

  doc.font("Helvetica").fontSize(9).fillColor("#111");
  doc.text(`Order: ${safe(order.orderNumber)}`, page.m.left, page.m.top + 44);
  doc.text(`Customer: ${customerName || "—"}`, page.m.left, page.m.top + 58);
  doc.text(
    `Generated: ${formatDateTime(new Date())}`,
    page.m.left,
    page.m.top + 72
  );

  const items = Array.isArray(order?.takeoff?.items) ? order.takeoff.items : [];

  const totals = computeTotals(items);

  // Summary block
  const sumTop = page.m.top + 98;
  const sumW = page.w - page.m.left - page.m.right;
  doc
    .rect(page.m.left, sumTop, sumW, 56)
    .strokeColor("#222")
    .lineWidth(1)
    .stroke();

  doc.font("Helvetica-Bold").fontSize(9).fillColor("#111");
  doc.text("Summary", page.m.left + 10, sumTop + 8);

  doc.font("Helvetica").fontSize(9).fillColor("#111");
  doc.text(`Pieces: ${totals.count}`, page.m.left + 10, sumTop + 26);
  doc.text(
    `Total labor time (accumulated): ${secondsToHms(
      totals.totalAccumulatedSec
    )}`,
    page.m.left + 150,
    sumTop + 26
  );

  doc.font("Helvetica").fontSize(9).fillColor("#111");
  doc.text(`Completed: ${totals.completed}`, page.m.left + 10, sumTop + 40);
  doc.text(`In progress: ${totals.inProgress}`, page.m.left + 150, sumTop + 40);
  doc.text(`Queued/Other: ${totals.other}`, page.m.left + 290, sumTop + 40);

  // Table
  const tableTop = sumTop + 76;
  const tableW = sumW;

  const cols = [
    {
      key: "pieceRef",
      label: "Piece",
      w: Math.floor(tableW * 0.14),
      align: "left",
    },
    {
      key: "typeCode",
      label: "Type",
      w: Math.floor(tableW * 0.1),
      align: "left",
    },
    {
      key: "status",
      label: "Status",
      w: Math.floor(tableW * 0.12),
      align: "left",
    },
    {
      key: "assigned",
      label: "Assigned",
      w: Math.floor(tableW * 0.14),
      align: "left",
    },
    {
      key: "timer",
      label: "Timer State",
      w: Math.floor(tableW * 0.12),
      align: "left",
    },
    {
      key: "accum",
      label: "Accumulated",
      w: Math.floor(tableW * 0.14),
      align: "right",
    },
    {
      key: "notes",
      label: "Notes (last)",
      w: tableW - Math.floor(tableW * 0.76),
      align: "left",
    },
  ];

  drawTableHeader(doc, page.m.left, tableTop, cols);

  const rowH = 18;
  let y = tableTop + 18;

  if (!items.length) {
    drawEmptyRow(doc, page.m.left, y, cols, rowH, "No takeoff items found.");
    y += rowH;
  } else {
    const rows = items.map(normalizeRow);

    for (let i = 0; i < rows.length; i++) {
      drawRow(doc, page.m.left, y, cols, rowH, rows[i], i);
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

function normalizeRow(x) {
  const lastWorkLog =
    Array.isArray(x.workLog) && x.workLog.length
      ? x.workLog[x.workLog.length - 1]
      : null;

  return {
    pieceRef: safe(x.pieceRef || ""),
    typeCode: safe(x.typeCode || ""),
    status: safe(x.pieceStatus || ""),
    assigned: safe(x.assignedQueueKey || ""),
    timer: safe(x.timer?.state || "idle"),
    accum: secondsToHms(Number(x.timer?.accumulatedSec || 0)),
    notes: safe(lastWorkLog?.notes || ""),
  };
}

function computeTotals(items) {
  let totalAccumulatedSec = 0;
  let completed = 0;
  let inProgress = 0;
  let other = 0;

  for (const it of items) {
    totalAccumulatedSec += Number(it?.timer?.accumulatedSec || 0);

    const st = String(it?.pieceStatus || "").toLowerCase();
    if (st === "completed" || st === "done" || st === "complete")
      completed += 1;
    else if (st === "in_progress" || st === "in progress" || st === "working")
      inProgress += 1;
    else other += 1;
  }

  return {
    count: items.length,
    totalAccumulatedSec,
    completed,
    inProgress,
    other,
  };
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
      align: c.align === "right" ? "right" : "left",
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
      align: c.align === "right" ? "right" : "left",
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

module.exports = { buildCompletionReportPdf };
