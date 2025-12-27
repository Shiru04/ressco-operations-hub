import { http } from "./httpClient";

export async function apiListCustomers({ q = "", page = 1, limit = 25 } = {}) {
  const { data } = await http.get("/api/customers", {
    params: { q, page, limit },
  });
  return data.data; // { items, total, page, limit }
}

export async function apiCreateCustomer(payload) {
  const { data } = await http.post("/api/customers", payload);
  return data.data;
}

export async function apiGetCustomer(id) {
  const { data } = await http.get(`/api/customers/${id}`);
  return data.data;
}

export async function apiUpdateCustomer(id, patch) {
  const { data } = await http.patch(`/api/customers/${id}`, patch);
  return data.data;
}

export async function apiCustomerOrders(id) {
  const { data } = await http.get(`/api/customers/${id}/orders`);
  return data.data; // {items:[]}
}
