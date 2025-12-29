import { http } from "./httpClient";

export async function apiListAuditEvents({
  entityType,
  entityId,
  page = 1,
  limit = 200,
} = {}) {
  const { data } = await http.get("/api/audit", {
    params: { entityType, entityId, page, limit },
  });
  return data.data; // { items, page, limit, total }
}
