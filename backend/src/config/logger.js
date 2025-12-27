const pino = require("pino");
const pinoHttpLib = require("pino-http");

const logger = pino({
  level: process.env.NODE_ENV === "production" ? "info" : "debug",
  redact: ["req.headers.authorization"],
});

const pinoHttp = pinoHttpLib({
  logger,
  customSuccessMessage: function (req, res) {
    return `${req.method} ${req.url} ${res.statusCode}`;
  },
});

module.exports = logger;
module.exports.pinoHttp = pinoHttp;
