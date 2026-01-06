const mongoose = require("mongoose");

const { Material } = require("./materials.model");
const { InventoryTransaction } = require("./inventoryTransactions.model");
const { OrderBom } = require("./orderBoms.model");
const { InventorySettings } = require("./inventorySettings.model");
const { Order } = require("../orders/orders.model");
const {
  createNotification,
} = require("../notifications/notifications.service");
const {
  INVENTORY_PRESETS,
  CONSUMPTION_MODES,
  INVENTORY_TX_TYPES,
} = require("./inventory.constants");
const {
  safeObjectId,
  roundToDecimals,
  clampNumber,
} = require("./inventory.utils");

async function getOrCreateSettings() {
  let doc = await InventorySettings.findOne({ active: true }).sort({
    createdAt: -1,
  });
  if (!doc) {
    doc = await InventorySettings.create({
      active: true,
      preset: INVENTORY_PRESETS.ASSISTED,
      consumptionMode: CONSUMPTION_MODES.BOM_ASSISTED,
    });
  }
  return doc;
}

function normalizeSettingsPatch(patch = {}) {
  const out = {};

  if (patch.preset && Object.values(INVENTORY_PRESETS).includes(patch.preset)) {
    out.preset = patch.preset;
  }

  if (
    patch.consumptionMode &&
    Object.values(CONSUMPTION_MODES).includes(patch.consumptionMode)
  ) {
    out.consumptionMode = patch.consumptionMode;
  }

  if (patch.qtyPrecision?.maxDecimals !== undefined) {
    const md = clampNumber(patch.qtyPrecision.maxDecimals, { min: 0, max: 8 });
    if (md !== null) out.qtyPrecision = { maxDecimals: md };
  }

  if (patch.lowStockRules) {
    out.lowStockRules = {};
    if (typeof patch.lowStockRules.enableReorderPoint === "boolean") {
      out.lowStockRules.enableReorderPoint =
        patch.lowStockRules.enableReorderPoint;
    }
    if (typeof patch.lowStockRules.alertOnNegative === "boolean") {
      out.lowStockRules.alertOnNegative = patch.lowStockRules.alertOnNegative;
    }
    if (patch.lowStockRules.alertCooldownMinutes !== undefined) {
      const m = clampNumber(patch.lowStockRules.alertCooldownMinutes, {
        min: 0,
        max: 60 * 24 * 30,
      });
      if (m !== null) out.lowStockRules.alertCooldownMinutes = m;
    }
  }

  if (patch.alertRecipients) {
    out.alertRecipients = {};
    if (Array.isArray(patch.alertRecipients.roles)) {
      out.alertRecipients.roles = patch.alertRecipients.roles
        .map(String)
        .filter(Boolean);
    }
    if (typeof patch.alertRecipients.includeOrderOwner === "boolean") {
      out.alertRecipients.includeOrderOwner =
        patch.alertRecipients.includeOrderOwner;
    }
    if (Array.isArray(patch.alertRecipients.orderOwnerFieldPriority)) {
      out.alertRecipients.orderOwnerFieldPriority =
        patch.alertRecipients.orderOwnerFieldPriority
          .map(String)
          .filter(Boolean);
    }
    if (typeof patch.alertRecipients.fallbackToRolesOnly === "boolean") {
      out.alertRecipients.fallbackToRolesOnly =
        patch.alertRecipients.fallbackToRolesOnly;
    }
  }

  if (patch.permissions) {
    out.permissions = {};
    if (typeof patch.permissions.productionCanConsume === "boolean") {
      out.permissions.productionCanConsume =
        patch.permissions.productionCanConsume;
    }
    if (typeof patch.permissions.productionCanReceive === "boolean") {
      out.permissions.productionCanReceive =
        patch.permissions.productionCanReceive;
    }
    if (typeof patch.permissions.productionCanAdjust === "boolean") {
      out.permissions.productionCanAdjust =
        patch.permissions.productionCanAdjust;
    }
  }

  // Apply preset mapping if preset changed and consumptionMode not explicitly provided
  if (out.preset && !out.consumptionMode) {
    if (out.preset === INVENTORY_PRESETS.LIGHTWEIGHT) {
      out.consumptionMode = CONSUMPTION_MODES.NO_BOM;
    }
    if (out.preset === INVENTORY_PRESETS.ASSISTED) {
      out.consumptionMode = CONSUMPTION_MODES.BOM_ASSISTED;
    }
    if (out.preset === INVENTORY_PRESETS.STRICT) {
      out.consumptionMode = CONSUMPTION_MODES.BOM_STRICT;
    }
  }

  return out;
}

