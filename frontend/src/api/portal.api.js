import { http } from "./httpClient";

export async function apiPortalCustomers() {
  const { data } = await http.get("/api/portal/customers");
  return data.data;
}

export async function apiPortalOrders() {
  const { data } = await http.get("/api/portal/orders");
  return data.data;
}

/**
 * IMPORTANT:
 * PortalTakeoffRequestPage.jsx expects this named export.
 */
export async function apiPortalCreateOrderRequest(payload) {
  const { data } = await http.post("/api/portal/orders", payload);
  return data.data;
}

/**
 * Backward-compatible alias (in case other code referenced a different name).
 * Safe to keep even if unused.
 */
export const apiPortalCreateOrder = apiPortalCreateOrderRequest;

export async function apiPortalPatchOrderTakeoff(orderId, patch) {
  const { data } = await http.patch(
    `/api/portal/orders/${orderId}/takeoff`,
    patch
  );
  return data.data;
}
