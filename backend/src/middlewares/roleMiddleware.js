const allowRoles = (...roles) => {
  const allowed = roles.map((r) => String(r).toUpperCase());

  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: "Not authorized" });
    }

    const userRole = String(req.user.role || "").toUpperCase();

    if (!allowed.includes(userRole)) {
      return res.status(403).json({ message: "Forbidden: insufficient permissions" });
    }

    return next();
  };
};

module.exports = { allowRoles };