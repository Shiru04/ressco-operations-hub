const { ok } = require("../../shared/http/apiResponse");
const {
  createOrderSchema,
  intakeOrderSchema,
  updateOrderSchema,
  patchStatusSchema,
} = require("./orders.dto");
const {
  createOrder,
  intakeOrder,
  listOrders,
  getOrderById,
  updateOrder,
  patchStatus,
  approveOrder,
} = require("./orders.service");

function actorFromReq(req) {
  return { userId: req.auth?.sub || null, role: req.auth?.role || null };
}

async function getOrders(req, res, next) {
  try {
    const { q, status, customerId, page, limit } = req.query;
    const result = await listOrders({ q, status, customerId, page, limit });
    return ok(res, result);
  } catch (err) {
    return next(err);
  }
}

async function postOrder(req, res, next) {
  try {
    const body = createOrderSchema.parse(req.body);
    const created = await createOrder(body, actorFromReq(req), req);
    return ok(res, created, 201);
  } catch (err) {
    return next(err);
  }
}

async function postIntake(req, res, next) {
  try {
    const body = intakeOrderSchema.parse(req.body);
    const created = await intakeOrder(body, req);
    return ok(res, created, 201);
  } catch (err) {
    return next(err);
  }
}

async function getOrder(req, res, next) {
  try {
    const order = await getOrderById(req.params.id);
    return ok(res, order);
  } catch (err) {
    return next(err);
  }
}

async function patchOrder(req, res, next) {
  try {
    const patch = updateOrderSchema.parse(req.body);
    const updated = await updateOrder(
      req.params.id,
      patch,
      actorFromReq(req),
      req
    );
    return ok(res, updated);
  } catch (err) {
    return next(err);
  }
}

async function patchOrderStatus(req, res, next) {
  try {
    const body = patchStatusSchema.parse(req.body);
    const updated = await patchStatus(
      req.params.id,
      body.status,
      actorFromReq(req),
      req,
      body.note
    );
    return ok(res, updated);
  } catch (err) {
    return next(err);
  }
}

async function postApprove(req, res, next) {
  try {
    const updated = await approveOrder(req.params.id, actorFromReq(req), req);
    return ok(res, updated);
  } catch (err) {
    return next(err);
  }
}

async function postUnapprove(req, res, next) {
  try {
    const actor = {
      userId: req.auth?.sub || null,
      role: req.auth?.role || null,
    };
    const updated = await unapproveOrder(req.params.id, { actor, req });
    return ok(res, updated);
  } catch (err) {
    return next(err);
  }
}

module.exports = {
  getOrders,
  postOrder,
  postIntake,
  getOrder,
  patchOrder,
  patchOrderStatus,
  postApprove,
  postUnapprove,
};
