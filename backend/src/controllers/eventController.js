const mongoose = require("mongoose");
const Event = require("../models/Event");
const Registration = require("../models/Registration");
const Ticket = require("../models/Ticket");
const Venue = require("../models/Venue");
const Booking = require("../models/Booking");
const { createAndApproveBooking } = require("./bookingController");
const { sendEventCancelledEmail, sendEventUpdatedEmail, sendEventApprovedEmail, sendEventRejectedEmail } = require("../utils/emailService");

// Helper: ownership check
const ensureCanModifyEvent = (reqUser, eventDoc) => {
  if (reqUser.role === "ADMIN") return true;
  // organizerId may be populated (object) or raw ObjectId
  const ownerId = eventDoc.organizerId?._id
    ? eventDoc.organizerId._id.toString()
    : eventDoc.organizerId?.toString();
  if (reqUser.role === "ORGANIZER" && ownerId === reqUser.id) return true;
  return false;
};

// POST /api/events (ADMIN/ORGANIZER)
const createEvent = async (req, res, next) => {
  const session = await mongoose.startSession();
  try {
    const { title, description, genre, venueId, venue, schedule, capacity, budget, pricing } = req.body || {};

    if (!title || (!venueId && !venue) || !schedule || !capacity) {
      res.status(400);
      throw new Error("title, venue, schedule, and capacity are required");
    }

    // Validate schedule dates
    const now = new Date();
    const startDt = new Date(schedule.startDateTime);
    const endDt = new Date(schedule.endDateTime);
    if (isNaN(startDt) || isNaN(endDt)) { res.status(400); throw new Error("Invalid date format"); }
    if (startDt < now) { res.status(400); throw new Error("Start date cannot be in the past"); }
    if (endDt <= startDt) { res.status(400); throw new Error("End date must be after start date"); }
    if (endDt - startDt < 30 * 60 * 1000) { res.status(400); throw new Error("Event must be at least 30 minutes long"); }

    let createdEvent;

    await session.withTransaction(async () => {
      // Resolve venue: try _id first, fall back to name + city
      let venueDoc = null;
      if (venueId) {
        venueDoc = await Venue.findById(venueId).session(session);
      }
      if (!venueDoc && venue?.name && venue?.city) {
        venueDoc = await Venue.findOne({ name: venue.name, "location.city": venue.city }).session(session);
      }

      if (!venueDoc) {
        const err = new Error("Venue not found");
        err.statusCode = 400;
        throw err;
      }

      if (!venueDoc.isActive) {
        const err = new Error("Venue is not available");
        err.statusCode = 400;
        throw err;
      }

      if (capacity > venueDoc.capacity) {
        const err = new Error(`Event capacity (${capacity}) cannot exceed venue capacity (${venueDoc.capacity})`);
        err.statusCode = 400;
        throw err;
      }

      // Build the denormalized venue sub-document for the Event
      const venueSubDoc = {
        name: venueDoc.name,
        address: venueDoc.location.address,
        city: venueDoc.location.city,
      };

      let bookingId = null;

      if (req.user.role === "ORGANIZER") {
        // Check if organizer already has an approved booking covering this window (backward compat)
        const existingApproved = await Booking.findOne({
          venue: venueDoc._id,
          requestedBy: req.user.id,
          status: "approved",
          event: null,
          startDateTime: { $lte: startDt },
          endDateTime: { $gte: endDt },
        }).session(session);

        if (existingApproved) {
          // Reuse existing approved booking
          bookingId = existingApproved._id;

          const [event] = await Event.create(
            [{ organizerId: req.user.id, title, description, genre, venue: venueSubDoc, schedule, capacity, budget, pricing, status: "PENDING_APPROVAL", bookingId, rejectionReason: null }],
            { session }
          );
          await Booking.updateOne({ _id: bookingId }, { $set: { event: event._id } }, { session });
          createdEvent = event;
        } else {
          // Check for approved overlap
          const approvedOverlap = await Booking.findOne({
            venue: venueDoc._id,
            status: "approved",
            startDateTime: { $lt: endDt },
            endDateTime: { $gt: startDt },
          }).session(session);

          if (approvedOverlap) {
            const err = new Error("Venue is already booked for that time range");
            err.statusCode = 409;
            throw err;
          }

          // Create pending booking + event atomically
          const [booking] = await Booking.create(
            [{ venue: venueDoc._id, requestedBy: req.user.id, startDateTime: startDt, endDateTime: endDt, status: "pending", notes: req.body.notes || "" }],
            { session }
          );

          const [event] = await Event.create(
            [{ organizerId: req.user.id, title, description, genre, venue: venueSubDoc, schedule, capacity, budget, pricing, status: "PENDING_APPROVAL", bookingId: booking._id, rejectionReason: null }],
            { session }
          );

          await Booking.updateOne({ _id: booking._id }, { $set: { event: event._id } }, { session });
          createdEvent = event;
        }
      } else {
        // Admin: auto-approve booking
        const approvedOverlap = await Booking.findOne({
          venue: venueDoc._id,
          status: "approved",
          startDateTime: { $lt: endDt },
          endDateTime: { $gt: startDt },
        }).session(session);

        if (approvedOverlap) {
          const err = new Error("Venue is already booked for that time range");
          err.statusCode = 409;
          throw err;
        }

        const [booking] = await Booking.create(
          [{ venue: venueDoc._id, requestedBy: req.user.id, startDateTime: startDt, endDateTime: endDt, status: "approved" }],
          { session }
        );

        const [event] = await Event.create(
          [{ organizerId: req.user.id, title, description, genre, venue: venueSubDoc, schedule, capacity, budget, pricing, status: "PENDING_APPROVAL", bookingId: booking._id, rejectionReason: null }],
          { session }
        );

        await Booking.updateOne({ _id: booking._id }, { $set: { event: event._id } }, { session });
        createdEvent = event;
      }
    });

    const finalEvent = await Event.findById(createdEvent._id);
    res.status(201).json({ success: true, message: "Event created", data: finalEvent });
  } catch (err) {
    if (err.message?.includes("Transaction numbers") || err.message?.includes("replica set")) {
      return res.status(500).json({ message: "Transactions require MongoDB replica set" });
    }
    next(err);
  } finally {
    session.endSession();
  }
};

