const mongoose = require("mongoose");
const Booking = require("../models/Booking");
const Venue = require("../models/Venue");
const { toDate } = require("../utils/date");

// shared overlap check — only against approved bookings by default
async function hasOverlap({ venueId, start, end, excludeBookingId, session, includesPending = false }) {
  const query = {
    venue: venueId,
    status: includesPending ? { $in: ["pending", "approved"] } : "approved",
    startDateTime: { $lt: end },
    endDateTime: { $gt: start },
  };

  if (excludeBookingId) query._id = { $ne: excludeBookingId };

  const existing = await Booking.findOne(query).session(session || null).select("_id status startDateTime endDateTime");
  return !!existing;
}

/**
 * Internal helper — NOT exposed as an HTTP route.
 * Called by eventController inside an existing MongoDB session.
 *
 * @param {Object} params
 * @param {ObjectId} params.venueId
 * @param {ObjectId} params.eventId
 * @param {ObjectId} params.requestedBy  - organizer user id
 * @param {Date}     params.start
 * @param {Date}     params.end
 * @param {ClientSession} params.session - must be an active session
 * @returns {Promise<BookingDocument>}
 * @throws {Error} with statusCode 409 if slot is taken
 */
exports.createAndApproveBooking = async ({ venueId, eventId, requestedBy, start, end, session }) => {
  const overlap = await hasOverlap({ venueId, start, end, session });
  if (overlap) {
    throw Object.assign(new Error("Time slot not available"), { statusCode: 409 });
  }

  const [booking] = await Booking.create(
    [
      {
        venue: venueId,
        event: eventId,
        requestedBy,
        startDateTime: start,
        endDateTime: end,
        status: "approved",
      },
    ],
    { session }
  );

  return booking;
};

exports.checkAvailability = async (req, res, next) => {
  try {
    const { venueId } = req.params;
    const start = toDate(req.query.start);
    const end = toDate(req.query.end);

    if (!start || !end) return res.status(400).json({ message: "Invalid start/end date" });
    if (start >= end) return res.status(400).json({ message: "start must be before end" });

    const venue = await Venue.findById(venueId);
    if (!venue || !venue.isActive) return res.status(404).json({ message: "Venue not available" });

    const approvedOverlap = await hasOverlap({ venueId, start, end });
    const pendingOverlap = !approvedOverlap && await hasOverlap({ venueId, start, end, includesPending: true });

    res.json({
      available: !approvedOverlap,
      hasApprovedConflict: approvedOverlap,
      hasPendingConflict: !!pendingOverlap,
    });
  } catch (err) {
    next(err);
  }
};

exports.createBooking = async (req, res, next) => {
  const session = await mongoose.startSession();
  try {
    const { venueId, eventId, startDateTime, endDateTime, notes } = req.body;

    // Input validation is handled by validateBookingRequest middleware.
    // Re-parse dates here for use in the transaction.
    const start = toDate(startDateTime);
    const end = toDate(endDateTime);

    // Collect result outside the transaction callback so we can respond after commit
    let createdBooking = null;
    let hasPendingOverlap = false;

    // Transaction protects against race conditions
    await session.withTransaction(async () => {
      const venue = await Venue.findById(venueId).session(session);
      if (!venue || !venue.isActive) throw Object.assign(new Error("Venue not available"), { statusCode: 404 });

      // Hard block: venue already has an approved booking for this slot
      const approvedOverlap = await hasOverlap({ venueId, start, end, session });
      if (approvedOverlap) throw Object.assign(new Error("Venue is already booked for that time range"), { statusCode: 409 });

      // Soft check: other pending requests exist — still allow, admin will decide
      hasPendingOverlap = await hasOverlap({ venueId, start, end, session, includesPending: true });

      const [booking] = await Booking.create(
        [
          {
            venue: venueId,
            event: eventId || undefined,
            requestedBy: req.user.id,
            startDateTime: start,
            endDateTime: end,
            status: "pending",
            notes: notes || "",
          },
        ],
        { session }
      );

      createdBooking = booking;
    });

    // Respond AFTER the transaction has committed
    res.status(201).json({
      success: true,
      message: "Booking requested (pending approval)",
      data: createdBooking,
      warning: hasPendingOverlap
        ? "Note: another booking request exists for an overlapping time slot. The admin will decide which to approve."
        : null,
    });
  } catch (err) {
    // If not replica set, transaction will fail — surface a clear message
    if (err.message?.includes("Transaction numbers") || err.message?.includes("replica set")) {
      return res.status(500).json({
        success: false,
        message: "Transactions require MongoDB replica set. Enable it for race-condition-safe booking.",
      });
    }
    // Delegate to global error handler for consistent shape
    if (err.statusCode) res.status(err.statusCode);
    next(err);
  } finally {
    session.endSession();
  }
};

exports.getMyBookings = async (req, res, next) => {
  try {
    const bookings = await Booking.find({ requestedBy: req.user.id })
      .populate("venue", "name capacity location")
      .populate("event", "title schedule")
      .sort({ createdAt: -1 });

    res.json({ data: bookings });
  } catch (err) {
    next(err);
  }
};

