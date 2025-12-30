import { http } from "./httpClient";

export async function apiAnalyticsProductionOverview(params) {
  const { data } = await http.get("/api/analytics/production/overview", {
    params,
  });
  return data.data;
}

export async function apiAnalyticsProductionQueues(params) {
  const { data } = await http.get("/api/analytics/production/queues", {
    params,
  });
  return data.data;
}

export async function apiAnalyticsProductionUsers(params) {
  const { data } = await http.get("/api/analytics/production/users", {
    params,
  });
  return data.data;
}

export async function apiAnalyticsOrders(params) {
  const { data } = await http.get("/api/analytics/orders", { params });
  return data.data;
}

export async function apiOrderCosting(orderId) {
  const { data } = await http.get(`/api/orders/${orderId}/costing`);
  return data.data;
}
