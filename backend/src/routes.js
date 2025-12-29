const authRoutes = require("./modules/auth/auth.routes");
const usersRoutes = require("./modules/users/users.routes");
const customersRoutes = require("./modules/customers/customers.routes");
const ordersRoutes = require("./modules/orders/orders.routes");
const takeoffRoutes = require("./modules/takeoff/takeoff.routes");
const notificationsRoutes = require("./modules/notifications/notifications.routes");
const productionRoutes = require("./modules/production/production.routes");
const auditRoutes = require("./modules/audit/audit.routes");

function registerRoutes(app) {
  app.use("/api/auth", authRoutes);
  app.use("/api/users", usersRoutes);
  app.use("/api/customers", customersRoutes);
  app.use("/api/orders", ordersRoutes);
  app.use("/api/takeoff", takeoffRoutes);
  app.use("/api/notifications", notificationsRoutes);
  app.use("/api/production", productionRoutes);
  app.use("/api/audit", auditRoutes);

  app.get("/api", (_req, res) => {
    res.json({ ok: true, message: "Ressco Operations Hub API" });
  });
}

module.exports = { registerRoutes };
