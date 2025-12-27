const { User } = require("./users.model");
const { hashPassword } = require("../../shared/utils/password");

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
  });

  return {
    id: user._id,
    name: user.name,
    email: user.email,
    role: user.role,
    isActive: user.isActive,
    twoFAEnabled: !!user.twoFA?.enabled,
  };
}

async function updateUser(userId, patch) {
  const update = {};

  if (patch.name !== undefined) update.name = patch.name.trim();
  if (patch.role !== undefined) update.role = patch.role;
  if (patch.isActive !== undefined) update.isActive = patch.isActive;

  const user = await User.findByIdAndUpdate(userId, update, {
    new: true,
  }).select("_id name email role isActive twoFA.enabled updatedAt");

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
    updatedAt: user.updatedAt,
  };
}

async function disableUser(userId) {
  return updateUser(userId, { isActive: false });
}

async function set2faEnforcement(userId, enabled) {
  const user = await User.findById(userId);

  if (!user) {
    const err = new Error("User not found");
    err.code = "USER_NOT_FOUND";
    err.statusCode = 404;
    throw err;
  }

  user.twoFA = user.twoFA || {};
  user.twoFA.enabled = !!enabled;

  // If we disable, remove secret to prevent accidental reuse
  if (!enabled) {
    user.twoFA.secret = null;
    user.twoFA.enforcedAt = null;
  } else {
    user.twoFA.enforcedAt = new Date();
    // secret will be set later in 2FA setup flow (next phase)
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

module.exports = {
  listUsers,
  createUser,
  updateUser,
  disableUser,
  set2faEnforcement,
};
