module.exports = (err, req, res, next) => {
  const statusCode = res.statusCode && res.statusCode !== 200 ? res.statusCode : 500;

  res.status(statusCode).json({
    success: false,
    message: err.message || "Server Error",
    // Hide stack in production
    stack: process.env.NODE_ENV === "production" ? undefined : err.stack,
  });
};