const { Order } = require("./orders.model");
const { Customer } = require("../customers/customers.model");

const { buildInvoicePdf } = require("./pdf/invoicePdf");
const { buildPackingSlipPdf } = require("./pdf/packingSlipPdf");
const { buildCompletionReportPdf } = require("./pdf/completionReportPdf");

async function loadOrderAndCustomer(orderId) {
  const order = await Order.findById(orderId);
  if (!order) {
    const err = new Error("Order not found");
    err.code = "ORDER_NOT_FOUND";
    err.statusCode = 404;
    throw err;
  }

  const customer = order.customerId
    ? await Customer.findById(order.customerId)
        .select("name address phone email")
        .lean()
    : null;

  return { order, customer };
}

async function getInvoicePdf(req, res, next) {
  try {
    const orderId = req.params.id;
    const { order, customer } = await loadOrderAndCustomer(orderId);

    const doc = buildInvoicePdf({ order, customer });

    const filename = `${order.orderNumber}-invoice.pdf`;
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `inline; filename="${filename}"`);

    doc.pipe(res);
    doc.end();
  } catch (err) {
    return next(err);
  }
}

async function getPackingSlipPdf(req, res, next) {
  try {
    const orderId = req.params.id;
    const { order, customer } = await loadOrderAndCustomer(orderId);

    const doc = buildPackingSlipPdf({ order, customer });

    const filename = `${order.orderNumber}-packing-slip.pdf`;
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `inline; filename="${filename}"`);

    doc.pipe(res);
    doc.end();
  } catch (err) {
    return next(err);
  }
}

async function getCompletionReportPdf(req, res, next) {
  try {
    const orderId = req.params.id;
    const { order, customer } = await loadOrderAndCustomer(orderId);

    const doc = buildCompletionReportPdf({ order, customer });

    const filename = `${order.orderNumber}-completion-report.pdf`;
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `inline; filename="${filename}"`);

    doc.pipe(res);
    doc.end();
  } catch (err) {
    return next(err);
  }
}

module.exports = {
  getInvoicePdf,
  getPackingSlipPdf,
  getCompletionReportPdf,
};
