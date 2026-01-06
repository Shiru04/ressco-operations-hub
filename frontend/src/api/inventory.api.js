import { http } from "./httpClient";

/**
 * Settings
 */
export async function apiGetInventorySettings() {
  const { data } = await http.get("/api/inventory/settings");
  return data.data;
}

export async function apiPatchInventorySettings(patch) {
  const { data } = await http.patch("/api/inventory/settings", patch);
  return data.data;
}

/**
 * Materials
 */
export async function apiListMaterials({
  q = "",
  lowOnly = false,
  page = 0,
  limit = 50,
} = {}) {
  const { data } = await http.get("/api/inventory/materials", {
    params: { q, lowOnly, page, limit },
  });
  return data.data; // { items, total, page, limit }
}

export async function apiCreateMaterial(payload) {
  const { data } = await http.post("/api/inventory/materials", payload);
  return data.data;
}

export async function apiGetMaterial(id) {
  const { data } = await http.get(`/api/inventory/materials/${id}`);
  return data.data;
}

export async function apiPatchMaterial(id, patch) {
  const { data } = await http.patch(`/api/inventory/materials/${id}`, patch);
  return data.data;
}

export async function apiGetMaterialLedger(id, { limit = 200 } = {}) {
  const { data } = await http.get(`/api/inventory/materials/${id}/ledger`, {
    params: { limit },
  });
  return data.data; // array
}

/**
 * Stock movements
 */
export async function apiReceiveStock(
  materialId,
  { qty, unitCost = null, notes = "" }
) {
  const { data } = await http.post(
    `/api/inventory/materials/${materialId}/receive`,
    {
      qty,
      unitCost,
      notes,
    }
  );
  return data.data; // { material, transaction }
}

export async function apiAdjustStock(materialId, { qtyDelta, notes = "" }) {
  const { data } = await http.post(
    `/api/inventory/materials/${materialId}/adjust`,
    {
      qtyDelta,
      notes,
    }
  );
  return data.data; // { material, transaction }
}

/**
 * Order BOM + consumption
 */
export async function apiGetOrderBom(orderId) {
  const { data } = await http.get(`/api/inventory/orders/${orderId}/bom`);
  return data.data; // null or BOM
}

export async function apiPatchOrderBom(orderId, patch) {
  const { data } = await http.patch(
    `/api/inventory/orders/${orderId}/bom`,
    patch
  );
  return data.data;
}

export async function apiConsumeForOrder(orderId, { items }) {
  const { data } = await http.post(`/api/inventory/orders/${orderId}/consume`, {
    items,
  });
  return data.data;
}
