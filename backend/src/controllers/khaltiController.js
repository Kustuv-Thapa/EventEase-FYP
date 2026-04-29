const axios = require("axios");
const QRCode = require("qrcode");
const { v4: uuidv4 } = require("uuid");

const Payment = require("../models/Payment");
const Registration = require("../models/Registration");
const Event = require("../models/Event");
const Ticket = require("../models/Ticket");
const User = require("../models/User");
const { sendPaymentConfirmationEmail } = require("../utils/emailService");

const khaltiHeaders = () => ({
  Authorization: `key ${process.env.KHALTI_SECRET_KEY}`,
  "Content-Type": "application/json",
});

// ── Helper: create ticket if not already exists ──
const createTicketIfNotExists = async (registration) => {
  try {
    const existing = await Ticket.findOne({ registration: registration._id });
    if (existing) return existing;

    const ticketId = uuidv4();
    const qrPayload = JSON.stringify({
      ticketId,
      eventId: String(registration.eventId),
      registrationId: String(registration._id),
    });
    const qrCode = await QRCode.toDataURL(qrPayload);

    return await Ticket.create({
      user: registration.userId,
      event: registration.eventId,
      registration: registration._id,
      ticketId,
      qrCode,
      status: "VALID",
    });
  } catch (err) {
    if (err.code === 11000) {
      return await Ticket.findOne({ registration: registration._id });
    }
    throw err;
  }
};

// ── 1. Initiate Khalti payment ──
exports.initiateKhaltiPayment = async (req, res, next) => {
  try {
    const { registrationId } = req.body;

    if (!registrationId) {
      return res.status(400).json({ success: false, message: "registrationId is required" });
    }

    const registration = await Registration.findById(registrationId);
    if (!registration) {
      return res.status(404).json({ success: false, message: "Registration not found" });
    }

    if (registration.userId.toString() !== req.user.id) {
      return res.status(403).json({ success: false, message: "Forbidden" });
    }

    if (req.user.role === "ADMIN") {
      return res.status(403).json({ success: false, message: "Admins cannot purchase tickets" });
    }

    if (registration.status === "confirmed") {
      return res.status(400).json({ success: false, message: "Registration is already confirmed" });
    }

    const existingSuccess = await Payment.findOne({
      registrationId: registration._id,
      status: "success",
      method: "khalti",
    });
    if (existingSuccess) {
      return res.status(400).json({ success: false, message: "Payment already completed" });
    }

    const event = await Event.findById(registration.eventId);
    if (!event) {
      return res.status(404).json({ success: false, message: "Event not found" });
    }

    const amount = event.pricing?.type === "PAID" ? event.pricing.price : 0;
    if (!amount || amount <= 0) {
      return res.status(400).json({ success: false, message: "Invalid event amount" });
    }

    const amountInPaisa = amount * 100;
    const purchaseOrderId = `ORDER-${Date.now()}-${Math.floor(Math.random() * 100000)}`;

    const khaltiRes = await axios.post(
      `${process.env.KHALTI_BASE_URL}/epayment/initiate/`,
      {
        return_url: process.env.KHALTI_RETURN_URL,
        website_url: process.env.FRONTEND_URL,
        amount: amountInPaisa,
        purchase_order_id: purchaseOrderId,
        purchase_order_name: event.title,
        customer_info: {
          name: req.user.name || "Customer",
          email: req.user.email || "",
        },
      },
      { headers: khaltiHeaders() }
    );

    const { pidx, payment_url } = khaltiRes.data;

    await Payment.create({
      userId: registration.userId,
      eventId: registration.eventId,
      registrationId: registration._id,
      amount,
      status: "pending",
      productId: purchaseOrderId,
      method: "khalti",
      transactionId: pidx,
    });

    return res.status(201).json({
      success: true,
      message: "Payment initiated",
      payment_url,
      pidx,
    });
  } catch (error) {
    console.error("[Khalti] Initiate error:", JSON.stringify(error.response?.data || error.message));
    if (error.response?.data) {
      return res.status(error.response.status || 400).json({
        success: false,
        message: "Khalti error",
        details: error.response.data,
      });
    }
    next(error);
  }
};