async function updateSettings({ patch, actorUserId }) {
  const doc = await getOrCreateSettings();
  const normalized = normalizeSettingsPatch(patch);

  const next = {
    ...normalized,
    qtyPrecision: {
      ...(doc.qtyPrecision || {}),
      ...(normalized.qtyPrecision || {}),
    },
    lowStockRules: {
      ...(doc.lowStockRules || {}),
      ...(normalized.lowStockRules || {}),
    },
    alertRecipients: {
      ...(doc.alertRecipients || {}),
      ...(normalized.alertRecipients || {}),
    },
    permissions: {
      ...(doc.permissions || {}),
      ...(normalized.permissions || {}),
    },
  };

  const reloaded = await InventorySettings.findByIdAndUpdate(
    doc._id,
    { $set: next },
    { new: true }
  );
  return mapSettings(reloaded, actorUserId);
}

function mapSettings(s) {
  return {
    id: s._id,
    preset: s.preset,
    consumptionMode: s.consumptionMode,
    negativeStockPolicy: s.negativeStockPolicy,
    qtyPrecision: s.qtyPrecision,
    lowStockRules: s.lowStockRules,
    alertRecipients: s.alertRecipients,
    permissions: s.permissions,
    updatedAt: s.updatedAt,
  };
}

async function getSettings() {
  const doc = await getOrCreateSettings();
  return mapSettings(doc);
}

async function listMaterials({
  q = "",
  lowOnly = false,
  limit = 50,
  page = 0,
} = {}) {
  const safeLimit = Math.min(Math.max(Number(limit) || 50, 1), 200);
  const safePage = Math.max(Number(page) || 0, 0);

  const filter = {};
  if (q && String(q).trim()) {
    filter.$text = { $search: String(q).trim() };
  }
  if (lowOnly) {
    filter["lowStock.isLow"] = true;
  }

  const [items, total] = await Promise.all([
    Material.find(filter)
      .sort({ updatedAt: -1 })
      .skip(safePage * safeLimit)
      .limit(safeLimit),
    Material.countDocuments(filter),
  ]);

  return {
    items: items.map(mapMaterial),
    total,
    page: safePage,
    limit: safeLimit,
  };
}

async function getMaterialById(materialId) {
  const mid = safeObjectId(materialId);
  if (!mid) {
    const err = new Error("Invalid material id");
    err.code = "INVALID_MATERIAL_ID";
    err.statusCode = 400;
    throw err;
  }
  const doc = await Material.findById(mid);
  if (!doc) {
    const err = new Error("Material not found");
    err.code = "MATERIAL_NOT_FOUND";
    err.statusCode = 404;
    throw err;
  }
  return mapMaterial(doc);
}

async function createMaterial({ payload, actorUserId }) {
  const sku = String(payload.sku || "").trim();
  const name = String(payload.name || "").trim();
  const unit = String(payload.unit || "").trim();
  if (!sku || !name || !unit) {
    const err = new Error("Missing required fields: sku, name, unit");
    err.code = "VALIDATION_ERROR";
    err.statusCode = 400;
    throw err;
  }

  const doc = await Material.create({
    sku,
    name,
    unit,
    category: String(payload.category || "").trim(),
    spec: payload.spec || {},
    isActive: payload.isActive !== false,
    defaultUnitCost: Number(payload.defaultUnitCost) || 0,
    reorderPointQty: Number(payload.reorderPointQty) || 0,
    reorderTargetQty: Number(payload.reorderTargetQty) || 0,
    createdBy: safeObjectId(actorUserId),
  });

  return mapMaterial(doc);
}