// GET /api/events (PUBLIC) — only PUBLISHED
const getEvents = async (req, res, next) => {
  try {
    const page = Math.min(Math.max(parseInt(req.query.page || "1", 10), 1), 500);
    const limit = Math.min(Math.max(parseInt(req.query.limit || "10", 10), 1), 50);
    const skip = (page - 1) * limit;

    const filters = { status: "PUBLISHED" };

    if (req.query.city) filters["venue.city"] = req.query.city;

    if (req.query.search) {
      const q = req.query.search.trim();
      // Escape regex metacharacters to prevent ReDoS / unintended matches
      const escaped = q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      filters.$or = [
        { title: { $regex: escaped, $options: "i" } },
        { description: { $regex: escaped, $options: "i" } },
        { genre: { $in: [new RegExp(escaped, "i")] } },
      ];
    }

    const [items, total] = await Promise.all([
      Event.find(filters).sort({ createdAt: -1 }).skip(skip).limit(limit).populate("organizerId", "name email role"),
      Event.countDocuments(filters),
    ]);

    // Return confirmedCount directly — no alias needed
    const itemsWithCount = items.map((ev) => ev.toObject());

    res.status(200).json({
      success: true,
      message: "Events fetched",
      data: { items: itemsWithCount, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } },
    });
  } catch (err) {
    next(err);
  }
};

// GET /api/events/:id (PUBLIC — PUBLISHED only)
const getEventById = async (req, res, next) => {
  try {
    const event = await Event.findById(req.params.id).populate("organizerId", "name email role");

    if (!event || (event.status !== "PUBLISHED" && event.status !== "COMPLETED")) {
      res.status(404);
      throw new Error("Event not found");
    }

    const obj = event.toObject();

    res.status(200).json({ success: true, message: "Event fetched", data: obj });
  } catch (err) {
    next(err);
  }
};

