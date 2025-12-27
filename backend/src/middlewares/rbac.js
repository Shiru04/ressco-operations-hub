function requireRoles(allowedRoles = []) {
  return function (req, res, next) {
    const role = req.auth?.role;
    if (!role) {
      return res.status(401).json({
        ok: false,
        error: { code: "UNAUTHORIZED", message: "Missing auth context" },
      });
    }

    if (!allowedRoles.includes(role)) {
      return res.status(403).json({
        ok: false,
        error: { code: "FORBIDDEN", message: "Insufficient permissions" },
      });
    }

    return next();
  };
}

module.exports = { requireRoles };