async function updateMaterial({ materialId, patch }) {
  const mid = safeObjectId(materialId);
  if (!mid) {
    const err = new Error("Invalid material id");
    err.code = "INVALID_MATERIAL_ID";
    err.statusCode = 400;
    throw err;
  }

  const update = {};
  if (patch.sku !== undefined) update.sku = String(patch.sku || "").trim();
  if (patch.name !== undefined) update.name = String(patch.name || "").trim();
  if (patch.category !== undefined)
    update.category = String(patch.category || "").trim();
  if (patch.unit !== undefined) update.unit = String(patch.unit || "").trim();
  if (patch.spec !== undefined) update.spec = patch.spec || {};
  if (patch.isActive !== undefined) update.isActive = !!patch.isActive;
  if (patch.defaultUnitCost !== undefined)
    update.defaultUnitCost = Number(patch.defaultUnitCost) || 0;
  if (patch.reorderPointQty !== undefined)
    update.reorderPointQty = Number(patch.reorderPointQty) || 0;
  if (patch.reorderTargetQty !== undefined)
    update.reorderTargetQty = Number(patch.reorderTargetQty) || 0;

  const doc = await Material.findByIdAndUpdate(mid, update, { new: true });
  if (!doc) {
    const err = new Error("Material not found");
    err.code = "MATERIAL_NOT_FOUND";
    err.statusCode = 404;
    throw err;
  }
  return mapMaterial(doc);
}

async function getMaterialLedger({ materialId, limit = 200 }) {
  const mid = safeObjectId(materialId);
  if (!mid) {
    const err = new Error("Invalid material id");
    err.code = "INVALID_MATERIAL_ID";
    err.statusCode = 400;
    throw err;
  }
  const safeLimit = Math.min(Math.max(Number(limit) || 200, 1), 500);
  const docs = await InventoryTransaction.find({ materialId: mid })
    .sort({ at: -1 })
    .limit(safeLimit);
  return docs.map(mapTransaction);
}

async function applyStockTransaction({
  materialId,
  type,
  qtyDelta,
  unitCost = null,
  notes = "",
  ref = {},
  actorUserId,
}) {
  const mid = safeObjectId(materialId);
  if (!mid) {
    const err = new Error("Invalid material id");
    err.code = "INVALID_MATERIAL_ID";
    err.statusCode = 400;
    throw err;
  }

  const delta = Number(qtyDelta);
  if (Number.isNaN(delta) || !Number.isFinite(delta) || delta === 0) {
    const err = new Error("qtyDelta must be a non-zero number");
    err.code = "VALIDATION_ERROR";
    err.statusCode = 400;
    throw err;
  }

  const settings = await getOrCreateSettings();
  const maxDecimals = settings.qtyPrecision?.maxDecimals ?? 3;
  const roundedDelta = roundToDecimals(delta, maxDecimals);
  if (roundedDelta === null || roundedDelta === 0) {
    const err = new Error("qtyDelta is invalid after rounding");
    err.code = "VALIDATION_ERROR";
    err.statusCode = 400;
    throw err;
  }

  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const material = await Material.findById(mid).session(session);
    if (!material) {
      const err = new Error("Material not found");
      err.code = "MATERIAL_NOT_FOUND";
      err.statusCode = 404;
      throw err;
    }

    const nextOnHand = roundToDecimals(
      Number(material.onHandQty || 0) + roundedDelta,
      maxDecimals
    );

    material.onHandQty = nextOnHand;
    await material.save({ session });

    const tx = await InventoryTransaction.create(
      [
        {
          materialId: mid,
          type,
          qtyDelta: roundedDelta,
          unitCost: unitCost === null ? null : Number(unitCost),
          notes: String(notes || ""),
          ref: {
            entityType: ref.entityType || null,
            entityId: safeObjectId(ref.entityId),
            orderId: safeObjectId(ref.orderId),
            orderNumber: ref.orderNumber || null,
          },
          actorUserId: safeObjectId(actorUserId),
          at: new Date(),
          balanceAfter: nextOnHand,
        },
      ],
      { session }
    );

    await evaluateAndNotifyLowStock({
      material,
      settings,
      orderNumber: ref.orderNumber || null,
      session,
    });

    await session.commitTransaction();
    session.endSession();

    return {
      material: mapMaterial(material),
      transaction: mapTransaction(tx[0]),
    };
  } catch (e) {
    await session.abortTransaction();
    session.endSession();
    throw e;
  }
}