// ── 2. Verify Khalti payment (called from frontend after redirect) ──
exports.verifyKhaltiPayment = async (req, res, next) => {
  try {
    const { pidx } = req.body;

    if (!pidx) {
      return res.status(400).json({ success: false, message: "pidx is required" });
    }

    // Step 1: Verify with Khalti — do this BEFORE opening a transaction
    const lookupRes = await axios.post(
      `${process.env.KHALTI_BASE_URL}/epayment/lookup/`,
      { pidx },
      { headers: khaltiHeaders() }
    );

    const { status, transaction_id, total_amount } = lookupRes.data;

    if (status !== "Completed") {
      return res.status(400).json({ success: false, message: `Payment not completed. Status: ${status}` });
    }

    // Step 2: Find the payment record — must exist before we open a transaction
    const payment = await Payment.findOne({ transactionId: pidx });
    if (!payment) {
      return res.status(404).json({ success: false, message: "Payment record not found" });
    }

    if (payment.status === "success") {
      return res.status(200).json({ success: true, message: "Payment already verified" });
    }

    const expectedPaisa = payment.amount * 100;
    if (total_amount !== expectedPaisa) {
      // Mark as failed — no transaction needed, single document update
      payment.status = "failed";
      payment.verificationResponse = { reason: "Amount mismatch", khaltiAmount: total_amount, expected: expectedPaisa };
      await payment.save();
      return res.status(400).json({ success: false, message: "Amount mismatch" });
    }

    // Step 3: Find the registration — must exist before we open a transaction
    const registration = await Registration.findById(payment.registrationId);
    if (!registration) {
      // Mark payment as failed since we can't fulfil the registration
      payment.status = "failed";
      payment.verificationResponse = { reason: "Registration not found" };
      await payment.save();
      return res.status(404).json({ success: false, message: "Registration not found — payment marked as failed" });
    }

    // Step 4: Atomically update payment + registration + ticket
    const mongoose = require("mongoose");
    const session = await mongoose.startSession();
    let ticket;

    try {
      await session.withTransaction(async () => {
        // Update payment
        payment.status = "success";
        payment.verificationResponse = lookupRes.data;
        payment.transactionId = transaction_id || pidx;
        await payment.save({ session });

        // Confirm registration and increment count (idempotent)
        if (registration.status !== "confirmed") {
          registration.status = "confirmed";
          registration.decidedAt = new Date();
          await registration.save({ session });
          await Event.findByIdAndUpdate(
            registration.eventId,
            { $inc: { confirmedCount: 1 } },
            { session }
          );
        }

        // Create ticket (idempotent)
        const existing = await Ticket.findOne({ registration: registration._id }).session(session);
        if (existing) {
          ticket = existing;
        } else {
          const ticketId = uuidv4();
          const qrPayload = JSON.stringify({
            ticketId,
            eventId: String(registration.eventId),
            registrationId: String(registration._id),
          });
          const qrCode = await QRCode.toDataURL(qrPayload);

          try {
            [ticket] = await Ticket.create(
              [{ user: registration.userId, event: registration.eventId, registration: registration._id, ticketId, qrCode, status: "VALID" }],
              { session }
            );
          } catch (err) {
            if (err.code === 11000) {
              ticket = await Ticket.findOne({ registration: registration._id }).session(session);
            } else {
              throw err;
            }
          }
        }
      });
    } catch (txErr) {
      // Transaction failed — if not a replica set issue, the payment is still pending
      if (txErr.message?.includes("Transaction numbers") || txErr.message?.includes("replica set")) {
        // Fallback: non-transactional update (best-effort)
        payment.status = "success";
        payment.verificationResponse = lookupRes.data;
        payment.transactionId = transaction_id || pidx;
        await payment.save();

        if (registration.status !== "confirmed") {
          registration.status = "confirmed";
          registration.decidedAt = new Date();
          await registration.save();
          await Event.findByIdAndUpdate(registration.eventId, { $inc: { confirmedCount: 1 } });
        }

        ticket = await createTicketIfNotExists(registration);
      } else {
        throw txErr;
      }
    } finally {
      session.endSession();
    }

    // Step 5: Send confirmation email (non-blocking — never fails the response)
    try {
      const user = await User.findById(registration.userId).select("name email");
      const event = await Event.findById(registration.eventId).select("title schedule");
      if (user && event) {
        sendPaymentConfirmationEmail({
          to: user.email,
          name: user.name,
          eventTitle: event.title,
          amount: payment.amount,
          ticketId: ticket?.ticketId,
        });
      }
    } catch { /* email failure must never break the response */ }

    return res.status(200).json({ success: true, message: "Payment verified and ticket issued" });
  } catch (error) {
    console.error("[Khalti] Verify error:", error.response?.data || error.message);
    next(error);
  }
};
