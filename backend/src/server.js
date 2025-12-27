const http = require("http");
const { createApp } = require("./app");
const { connectDB } = require("./config/db");
const { env } = require("./config/env");
const logger = require("./config/logger");
const { initSocket } = require("./realtime/socket");

async function bootstrap() {
  await connectDB();

  const app = createApp();

  // Create raw HTTP server so Socket.IO can attach cleanly
  const server = http.createServer(app);

  // Initialize Socket.IO
  initSocket(server, {
    corsOrigin: env.CLIENT_ORIGIN || true, // set this in Render for strict CORS
  });

  server.listen(env.PORT, () => {
    logger.info({ port: env.PORT, env: env.NODE_ENV }, "API server started");
  });

  // Render/Node graceful shutdown
  const shutdown = (signal) => {
    logger.warn({ signal }, "Shutting down server...");
    server.close(() => {
      logger.info("HTTP server closed.");
      process.exit(0);
    });
  };

  process.on("SIGINT", () => shutdown("SIGINT"));
  process.on("SIGTERM", () => shutdown("SIGTERM"));
}

bootstrap().catch((err) => {
  // eslint-disable-next-line no-console
  console.error("Bootstrap failed:", err);
  process.exit(1);
});
