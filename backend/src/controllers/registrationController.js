const mongoose = require("mongoose");
const Event = require("../models/Event");
const Registration = require("../models/Registration");

// POST /api/registrations/events/:eventId
// User registers for an event
const registerForEvent = async (req, res, next) => {
  try {
    const { eventId } = req.params;

    // Ensure event exists and is published (public registration rule)
    const event = await Event.findById(eventId);
    if (!event) {
      res.status(404);
      throw new Error("Event not found");
    }
    if (event.status !== "PUBLISHED") {
      res.status(400);
      throw new Error("You can only register for published events");
    }

    // Organizer cannot register for their own event
    if (event.organizerId.toString() === req.user.id) {
      res.status(403);
      throw new Error("You cannot register for your own event");
    }

    // Create registration (duplicate prevented by unique index)
    const reg = await Registration.create({
      eventId,
      userId: req.user.id,
      status: "PENDING",
    });

    res.status(201).json({
      success: true,
      message: "Registration created (pending approval)",
      data: reg,
    });
  } catch (err) {
    // Handle duplicate key error nicely
    if (err && err.code === 11000) {
      res.status(409);
      return next(new Error("You are already registered for this event"));
    }
    next(err);
  }
};

// GET /api/registrations/me
// Show logged-in user's registrations + event details
const getMyRegistrations = async (req, res, next) => {
  try {
    const regs = await Registration.find({ userId: req.user.id })
      .sort({ createdAt: -1 })
      .populate({
        path: "eventId",
        select: "title venue schedule status pricing",
      });

    res.status(200).json({
      success: true,
      message: "My registrations fetched",
      data: regs,
    });
  } catch (err) {
    next(err);
  }
};

// Admin: list registrations (filters + pagination)
// GET /api/registrations/admin?status=PENDING&page=1&limit=10&eventId=...
const adminListRegistrations = async (req, res, next) => {
  try {
    const page = Math.max(parseInt(req.query.page || "1", 10), 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit || "10", 10), 1), 50);
    const skip = (page - 1) * limit;

    const filters = {};
    if (req.query.status) filters.status = req.query.status;

    if (req.query.eventId) {
      if (!mongoose.Types.ObjectId.isValid(req.query.eventId)) {
        res.status(400);
        throw new Error("Invalid eventId");
      }
      filters.eventId = req.query.eventId;
    }

    const [items, total] = await Promise.all([
      Registration.find(filters)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate("userId", "name email role")
        .populate("eventId", "title status schedule venue"),
      Registration.countDocuments(filters),
    ]);

    res.status(200).json({
      success: true,
      message: "Registrations fetched",
      data: {
        items,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      },
    });
  } catch (err) {
    next(err);
  }
};

// PATCH /api/registrations/admin/:id/decision
// Admin approves/rejects a registration
const adminDecideRegistration = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status, note } = req.body || {};

    if (!["APPROVED", "REJECTED"].includes(status)) {
      res.status(400);
      throw new Error("status must be APPROVED or REJECTED");
    }

    const reg = await Registration.findById(id);
    if (!reg) {
      res.status(404);
      throw new Error("Registration not found");
    }

    // Optional: prevent re-decision
    if (reg.status !== "PENDING") {
      res.status(400);
      throw new Error(`Registration already ${reg.status}`);
    }

    reg.status = status;
    if (typeof note === "string") reg.note = note.trim().slice(0, 500);
    reg.decidedBy = req.user.id;
    reg.decidedAt = new Date();

    const updated = await reg.save();

    res.status(200).json({
      success: true,
      message: `Registration ${status.toLowerCase()}`,
      data: updated,
    });
  } catch (err) {
    next(err);
  }
};

// GET /api/registrations/admin/stats
// Admin dashboard statistics
const adminRegistrationStats = async (req, res, next) => {
  try {
    const [
      total,
      pending,
      approved,
      rejected,
      byStatus,
      topEvents,
    ] = await Promise.all([
      Registration.countDocuments({}),
      Registration.countDocuments({ status: "PENDING" }),
      Registration.countDocuments({ status: "APPROVED" }),
      Registration.countDocuments({ status: "REJECTED" }),

      // Breakdown counts by status
      Registration.aggregate([
        { $group: { _id: "$status", count: { $sum: 1 } } },
        { $project: { _id: 0, status: "$_id", count: 1 } },
      ]),

      // Top events by registration volume (simple leaderboard)
      Registration.aggregate([
        { $group: { _id: "$eventId", registrations: { $sum: 1 } } },
        { $sort: { registrations: -1 } },
        { $limit: 5 },
        {
          $lookup: {
            from: "events",
            localField: "_id",
            foreignField: "_id",
            as: "event",
          },
        },
        { $unwind: "$event" },
        {
          $project: {
            _id: 0,
            eventId: "$event._id",
            title: "$event.title",
            status: "$event.status",
            registrations: 1,
          },
        },
      ]),
    ]);

    res.status(200).json({
      success: true,
      message: "Admin registration stats",
      data: {
        totals: { total, pending, approved, rejected },
        byStatus,
        topEvents,
      },
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  registerForEvent,
  getMyRegistrations,
  adminListRegistrations,
  adminDecideRegistration,
  adminRegistrationStats,
};