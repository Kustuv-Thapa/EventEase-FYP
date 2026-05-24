const jwt = require("jsonwebtoken");

const signToken = (payload) => {
  const secret = process.env.JWT_SECRET;
  const expiresIn = process.env.JWT_EXPIRES_IN || "1d";

  if (!secret) throw new Error("JWT_SECRET is missing in .env");
  if (secret.length < 32) throw new Error("JWT_SECRET must be at least 32 characters long");

  return jwt.sign(payload, secret, { expiresIn });
};

module.exports = { signToken };