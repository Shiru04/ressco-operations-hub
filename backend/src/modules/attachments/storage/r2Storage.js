const {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} = require("@aws-sdk/client-s3");

function requiredEnv(name) {
  const v = process.env[name];
  if (!v || !String(v).trim()) {
    const err = new Error(`Missing required env var: ${name}`);
    err.code = "STORAGE_NOT_CONFIGURED";
    err.statusCode = 500;
    throw err;
  }
  return String(v).trim();
}

function buildClient() {
  const accessKeyId = requiredEnv("S3_ACCESS_KEY_ID");
  const secretAccessKey = requiredEnv("S3_SECRET_ACCESS_KEY");
  const region =
    (process.env.S3_REGION && String(process.env.S3_REGION).trim()) || "auto";
  const endpoint = requiredEnv("S3_ENDPOINT");

  // Cloudflare R2 requires path style in most cases
  const forcePathStyle =
    String(process.env.S3_FORCE_PATH_STYLE || "true").toLowerCase() === "true";

  return new S3Client({
    region,
    endpoint,
    forcePathStyle,
    credentials: { accessKeyId, secretAccessKey },
  });
}

function getBucket() {
  return requiredEnv("S3_BUCKET");
}

async function putObject({ storageKey, sourceFilePath, contentType }) {
  const client = buildClient();
  const Bucket = getBucket();

  const fs = require("fs");
  const Body = fs.createReadStream(sourceFilePath);

  const cmd = new PutObjectCommand({
    Bucket,
    Key: storageKey,
    Body,
    ContentType: contentType || "application/octet-stream",
  });

  const out = await client.send(cmd);
  // ETag is often quoted, normalize
  const etag = out?.ETag ? String(out.ETag).replace(/"/g, "") : null;
  return { bucket: Bucket, etag };
}

async function getObjectStream({ storageKey }) {
  const client = buildClient();
  const Bucket = getBucket();

  const cmd = new GetObjectCommand({
    Bucket,
    Key: storageKey,
  });

  try {
    const out = await client.send(cmd);
    // out.Body is a stream
    return {
      stream: out.Body,
      contentLength: out.ContentLength ?? null,
      contentType: out.ContentType ?? null,
      etag: out.ETag ? String(out.ETag).replace(/"/g, "") : null,
      bucket: Bucket,
    };
  } catch (e) {
    // Normalize common S3 errors
    const name = e?.name || "";
    const code = e?.$metadata?.httpStatusCode;

    if (name === "NoSuchKey" || code === 404) {
      const err = new Error("File missing in object storage");
      err.code = "FILE_MISSING";
      err.statusCode = 404;
      throw err;
    }

    throw e;
  }
}

async function deleteObject({ storageKey }) {
  const client = buildClient();
  const Bucket = getBucket();
  const cmd = new DeleteObjectCommand({ Bucket, Key: storageKey });
  await client.send(cmd);
  return { ok: true };
}

module.exports = {
  putObject,
  getObjectStream,
  deleteObject,
  getBucket,
};