async function evaluateAndNotifyLowStock({
  material,
  settings,
  orderNumber,
  session,
}) {
  const rules = settings.lowStockRules || {};
  const maxDecimals = settings.qtyPrecision?.maxDecimals ?? 3;
  const now = new Date();

  const onHand =
    roundToDecimals(Number(material.onHandQty || 0), maxDecimals) ?? 0;
  const reorderPointQty =
    roundToDecimals(Number(material.reorderPointQty || 0), maxDecimals) ?? 0;

  const enableReorderPoint = rules.enableReorderPoint !== false;
  const alertOnNegative = rules.alertOnNegative !== false;
  const cooldownMinutes = Number(rules.alertCooldownMinutes) || 0;
  const cooldownMs = cooldownMinutes * 60 * 1000;

  const prevIsLow = !!material.lowStock?.isLow;
  const wasAlertedAt = material.lowStock?.lastAlertAt
    ? new Date(material.lowStock.lastAlertAt)
    : null;
  const withinCooldown =
    wasAlertedAt && cooldownMs > 0
      ? now.getTime() - wasAlertedAt.getTime() < cooldownMs
      : false;

  const isLow =
    enableReorderPoint && reorderPointQty > 0
      ? onHand <= reorderPointQty
      : false;
  const isNegative = alertOnNegative ? onHand < 0 : false;

  // Update lowStock state (cache)
  material.lowStock = {
    isLow: isLow || isNegative,
    lastAlertAt: material.lowStock?.lastAlertAt || null,
    lastAlertQty: material.lowStock?.lastAlertQty ?? null,
  };

  await material.save({ session });

  // Decide to notify
  const shouldAlert =
    !withinCooldown &&
    ((isNegative &&
      (material.lowStock?.lastAlertQty === null ||
        material.lowStock?.lastAlertQty >= 0)) ||
      (isLow && !prevIsLow) ||
      (isLow && prevIsLow) ||
      (isNegative && prevIsLow));

  if (!shouldAlert) return;

  const roles = settings.alertRecipients?.roles || ["admin", "supervisor"];
  const title = isNegative
    ? `Negative inventory: ${material.sku}`
    : `Low stock: ${material.sku}`;

  const messageParts = [
    `${material.name} (${material.sku})`,
    `On hand: ${onHand} ${material.unit}`,
  ];
  if (enableReorderPoint && reorderPointQty > 0) {
    messageParts.push(`Reorder point: ${reorderPointQty} ${material.unit}`);
  }
  if (orderNumber) {
    messageParts.push(`Related order: ${orderNumber}`);
  }

  await createNotification({
    type: isNegative ? "inventory_negative" : "inventory_low_stock",
    title,
    message: messageParts.join(" | "),
    entityType: "material",
    entityId: material._id,
    orderNumber: orderNumber || null,
    roles,
  });

  material.lowStock.lastAlertAt = now;
  material.lowStock.lastAlertQty = onHand;
  await material.save({ session });
}

async function getOrCreateOrderBom({ orderId, orderNumber, actorUserId }) {
  const oid = safeObjectId(orderId);
  if (!oid) {
    const err = new Error("Invalid order id");
    err.code = "INVALID_ORDER_ID";
    err.statusCode = 400;
    throw err;
  }
  let bom = await OrderBom.findOne({ orderId: oid });
  if (!bom) {
    bom = await OrderBom.create({
      orderId: oid,
      orderNumber: orderNumber || "",
      status: "draft",
      lines: [],
      createdBy: safeObjectId(actorUserId),
      updatedBy: safeObjectId(actorUserId),
    });
  }
  return bom;
}

async function getOrderBomByOrderId({ orderId }) {
  const oid = safeObjectId(orderId);
  if (!oid) {
    const err = new Error("Invalid order id");
    err.code = "INVALID_ORDER_ID";
    err.statusCode = 400;
    throw err;
  }
  const bom = await OrderBom.findOne({ orderId: oid });
  if (!bom) return null;
  return mapOrderBom(bom);
}

