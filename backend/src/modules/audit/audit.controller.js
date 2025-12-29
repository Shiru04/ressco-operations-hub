const { ok } = require("../../shared/http/apiResponse");
const { listAuditEvents } = require("./audit.service");

async function getAuditEvents(req, res, next) {
  try {
    const { entityType, entityId, page, limit } = req.query;
    const result = await listAuditEvents({ entityType, entityId, page, limit });
    return ok(res, result);
  } catch (err) {
    return next(err);
  }
}

module.exports = { getAuditEvents };
