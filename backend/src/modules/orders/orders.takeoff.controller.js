const { ok } = require("../../shared/http/apiResponse");
const { patchTakeoffSchema } = require("./orders.takeoff.dto");
const { patchOrderTakeoff } = require("./orders.takeoff.service");

function actorFromReq(req) {
  return { userId: req.auth?.sub || null, role: req.auth?.role || null };
}

async function patchTakeoff(req, res, next) {
  try {
    const patch = patchTakeoffSchema.parse(req.body || {});
    const result = await patchOrderTakeoff(
      req.params.id,
      patch,
      actorFromReq(req),
      req
    );
    return ok(res, result);
  } catch (err) {
    return next(err);
  }
}

module.exports = { patchTakeoff };