// PUT /api/events/:id (ADMIN/ORGANIZER)
const updateEvent = async (req, res, next) => {
  const session = await mongoose.startSession();
  try {
    const event = await Event.findById(req.params.id);

    if (!event) { res.status(404); throw new Error("Event not found"); }
    if (!ensureCanModifyEvent(req.user, event)) { res.status(403); throw new Error("Forbidden"); }
    if (event.status === "COMPLETED") { res.status(400); throw new Error("Cannot modify a completed event"); }

    const allowed = ["title", "description", "genre", "venue", "schedule", "capacity", "budget", "pricing"];
    // Organizers cannot directly set status to PUBLISHED
    if (req.user.role === "ADMIN") allowed.push("status");

    const updates = {};
    for (const key of allowed) {
      if (req.body && typeof req.body[key] !== "undefined") {
        updates[key] = req.body[key];
      }
    }

    // Validate schedule if being updated
    if (updates.schedule) {
      const startDt = new Date(updates.schedule.startDateTime);
      const endDt = new Date(updates.schedule.endDateTime);
      if (isNaN(startDt) || isNaN(endDt)) { res.status(400); throw new Error("Invalid date format"); }
      if (startDt < new Date()) { res.status(400); throw new Error("Start date cannot be in the past"); }
      if (endDt <= startDt) { res.status(400); throw new Error("End date must be after start date"); }
      if (endDt - startDt < 30 * 60 * 1000) { res.status(400); throw new Error("Event must be at least 30 minutes long"); }
    }

    // Detect date changes and re-book if a bookingId exists
    const newStart = updates.schedule?.startDateTime
      ? new Date(updates.schedule.startDateTime)
      : null;
    const newEnd = updates.schedule?.endDateTime
      ? new Date(updates.schedule.endDateTime)
      : null;

    const existingStart = event.schedule?.startDateTime
      ? new Date(event.schedule.startDateTime)
      : null;
    const existingEnd = event.schedule?.endDateTime
      ? new Date(event.schedule.endDateTime)
      : null;

    const datesChanged =
      newStart &&
      newEnd &&
      existingStart &&
      existingEnd &&
      (newStart.getTime() !== existingStart.getTime() ||
        newEnd.getTime() !== existingEnd.getTime());

    if (datesChanged && event.bookingId) {
      let updated;
      await session.withTransaction(async () => {
        const venueDoc = await Venue.findOne({
          name: event.venue.name,
          "location.city": event.venue.city,
        }).session(session);

        if (!venueDoc) {
          const err = new Error("Venue not found");
          err.statusCode = 400;
          throw err;
        }

        const newBooking = await createAndApproveBooking({
          venueId: venueDoc._id,
          eventId: event._id,
          requestedBy: req.user.id,
          start: newStart,
          end: newEnd,
          session,
          excludeBookingId: event.bookingId,
        });

        await Booking.updateOne(
          { _id: event.bookingId },
          { $set: { status: "cancelled" } },
          { session }
        );

        updates.bookingId = newBooking._id;

        updated = await Event.findByIdAndUpdate(
          req.params.id,
          { $set: updates },
          { new: true, runValidators: false, session }
        );
      });

      // Notify confirmed attendees of the date change (after transaction commits)
      try {
        const confirmedRegs = await Registration.find({ eventId: event._id, status: "confirmed" })
          .populate("userId", "name email");
        const oldDateStr = existingStart
          ? existingStart.toLocaleString("en-US", { dateStyle: "long", timeStyle: "short" })
          : "TBD";
        const newDateStr = newStart
          ? newStart.toLocaleString("en-US", { dateStyle: "long", timeStyle: "short" })
          : "TBD";
        const venueStr = `${event.venue?.name || ""}, ${event.venue?.city || ""}`;
        for (const reg of confirmedRegs) {
          if (reg.userId?.email) {
            sendEventUpdatedEmail({
              to: reg.userId.email,
              name: reg.userId.name,
              eventTitle: event.title,
              oldDate: oldDateStr,
              newDate: newDateStr,
              oldVenue: venueStr,
              newVenue: venueStr,
            });
          }
        }
      } catch { /* email failure must not break the response */ }

      return res.status(200).json({ success: true, message: "Event updated", data: updated });
    }

    // No date change (or no bookingId) — plain update, no transaction needed
    const updated = await Event.findByIdAndUpdate(
      req.params.id,
      { $set: updates },
      { new: true, runValidators: false }
    );

    // Notify confirmed attendees if schedule changed
    if (datesChanged) {
      try {
        const confirmedRegs = await Registration.find({ eventId: event._id, status: "confirmed" })
          .populate("userId", "name email");
        const oldDateStr = existingStart
          ? existingStart.toLocaleString("en-US", { dateStyle: "long", timeStyle: "short" })
          : "TBD";
        const newDateStr = newStart
          ? newStart.toLocaleString("en-US", { dateStyle: "long", timeStyle: "short" })
          : "TBD";
        const venueStr = `${event.venue?.name || ""}, ${event.venue?.city || ""}`;
        for (const reg of confirmedRegs) {
          if (reg.userId?.email) {
            sendEventUpdatedEmail({
              to: reg.userId.email,
              name: reg.userId.name,
              eventTitle: event.title,
              oldDate: oldDateStr,
              newDate: newDateStr,
              oldVenue: venueStr,
              newVenue: venueStr,
            });
          }
        }
      } catch { /* email failure must not break the response */ }
    }

    res.status(200).json({ success: true, message: "Event updated", data: updated });
  } catch (err) {
    if (err.statusCode === 409) {
      return res.status(409).json({ success: false, message: err.message });
    }
    if (err.message?.includes("Transaction numbers") || err.message?.includes("replica set")) {
      return res.status(500).json({ message: "Transactions require MongoDB replica set" });
    }
    next(err);
  } finally {
    session.endSession();
  }
};

