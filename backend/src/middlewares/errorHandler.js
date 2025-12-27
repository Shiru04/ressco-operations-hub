const logger = require("../config/logger");

// Detect Zod errors without requiring direct import in every layer
function isZodError(err) {
  return err && (err.name === "ZodError" || Array.isArray(err.issues));
}

function errorHandler(err, req, res, _next) {
  // Zod validation -> 400
  if (isZodError(err)) {
    return res.status(400).json({
      ok: false,
      error: {
        code: "VALIDATION_ERROR",
        message: "Invalid request payload",
        details: err.issues || null,
      },
    });
  }

  const status = err.statusCode || 500;

  // Log 500s as errors, others as warnings
  const logFn =
    status >= 500 ? logger.error.bind(logger) : logger.warn.bind(logger);
  logFn(
    {
      err: { message: err.message, stack: err.stack, code: err.code },
      path: req.originalUrl,
      method: req.method,
    },
    "Request error"
  );

  return res.status(status).json({
    ok: false,
    error: {
      code: err.code || (status === 500 ? "INTERNAL_ERROR" : "REQUEST_ERROR"),
      message:
        status === 500
          ? "Internal server error"
          : err.message || "Request failed",
      details: err.details || null,
    },
  });
}

module.exports = { errorHandler };
