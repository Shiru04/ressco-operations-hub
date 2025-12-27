import { http } from "./httpClient";

export async function apiGetTakeoffCatalog() {
  const { data } = await http.get("/api/takeoff/catalog");
  return data.data; // { version, fields, types[] }
}
