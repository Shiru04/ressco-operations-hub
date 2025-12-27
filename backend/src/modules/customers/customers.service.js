const mongoose = require("mongoose");
const { Customer } = require("./customers.model");
const { Order } = require("../orders/orders.model");

function normalizeAddress(a) {
  if (!a) return undefined;
  return {
    line1: a.line1 ?? null,
    line2: a.line2 ?? null,
    city: a.city ?? null,
    state: a.state ?? null,
    zip: a.zip ?? null,
    country: a.country ?? "USA",
  };
}

function normalizeContacts(contacts) {
  if (!Array.isArray(contacts)) return undefined;
  return contacts.map((c) => ({
    name: c.name.trim(),
    email: c.email ? String(c.email).toLowerCase().trim() : null,
    phone: c.phone ? String(c.phone).trim() : null,
    title: c.title ? String(c.title).trim() : null,
  }));
}

function normalizeSLA(sla) {
  if (!sla) return undefined;
  return {
    hoursTarget: sla.hoursTarget ?? 48,
    priority: sla.priority ?? "normal",
  };
}

async function listCustomers({ q, limit = 50, page = 1 }) {
  const filter = {};
  if (q) {
    filter.name = { $regex: String(q).trim(), $options: "i" };
  }

  const safeLimit = Math.min(Math.max(Number(limit) || 50, 1), 200);
  const safePage = Math.max(Number(page) || 1, 1);
  const skip = (safePage - 1) * safeLimit;

  const [items, total] = await Promise.all([
    Customer.find(filter).sort({ createdAt: -1 }).skip(skip).limit(safeLimit),
    Customer.countDocuments(filter),
  ]);

  return {
    items: items.map(mapCustomer),
    page: safePage,
    limit: safeLimit,
    total,
  };
}

async function createCustomer(payload) {
  const doc = await Customer.create({
    name: payload.name.trim(),
    billingAddress: normalizeAddress(payload.billingAddress),
    shippingAddress: normalizeAddress(payload.shippingAddress),
    contacts: normalizeContacts(payload.contacts) || [],
    sla: normalizeSLA(payload.sla),
    notes: payload.notes ? String(payload.notes).trim() : "",
  });

  return mapCustomer(doc);
}

async function getCustomerById(id) {
  if (!mongoose.isValidObjectId(id)) {
    const err = new Error("Invalid customer id");
    err.code = "INVALID_ID";
    err.statusCode = 400;
    throw err;
  }

  const doc = await Customer.findById(id);
  if (!doc) {
    const err = new Error("Customer not found");
    err.code = "CUSTOMER_NOT_FOUND";
    err.statusCode = 404;
    throw err;
  }

  return mapCustomer(doc);
}

async function updateCustomer(id, patch) {
  if (!mongoose.isValidObjectId(id)) {
    const err = new Error("Invalid customer id");
    err.code = "INVALID_ID";
    err.statusCode = 400;
    throw err;
  }

  const update = {};
  if (patch.name !== undefined) update.name = patch.name.trim();
  if (patch.billingAddress !== undefined)
    update.billingAddress = normalizeAddress(patch.billingAddress);
  if (patch.shippingAddress !== undefined)
    update.shippingAddress = normalizeAddress(patch.shippingAddress);
  if (patch.contacts !== undefined)
    update.contacts = normalizeContacts(patch.contacts) || [];
  if (patch.sla !== undefined) update.sla = normalizeSLA(patch.sla);
  if (patch.notes !== undefined)
    update.notes = patch.notes ? String(patch.notes).trim() : "";

  const doc = await Customer.findByIdAndUpdate(id, update, { new: true });
  if (!doc) {
    const err = new Error("Customer not found");
    err.code = "CUSTOMER_NOT_FOUND";
    err.statusCode = 404;
    throw err;
  }

  return mapCustomer(doc);
}

async function getCustomerOrders(customerId) {
  if (!mongoose.isValidObjectId(customerId)) {
    const err = new Error("Invalid customer id");
    err.code = "INVALID_ID";
    err.statusCode = 400;
    throw err;
  }

  const orders = await Order.find({ customerId })
    .sort({ createdAt: -1 })
    .limit(200);

  return orders.map((o) => ({
    id: o._id,
    orderNumber: o.orderNumber,
    status: o.status,
    priority: o.priority,
    source: o.source,
    createdAt: o.createdAt,
    updatedAt: o.updatedAt,
  }));
}

function mapCustomer(c) {
  return {
    id: c._id,
    name: c.name,
    billingAddress: c.billingAddress || {},
    shippingAddress: c.shippingAddress || {},
    contacts: (c.contacts || []).map((x) => ({
      id: x._id,
      name: x.name,
      email: x.email || null,
      phone: x.phone || null,
      title: x.title || null,
    })),
    sla: c.sla || { hoursTarget: 48, priority: "normal" },
    notes: c.notes || "",
    createdAt: c.createdAt,
    updatedAt: c.updatedAt,
  };
}

module.exports = {
  listCustomers,
  createCustomer,
  getCustomerById,
  updateCustomer,
  getCustomerOrders,
};
