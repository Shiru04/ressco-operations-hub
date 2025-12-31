const service = require("./portal.service");

async function listCustomers(req, res, next) {
  try {
    const data = await service.listCustomersForPortal(req.auth);
    return res.json({ ok: true, data });
  } catch (e) {
    return next(e);
  }
}

async function listOrders(req, res, next) {
  try {
    const data = await service.listOrdersForPortal(req.auth);
    return res.json({ ok: true, data });
  } catch (e) {
    return next(e);
  }
}

async function getLastDraft(req, res, next) {
  try {
    const data = await service.getLastDraftForPortal(req.auth, req.query);
    return res.json({ ok: true, data });
  } catch (e) {
    return next(e);
  }
}

async function getOrder(req, res, next) {
  try {
    const data = await service.getOrderForPortal(req.auth, req.params.id);
    return res.json({ ok: true, data });
  } catch (e) {
    return next(e);
  }
}

async function createOrderRequest(req, res, next) {
  try {
    const data = await service.createOrderRequest(req.auth, req.body, req);
    return res.status(201).json({ ok: true, data });
  } catch (e) {
    return next(e);
  }
}

async function patchOrderTakeoff(req, res, next) {
  try {
    const data = await service.patchOrderTakeoff(
      req.auth,
      req.params.id,
      req.body,
      req
    );
    return res.json({ ok: true, data });
  } catch (e) {
    return next(e);
  }
}

module.exports = {
  listCustomers,
  listOrders,
  getLastDraft,
  getOrder,
  createOrderRequest,
  patchOrderTakeoff,
};
