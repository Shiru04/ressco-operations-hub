import { http } from "./httpClient";

export async function apiListOrders({
  q = "",
  status = "",
  customerId = "",
  page = 1,
  limit = 25,
} = {}) {
  const { data } = await http.get("/api/orders", {
    params: { q, status, customerId, page, limit },
  });
  return data.data; // {items,page,limit,total}
}

export async function apiGetOrder(id) {
  const { data } = await http.get(`/api/orders/${id}`);
  return data.data;
}

export async function apiCreateOrder(payload) {
  const { data } = await http.post("/api/orders", payload);
  return data.data;
}

export async function apiApproveOrder(id) {
  const { data } = await http.post(`/api/orders/${id}/approve`);
  return data.data;
}

export async function apiPatchOrderStatus(id, payload) {
  const { data } = await http.patch(`/api/orders/${id}/status`, payload);
  return data.data;
}

// Phase 4A endpoint
export async function apiPatchOrderTakeoff(id, payload) {
  const { data } = await http.patch(`/api/orders/${id}/takeoff`, payload);
  return data.data;
}
export async function apiGetTakeoffPdfBlob(orderId) {
  const res = await http.get(`/api/orders/${orderId}/pdf/takeoff`, {
    responseType: "blob",
  });
  return res.data; // Blob
}
//unappproved order
export async function apiUnapproveOrder(id) {
  const { data } = await http.post(`/api/orders/${id}/unapprove`);
  return data.data;
}

export async function apiPatchTakeoffItemStatus(orderId, itemId, pieceStatus) {
  const { data } = await http.patch(
    `/api/orders/${orderId}/takeoff/items/${itemId}/status`,
    { pieceStatus }
  );
  return data.data;
}

export async function apiAssignPiece(orderId, itemId, { queueKey, userId }) {
  const { data } = await http.patch(
    `/api/orders/${orderId}/takeoff/items/${itemId}/assign`,
    { queueKey, userId }
  );
  return data.data;
}

export async function apiPieceTimerStart(orderId, itemId) {
  const { data } = await http.post(
    `/api/orders/${orderId}/takeoff/items/${itemId}/timer/start`
  );
  return data.data;
}
export async function apiPieceTimerPause(orderId, itemId) {
  const { data } = await http.post(
    `/api/orders/${orderId}/takeoff/items/${itemId}/timer/pause`
  );
  return data.data;
}
export async function apiPieceTimerResume(orderId, itemId) {
  const { data } = await http.post(
    `/api/orders/${orderId}/takeoff/items/${itemId}/timer/resume`
  );
  return data.data;
}
export async function apiPieceTimerStop(orderId, itemId, notes = "") {
  const { data } = await http.post(
    `/api/orders/${orderId}/takeoff/items/${itemId}/timer/stop`,
    { notes }
  );
  return data.data;
}