// DELETE /api/events/:id (ADMIN/ORGANIZER)
const deleteEvent = async (req, res, next) => {
  try {
    const event = await Event.findById(req.params.id);

    if (!event) { res.status(404); throw new Error("Event not found"); }
    if (!ensureCanModifyEvent(req.user, event)) { res.status(403); throw new Error("Forbidden"); }

    // Cascade: cancel registrations and tickets before deleting
    await Registration.updateMany(
      { eventId: event._id, status: { $in: ["pending", "confirmed"] } },
      { $set: { status: "cancelled" } }
    );
    await Ticket.updateMany(
      { event: event._id, status: "VALID" },
      { $set: { status: "CANCELLED" } }
    );

    // Cancel the linked booking so the venue slot becomes available again
    if (event.bookingId) {
      await Booking.updateOne(
        { _id: event.bookingId },
        { $set: { status: "cancelled" } }
      );
    }

    await event.deleteOne();
    res.status(200).json({ success: true, message: "Event deleted" });
  } catch (err) {
    next(err);
  }
};

// GET /api/events/mine (ORGANIZER — own events, all statuses)
const getMyEvents = async (req, res, next) => {
  try {
    const events = await Event.find({ organizerId: req.user.id })
      .sort({ createdAt: -1 })
      .populate("organizerId", "name email role");

    res.status(200).json({ success: true, message: "My events fetched", data: { items: events } });
  } catch (err) {
    next(err);
  }
};

// PATCH /api/events/:id/submit (ORGANIZER — submit DRAFT for approval)
const submitEventForApproval = async (req, res, next) => {
  try {
    const event = await Event.findById(req.params.id);

    if (!event) { res.status(404); throw new Error("Event not found"); }
    if (event.organizerId.toString() !== req.user.id) { res.status(403); throw new Error("Forbidden"); }
    if (event.status !== "DRAFT") { res.status(400); throw new Error("Only DRAFT events can be submitted for approval"); }

    event.status = "PENDING_APPROVAL";
    await event.save();

    res.status(200).json({ success: true, message: "Event submitted for approval", data: event });
  } catch (err) {
    next(err);
  }
};

// GET /api/events/admin/all (ADMIN — all events, all statuses)
const adminListAllEvents = async (req, res, next) => {
  try {
    const events = await Event.find({})
      .sort({ createdAt: -1 })
      .select("title status schedule venue organizerId")
      .populate("organizerId", "name email");

    res.status(200).json({ success: true, message: "All events fetched", data: { items: events } });
  } catch (err) {
    next(err);
  }
};
const adminListPendingEvents = async (req, res, next) => {
  try {
    const events = await Event.find({ status: "PENDING_APPROVAL" })
      .sort({ createdAt: -1 })
      .populate("organizerId", "name email");

    res.status(200).json({ success: true, message: "Pending events fetched", data: { items: events } });
  } catch (err) {
    next(err);
  }
};

