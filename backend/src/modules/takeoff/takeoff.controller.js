const { ok } = require("../../shared/http/apiResponse");
const { getTakeoffCatalog } = require("./takeoff.catalog");

async function getCatalog(_req, res) {
  return ok(res, getTakeoffCatalog());
}

module.exports = { getCatalog };
