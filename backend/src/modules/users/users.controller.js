const { get } = require("mongoose");
const { ok } = require("../../shared/http/apiResponse");
const {
  createUserSchema,
  updateUserSchema,
  enforce2faSchema,
  productionQueuesSchema,
  resetPasswordSchema,
  updateSelfSchema,
} = require("./users.dto");
const {
  listUsers,
  createUser,
  updateUser,
  disableUser,
  set2faEnforcement,
  setUserProductionQueues,
  resetUserPassword,
  updateSelf,
  getUserById,
} = require("./users.service");

async function getUsers(req, res, next) {
  try {
    res.set("Cache-Control", "no-store, max-age=0");
    res.set("Pragma", "no-cache");

    const role = req.query?.role ? String(req.query.role) : undefined;

    const activeRaw = req.query?.active;
    const active =
      activeRaw === undefined
        ? undefined
        : String(activeRaw).toLowerCase() === "true";

    const users = await listUsers({ role, active });
    return ok(res, { items: users });
  } catch (err) {
    return next(err);
  }
}

async function postUser(req, res, next) {
  try {
    const body = createUserSchema.parse(req.body);
    const user = await createUser(body);
    return ok(res, user, 201);
  } catch (err) {
    if (err && err.code === 11000) {
      err.statusCode = 409;
      err.code = "EMAIL_IN_USE";
      err.message = "Email is already in use";
    }
    return next(err);
  }
}

async function patchUser(req, res, next) {
  try {
    const patch = updateUserSchema.parse(req.body);
    const user = await updateUser(req.params.id, patch);
    return ok(res, user);
  } catch (err) {
    return next(err);
  }
}

async function patchDisableUser(req, res, next) {
  try {
    const user = await disableUser(req.params.id);
    return ok(res, user);
  } catch (err) {
    return next(err);
  }
}

async function patchEnforce2fa(req, res, next) {
  try {
    const body = enforce2faSchema.parse(req.body);
    const result = await set2faEnforcement(req.params.id, body.enabled);
    return ok(res, result);
  } catch (err) {
    return next(err);
  }
}

async function patchUserProductionQueues(req, res, next) {
  try {
    const userId = req.params.id;
    const body = productionQueuesSchema.parse(req.body);
    const result = await setUserProductionQueues(userId, body.productionQueues);
    return ok(res, result);
  } catch (err) {
    return next(err);
  }
}

// NEW
async function patchUserPassword(req, res, next) {
  try {
    const body = resetPasswordSchema.parse(req.body);
    const result = await resetUserPassword(req.params.id, body.password);
    return ok(res, result);
  } catch (err) {
    return next(err);
  }
}
async function getMe(req, res, next) {
  try {
    const userId = req.auth.sub;
    const user = await getUserById(userId);
    return ok(res, user);
  } catch (err) {
    return next(err);
  }
}

async function updateMe(req, res, next) {
  try {
    const dto = updateSelfSchema.parse(req.body);
    const user = await updateSelf(req.auth.sub, dto);
    return ok(res, user);
  } catch (err) {
    return next(err);
  }
}

async function changeMyPassword(req, res, next) {
  try {
    await resetUserPassword(
      req.auth.sub,
      req.body.newPassword
    );
    return res.status(204).end();
  } catch (err) {
    return next(err);
  }
}


module.exports = {
  getUsers,
  postUser,
  patchUser,
  patchDisableUser,
  patchEnforce2fa,
  patchUserProductionQueues,
  patchUserPassword,
  getMe,
  updateMe,
  changeMyPassword,
};
