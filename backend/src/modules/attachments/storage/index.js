const local = require("./localStorage");
const r2 = require("./r2Storage");

function getProvider() {
  const p = String(process.env.ATTACHMENTS_STORAGE_PROVIDER || "local")
    .trim()
    .toLowerCase();
  if (p === "r2") return "r2";
  return "local";
}

function getAdapter() {
  const provider = getProvider();
  if (provider === "r2") {
    return {
      provider: "r2",
      putObject: r2.putObject,
      getObjectStream: r2.getObjectStream,
      deleteObject: r2.deleteObject,
      bucket: r2.getBucket(),
    };
  }

  return {
    provider: "local",
    putObject: local.putObject,
    getObjectStream: local.getObjectStream,
    deleteObject: local.deleteObject,
    bucket: null,
  };
}

module.exports = {
  getProvider,
  getAdapter,
};
