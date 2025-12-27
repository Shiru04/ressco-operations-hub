const { Order } = require("./orders.model");
const { Customer } = require("../customers/customers.model");
const { buildTakeoffPdf } = require("./pdf/takeoffPdf");

async function getTakeoffPdf(req, res, next) {
  try {
    const orderId = req.params.id;

    const order = await Order.findById(orderId);
    if (!order) {
      const err = new Error("Order not found");
      err.code = "ORDER_NOT_FOUND";
      err.statusCode = 404;
      throw err;
    }

    // Optional: include customer name if header.customer not set
    const customer = order.customerId
      ? await Customer.findById(order.customerId).select("name").lean()
      : null;

    const doc = buildTakeoffPdf({ order, customer });

    const filename = `${order.orderNumber}-takeoff.pdf`;

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `inline; filename="${filename}"`);

    doc.pipe(res);
    doc.end();
  } catch (err) {
    return next(err);
  }
}

module.exports = { getTakeoffPdf };
