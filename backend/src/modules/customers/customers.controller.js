const { ok } = require("../../shared/http/apiResponse");
const {
  createCustomerSchema,
  updateCustomerSchema,
} = require("./customers.dto");
const {
  listCustomers,
  createCustomer,
  getCustomerById,
  updateCustomer,
  getCustomerOrders,
} = require("./customers.service");

async function getCustomers(req, res, next) {
  try {
    const { q, limit, page } = req.query;
    const result = await listCustomers({ q, limit, page });
    return ok(res, result);
  } catch (err) {
    return next(err);
  }
}

async function postCustomer(req, res, next) {
  try {
    const body = createCustomerSchema.parse(req.body);
    const created = await createCustomer(body);
    return ok(res, created, 201);
  } catch (err) {
    return next(err);
  }
}

async function getCustomer(req, res, next) {
  try {
    const customer = await getCustomerById(req.params.id);
    return ok(res, customer);
  } catch (err) {
    return next(err);
  }
}

async function patchCustomer(req, res, next) {
  try {
    const patch = updateCustomerSchema.parse(req.body);
    const updated = await updateCustomer(req.params.id, patch);
    return ok(res, updated);
  } catch (err) {
    return next(err);
  }
}

async function getCustomerOrderHistory(req, res, next) {
  try {
    const orders = await getCustomerOrders(req.params.id);
    return ok(res, { items: orders });
  } catch (err) {
    return next(err);
  }
}

module.exports = {
  getCustomers,
  postCustomer,
  getCustomer,
  patchCustomer,
  getCustomerOrderHistory,
};
