import { http } from "./httpClient";

export async function apiListUsers({ role = "", active = true } = {}) {
  const { data } = await http.get("/api/users", { params: { role, active } });
  return data.data; // { items }
}