// PATCH /api/events/:id/approve (ADMIN)
const adminApproveEvent = async (req, res, next) => {
  const session = await mongoose.startSession();
  try {
    // Collect result outside the transaction callback so we can respond after commit
    let responseData = null;

    await session.withTransaction(async () => {
      const event = await Event.findById(req.params.id).session(session);
      if (!event) throw Object.assign(new Error("Event not found"), { statusCode: 404 });
      if (event.status !== "PENDING_APPROVAL") throw Object.assign(new Error("Event is not pending approval"), { statusCode: 400 });

      // Verify linked booking
      if (!event.bookingId) throw Object.assign(new Error("Linked booking not found"), { statusCode: 400 });
      const booking = await Booking.findById(event.bookingId).session(session);
      if (!booking) throw Object.assign(new Error("Linked booking not found"), { statusCode: 400 });

      // Race condition guard: check for approved overlap
      const overlap = await Booking.findOne({
        _id: { $ne: booking._id },
        venue: booking.venue,
        status: "approved",
        startDateTime: { $lt: booking.endDateTime },
        endDateTime: { $gt: booking.startDateTime },
      }).session(session);
      if (overlap) throw Object.assign(new Error("Cannot approve: overlaps an approved booking"), { statusCode: 409 });

      // Publish event and approve booking
      event.status = "PUBLISHED";
      event.rejectionReason = null;
      await event.save({ session });

      booking.status = "approved";
      booking.reviewedBy = req.user.id;
      booking.reviewedAt = new Date();
      booking.rejectionReason = undefined;
      await booking.save({ session });

      // Auto-reject conflicting pending bookings
      const conflicting = await Booking.find({
        _id: { $ne: booking._id },
        venue: booking.venue,
        status: "pending",
        startDateTime: { $lt: booking.endDateTime },
        endDateTime: { $gt: booking.startDateTime },
      }).session(session);

      let eventsToDraft = 0;
      if (conflicting.length > 0) {
        const conflictingIds = conflicting.map((b) => b._id);
        await Booking.updateMany(
          { _id: { $in: conflictingIds } },
          { $set: { status: "rejected", reviewedBy: req.user.id, reviewedAt: new Date(), rejectionReason: "Another booking was approved for this time slot." } },
          { session }
        );

        // Return linked events to DRAFT
        const linkedEventIds = conflicting.filter((b) => b.event).map((b) => b.event);
        if (linkedEventIds.length > 0) {
          const result = await Event.updateMany(
            { _id: { $in: linkedEventIds }, status: "PENDING_APPROVAL" },
            { $set: { status: "DRAFT", rejectionReason: "Venue booking was rejected due to a conflicting approval." } },
            { session }
          );
          eventsToDraft = result.modifiedCount;
        }
      }

      responseData = { event, autoRejectedBookings: conflicting.length, eventsToDraft };
    });

    // Respond AFTER the transaction has committed
    res.status(200).json({
      success: true,
      message: "Event approved and published",
      data: responseData.event,
      autoRejectedBookings: responseData.autoRejectedBookings,
      eventsToDraft: responseData.eventsToDraft,
    });

    // Notify organizer after response is sent (non-blocking)
    try {
      const approvedEvent = await Event.findById(req.params.id).populate("organizerId", "name email");
      if (approvedEvent?.organizerId?.email) {
        const eventDate = approvedEvent.schedule?.startDateTime
          ? new Date(approvedEvent.schedule.startDateTime).toLocaleString("en-US", { dateStyle: "long", timeStyle: "short" })
          : "TBD";
        sendEventApprovedEmail({
          to: approvedEvent.organizerId.email,
          name: approvedEvent.organizerId.name,
          eventTitle: approvedEvent.title,
          eventDate,
          eventVenue: `${approvedEvent.venue?.name || ""}, ${approvedEvent.venue?.city || ""}`,
          pricing: approvedEvent.pricing?.type === "FREE" ? "Free" : `NPR ${approvedEvent.pricing?.price?.toLocaleString()}`,
        });
      }
    } catch { /* email failure must not break the response */ }
  } catch (err) {
    if (err.message?.includes("Transaction numbers") || err.message?.includes("replica set")) {
      return res.status(500).json({ success: false, message: "Transactions require MongoDB replica set" });
    }
    if (err.statusCode) res.status(err.statusCode);
    next(err);
  } finally {
    session.endSession();
  }
};