async function upsertOrderBom({ orderId, patch, actorUserId }) {
  const oid = safeObjectId(orderId);
  if (!oid) {
    const err = new Error("Invalid order id");
    err.code = "INVALID_ORDER_ID";
    err.statusCode = 400;
    throw err;
  }

  const order = await Order.findById(oid);
  if (!order) {
    const err = new Error("Order not found");
    err.code = "ORDER_NOT_FOUND";
    err.statusCode = 404;
    throw err;
  }

  const bom = await getOrCreateOrderBom({
    orderId: oid,
    orderNumber: order.orderNumber,
    actorUserId,
  });

  if (patch.status && ["draft", "locked", "completed"].includes(patch.status)) {
    bom.status = patch.status;
  }

  if (Array.isArray(patch.lines)) {
    // Replace whole lines list (v1), keeping structure stable.
    // Line IDs can be provided by client; otherwise they are generated by schema default.
    bom.lines = patch.lines.map((l) => ({
      lineId: safeObjectId(l.lineId) || undefined,
      materialId: safeObjectId(l.materialId),
      materialSnapshot: {
        sku: String(l.materialSnapshot?.sku || ""),
        name: String(l.materialSnapshot?.name || ""),
        unit: String(l.materialSnapshot?.unit || ""),
        spec: l.materialSnapshot?.spec || {},
      },
      plannedQty: Number(l.plannedQty) || 0,
      consumedQty: Number(l.consumedQty) || 0,
      scrapPct: Number(l.scrapPct) || 0,
      notes: String(l.notes || ""),
      unplanned: !!l.unplanned,
      consumptionTxnIds: Array.isArray(l.consumptionTxnIds)
        ? l.consumptionTxnIds.map(safeObjectId).filter(Boolean)
        : [],
    }));
  }

  bom.updatedBy = safeObjectId(actorUserId);
  await bom.save();
  return mapOrderBom(bom);
}

