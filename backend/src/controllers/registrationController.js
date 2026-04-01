const mongoose = require("mongoose");
const Event = require("../models/Event");
const Registration = require("../models/Registration");
const Ticket = require("../models/Ticket");
const { createTicket } = require("./ticketController");

// POST /api/registrations/events/:eventId
// User registers for an event — atomic capacity check via $inc on confirmedCount
const registerForEvent = async (req, res, next) => {
  try {
    const { eventId } = req.params;

    // Ensure event exists and is published
    const event = await Event.findById(eventId);
    if (!event) {
      res.status(404);
      throw new Error("Event not found");
    }
    if (event.status === "CANCELLED") {
      res.status(400);
      throw new Error("Cannot register for a cancelled event");
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

    if (!event.capacity) {
      res.status(400);
      throw new Error("This event has no capacity set and cannot accept registrations");
    }

    // Atomic capacity check: increment confirmedCount only if under capacity
    // For FREE events only — PAID events confirm after payment
    if (event.pricing?.type !== "PAID" || !event.pricing?.price) {
      const updatedEvent = await Event.findOneAndUpdate(
        { _id: eventId, status: "PUBLISHED", confirmedCount: { $lt: event.capacity } },
        { $inc: { confirmedCount: 1 } },
        { new: true }
      );

      if (!updatedEvent) {
        res.status(400);
        throw new Error("Event is full");
      }
    } else {
      // For PAID events, atomic capacity check (read-only, no increment yet)
      const eventAtCapacity = await Event.findOne({
        _id: eventId,
        status: "PUBLISHED",
        $expr: { $gte: ["$confirmedCount", "$capacity"] },
      });
      if (eventAtCapacity) {
        res.status(400);
        throw new Error("Event is full");
      }
    }

    // For PAID events: create pending registration, return payment data (no ticket yet)
    // Do NOT increment confirmedCount yet — only do that after payment succeeds
    if (event.pricing?.type === "PAID" && event.pricing?.price > 0) {
      let reg;
      try {
        reg = await Registration.create({
          eventId,
          userId: req.user.id,
          status: "pending",
        });
      } catch (err) {
        if (err && err.code === 11000) {
          res.status(409);
          return next(new Error("You are already registered for this event"));
        }
        throw err;
      }

      return res.status(201).json({
        success: true,
        message: "Registration created — complete payment to confirm",
        requiresPayment: true,
        data: { registration: reg },
      });
    }

    // FREE event: auto-confirm + create ticket immediately
    let reg;
    try {
      reg = await Registration.create({
        eventId,
        userId: req.user.id,
        status: "confirmed",
      });
    } catch (err) {
      // Roll back the confirmedCount increment on duplicate or other error
      await Event.findByIdAndUpdate(eventId, { $inc: { confirmedCount: -1 } });
      if (err && err.code === 11000) {
        res.status(409);
        return next(new Error("You are already registered for this event"));
      }
      throw err;
    }

    // Auto-create ticket since registration is auto-confirmed
    const ticket = await createTicket({
      userId: req.user.id,
      eventId,
      registrationId: reg._id,
    });

    res.status(201).json({
      success: true,
      message: "Registration confirmed",
      data: { registration: reg, ticket },
    });
  } catch (err) {
    next(err);
  }
};

// GET /api/registrations/me
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

// DELETE /api/registrations/:id
// Attendee cancels their own confirmed registration
const cancelMyRegistration = async (req, res, next) => {
  try {
    const reg = await Registration.findById(req.params.id);
    if (!reg) {
      res.status(404);
      throw new Error("Registration not found");
    }
    if (reg.userId.toString() !== req.user.id) {
      res.status(403);
      throw new Error("Forbidden");
    }
    if (reg.status === "cancelled") {
      res.status(400);
      throw new Error("Registration is already cancelled");
    }
    if (reg.status !== "confirmed") {
      res.status(400);
      throw new Error("Only confirmed registrations can be cancelled");
    }

    reg.status = "cancelled";
    await reg.save();

    // Decrement confirmedCount on the event
    await Event.findByIdAndUpdate(reg.eventId, { $inc: { confirmedCount: -1 } });

    // Cancel associated ticket
    await Ticket.updateOne({ registration: reg._id }, { $set: { status: "CANCELLED" } });

    res.status(200).json({ success: true, message: "Registration cancelled", data: reg });
  } catch (err) {
    next(err);
  }
};

// GET /api/registrations/admin?status=pending&page=1&limit=10&eventId=...
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
        .populate("eventId", "title status schedule venue organizerId"),
      Registration.countDocuments(filters),
    ]);

    res.status(200).json({
      success: true,
      message: "Registrations fetched",
      data: {
        items,
        pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
      },
    });
  } catch (err) {
    next(err);
  }
};