exports.getAdminBookings = async (req, res, next) => {
  try {
    const { status, venueId } = req.query;
    const filter = {};
    if (status) filter.status = status;
    if (venueId) filter.venue = venueId;

    const bookings = await Booking.find(filter)
      .populate("venue", "name location capacity")
      .populate("requestedBy", "name email role")
      .populate("event", "title")
      .sort({ createdAt: -1 });

    res.json({ data: bookings });
  } catch (err) {
    next(err);
  }
};

exports.approveBooking = async (req, res, next) => {
  try {
    const booking = await Booking.findById(req.params.id);
    if (!booking) return res.status(404).json({ message: "Booking not found" });
    if (booking.status !== "pending") return res.status(400).json({ message: "Only pending bookings can be approved" });

    // Re-check overlap at approval time (important!)
    const overlap = await Booking.findOne({
      _id: { $ne: booking._id },
      venue: booking.venue,
      status: "approved",
      startDateTime: { $lt: booking.endDateTime },
      endDateTime: { $gt: booking.startDateTime },
    });

    if (overlap) return res.status(409).json({ message: "Cannot approve: overlaps an approved booking" });

    booking.status = "approved";
    booking.reviewedBy = req.user.id;
    booking.reviewedAt = new Date();
    booking.rejectionReason = undefined;

    await booking.save();

    // Auto-reject all other pending bookings that overlap this same venue/time
    const conflicting = await Booking.find({
      _id: { $ne: booking._id },
      venue: booking.venue,
      status: "pending",
      startDateTime: { $lt: booking.endDateTime },
      endDateTime: { $gt: booking.startDateTime },
    });

    if (conflicting.length > 0) {
      await Booking.updateMany(
        { _id: { $in: conflicting.map((b) => b._id) } },
        {
          $set: {
            status: "rejected",
            reviewedBy: req.user.id,
            reviewedAt: new Date(),
            rejectionReason: "Another booking was approved for this time slot.",
          },
        }
      );
    }

    res.json({
      message: "Booking approved",
      data: booking,
      autoRejected: conflicting.length,
    });
  } catch (err) {
    next(err);
  }
};

exports.rejectBooking = async (req, res, next) => {
  try {
    const { reason } = req.body;

    const booking = await Booking.findById(req.params.id);
    if (!booking) return res.status(404).json({ message: "Booking not found" });
    if (booking.status !== "pending") return res.status(400).json({ message: "Only pending bookings can be rejected" });
    if (!reason || reason.trim().length < 3) return res.status(400).json({ message: "Rejection reason is required" });

    booking.status = "rejected";
    booking.reviewedBy = req.user.id;
    booking.reviewedAt = new Date();
    booking.rejectionReason = reason.trim();

    await booking.save();
    res.json({ message: "Booking rejected", data: booking });
  } catch (err) {
    next(err);
  }
};

exports.cancelMyBooking = async (req, res, next) => {
  try {
    const booking = await Booking.findById(req.params.id);
    if (!booking) return res.status(404).json({ message: "Booking not found" });

    // Only owner can cancel
    if (String(booking.requestedBy) !== String(req.user.id)) {
      return res.status(403).json({ message: "Not allowed" });
    }

    if (booking.status === "cancelled") return res.status(400).json({ message: "Already cancelled" });

    // Block cancellation of approved bookings that are linked to an event
    if (booking.status === "approved" && booking.event) {
      return res.status(400).json({
        message: "Cannot cancel an approved booking that is linked to an event. Remove the event first.",
      });
    }

    booking.status = "cancelled";
    await booking.save();

    res.json({ message: "Booking cancelled", data: booking });
  } catch (err) {
    next(err);
  }
};

exports.adminDashboardStats = async (req, res, next) => {
  try {
    const stats = await Booking.aggregate([
      { $group: { _id: "$status", count: { $sum: 1 } } },
      { $project: { status: "$_id", count: 1, _id: 0 } },
    ]);

    const total = await Booking.countDocuments();
    res.json({ data: { total, byStatus: stats } });
  } catch (err) {
    next(err);
  }
};

// GET /api/bookings/my-approved-venues
// Returns organizer's approved bookings with venue details (for event creation dropdown)
exports.getMyApprovedVenues = async (req, res, next) => {
  try {
    const bookings = await Booking.find({
      requestedBy: req.user.id,
      status: "approved",
      event: null, // only bookings not yet linked to an event
    })
      .populate("venue", "name capacity location amenities image")
      .sort({ startDateTime: 1 });

    res.json({ data: bookings });
  } catch (err) {
    next(err);
  }
};

exports.checkMyBooking = async (req, res, next) => {
  // GET /api/bookings/check?venueId=:id&start=...&end=...
  // Returns the organizer's booking for a venue, optionally filtered to cover specific dates
  try {
    const { venueId, start, end } = req.query;
    if (!venueId) return res.status(400).json({ message: "venueId is required" });

    const query = {
      venue: venueId,
      requestedBy: req.user.id,
      status: { $in: ["pending", "approved"] },
    };

    // If dates provided, find a booking that covers the full event window
    if (start && end) {
      const startDt = new Date(start);
      const endDt = new Date(end);
      if (!isNaN(startDt) && !isNaN(endDt)) {
        query.startDateTime = { $lte: startDt };
        query.endDateTime = { $gte: endDt };
      }
    }

    const booking = await Booking.findOne(query).sort({ createdAt: -1 });

    res.json({ data: { hasActiveBooking: !!booking, booking: booking || null } });
  } catch (err) {
    next(err);
  }
};