async function consumeForOrder({ orderId, items, actorUserId }) {
  const oid = safeObjectId(orderId);
  if (!oid) {
    const err = new Error("Invalid order id");
    err.code = "INVALID_ORDER_ID";
    err.statusCode = 400;
    throw err;
  }

  if (!Array.isArray(items) || items.length === 0) {
    const err = new Error("items[] is required");
    err.code = "VALIDATION_ERROR";
    err.statusCode = 400;
    throw err;
  }

  const settings = await getOrCreateSettings();
  const maxDecimals = settings.qtyPrecision?.maxDecimals ?? 3;

  const order = await Order.findById(oid);
  if (!order) {
    const err = new Error("Order not found");
    err.code = "ORDER_NOT_FOUND";
    err.statusCode = 404;
    throw err;
  }

  const mode = settings.consumptionMode || CONSUMPTION_MODES.BOM_ASSISTED;
  const bom =
    mode === CONSUMPTION_MODES.NO_BOM
      ? await OrderBom.findOne({ orderId: oid })
      : await getOrCreateOrderBom({
          orderId: oid,
          orderNumber: order.orderNumber,
          actorUserId,
        });

  const results = [];

  for (const raw of items) {
    const mid = safeObjectId(raw.materialId);
    if (!mid) {
      const err = new Error("Invalid materialId in items[]");
      err.code = "INVALID_MATERIAL_ID";
      err.statusCode = 400;
      throw err;
    }

    const qty = roundToDecimals(Number(raw.qty), maxDecimals);
    if (!qty || qty <= 0) {
      const err = new Error("qty must be a positive number");
      err.code = "VALIDATION_ERROR";
      err.statusCode = 400;
      throw err;
    }

    const material = await Material.findById(mid);
    if (!material) {
      const err = new Error("Material not found");
      err.code = "MATERIAL_NOT_FOUND";
      err.statusCode = 404;
      throw err;
    }

    // BOM enforcement
    let lineIdx = -1;
    if (bom && Array.isArray(bom.lines)) {
      lineIdx = bom.lines.findIndex(
        (l) => String(l.materialId) === String(mid)
      );
    }

    if (mode === CONSUMPTION_MODES.BOM_STRICT && lineIdx === -1) {
      const err = new Error(
        `BOM line missing for material ${material.sku}; add it to BOM before consuming.`
      );
      err.code = "BOM_LINE_REQUIRED";
      err.statusCode = 400;
      throw err;
    }

    // apply stock movement
    const { transaction } = await applyStockTransaction({
      materialId: mid,
      type: INVENTORY_TX_TYPES.CONSUME,
      qtyDelta: -qty,
      unitCost: raw.unitCost ?? null,
      notes: raw.notes || "",
      ref: {
        entityType: "order",
        orderId: oid,
        orderNumber: order.orderNumber,
      },
      actorUserId,
    });

    // Update BOM if present/required
    if (bom && mode !== CONSUMPTION_MODES.NO_BOM) {
      if (lineIdx === -1 && mode === CONSUMPTION_MODES.BOM_ASSISTED) {
        bom.lines.push({
          materialId: mid,
          materialSnapshot: {
            sku: material.sku,
            name: material.name,
            unit: material.unit,
            spec: material.spec || {},
          },
          plannedQty: 0,
          consumedQty: qty,
          unplanned: true,
          notes: "Auto-added from consumption",
          consumptionTxnIds: [safeObjectId(transaction.id)].filter(Boolean),
        });
      } else if (lineIdx >= 0) {
        const line = bom.lines[lineIdx];
        line.consumedQty = roundToDecimals(
          Number(line.consumedQty || 0) + qty,
          maxDecimals
        );
        const existing = Array.isArray(line.consumptionTxnIds)
          ? line.consumptionTxnIds.map((x) => safeObjectId(x)).filter(Boolean)
          : [];
        const tid = safeObjectId(transaction.id);
        line.consumptionTxnIds = tid ? [...existing, tid] : existing;
      }

      bom.updatedBy = safeObjectId(actorUserId);
      await bom.save();
    }

    results.push({ material: mapMaterial(material), transaction });
  }

  return {
    orderId: String(order._id),
    orderNumber: order.orderNumber,
    mode,
    items: results,
    bom: bom ? mapOrderBom(bom) : null,
  };
}

function mapMaterial(m) {
  return {
    id: m._id,
    sku: m.sku,
    name: m.name,
    category: m.category,
    unit: m.unit,
    spec: m.spec || {},
    isActive: m.isActive,
    defaultUnitCost: m.defaultUnitCost,
    avgUnitCost: m.avgUnitCost,
    onHandQty: m.onHandQty,
    reorderPointQty: m.reorderPointQty,
    reorderTargetQty: m.reorderTargetQty,
    lowStock: m.lowStock || { isLow: false },
    createdAt: m.createdAt,
    updatedAt: m.updatedAt,
  };
}

function mapTransaction(t) {
  return {
    id: t._id,
    materialId: t.materialId,
    type: t.type,
    qtyDelta: t.qtyDelta,
    unitCost: t.unitCost,
    notes: t.notes,
    ref: t.ref || {},
    actorUserId: t.actorUserId,
    at: t.at,
    balanceAfter: t.balanceAfter,
    createdAt: t.createdAt,
  };
}

function mapOrderBom(b) {
  return {
    id: b._id,
    orderId: b.orderId,
    orderNumber: b.orderNumber,
    status: b.status,
    lines: (b.lines || []).map((l) => ({
      lineId: l.lineId,
      materialId: l.materialId,
      materialSnapshot: l.materialSnapshot,
      plannedQty: l.plannedQty,
      consumedQty: l.consumedQty,
      scrapPct: l.scrapPct,
      notes: l.notes,
      unplanned: l.unplanned,
      consumptionTxnIds: (l.consumptionTxnIds || []).map(String),
    })),
    createdAt: b.createdAt,
    updatedAt: b.updatedAt,
  };
}

module.exports = {
  getSettings,
  updateSettings,
  listMaterials,
  getMaterialById,
  createMaterial,
  updateMaterial,
  getMaterialLedger,
  applyStockTransaction,
  getOrderBomByOrderId,
  upsertOrderBom,
  consumeForOrder,
};