// PATCH /api/events/:id/reject (ADMIN)
const adminRejectEvent = async (req, res, next) => {
  const session = await mongoose.startSession();
  try {
    const { reason } = req.body;
    if (!reason || reason.trim().length < 3) {
      return res.status(400).json({ success: false, message: "Rejection reason is required (min 3 characters)" });
    }
    if (reason.trim().length > 300) {
      return res.status(400).json({ success: false, message: "Rejection reason too long (max 300 characters)" });
    }

    // Collect result outside the transaction callback so we can respond after commit
    let rejectedEvent = null;

    await session.withTransaction(async () => {
      const event = await Event.findById(req.params.id).session(session);
      if (!event) throw Object.assign(new Error("Event not found"), { statusCode: 404 });
      if (event.status !== "PENDING_APPROVAL") throw Object.assign(new Error("Event is not pending approval"), { statusCode: 400 });

      event.status = "DRAFT";
      event.rejectionReason = reason.trim();
      await event.save({ session });

      if (event.bookingId) {
        await Booking.updateOne(
          { _id: event.bookingId },
          { $set: { status: "rejected", reviewedBy: req.user.id, reviewedAt: new Date(), rejectionReason: reason.trim() } },
          { session }
        );
      }

      rejectedEvent = event;
    });

    // Respond AFTER the transaction has committed
    res.status(200).json({ success: true, message: "Event rejected, returned to DRAFT", data: rejectedEvent });

    // Notify organizer after response is sent (non-blocking)
    try {
      const eventWithOrg = await Event.findById(req.params.id).populate("organizerId", "name email");
      if (eventWithOrg?.organizerId?.email) {
        sendEventRejectedEmail({
          to: eventWithOrg.organizerId.email,
          name: eventWithOrg.organizerId.name,
          eventTitle: eventWithOrg.title,
          reason: reason.trim(),
        });
      }
    } catch { /* email failure must not break the response */ }
  } catch (err) {
    if (err.message?.includes("Transaction numbers") || err.message?.includes("replica set")) {
      return res.status(500).json({ success: false, message: "Transactions require MongoDB replica set" });
    }
    if (err.statusCode) res.status(err.statusCode);
    next(err);
  } finally {
    session.endSession();
  }
};

// PATCH /api/events/:id/image (ADMIN/ORGANIZER — upload/update event image)
const uploadEventImage = async (req, res, next) => {
  try {
    const { image } = req.body;
    if (!image || !image.startsWith("data:image/")) {
      res.status(400); throw new Error("Invalid image data");
    }
    if (image.length > 2 * 1024 * 1024 * 1.37) {
      res.status(400); throw new Error("Image too large (max ~2MB)");
    }
    const event = await Event.findById(req.params.id);
    if (!event) { res.status(404); throw new Error("Event not found"); }
    if (!ensureCanModifyEvent(req.user, event)) { res.status(403); throw new Error("Forbidden"); }

    event.image = image;
    // Keep images array in sync — replace first element or add
    if (event.images && event.images.length > 0) {
      event.images[0] = image;
    } else {
      event.images = [image];
    }
    await event.save();
    res.status(200).json({ success: true, message: "Event image updated", data: event });
  } catch (err) {
    next(err);
  }
};

// PATCH /api/events/:id/gallery (ADMIN/ORGANIZER — update full gallery)
const updateEventGallery = async (req, res, next) => {
  try {
    const { images } = req.body;
    if (!Array.isArray(images)) {
      res.status(400); throw new Error("images must be an array");
    }
    if (images.length > 5) {
      res.status(400); throw new Error("Maximum 5 images allowed");
    }
    for (const img of images) {
      if (!img.startsWith("data:image/")) {
        res.status(400); throw new Error("Invalid image data");
      }
      if (img.length > 2 * 1024 * 1024 * 1.37) {
        res.status(400); throw new Error("Each image must be under ~2MB");
      }
    }

    const event = await Event.findById(req.params.id);
    if (!event) { res.status(404); throw new Error("Event not found"); }
    if (!ensureCanModifyEvent(req.user, event)) { res.status(403); throw new Error("Forbidden"); }

    event.images = images;
    // Keep cover image in sync with first gallery image
    event.image = images.length > 0 ? images[0] : "";
    await event.save();
    res.status(200).json({ success: true, message: "Gallery updated", data: event });
  } catch (err) {
    next(err);
  }
};

