const { ok, fail } = require("../../shared/http/apiResponse");

const inventoryService = require("./inventory.service");
const { INVENTORY_TX_TYPES } = require("./inventory.constants");

async function getSettings(req, res) {
  try {
    const data = await inventoryService.getSettings();
    return ok(res, data);
  } catch (err) {
    return fail(res, err, err.statusCode || 400);
  }
}

async function patchSettings(req, res) {
  try {
    const patch = req.body || {};
    const data = await inventoryService.updateSettings({
      patch,
      actorUserId: req.auth?.userId,
    });
    return ok(res, data);
  } catch (err) {
    return fail(res, err, err.statusCode || 400);
  }
}

async function listMaterials(req, res) {
  try {
    const data = await inventoryService.listMaterials({
      q: req.query.q || "",
      lowOnly: String(req.query.lowOnly || "") === "true",
      limit: req.query.limit,
      page: req.query.page,
    });
    return ok(res, data);
  } catch (err) {
    return fail(res, err, err.statusCode || 400);
  }
}

async function postMaterial(req, res) {
  try {
    const payload = req.body || {};
    const data = await inventoryService.createMaterial({
      payload,
      actorUserId: req.auth?.userId,
    });
    return ok(res, data, 201);
  } catch (err) {
    return fail(res, err, err.statusCode || 400);
  }
}

async function getMaterial(req, res) {
  try {
    const data = await inventoryService.getMaterialById(req.params.id);
    return ok(res, data);
  } catch (err) {
    return fail(res, err, err.statusCode || 400);
  }
}

async function patchMaterial(req, res) {
  try {
    const data = await inventoryService.updateMaterial({
      materialId: req.params.id,
      patch: req.body || {},
    });
    return ok(res, data);
  } catch (err) {
    return fail(res, err, err.statusCode || 400);
  }
}

async function getMaterialLedger(req, res) {
  try {
    const data = await inventoryService.getMaterialLedger({
      materialId: req.params.id,
      limit: req.query.limit,
    });
    return ok(res, data);
  } catch (err) {
    return fail(res, err, err.statusCode || 400);
  }
}

async function postReceive(req, res) {
  try {
    const qty = req.body?.qty;
    const unitCost = req.body?.unitCost ?? null;
    const notes = req.body?.notes || "";

    const data = await inventoryService.applyStockTransaction({
      materialId: req.params.id,
      type: INVENTORY_TX_TYPES.RECEIPT,
      qtyDelta: qty,
      unitCost,
      notes,
      ref: { entityType: "manual" },
      actorUserId: req.auth?.userId,
    });
    return ok(res, data, 201);
  } catch (err) {
    return fail(res, err, err.statusCode || 400);
  }
}

async function postAdjust(req, res) {
  try {
    const qtyDelta = req.body?.qtyDelta;
    const notes = req.body?.notes || "";
    const data = await inventoryService.applyStockTransaction({
      materialId: req.params.id,
      type: INVENTORY_TX_TYPES.ADJUSTMENT,
      qtyDelta,
      unitCost: null,
      notes,
      ref: { entityType: "manual" },
      actorUserId: req.auth?.userId,
    });
    return ok(res, data, 201);
  } catch (err) {
    return fail(res, err, err.statusCode || 400);
  }
}

async function getOrderBom(req, res) {
  try {
    const data = await inventoryService.getOrderBomByOrderId({
      orderId: req.params.orderId,
    });
    return ok(res, data || null);
  } catch (err) {
    return fail(res, err, err.statusCode || 400);
  }
}

async function upsertOrderBom(req, res) {
  try {
    const data = await inventoryService.upsertOrderBom({
      orderId: req.params.orderId,
      patch: req.body || {},
      actorUserId: req.auth?.userId,
    });
    return ok(res, data);
  } catch (err) {
    return fail(res, err, err.statusCode || 400);
  }
}

async function postConsume(req, res) {
  try {
    const data = await inventoryService.consumeForOrder({
      orderId: req.params.orderId,
      items: req.body?.items || [],
      actorUserId: req.auth?.userId,
    });
    return ok(res, data, 201);
  } catch (err) {
    return fail(res, err, err.statusCode || 400);
  }
}

module.exports = {
  getSettings,
  patchSettings,
  listMaterials,
  postMaterial,
  getMaterial,
  patchMaterial,
  getMaterialLedger,
  postReceive,
  postAdjust,
  getOrderBom,
  upsertOrderBom,
  postConsume,
};