// PATCH /api/registrations/admin/:id/decision
const adminDecideRegistration = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status, note } = req.body || {};

    if (!["confirmed", "cancelled"].includes(status)) {
      res.status(400);
      throw new Error("status must be confirmed or cancelled");
    }

    const reg = await Registration.findById(id);
    if (!reg) {
      res.status(404);
      throw new Error("Registration not found");
    }

    if (reg.status !== "pending") {
      res.status(400);
      throw new Error(`Registration already ${reg.status}`);
    }

    reg.status = status;
    if (typeof note === "string") reg.note = note.trim().slice(0, 500);
    reg.decidedBy = req.user.id;
    reg.decidedAt = new Date();

    const updated = await reg.save();

    let ticket = null;
    if (status === "confirmed") {
      await Event.findByIdAndUpdate(updated.eventId, { $inc: { confirmedCount: 1 } });
      ticket = await createTicket({
        userId: updated.userId,
        eventId: updated.eventId,
        registrationId: updated._id,
      });
    }

    res.status(200).json({
      success: true,
      message: `Registration ${status}`,
      data: { registration: updated, ticket },
    });
  } catch (err) {
    next(err);
  }
};

// GET /api/registrations/admin/stats
const adminRegistrationStats = async (req, res, next) => {
  try {
    const [total, pending, confirmed, cancelled, byStatus, topEvents] = await Promise.all([
      Registration.countDocuments({}),
      Registration.countDocuments({ status: "pending" }),
      Registration.countDocuments({ status: "confirmed" }),
      Registration.countDocuments({ status: "cancelled" }),
      Registration.aggregate([
        { $group: { _id: "$status", count: { $sum: 1 } } },
        { $project: { _id: 0, status: "$_id", count: 1 } },
      ]),
      Registration.aggregate([
        { $group: { _id: "$eventId", registrations: { $sum: 1 } } },
        { $sort: { registrations: -1 } },
        { $limit: 5 },
        { $lookup: { from: "events", localField: "_id", foreignField: "_id", as: "event" } },
        { $unwind: "$event" },
        { $project: { _id: 0, eventId: "$event._id", title: "$event.title", status: "$event.status", registrations: 1 } },
      ]),
    ]);

    res.status(200).json({
      success: true,
      message: "Admin registration stats",
      data: { totals: { total, pending, confirmed, cancelled }, byStatus, topEvents },
    });
  } catch (err) {
    next(err);
  }
};

// GET /api/registrations/admin/event/:eventId
// Returns all registrations for an event with check-in stats
const adminEventRegistrations = async (req, res, next) => {
  try {
    const { eventId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(eventId)) {
      res.status(400);
      throw new Error("Invalid eventId");
    }

    const registrations = await Registration.find({ eventId })
      .sort({ createdAt: -1 })
      .populate("userId", "name email");

    // Attach ticket status to each registration
    const regIds = registrations.map((r) => r._id);
    const tickets = await Ticket.find({ registration: { $in: regIds } }).select("registration status");
    const ticketMap = {};
    tickets.forEach((t) => { ticketMap[t.registration.toString()] = t.status; });

    const regsWithTicket = registrations.map((r) => {
      const obj = r.toObject();
      obj.ticketStatus = ticketMap[r._id.toString()] || null;
      return obj;
    });

    const totalConfirmed = registrations.filter((r) => r.status === "confirmed").length;
    const totalCheckedIn = tickets.filter((t) => t.status === "USED").length;

    res.status(200).json({
      success: true,
      message: "Event registrations fetched",
      data: {
        stats: { totalConfirmed, totalCheckedIn, remaining: totalConfirmed - totalCheckedIn },
        registrations: regsWithTicket,
      },
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  registerForEvent,
  getMyRegistrations,
  cancelMyRegistration,
  adminListRegistrations,
  adminDecideRegistration,
  adminRegistrationStats,
  adminEventRegistrations,
};
