const {
  listOrderAttachments,
  listPieceAttachments,
  createAttachment,
  getAttachmentForDownload,
  patchAttachmentMeta,
  deleteAttachment,
} = require("./attachments.service");

async function getOrderAttachments(req, res, next) {
  try {
    const { orderId } = req.params;
    const items = await listOrderAttachments({ orderId });
    return res.json({ ok: true, data: { items } });
  } catch (e) {
    return next(e);
  }
}

async function getPieceAttachments(req, res, next) {
  try {
    const { orderId, pieceUid } = req.params;
    const items = await listPieceAttachments({ orderId, pieceUid });
    return res.json({ ok: true, data: { items } });
  } catch (e) {
    return next(e);
  }
}

async function postOrderAttachment(req, res, next) {
  try {
    const { orderId } = req.params;
    const actorUserId = req.auth?.sub || null;
    const actorRole = req.auth?.role || null;

    const created = await createAttachment({
      orderId,
      entityType: "order",
      entityId: String(orderId),
      file: req.file,
      category: req.body?.category,
      tags: req.body?.tags,
      notes: req.body?.notes,
      actorUserId,
      actorRole,
    });

    return res.status(201).json({ ok: true, data: created });
  } catch (e) {
    return next(e);
  }
}

async function postPieceAttachment(req, res, next) {
  try {
    const { orderId, pieceUid } = req.params;
    const actorUserId = req.auth?.sub || null;
    const actorRole = req.auth?.role || null;

    const created = await createAttachment({
      orderId,
      entityType: "piece",
      entityId: pieceUid,
      file: req.file,
      category: req.body?.category,
      tags: req.body?.tags,
      notes: req.body?.notes,
      actorUserId,
      actorRole,
    });

    return res.status(201).json({ ok: true, data: created });
  } catch (e) {
    return next(e);
  }
}

async function downloadAttachment(req, res, next) {
  try {
    const { id } = req.params;
    const { stream, contentLength, contentType, downloadName } =
      await getAttachmentForDownload({ id });

    if (contentType) res.setHeader("Content-Type", contentType);
    if (contentLength) res.setHeader("Content-Length", String(contentLength));
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${downloadName}"`
    );

    // Stream to client
    stream.on("error", (e) => next(e));
    stream.pipe(res);
  } catch (e) {
    return next(e);
  }
}

async function patchAttachment(req, res, next) {
  try {
    const { id } = req.params;
    const actorUserId = req.auth?.sub || null;
    const actorRole = req.auth?.role || null;

    const updated = await patchAttachmentMeta({
      id,
      category: req.body?.category,
      tags: req.body?.tags,
      notes: req.body?.notes,
      actorUserId,
      actorRole,
    });

    return res.json({ ok: true, data: updated });
  } catch (e) {
    return next(e);
  }
}

async function removeAttachment(req, res, next) {
  try {
    const { id } = req.params;
    const actorUserId = req.auth?.sub || null;
    const actorRole = req.auth?.role || null;

    const out = await deleteAttachment({ id, actorUserId, actorRole });
    return res.json({ ok: true, data: out });
  } catch (e) {
    return next(e);
  }
}

module.exports = {
  getOrderAttachments,
  getPieceAttachments,
  postOrderAttachment,
  postPieceAttachment,
  downloadAttachment,
  patchAttachment,
  removeAttachment,
};
