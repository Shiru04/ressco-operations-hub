import { http } from "./httpClient";

export async function apiGetProductionBoard() {
  const { data } = await http.get("/api/production/board");
  return data.data; // { id, columns: [...] }
}

export async function apiUpdateProductionBoard(columns) {
  const { data } = await http.put("/api/production/board", { columns });
  return data.data; // { id, columns: [...] }
}
