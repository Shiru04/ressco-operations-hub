const express = require("express");
const helmet = require("helmet");
const morgan = require("morgan");

const { env } = require("./config/env");
const { corsMiddleware } = require("./config/cors");
const { rateLimiter } = require("./config/rateLimit");
const { pinoHttp } = require("./config/logger");

const { notFoundHandler } = require("./middlewares/notFoundHandler");
const { errorHandler } = require("./middlewares/errorHandler");

const { registerRoutes } = require("./routes");

function createApp() {
  const app = express();

  // Security & basics
  app.disable("x-powered-by");
  app.use(helmet());

  // Logging (pino for structured, morgan optional for dev readability)
  app.use(pinoHttp);
  if (env.NODE_ENV !== "production") {
    app.use(morgan("dev"));
  }

  // Body parsing
  app.use(express.json({ limit: "2mb" }));

  // CORS + Rate limit (global)
  app.use(corsMiddleware);
  app.use(rateLimiter);

  // Health
  app.get("/health", (_req, res) => {
    res.status(200).json({
      ok: true,
      service: env.APP_NAME,
      env: env.NODE_ENV,
      timestamp: new Date().toISOString(),
    });
  });

  // API routes
  registerRoutes(app);

  // 404 + error
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}

module.exports = { createApp };
