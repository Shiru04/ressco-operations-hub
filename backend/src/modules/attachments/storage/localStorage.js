const path = require("path");
const fs = require("fs");

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function getUploadRoot() {
  const configured = process.env.UPLOAD_DIR
    ? String(process.env.UPLOAD_DIR)
    : "";
  if (configured.trim()) return configured.trim();
  return path.join(process.cwd(), "uploads");
}

function resolveStoragePath(storageKey) {
  return path.join(getUploadRoot(), storageKey);
}

async function putObject({ storageKey, sourceFilePath }) {
  const finalPath = resolveStoragePath(storageKey);
  ensureDir(path.dirname(finalPath));
  fs.renameSync(sourceFilePath, finalPath);
  return { etag: null };
}

async function getObjectStream({ storageKey }) {
  const filePath = resolveStoragePath(storageKey);
  if (!fs.existsSync(filePath)) {
    const err = new Error("File missing on server");
    err.code = "FILE_MISSING";
    err.statusCode = 404;
    throw err;
  }
  return { stream: fs.createReadStream(filePath) };
}

async function deleteObject({ storageKey }) {
  const filePath = resolveStoragePath(storageKey);
  if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
  return { ok: true };
}

module.exports = {
  ensureDir,
  getUploadRoot,
  resolveStoragePath,
  putObject,
  getObjectStream,
  deleteObject,
};
