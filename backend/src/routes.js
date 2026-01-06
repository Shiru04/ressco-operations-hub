const authRoutes = require("./modules/auth/auth.routes");
const usersRoutes = require("./modules/users/users.routes");
const customersRoutes = require("./modules/customers/customers.routes");
const ordersRoutes = require("./modules/orders/orders.routes");
const takeoffRoutes = require("./modules/takeoff/takeoff.routes");
const notificationsRoutes = require("./modules/notifications/notifications.routes");
const productionRoutes = require("./modules/production/production.routes");
const auditRoutes = require("./modules/audit/audit.routes");
const analyticsRoutes = require("./modules/analytics/analytics.routes");
const portalRoutes = require("./modules/portal/portal.routes");
const inventoryRoutes = require("./modules/inventory/inventory.routes");
const attachmentsRoutes = require("./modules/attachments/attachments.routes");

function registerRoutes(app) {
  app.use("/api/auth", authRoutes);
  app.use("/api/users", usersRoutes);
  app.use("/api/customers", customersRoutes);
  app.use("/api/orders", ordersRoutes);
  app.use("/api/takeoff", takeoffRoutes);
  app.use("/api/notifications", notificationsRoutes);
  app.use("/api/production", productionRoutes);
  app.use("/api/audit", auditRoutes);
  app.use("/api/analytics", analyticsRoutes);
  app.use("/api/portal", portalRoutes);
  app.use("/api/inventory", inventoryRoutes);
  app.use("/api/attachments", attachmentsRoutes);

  app.get("/api", (_req, res) => {
    res.json({ ok: true, message: "Ressco Operations Hub API" });
  });
}

module.exports = { registerRoutes };
