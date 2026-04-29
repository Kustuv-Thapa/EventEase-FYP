const mongoose = require("mongoose");
const Event = require("../models/Event");
const Registration = require("../models/Registration");
const Ticket = require("../models/Ticket");
const Payment = require("../models/Payment");
const { createTicket } = require("./ticketController");
const { sendRegistrationConfirmationEmail, sendTicketIssuedEmail, sendRegistrationCancelledEmail } = require("../utils/emailService");

// POST /api/registrations/events/:eventId
// User registers for an event — supports re-registration after cancellation
const registerForEvent = async (req, res, next) => {
  try {
    const { eventId } = req.params;

    const event = await Event.findById(eventId);
    if (!event) { res.status(404); throw new Error("Event not found"); }
    if (event.status === "CANCELLED") { res.status(400); throw new Error("Cannot register for a cancelled event"); }
    if (event.status === "COMPLETED") { res.status(400); throw new Error("This event has already ended"); }
    if (event.status !== "PUBLISHED") { res.status(400); throw new Error("You can only register for published events"); }
    if (event.organizerId.toString() === req.user.id) { res.status(403); throw new Error("You cannot register for your own event"); }
    if (req.user.role === "ADMIN") { res.status(403); throw new Error("Admins cannot register for events"); }
    if (!event.capacity) { res.status(400); throw new Error("This event has no capacity set and cannot accept registrations"); }

    // Check for any existing registration for this user+event
    const existingReg = await Registration.findOne({ eventId, userId: req.user.id });

    if (existingReg) {
      if (existingReg.status === "pending" || existingReg.status === "confirmed") {
        res.status(409);
        throw new Error("You are already registered for this event");
      }
      // existingReg.status === "cancelled" — allow re-registration by reactivating
    }

    // ── PAID event ──
    if (event.pricing?.type === "PAID" && event.pricing?.price > 0) {
      const atCapacity = await Event.findOne({
        _id: eventId,
        status: "PUBLISHED",
        $expr: { $gte: ["$confirmedCount", "$capacity"] },
      });
      if (atCapacity) { res.status(400); throw new Error("Event is full"); }

      let reg;
      if (existingReg) {
        // Reactivate the cancelled registration
        existingReg.status = "pending";
        existingReg.decidedBy = null;
        existingReg.decidedAt = null;
        existingReg.note = "";
        reg = await existingReg.save();
      } else {
        reg = await Registration.create({ eventId, userId: req.user.id, status: "pending" });
      }

      return res.status(201).json({
        success: true,
        message: "Registration created — complete payment to confirm",
        requiresPayment: true,
        data: { registration: reg },
      });
    }

    // ── FREE event: atomic capacity increment + registration + ticket ──
    const session = await mongoose.startSession();
    let reg, ticket;
    try {
      await session.withTransaction(async () => {
        // Atomic capacity check + increment
        const updatedEvent = await Event.findOneAndUpdate(
          { _id: eventId, status: "PUBLISHED", confirmedCount: { $lt: event.capacity } },
          { $inc: { confirmedCount: 1 } },
          { new: true, session }
        );
        if (!updatedEvent) { const err = new Error("Event is full"); err.statusCode = 400; throw err; }

        if (existingReg) {
          // Reactivate the cancelled registration
          reg = await Registration.findByIdAndUpdate(
            existingReg._id,
            { $set: { status: "confirmed", decidedBy: null, decidedAt: null, note: "" } },
            { new: true, session }
          );
        } else {
          [reg] = await Registration.create(
            [{ eventId, userId: req.user.id, status: "confirmed" }],
            { session }
          );
        }

        // Reactivate existing cancelled ticket or create a new one
        const existingTicket = await Ticket.findOne({ registration: reg._id }).session(session);
        if (existingTicket) {
          await Ticket.updateOne(
            { _id: existingTicket._id },
            { $set: { status: "VALID" } },
            { session }
          );
          ticket = { ...existingTicket.toObject(), status: "VALID" };
        } else {
          const { v4: uuidv4 } = require("uuid");
          const QRCode = require("qrcode");
          const ticketId = uuidv4();
          const qrPayload = JSON.stringify({ ticketId, eventId: String(eventId), registrationId: String(reg._id) });
          const qrCode = await QRCode.toDataURL(qrPayload);
          [ticket] = await Ticket.create(
            [{ user: req.user.id, event: eventId, registration: reg._id, ticketId, qrCode, status: "VALID" }],
            { session }
          );
        }
      });
    } catch (err) {
      if (err.message?.includes("Transaction numbers") || err.message?.includes("replica set")) {
        // Fallback for non-replica-set environments
        const updatedEvent = await Event.findOneAndUpdate(
          { _id: eventId, status: "PUBLISHED", confirmedCount: { $lt: event.capacity } },
          { $inc: { confirmedCount: 1 } },
          { new: true }
        );
        if (!updatedEvent) { res.status(400); throw new Error("Event is full"); }

        if (existingReg) {
          reg = await Registration.findByIdAndUpdate(
            existingReg._id,
            { $set: { status: "confirmed", decidedBy: null, decidedAt: null, note: "" } },
            { new: true }
          );
        } else {
          try {
            reg = await Registration.create({ eventId, userId: req.user.id, status: "confirmed" });
          } catch (createErr) {
            await Event.findByIdAndUpdate(eventId, { $inc: { confirmedCount: -1 } });
            throw createErr;
          }
        }

        const existingTicket = await Ticket.findOne({ registration: reg._id });
        if (existingTicket) {
          await Ticket.updateOne({ _id: existingTicket._id }, { $set: { status: "VALID" } });
          ticket = existingTicket;
        } else {
          ticket = await createTicket({ userId: req.user.id, eventId, registrationId: reg._id });
        }
      } else {
        if (err.statusCode) res.status(err.statusCode);
        throw err;
      }
    } finally {
      session.endSession();
    }

    // Send confirmation email (non-blocking)
    const eventDate = event.schedule?.startDateTime
      ? new Date(event.schedule.startDateTime).toLocaleString("en-US", { dateStyle: "long", timeStyle: "short" })
      : "TBD";
    sendRegistrationConfirmationEmail({
      to: req.user.email,
      name: req.user.name,
      eventTitle: event.title,
      eventDate,
      eventVenue: `${event.venue?.name || ""}, ${event.venue?.city || ""}`,
      ticketId: ticket?.ticketId,
    });

    res.status(201).json({ success: true, message: "Registration confirmed", data: { registration: reg, ticket } });
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
// Attendee cancels their own registration (confirmed or pending)
const cancelMyRegistration = async (req, res, next) => {
  try {
    const reg = await Registration.findById(req.params.id);
    if (!reg) { res.status(404); throw new Error("Registration not found"); }
    if (reg.userId.toString() !== req.user.id) { res.status(403); throw new Error("Forbidden"); }
    if (reg.status === "cancelled") { res.status(400); throw new Error("Registration is already cancelled"); }

    const isPending = reg.status === "pending";
    const isConfirmed = reg.status === "confirmed";

    if (!isPending && !isConfirmed) {
      res.status(400);
      throw new Error("Only pending or confirmed registrations can be cancelled");
    }

    reg.status = "cancelled";
    await reg.save();

    // Only decrement confirmedCount if the registration was confirmed (pending never incremented it)
    if (isConfirmed) {
      await Event.findByIdAndUpdate(reg.eventId, { $inc: { confirmedCount: -1 } });
      await Ticket.updateOne({ registration: reg._id }, { $set: { status: "CANCELLED" } });
      // Mark successful payment as refunded so re-registration can pay again
      await Payment.updateMany(
        { registrationId: reg._id, status: "success" },
        { $set: { status: "refunded" } }
      );
    }

    // For pending paid registrations: cancel any pending payment records too
    if (isPending) {
      await Payment.updateMany(
        { registrationId: reg._id, status: "pending" },
        { $set: { status: "failed" } }
      );
    }

    // Notify attendee (non-blocking)
    try {
      const event = await Event.findById(reg.eventId).select("title schedule venue");
      if (event) {
        const eventDate = event.schedule?.startDateTime
          ? new Date(event.schedule.startDateTime).toLocaleString("en-US", { dateStyle: "long", timeStyle: "short" })
          : "TBD";
        sendRegistrationCancelledEmail({
          to: req.user.email,
          name: req.user.name,
          eventTitle: event.title,
          eventDate,
          eventVenue: `${event.venue?.name || ""}, ${event.venue?.city || ""}`,
        });
      }
    } catch { /* email failure must not break the response */ }

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
      // For paid events, only confirm if payment exists
      const event = await Event.findById(updated.eventId);
      if (event?.pricing?.type === "PAID") {
        const paid = await Payment.findOne({ registrationId: updated._id, status: "success" });
        if (!paid) {
          res.status(400);
          throw new Error("Cannot confirm a paid registration without a successful payment");
        }
      }
      await Event.findByIdAndUpdate(updated.eventId, { $inc: { confirmedCount: 1 } });
      ticket = await createTicket({
        userId: updated.userId,
        eventId: updated.eventId,
        registrationId: updated._id,
      });
    }

    // Notify attendee of admin decision (non-blocking)
    try {
      const User = require("../models/User");
      const attendee = await User.findById(updated.userId).select("name email");
      const eventDoc = await Event.findById(updated.eventId).select("title schedule venue");
      if (attendee && eventDoc) {
        const eventDate = eventDoc.schedule?.startDateTime
          ? new Date(eventDoc.schedule.startDateTime).toLocaleString("en-US", { dateStyle: "long", timeStyle: "short" })
          : "TBD";
        const eventVenue = `${eventDoc.venue?.name || ""}, ${eventDoc.venue?.city || ""}`;
        if (status === "cancelled") {
          sendRegistrationCancelledEmail({
            to: attendee.email,
            name: attendee.name,
            eventTitle: eventDoc.title,
            eventDate,
            eventVenue,
            reason: updated.note || undefined,
          });
        } else if (status === "confirmed" && ticket) {
          sendRegistrationConfirmationEmail({
            to: attendee.email,
            name: attendee.name,
            eventTitle: eventDoc.title,
            eventDate,
            eventVenue,
            ticketId: ticket.ticketId,
          });
        }
      }
    } catch { /* email failure must not break the response */ }

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
