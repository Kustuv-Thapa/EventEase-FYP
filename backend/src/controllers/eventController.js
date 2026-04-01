const Event = require("../models/Event");
const Registration = require("../models/Registration");
const Ticket = require("../models/Ticket");
const Venue = require("../models/Venue");

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
  try {
    const { title, description, genre, venue, schedule, capacity, budget, pricing } = req.body || {};

    if (!title || !venue || !schedule || !capacity) {
      res.status(400);
      throw new Error("title, venue, schedule, and capacity are required");
    }

    // Validate capacity against venue's physical capacity
    const venueDoc = await Venue.findOne({ name: venue.name, "location.city": venue.city });
    if (venueDoc && capacity > venueDoc.capacity) {
      res.status(400);
      throw new Error(`Event capacity (${capacity}) cannot exceed venue capacity (${venueDoc.capacity})`);
    }

    // Organizers always start at DRAFT; only admin can set status directly
    const status = req.user.role === "ADMIN" ? (req.body.status || "DRAFT") : "DRAFT";

    const event = await Event.create({
      organizerId: req.user.id,
      title, description, genre, venue, schedule, capacity, budget, pricing, status,
    });

    res.status(201).json({ success: true, message: "Event created", data: event });
  } catch (err) {
    next(err);
  }
};

// GET /api/events (PUBLIC) — only PUBLISHED
const getEvents = async (req, res, next) => {
  try {
    const page = Math.max(parseInt(req.query.page || "1", 10), 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit || "10", 10), 1), 50);
    const skip = (page - 1) * limit;

    const filters = { status: "PUBLISHED" };

    if (req.query.city) filters["venue.city"] = req.query.city;

    if (req.query.search) {
      const q = req.query.search.trim();
      filters.$or = [
        { title: { $regex: q, $options: "i" } },
        { description: { $regex: q, $options: "i" } },
        { genre: { $in: [new RegExp(q, "i")] } },
      ];
    }

    const [items, total] = await Promise.all([
      Event.find(filters).sort({ createdAt: -1 }).skip(skip).limit(limit).populate("organizerId", "name email role"),
      Event.countDocuments(filters),
    ]);

    // Attach registeredCount (use confirmedCount from model, fallback to countDocuments)
    const itemsWithCount = items.map((ev) => {
      const obj = ev.toObject();
      obj.registeredCount = ev.confirmedCount || 0;
      return obj;
    });

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

    if (!event || event.status !== "PUBLISHED") {
      res.status(404);
      throw new Error("Event not found");
    }

    const obj = event.toObject();
    obj.registeredCount = event.confirmedCount || 0;

    res.status(200).json({ success: true, message: "Event fetched", data: obj });
  } catch (err) {
    next(err);
  }
};

// PUT /api/events/:id (ADMIN/ORGANIZER)
const updateEvent = async (req, res, next) => {
  try {
    const event = await Event.findById(req.params.id);

    if (!event) { res.status(404); throw new Error("Event not found"); }
    if (!ensureCanModifyEvent(req.user, event)) { res.status(403); throw new Error("Forbidden"); }

    const allowed = ["title", "description", "genre", "venue", "schedule", "capacity", "budget", "pricing"];
    // Organizers cannot directly set status to PUBLISHED
    if (req.user.role === "ADMIN") allowed.push("status");

    const updates = {};
    for (const key of allowed) {
      if (req.body && typeof req.body[key] !== "undefined") {
        updates[key] = req.body[key];
      }
    }

    const updated = await Event.findByIdAndUpdate(
      req.params.id,
      { $set: updates },
      { new: true, runValidators: false }
    );
    res.status(200).json({ success: true, message: "Event updated", data: updated });
  } catch (err) {
    next(err);
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

// GET /api/events/admin/pending (ADMIN — list PENDING_APPROVAL events)
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
  try {
    const event = await Event.findById(req.params.id);

    if (!event) { res.status(404); throw new Error("Event not found"); }
    if (event.status !== "PENDING_APPROVAL") { res.status(400); throw new Error("Event is not pending approval"); }

    event.status = "PUBLISHED";
    await event.save();

    res.status(200).json({ success: true, message: "Event approved and published", data: event });
  } catch (err) {
    next(err);
  }
};

// PATCH /api/events/:id/reject (ADMIN)
const adminRejectEvent = async (req, res, next) => {
  try {
    const event = await Event.findById(req.params.id);

    if (!event) { res.status(404); throw new Error("Event not found"); }
    if (event.status !== "PENDING_APPROVAL") { res.status(400); throw new Error("Event is not pending approval"); }

    event.status = "DRAFT";
    await event.save();

    res.status(200).json({ success: true, message: "Event rejected, returned to DRAFT", data: event });
  } catch (err) {
    next(err);
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
    await event.save();
    res.status(200).json({ success: true, message: "Event image updated", data: event });
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
    if (event.status !== "PUBLISHED") {
      res.status(400); throw new Error("Only PUBLISHED events can be cancelled");
    }

    event.status = "CANCELLED";
    await event.save();

    // Cascade: cancel confirmed registrations and valid tickets
    await Registration.updateMany(
      { eventId: event._id, status: "confirmed" },
      { $set: { status: "cancelled" } }
    );
    await Ticket.updateMany(
      { event: event._id, status: "VALID" },
      { $set: { status: "CANCELLED" } }
    );

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
  adminListPendingEvents,
  adminApproveEvent,
  adminRejectEvent,
  uploadEventImage,
  updateCapacity,
  cancelEvent,
};
