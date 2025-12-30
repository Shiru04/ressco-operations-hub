const mongoose = require("mongoose");
const { User } = require("./users.model");
const { hashPassword } = require("../../shared/utils/password");

function assertValidObjectId(id) {
  if (!mongoose.isValidObjectId(id)) {
    const err = new Error("Invalid id");
    err.code = "INVALID_ID";
    err.statusCode = 400;
    throw err;
  }
}

function normalizeQueues(queues) {
  const arr = Array.isArray(queues) ? queues : [];

  const normalized = arr.map((q, idx) => ({
    key: String(q.key || "").trim(),
    order: Number.isFinite(q.order) ? Number(q.order) : idx + 1,
    isActive: q.isActive === undefined ? true : !!q.isActive,
  }));

  // validate required
  for (const q of normalized) {
    if (!q.key) {
      const err = new Error("Queue key is required");
      err.code = "VALIDATION_ERROR";
      err.statusCode = 400;
      throw err;
    }
  }

  // unique keys
  const keys = normalized.map((q) => q.key);
  const uniq = new Set(keys);
  if (uniq.size !== keys.length) {
    const err = new Error("Duplicate queue keys are not allowed");
    err.code = "DUPLICATE_QUEUE_KEYS";
    err.statusCode = 400;
    throw err;
  }

  // stable order
  normalized.sort((a, b) => (a.order || 0) - (b.order || 0));

  return normalized;
}

async function listUsers({ role, active } = {}) {
  const filter = {};

  if (role) filter.role = String(role);
  if (active !== undefined) filter.isActive = !!active;

  const users = await User.find(filter)
    .select(
      "_id name email role isActive twoFA.enabled createdAt updatedAt productionQueues lastAutoAssignedAt"
    )
    .sort({ createdAt: -1 });

  return users.map((u) => ({
    id: u._id,
    name: u.name,
    email: u.email,
    role: u.role,
    isActive: u.isActive,
    twoFAEnabled: !!u.twoFA?.enabled,
    productionQueues: u.productionQueues || [],
    lastAutoAssignedAt: u.lastAutoAssignedAt || null,
    createdAt: u.createdAt,
    updatedAt: u.updatedAt,
  }));
}

async function createUser({ name, email, role, password }) {
  const passwordHash = await hashPassword(password);

  const user = await User.create({
    name: name.trim(),
    email: email.toLowerCase().trim(),
    role,
    passwordHash,
    isActive: true,
    twoFA: { enabled: false, secret: null, enforcedAt: null },
    productionQueues: [],
    lastAutoAssignedAt: null,
  });

  return {
    id: user._id,
    name: user.name,
    email: user.email,
    role: user.role,
    isActive: user.isActive,
    twoFAEnabled: !!user.twoFA?.enabled,
    productionQueues: user.productionQueues || [],
  };
}

async function updateUser(userId, patch) {
  assertValidObjectId(userId);

  const update = {};

  if (patch.name !== undefined) update.name = patch.name.trim();
  if (patch.role !== undefined) update.role = patch.role;
  if (patch.isActive !== undefined) update.isActive = patch.isActive;

  const user = await User.findByIdAndUpdate(userId, update, {
    new: true,
  }).select(
    "_id name email role isActive twoFA.enabled updatedAt productionQueues"
  );

  if (!user) {
    const err = new Error("User not found");
    err.code = "USER_NOT_FOUND";
    err.statusCode = 404;
    throw err;
  }

  return {
    id: user._id,
    name: user.name,
    email: user.email,
    role: user.role,
    isActive: user.isActive,
    twoFAEnabled: !!user.twoFA?.enabled,
    productionQueues: user.productionQueues || [],
    updatedAt: user.updatedAt,
  };
}

async function disableUser(userId) {
  return updateUser(userId, { isActive: false });
}

async function set2faEnforcement(userId, enabled) {
  assertValidObjectId(userId);

  const user = await User.findById(userId);

  if (!user) {
    const err = new Error("User not found");
    err.code = "USER_NOT_FOUND";
    err.statusCode = 404;
    throw err;
  }

  user.twoFA = user.twoFA || {};
  user.twoFA.enabled = !!enabled;

  if (!enabled) {
    user.twoFA.secret = null;
    user.twoFA.pendingSecret = null;
    user.twoFA.enforcedAt = null;
  } else {
    user.twoFA.enforcedAt = new Date();
  }

  await user.save();

  return {
    id: user._id,
    email: user.email,
    role: user.role,
    twoFAEnabled: !!user.twoFA.enabled,
    enforcedAt: user.twoFA.enforcedAt,
  };
}

async function setUserProductionQueues(userId, productionQueues) {
  assertValidObjectId(userId);

  const normalized = normalizeQueues(productionQueues);

  const user = await User.findByIdAndUpdate(
    userId,
    {
      $set: {
        productionQueues: normalized,
        // We are moving away from auto-assignment; clearing this avoids confusing stale data
        lastAutoAssignedAt: null,
      },
    },
    { new: true }
  ).select("_id productionQueues");

  if (!user) {
    const err = new Error("User not found");
    err.code = "USER_NOT_FOUND";
    err.statusCode = 404;
    throw err;
  }

  return {
    id: user._id,
    productionQueues: user.productionQueues || [],
  };
}

module.exports = {
  listUsers,
  createUser,
  updateUser,
  disableUser,
  set2faEnforcement,
  setUserProductionQueues,
};
