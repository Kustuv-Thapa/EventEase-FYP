module.exports = (err, req, res, next) => {
  // If headers already sent (e.g. res.json() called inside withTransaction), do nothing
  if (res.headersSent) return;

  // ── Mongoose ValidationError → 400 ──
  if (err.name === "ValidationError") {
    const messages = Object.values(err.errors).map((e) => e.message);
    return res.status(400).json({
      success: false,
      message: messages.join(". "),
    });
  }

  // ── Mongoose CastError (bad ObjectId) → 400 ──
  if (err.name === "CastError" && err.kind === "ObjectId") {
    return res.status(400).json({
      success: false,
      message: `Invalid ID format for field: ${err.path}`,
    });
  }

  // ── MongoDB duplicate key error → 409 ──
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue || {})[0] || "field";
    const value = err.keyValue?.[field];
    return res.status(409).json({
      success: false,
      message: `${field.charAt(0).toUpperCase() + field.slice(1)} '${value}' is already in use`,
    });
  }

  // ── JWT errors → 401 ──
  if (err.name === "JsonWebTokenError" || err.name === "TokenExpiredError") {
    return res.status(401).json({
      success: false,
      message: "Not authorized: invalid or expired token",
    });
  }

  // ── Custom statusCode attached to error (e.g. err.statusCode = 409) ──
  if (err.statusCode && (!res.statusCode || res.statusCode === 200)) {
    res.status(err.statusCode);
  }

  const statusCode = res.statusCode && res.statusCode !== 200 ? res.statusCode : 500;

  res.status(statusCode).json({
    success: false,
    message: err.message || "Internal Server Error",
    // Hide stack trace in production
    stack: process.env.NODE_ENV === "production" ? undefined : err.stack,
  });
};
