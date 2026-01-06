const express = require("express");
const multer = require("multer");
const path = require("path");
const crypto = require("crypto");

const { authRequired } = require("../../middlewares/authRequired");
const { requireRoles } = require("../../middlewares/rbac");
const { require2FAForAdmin } = require("../../middlewares/require2fa");
const { ROLES } = require("../../shared/constants/roles");

const {
  getOrderAttachments,
  getPieceAttachments,
  postOrderAttachment,
  postPieceAttachment,
  downloadAttachment,
  patchAttachment,
  removeAttachment,
} = require("./attachments.controller");

const { sanitizeFilename } = require("./attachments.service");
const { ensureDir, getUploadRoot } = require("./storage/localStorage");

const router = express.Router();

// All attachment endpoints require auth (never exposed to portal/customer).
router.use(
  authRequired,
  requireRoles([ROLES.ADMIN, ROLES.SUPERVISOR, ROLES.PRODUCTION, ROLES.SALES]),
  require2FAForAdmin
);

// Multer tmp storage (always local tmp; then service uploads to R2/local)
const uploadRoot = getUploadRoot();
const tmpDir = path.join(uploadRoot, "tmp");
ensureDir(tmpDir);

const maxMb = Number(process.env.ATTACHMENTS_MAX_MB || 50);
const maxBytes = Math.min(Math.max(maxMb, 1), 250) * 1024 * 1024;

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    try {
      ensureDir(tmpDir);
      cb(null, tmpDir);
    } catch (e) {
      cb(e);
    }
  },
  filename: (_req, file, cb) => {
    try {
      const safe = sanitizeFilename(file.originalname || "file");
      const prefix = `${Date.now()}_${crypto.randomUUID()}`;
      cb(null, `${prefix}_${safe}`);
    } catch (e) {
      cb(e);
    }
  },
});

const upload = multer({
  storage,
  limits: { fileSize: maxBytes },
});

// LIST
router.get("/orders/:orderId", getOrderAttachments);
router.get("/orders/:orderId/pieces/:pieceUid", getPieceAttachments);

// UPLOAD (production allowed; sales not allowed)
router.post(
  "/orders/:orderId",
  requireRoles([ROLES.ADMIN, ROLES.SUPERVISOR, ROLES.PRODUCTION]),
  upload.single("file"),
  postOrderAttachment
);

router.post(
  "/orders/:orderId/pieces/:pieceUid",
  requireRoles([ROLES.ADMIN, ROLES.SUPERVISOR, ROLES.PRODUCTION]),
  upload.single("file"),
  postPieceAttachment
);

// DOWNLOAD
router.get("/:id/download", downloadAttachment);

// META + DELETE (supervisor/admin only)
router.patch(
  "/:id",
  requireRoles([ROLES.ADMIN, ROLES.SUPERVISOR]),
  patchAttachment
);

router.delete(
  "/:id",
  requireRoles([ROLES.ADMIN, ROLES.SUPERVISOR]),
  removeAttachment
);

// Multer errors -> clean 400 responses
router.use((err, _req, res, next) => {
  if (err && err.name === "MulterError") {
    const code = err.code || "UPLOAD_ERROR";
    if (code === "LIMIT_FILE_SIZE") {
      return res.status(400).json({
        ok: false,
        error: {
          code: "FILE_TOO_LARGE",
          message: "File exceeds maximum allowed size",
        },
      });
    }

    return res.status(400).json({
      ok: false,
      error: { code: "UPLOAD_ERROR", message: err.message || "Upload failed" },
    });
  }

  return next(err);
});

module.exports = router;
