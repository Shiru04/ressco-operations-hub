const { ok } = require("../../shared/http/apiResponse");
const {
  listNotificationsForUser,
  markAllRead,
  markOneRead,
} = require("./notifications.service");

function actorFromReq(req) {
  return { userId: req.auth?.sub || null, role: req.auth?.role || null };
}

async function getMyNotifications(req, res, next) {
  try {
    const actor = actorFromReq(req);
    const limit = req.query?.limit;
    const data = await listNotificationsForUser({
      userId: actor.userId,
      role: actor.role,
      limit,
    });
    return ok(res, data);
  } catch (err) {
    return next(err);
  }
}

async function postMarkAllRead(req, res, next) {
  try {
    const actor = actorFromReq(req);
    const data = await markAllRead({ userId: actor.userId, role: actor.role });
    return ok(res, data);
  } catch (err) {
    return next(err);
  }
}

async function postMarkOneRead(req, res, next) {
  try {
    const actor = actorFromReq(req);
    const data = await markOneRead({
      notificationId: req.params.id,
      userId: actor.userId,
    });
    return ok(res, data);
  } catch (err) {
    return next(err);
  }
}

module.exports = { getMyNotifications, postMarkAllRead, postMarkOneRead };
