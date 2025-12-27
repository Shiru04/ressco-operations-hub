const { ok } = require("../../shared/http/apiResponse");
const { loginSchema, verify2faSchema } = require("./auth.dto");
const { loginWithPassword, verify2FA, getMe } = require("./auth.service");
const {
  setup2faStartSchema,
  setup2faConfirmSchema,
  adminReset2faSchema,
} = require("./auth.dto");
const {
  start2FASetupForAdmin,
  confirm2FASetupForAdmin,
  adminReset2FA,
} = require("./auth.service");

async function login(req, res, next) {
  try {
    const body = loginSchema.parse(req.body);
    const result = await loginWithPassword(body);
    return ok(res, result);
  } catch (err) {
    return next(err);
  }
}

async function verify2fa(req, res, next) {
  try {
    const body = verify2faSchema.parse(req.body);
    const result = await verify2FA(body);
    return ok(res, result);
  } catch (err) {
    return next(err);
  }
}

async function me(req, res, next) {
  try {
    const userId = req.auth?.sub;
    const user = await getMe(userId);

    if (!user) {
      return res.status(401).json({
        ok: false,
        error: { code: "UNAUTHORIZED", message: "Session invalid" },
      });
    }

    return ok(res, user);
  } catch (err) {
    return next(err);
  }
}

async function start2faSetup(req, res, next) {
  try {
    const body = setup2faStartSchema.parse(req.body || {});
    const userId = req.auth?.sub;
    const result = await start2FASetupForAdmin(userId, body.label);
    return ok(res, result);
  } catch (err) {
    return next(err);
  }
}

async function confirm2faSetup(req, res, next) {
  try {
    const body = setup2faConfirmSchema.parse(req.body);
    const result = await confirm2FASetupForAdmin(body);
    return ok(res, result);
  } catch (err) {
    return next(err);
  }
}

async function reset2faAsAdmin(req, res, next) {
  try {
    const body = adminReset2faSchema.parse(req.body);
    const adminUserId = req.auth?.sub;
    const result = await adminReset2FA({
      adminUserId,
      targetUserId: body.userId,
    });
    return ok(res, result);
  } catch (err) {
    return next(err);
  }
}

module.exports = {
  login,
  verify2fa,
  me,
  start2faSetup,
  confirm2faSetup,
  reset2faAsAdmin,
};
