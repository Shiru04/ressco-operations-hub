import { http } from "./httpClient";

export async function apiGetMyNotifications(limit = 30) {
  const { data } = await http.get("/api/notifications/me", {
    params: { limit },
  });
  return data.data; // { items, unreadCount }
}

export async function apiMarkAllRead() {
  const { data } = await http.post("/api/notifications/me/read-all");
  return data.data;
}

export async function apiMarkOneRead(id) {
  const { data } = await http.post(`/api/notifications/${id}/read`);
  return data.data;
}
