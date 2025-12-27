import { http } from "./httpClient";

export async function apiGetProductionBoard() {
  const { data } = await http.get("/api/production/board");
  return data.data; // { columns: [...] }
}
