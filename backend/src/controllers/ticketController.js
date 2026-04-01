const Ticket = require("../models/Ticket");
const Event = require("../models/Event");
const Registration = require("../models/Registration");
const QRCode = require("qrcode");
const { v4: uuidv4 } = require("uuid");

// Internal helper: create ticket after registration approval
const createTicket = async ({ userId, eventId, registrationId }) => {
  const existing = await Ticket.findOne({ registration: registrationId });
  if (existing) return existing;

  const registration = await Registration.findById(registrationId);
  if (!registration) {
    throw new Error("Registration not found for ticket creation");
  }

  const event = await Event.findById(eventId);
  if (!event) {
    throw new Error("Event not found for ticket creation");
  }

  const ticketId = uuidv4();

  // QR can encode ticketId or backend verification path
  const qrPayload = JSON.stringify({
    ticketId,
    eventId: String(eventId),
    registrationId: String(registrationId),
  });

  const qrCode = await QRCode.toDataURL(qrPayload);

  const ticket = await Ticket.create({
    user: userId,
    event: eventId,
    registration: registrationId,
    ticketId,
    qrCode,
    status: "VALID",
  });

  return ticket;
};

// GET /api/tickets/my
const getUserTickets = async (req, res, next) => {
  try {
    const tickets = await Ticket.find({ user: req.user.id })
      .sort({ createdAt: -1 })
      .populate({
        path: "event",
        select: "title venue schedule status pricing organizerId",
      })
      .populate({
        path: "registration",
        select: "status note decidedAt createdAt",
      });

    res.status(200).json({
      success: true,
      message: "My tickets fetched",
      data: tickets,
    });
  } catch (err) {
    next(err);
  }
};

// POST /api/tickets/verify/:ticketId
const verifyTicket = async (req, res, next) => {
  try {
    const { ticketId } = req.params;

    const ticket = await Ticket.findOne({ ticketId })
      .populate({
        path: "event",
        select: "title organizerId status schedule venue",
      })
      .populate({
        path: "user",
        select: "name email",
      })
      .populate({
        path: "registration",
        select: "status",
      });

    if (!ticket) {
      res.status(404);
      throw new Error("Ticket not found");
    }

    if (!ticket.event) {
      res.status(404);
      throw new Error("Associated event not found");
    }

    const userRole = String(req.user.role || "").toUpperCase();

    // Only organizers and admins can verify tickets
    if (userRole !== "ORGANIZER" && userRole !== "ADMIN") {
      res.status(403);
      throw new Error("Forbidden: only organizers can verify tickets");
    }

    // Organizer can verify only their own event tickets
    if (userRole === "ORGANIZER") {
      if (ticket.event.organizerId.toString() !== req.user.id) {
        res.status(403);
        throw new Error("You can verify tickets only for your own events");
      }
    }

    if (ticket.status === "USED") {
      return res.status(200).json({
        success: false,
        message: "Ticket already used",
        data: ticket,
      });
    }

    if (ticket.status === "CANCELLED") {
      return res.status(200).json({
        success: false,
        message: "Ticket cancelled — registration was cancelled",
        data: ticket,
      });
    }

    ticket.status = "USED";
    await ticket.save();

    res.status(200).json({
      success: true,
      message: "Ticket verified successfully — welcome in",
      data: ticket,
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  createTicket,
  getUserTickets,
  verifyTicket,
};