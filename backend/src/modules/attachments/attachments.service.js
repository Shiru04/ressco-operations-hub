const path = require("path");
const fs = require("fs");
const crypto = require("crypto");

const mongoose = require("mongoose");
const { Attachment } = require("./attachments.model");
const { Order } = require("../orders/orders.model");

const { getAdapter } = require("./storage");

function safeString(v) {
  return v === undefined || v === null ? "" : String(v);
}

function isValidObjectId(id) {
  try {
    return mongoose.Types.ObjectId.isValid(String(id));
  } catch {
    return false;
  }
}

function sanitizeFilename(name) {
  const raw = safeString(name) || "file";
  const base = raw
    .replace(/\\/g, "_")
    .replace(/\//g, "_")
    .replace(/\s+/g, " ")
    .trim();

  const cleaned = base.replace(/[^a-zA-Z0-9 ._-]/g, "_");
  return cleaned.length > 120 ? cleaned.slice(0, 120) : cleaned;
}

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function buildStorageKey({ orderId, filename }) {
  return path.posix.join("orders", String(orderId), filename);
}

async function computeSha256(filePath) {
  return new Promise((resolve, reject) => {
    const hash = crypto.createHash("sha256");
    const stream = fs.createReadStream(filePath);
    stream.on("error", reject);
    stream.on("data", (chunk) => hash.update(chunk));
    stream.on("end", () => resolve(hash.digest("hex")));
  });
}

async function assertOrderExists(orderId) {
  if (!isValidObjectId(orderId)) {
    const err = new Error("Invalid orderId");
    err.code = "INVALID_ID";
    err.statusCode = 400;
    throw err;
  }

  const exists = await Order.exists({ _id: orderId });
  if (!exists) {
    const err = new Error("Order not found");
    err.code = "NOT_FOUND";
    err.statusCode = 404;
    throw err;
  }
}

async function assertPieceUidOnOrder(orderId, pieceUid) {
  await assertOrderExists(orderId);

  const puid = safeString(pieceUid).trim();
  if (!puid) {
    const err = new Error("Invalid pieceUid");
    err.code = "INVALID_ID";
    err.statusCode = 400;
    throw err;
  }

  const order = await Order.findById(orderId)
    .select({ "takeoff.items.pieceUid": 1 })
    .lean();

  const items = order?.takeoff?.items || [];
  const found =
    Array.isArray(items) && items.some((it) => it?.pieceUid === puid);
  if (!found) {
    const err = new Error("Piece not found on this order");
    err.code = "NOT_FOUND";
    err.statusCode = 404;
    throw err;
  }
}

function normalizeTags(tags) {
  if (!tags) return [];
  const arr = Array.isArray(tags) ? tags : String(tags).split(",");
  return arr
    .map((t) => safeString(t).trim())
    .filter(Boolean)
    .slice(0, 25);
}

function toPublic(doc) {
  return {
    id: String(doc._id),
    orderId: String(doc.orderId),
    entityType: doc.entityType,
    entityId: doc.entityId,
    originalName: doc.originalName,
    mimeType: doc.mimeType,
    sizeBytes: doc.sizeBytes,
    sha256: doc.sha256 || null,
    category: doc.category || "",
    tags: doc.tags || [],
    notes: doc.notes || "",
    uploadedByUserId: doc.uploadedByUserId
      ? String(doc.uploadedByUserId)
      : null,
    uploadedByRole: doc.uploadedByRole || null,
    storageProvider: doc.storageProvider || "local",
    bucket: doc.bucket || null,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}

async function listOrderAttachments({ orderId }) {
  await assertOrderExists(orderId);
  const items = await Attachment.find({
    orderId,
    entityType: "order",
    deletedAt: null,
  })
    .sort({ createdAt: -1, _id: -1 })
    .lean();

  return (items || []).map(toPublic);
}

async function listPieceAttachments({ orderId, pieceUid }) {
  await assertPieceUidOnOrder(orderId, pieceUid);
  const items = await Attachment.find({
    orderId,
    entityType: "piece",
    entityId: String(pieceUid),
    deletedAt: null,
  })
    .sort({ createdAt: -1, _id: -1 })
    .lean();

  return (items || []).map(toPublic);
}

async function createAttachment({
  orderId,
  entityType,
  entityId,
  file,
  category,
  tags,
  notes,
  actorUserId,
  actorRole,
}) {
  if (!file) {
    const err = new Error("File is required");
    err.code = "VALIDATION_ERROR";
    err.statusCode = 400;
    throw err;
  }

  await assertOrderExists(orderId);

  const et = safeString(entityType).trim();
  if (et !== "order" && et !== "piece") {
    const err = new Error("Invalid entityType");
    err.code = "VALIDATION_ERROR";
    err.statusCode = 400;
    throw err;
  }

  const eid = safeString(entityId).trim();
  if (!eid) {
    const err = new Error("Invalid entityId");
    err.code = "VALIDATION_ERROR";
    err.statusCode = 400;
    throw err;
  }

  if (et === "piece") {
    await assertPieceUidOnOrder(orderId, eid);
  }

  // Multer disk storage produced a tmp file path
  const tmpPath = file.path;
  if (!tmpPath || !fs.existsSync(tmpPath)) {
    const err = new Error("Temporary upload file missing");
    err.code = "UPLOAD_ERROR";
    err.statusCode = 400;
    throw err;
  }

  const originalName = sanitizeFilename(file.originalname || "file");
  const ext = path.extname(originalName);
  const baseNoExt = ext ? originalName.slice(0, -ext.length) : originalName;
  const unique = crypto.randomUUID();
  const finalName = `${unique}_${baseNoExt}${ext}`;

  const storageKey = buildStorageKey({ orderId, filename: finalName });

  // Hash is computed from tmp file (works for both local and r2)
  const sha256 = await computeSha256(tmpPath);

  const adapter = getAdapter();

  // Upload to configured provider
  let putOut;
  try {
    putOut = await adapter.putObject({
      storageKey,
      sourceFilePath: tmpPath,
      contentType: safeString(file.mimetype) || "application/octet-stream",
    });
  } finally {
    // Ensure tmp is removed if provider didn't move it (R2 uploads stream; local provider renames)
    // local provider already renamed; this is safe
    try {
      if (fs.existsSync(tmpPath)) fs.unlinkSync(tmpPath);
    } catch {
      // no-op
    }
  }

  const doc = await Attachment.create({
    orderId,
    entityType: et,
    entityId: eid,
    originalName,
    storageKey,

    storageProvider: adapter.provider,
    bucket: adapter.bucket || putOut?.bucket || null,
    etag: putOut?.etag || null,

    mimeType: safeString(file.mimetype) || "application/octet-stream",
    sizeBytes: Number(file.size) || 0,
    sha256,
    category: safeString(category).trim(),
    tags: normalizeTags(tags),
    notes: safeString(notes).trim(),
    uploadedByUserId: actorUserId || null,
    uploadedByRole: actorRole || null,
  });

  // Audit is intentionally non-blocking; keep it isolated (no extra dependencies)
  try {
    const { AuditEvent } = require("../audit/audit.model");
    await AuditEvent.create({
      entityType: "order",
      entityId: String(orderId),
      action: "attachment_upload",
      changes: {
        attachmentId: String(doc._id),
        entityType: et,
        entityId: eid,
        originalName,
        mimeType: doc.mimeType,
        sizeBytes: doc.sizeBytes,
        category: doc.category || "",
        tags: doc.tags || [],
        storageProvider: doc.storageProvider,
      },
      actorUserId: actorUserId || null,
      actorRole: actorRole || null,
      at: new Date(),
    });
  } catch {
    // audit should never break upload
  }

  return toPublic(doc);
}

async function getAttachmentMeta({ id }) {
  const attachmentId = safeString(id).trim();
  if (!attachmentId || !isValidObjectId(attachmentId)) {
    const err = new Error("Invalid attachment id");
    err.code = "INVALID_ID";
    err.statusCode = 400;
    throw err;
  }

  const doc = await Attachment.findOne({
    _id: attachmentId,
    deletedAt: null,
  }).lean();
  if (!doc) {
    const err = new Error("Attachment not found");
    err.code = "NOT_FOUND";
    err.statusCode = 404;
    throw err;
  }

  return doc;
}

async function getAttachmentForDownload({ id }) {
  const doc = await getAttachmentMeta({ id });

  // IMPORTANT: We use the CURRENT adapter to fetch content.
  // This means:
  // - If records were stored as local but you switch env to R2 only, local files won't be found.
  // - That is acceptable for now; if you need mixed-mode support, we can select adapter by doc.storageProvider.
  // To keep this surgical and predictable, we stream using the active provider.
  const adapter = getAdapter();

  const out = await adapter.getObjectStream({ storageKey: doc.storageKey });

  return {
    meta: toPublic(doc),
    stream: out.stream,
    contentLength: out.contentLength ?? null,
    contentType: out.contentType ?? doc.mimeType ?? "application/octet-stream",
    downloadName: doc.originalName,
  };
}

async function patchAttachmentMeta({
  id,
  category,
  tags,
  notes,
  actorUserId,
  actorRole,
}) {
  const attachmentId = safeString(id).trim();
  if (!attachmentId || !isValidObjectId(attachmentId)) {
    const err = new Error("Invalid attachment id");
    err.code = "INVALID_ID";
    err.statusCode = 400;
    throw err;
  }

  const doc = await Attachment.findOne({ _id: attachmentId, deletedAt: null });
  if (!doc) {
    const err = new Error("Attachment not found");
    err.code = "NOT_FOUND";
    err.statusCode = 404;
    throw err;
  }

  if (category !== undefined) doc.category = safeString(category).trim();
  if (tags !== undefined) doc.tags = normalizeTags(tags);
  if (notes !== undefined) doc.notes = safeString(notes).trim();

  await doc.save();

  try {
    const { AuditEvent } = require("../audit/audit.model");
    await AuditEvent.create({
      entityType: "order",
      entityId: String(doc.orderId),
      action: "attachment_update_meta",
      changes: {
        attachmentId: String(doc._id),
        category: doc.category || "",
        tags: doc.tags || [],
      },
      actorUserId: actorUserId || null,
      actorRole: actorRole || null,
      at: new Date(),
    });
  } catch {
    // no-op
  }

  return toPublic(doc.toObject());
}

async function deleteAttachment({ id, actorUserId, actorRole }) {
  const attachmentId = safeString(id).trim();
  if (!attachmentId || !isValidObjectId(attachmentId)) {
    const err = new Error("Invalid attachment id");
    err.code = "INVALID_ID";
    err.statusCode = 400;
    throw err;
  }

  const doc = await Attachment.findOne({ _id: attachmentId, deletedAt: null });
  if (!doc) {
    const err = new Error("Attachment not found");
    err.code = "NOT_FOUND";
    err.statusCode = 404;
    throw err;
  }

  doc.deletedAt = new Date();
  doc.deletedByUserId = actorUserId || null;
  await doc.save();

  try {
    const { AuditEvent } = require("../audit/audit.model");
    await AuditEvent.create({
      entityType: "order",
      entityId: String(doc.orderId),
      action: "attachment_delete",
      changes: {
        attachmentId: String(doc._id),
        entityType: doc.entityType,
        entityId: doc.entityId,
        originalName: doc.originalName,
      },
      actorUserId: actorUserId || null,
      actorRole: actorRole || null,
      at: new Date(),
    });
  } catch {
    // no-op
  }

  return { ok: true };
}

module.exports = {
  sanitizeFilename,
  ensureDir,
  buildStorageKey,
  listOrderAttachments,
  listPieceAttachments,
  createAttachment,
  getAttachmentForDownload,
  patchAttachmentMeta,
  deleteAttachment,
};
