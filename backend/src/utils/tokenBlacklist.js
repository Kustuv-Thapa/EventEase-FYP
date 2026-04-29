const jwt = require("jsonwebtoken");
const BlacklistedToken = require("../models/BlacklistedToken");

/**
 * Add a token to the blacklist.
 * Decodes the token to get its expiry so MongoDB TTL can auto-clean it.
 */
const add = async (token) => {
  try {
    const decoded = jwt.decode(token);
    const expiresAt = decoded?.exp
      ? new Date(decoded.exp * 1000)
      : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // fallback: 7 days

    await BlacklistedToken.updateOne(
      { token },
      { token, expiresAt },
      { upsert: true }
    );
  } catch (err) {
    // Log but don't throw — logout should always succeed
    console.error("[TokenBlacklist] Failed to blacklist token:", err.message);
  }
};

/**
 * Check if a token is blacklisted.
 */
const has = async (token) => {
  const found = await BlacklistedToken.findOne({ token }).lean();
  return !!found;
};

module.exports = { add, has };
