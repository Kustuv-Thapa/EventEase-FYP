const mongoose = require("mongoose");
const Booking = require("../models/Booking");
const Venue = require("../models/Venue");
const { toDate } = require("../utils/date");

// shared overlap check
async function hasOverlap({ venueId, start, end, excludeBookingId, session }) {
  const query = {
    venue: venueId,
    status: { $in: ["pending", "approved"] },
    startDateTime: { $lt: end },
    endDateTime: { $gt: start },
  };

  if (excludeBookingId) query._id = { $ne: excludeBookingId };

  const existing = await Booking.findOne(query).session(session || null).select("_id status startDateTime endDateTime");
  return !!existing;
}

exports.checkAvailability = async (req, res, next) => {
  try {
    const { venueId } = req.params;
    const start = toDate(req.query.start);
    const end = toDate(req.query.end);

    if (!start || !end) return res.status(400).json({ message: "Invalid start/end date" });
    if (start >= end) return res.status(400).json({ message: "start must be before end" });

    const venue = await Venue.findById(venueId);
    if (!venue || !venue.isActive) return res.status(404).json({ message: "Venue not available" });

    const overlap = await hasOverlap({ venueId, start, end });
    res.json({ available: !overlap });
  } catch (err) {
    next(err);
  }
};

exports.createBooking = async (req, res, next) => {
  const session = await mongoose.startSession();
  try {
    const { venueId, eventId, startDateTime, endDateTime, notes } = req.body;

    const start = toDate(startDateTime);
    const end = toDate(endDateTime);

    if (!venueId || !start || !end) {
      return res.status(400).json({ message: "venueId, startDateTime, endDateTime are required" });
    }
    if (start >= end) return res.status(400).json({ message: "endDateTime must be after startDateTime" });

    // Transaction protects against race conditions (requires replica set)
    await session.withTransaction(async () => {
      const venue = await Venue.findById(venueId).session(session);
      if (!venue || !venue.isActive) throw Object.assign(new Error("Venue not available"), { statusCode: 404 });

      const overlap = await hasOverlap({ venueId, start, end, session });
      if (overlap) throw Object.assign(new Error("Venue already booked for that time range"), { statusCode: 409 });

      const booking = await Booking.create(
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

      res.status(201).json({ message: "Booking requested (pending approval)", data: booking[0] });
    });
  } catch (err) {
    // If not replica set, transaction may fail. Still return a helpful message.
    if (err.message?.includes("Transaction numbers") || err.message?.includes("replica set")) {
      return res.status(500).json({
        message:
          "Transactions require MongoDB replica set. Enable it for race-condition-safe booking. Your code is correct otherwise.",
      });
    }
    res.status(err.statusCode || 500).json({ message: err.message || "Failed to create booking" });
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
    res.json({ message: "Booking approved", data: booking });
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

    // Only owner (or admin via other route) can cancel
    if (String(booking.requestedBy) !== String(req.user.id)) {
      return res.status(403).json({ message: "Not allowed" });
    }

    if (booking.status === "cancelled") return res.status(400).json({ message: "Already cancelled" });

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