// PATCH /api/events/:id/capacity (ADMIN/ORGANIZER)
const updateCapacity = async (req, res, next) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) { res.status(404); throw new Error("Event not found"); }
    if (!ensureCanModifyEvent(req.user, event)) { res.status(403); throw new Error("Forbidden"); }

    const newCapacity = parseInt(req.body.capacity, 10);
    if (!newCapacity || newCapacity < 1) {
      res.status(400); throw new Error("Capacity must be at least 1");
    }

    const confirmedCount = event.confirmedCount || 0;
    if (newCapacity < confirmedCount) {
      res.status(400);
      throw new Error(`New capacity cannot be less than current confirmed registrations (${confirmedCount})`);
    }

    // Validate against venue's physical capacity
    const venueDoc = await Venue.findOne({ name: event.venue?.name, "location.city": event.venue?.city });
    if (venueDoc && newCapacity > venueDoc.capacity) {
      res.status(400);
      throw new Error(`Event capacity (${newCapacity}) cannot exceed venue capacity (${venueDoc.capacity})`);
    }

    event.capacity = newCapacity;
    await event.save();
    res.status(200).json({ success: true, message: "Capacity updated", data: event });
  } catch (err) {
    next(err);
  }
};

// PATCH /api/events/:id/cancel (ADMIN/ORGANIZER)
const cancelEvent = async (req, res, next) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) { res.status(404); throw new Error("Event not found"); }
    if (!ensureCanModifyEvent(req.user, event)) { res.status(403); throw new Error("Forbidden"); }
    if (!["PUBLISHED", "PENDING_APPROVAL", "DRAFT"].includes(event.status)) {
      res.status(400); throw new Error("Only PENDING_APPROVAL, DRAFT, or PUBLISHED events can be cancelled");
    }

    if (event.status === "PUBLISHED") {
      // Cascade: cancel all active registrations and valid tickets for published events
      event.status = "CANCELLED";
      await event.save();

      const cancelledRegs = await Registration.find(
        { eventId: event._id, status: { $in: ["confirmed", "pending"] } }
      ).populate("userId", "name email");

      await Registration.updateMany(
        { eventId: event._id, status: { $in: ["confirmed", "pending"] } },
        { $set: { status: "cancelled" } }
      );
      await Ticket.updateMany(
        { event: event._id, status: "VALID" },
        { $set: { status: "CANCELLED" } }
      );

      // Notify all affected attendees (non-blocking)
      try {
        const eventDate = event.schedule?.startDateTime
          ? new Date(event.schedule.startDateTime).toLocaleString("en-US", { dateStyle: "long", timeStyle: "short" })
          : "TBD";
        const eventVenue = `${event.venue?.name || ""}, ${event.venue?.city || ""}`;
        for (const reg of cancelledRegs) {
          if (reg.userId?.email) {
            sendEventCancelledEmail({
              to: reg.userId.email,
              name: reg.userId.name,
              eventTitle: event.title,
              eventDate,
              eventVenue,
            });
          }
        }
      } catch { /* email failure must not break the response */ }
    } else {
      // PENDING_APPROVAL or DRAFT: cancel linked booking if present
      if (event.bookingId) {
        await Booking.updateOne({ _id: event.bookingId }, { $set: { status: "cancelled" } });
      }
      event.status = "CANCELLED";
      await event.save();
    }

    res.status(200).json({ success: true, message: "Event cancelled", data: event });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  createEvent,
  getEvents,
  getEventById,
  getMyEvents,
  updateEvent,
  deleteEvent,
  submitEventForApproval,
  adminListAllEvents,
  adminListPendingEvents,
  adminApproveEvent,
  adminRejectEvent,
  uploadEventImage,
  updateCapacity,
  cancelEvent,
  updateEventGallery,
};
