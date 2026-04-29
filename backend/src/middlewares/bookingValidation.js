const { toDate } = require("../utils/date");

const validateBookingRequest = (req, res, next) => {
  const { venueId, startDateTime, endDateTime } = req.body;

  // Required fields
  if (!venueId) {
    return res.status(400).json({ message: "venueId is required" });
  }

  if (!startDateTime || !endDateTime) {
    return res.status(400).json({ message: "startDateTime and endDateTime are required" });
  }

  // Validate dates
  const start = toDate(startDateTime);
  const end = toDate(endDateTime);

  if (!start || !end) {
    return res.status(400).json({ message: "Invalid date format" });
  }

  if (start >= end) {
    return res.status(400).json({ message: "endDateTime must be after startDateTime" });
  }

  // Check if dates are in the past
  const now = new Date();
  if (start < now) {
    return res.status(400).json({ message: "Cannot book in the past" });
  }

  // Minimum booking duration: 30 minutes
  if (end - start < 30 * 60 * 1000) {
    return res.status(400).json({ message: "Booking must be at least 30 minutes" });
  }

  // Maximum booking duration: 7 days
  const maxDuration = 7 * 24 * 60 * 60 * 1000;
  if (end - start > maxDuration) {
    return res.status(400).json({ message: "Booking duration cannot exceed 7 days" });
  }

  next();
};

const validateRejectionReason = (req, res, next) => {
  const { reason } = req.body;

  if (!reason || typeof reason !== "string" || reason.trim().length < 3) {
    return res.status(400).json({ message: "Rejection reason is required (min 3 characters)" });
  }

  if (reason.length > 300) {
    return res.status(400).json({ message: "Rejection reason too long (max 300 characters)" });
  }

  next();
};

module.exports = {
  validateBookingRequest,
  validateRejectionReason,
};
