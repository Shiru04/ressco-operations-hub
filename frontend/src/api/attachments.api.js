import { http } from "./httpClient";

function parseFilenameFromContentDisposition(cd) {
  if (!cd) return null;
  // Content-Disposition: attachment; filename="something.pdf"
  const m = /filename\*?=(?:UTF-8''|")?([^\";]+)/i.exec(cd);
  if (!m) return null;
  try {
    return decodeURIComponent(m[1].replace(/"/g, ""));
  } catch {
    return m[1].replace(/"/g, "");
  }
}

export async function apiListOrderAttachments(orderId) {
  const res = await http.get(`/api/attachments/orders/${orderId}`);
  return res.data?.data?.items || [];
}

export async function apiListPieceAttachments(orderId, pieceUid) {
  const res = await http.get(
    `/api/attachments/orders/${orderId}/pieces/${encodeURIComponent(pieceUid)}`
  );
  return res.data?.data?.items || [];
}

export async function apiUploadOrderAttachment(
  orderId,
  { file, category, tags, notes }
) {
  const fd = new FormData();
  fd.append("file", file);
  if (category) fd.append("category", category);
  if (tags) fd.append("tags", tags);
  if (notes) fd.append("notes", notes);

  const res = await http.post(`/api/attachments/orders/${orderId}`, fd, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return res.data?.data;
}

export async function apiUploadPieceAttachment(
  orderId,
  pieceUid,
  { file, category, tags, notes }
) {
  const fd = new FormData();
  fd.append("file", file);
  if (category) fd.append("category", category);
  if (tags) fd.append("tags", tags);
  if (notes) fd.append("notes", notes);

  const res = await http.post(
    `/api/attachments/orders/${orderId}/pieces/${encodeURIComponent(pieceUid)}`,
    fd,
    { headers: { "Content-Type": "multipart/form-data" } }
  );
  return res.data?.data;
}

export async function apiPatchAttachment(id, { category, tags, notes }) {
  const res = await http.patch(`/api/attachments/${id}`, {
    category,
    tags,
    notes,
  });
  return res.data?.data;
}

export async function apiDeleteAttachment(id) {
  const res = await http.delete(`/api/attachments/${id}`);
  return res.data?.data;
}

/**
 * Download with auth header (cannot use plain <a href>).
 * Returns: { blob, filename }
 */
export async function apiDownloadAttachmentBlob(id) {
  const res = await http.get(`/api/attachments/${id}/download`, {
    responseType: "blob",
  });

  const cd = res.headers?.["content-disposition"];
  const filename = parseFilenameFromContentDisposition(cd) || "download";
  return { blob: res.data, filename };
}
