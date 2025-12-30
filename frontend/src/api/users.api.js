import { http } from "./httpClient";

export async function apiListUsers({ role = "", active } = {}) {
  const params = {};
  if (role) params.role = role;
  if (active !== undefined) params.active = active;
  const { data } = await http.get("/api/users", { params });
  return data.data; // { items }
}

export async function apiCreateUser(payload) {
  const { data } = await http.post("/api/users", payload);
  return data.data;
}

export async function apiPatchUser(id, patch) {
  const { data } = await http.patch(`/api/users/${id}`, patch);
  return data.data;
}

export async function apiDisableUser(id) {
  const { data } = await http.patch(`/api/users/${id}/disable`);
  return data.data;
}

export async function apiEnforceUser2FA(id, enabled) {
  const { data } = await http.patch(`/api/users/${id}/2fa/enforce`, {
    enabled,
  });
  return data.data;
}

export async function apiPatchUserProductionQueues(id, productionQueues) {
  const { data } = await http.patch(`/api/users/${id}/production-queues`, {
    productionQueues,
  });
  return data.data; // { id, productionQueues }
}
