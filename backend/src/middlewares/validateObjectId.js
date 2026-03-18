const mongoose = require("mongoose");

const validateObjectId = (paramName = "id") => (req, res, next) => {
  const value = req.params[paramName];

  if (!mongoose.Types.ObjectId.isValid(value)) {
    return res.status(400).json({ message: `Invalid ${paramName}` });
  }

  return next();
};

module.exports = validateObjectId;