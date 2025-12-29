const { ok } = require("../../shared/http/apiResponse");
const {
  assignPiece,
  timerStart,
  timerPause,
  timerResume,
  timerStop,
} = require("./order.pieceProduction.service");

function actor(req) {
  const a = req.auth || {};
  return {
    userId: a.sub || a.userId || a.id || null,
    role: a.role || null,
  };
}

async function patchAssignPiece(req, res, next) {
  try {
    const data = await assignPiece({
      orderId: req.params.id,
      itemId: req.params.itemId,
      actor: actor(req),
      queueKey: req.body?.queueKey,
      userId: req.body?.userId, // "auto" | userId | null
    });
    return ok(res, data);
  } catch (e) {
    return next(e);
  }
}

async function postTimerStart(req, res, next) {
  try {
    const data = await timerStart({
      orderId: req.params.id,
      itemId: req.params.itemId,
      actor: actor(req),
    });
    return ok(res, data);
  } catch (e) {
    return next(e);
  }
}

async function postTimerPause(req, res, next) {
  try {
    const data = await timerPause({
      orderId: req.params.id,
      itemId: req.params.itemId,
      actor: actor(req),
    });
    return ok(res, data);
  } catch (e) {
    return next(e);
  }
}

async function postTimerResume(req, res, next) {
  try {
    const data = await timerResume({
      orderId: req.params.id,
      itemId: req.params.itemId,
      actor: actor(req),
    });
    return ok(res, data);
  } catch (e) {
    return next(e);
  }
}

async function postTimerStop(req, res, next) {
  try {
    const data = await timerStop({
      orderId: req.params.id,
      itemId: req.params.itemId,
      actor: actor(req),
      notes: req.body?.notes || "",
    });
    return ok(res, data);
  } catch (e) {
    return next(e);
  }
}

module.exports = {
  patchAssignPiece,
  postTimerStart,
  postTimerPause,
  postTimerResume,
  postTimerStop,
};
