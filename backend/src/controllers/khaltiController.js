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

// ── Helper: initiate Khalti refund (best-effort, non-blocking) ──
const initiateKhaltiRefund = async (pidx) => {
  try {
    await axios.post(
      `${process.env.KHALTI_BASE_URL}/epayment/initiate-refund/`,
      { pidx },
      { headers: khaltiHeaders() }
    );
    console.log(`[Khalti] Refund initiated for pidx: ${pidx}`);
  } catch (err) {
    console.error("[Khalti] Refund initiation failed for pidx:", pidx, err.response?.data || err.message);
  }
};

// ── Helper: create ticket if not already exists, reactivate if cancelled ──
const createTicketIfNotExists = async (registration) => {
  try {
    const existing = await Ticket.findOne({ registration: registration._id });
    if (existing) {
      if (existing.status !== "VALID") {
        await Ticket.updateOne({ _id: existing._id }, { $set: { status: "VALID" } });
        return { ...existing.toObject(), status: "VALID" };
      }
      return existing;
    }

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
      const found = await Ticket.findOne({ registration: registration._id });
      if (found && found.status !== "VALID") {
        await Ticket.updateOne({ _id: found._id }, { $set: { status: "VALID" } });
        return { ...found.toObject(), status: "VALID" };
      }
      return found;
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

    // Block duplicate pending payment within a 2-minute window to prevent double-clicks.
    // After 2 minutes the session is considered abandoned (user cancelled on Khalti page)
    // and we mark it failed to allow a clean retry.
    const existingPending = await Payment.findOne({
      registrationId: registration._id,
      status: "pending",
      method: "khalti",
    });
    if (existingPending) {
      const ageMs = Date.now() - new Date(existingPending.createdAt).getTime();
      if (ageMs < 2 * 60 * 1000) {
        return res.status(400).json({ success: false, message: "A payment is already in progress for this registration. Please complete or wait for it to expire." });
      }
      // Older than 2 minutes — treat as abandoned, mark failed and allow retry
      await Payment.updateOne({ _id: existingPending._id }, { $set: { status: "failed" } });
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
      // Log full Khalti error server-side but return a generic message to the client
      // to avoid leaking internal API structure or credentials.
      return res.status(error.response.status || 400).json({
        success: false,
        message: "Payment initiation failed. Please try again.",
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
        // Re-fetch payment and registration INSIDE the session for safe transactional writes
        const paymentInSession = await Payment.findById(payment._id).session(session);
        const registrationInSession = await Registration.findById(registration._id).session(session);

        if (!paymentInSession || !registrationInSession) {
          throw new Error("Payment or registration disappeared during transaction");
        }

        // Update payment
        paymentInSession.status = "success";
        paymentInSession.verificationResponse = lookupRes.data;
        paymentInSession.transactionId = transaction_id || pidx;
        await paymentInSession.save({ session });

        // Confirm registration and increment count (idempotent)
        if (registrationInSession.status !== "confirmed") {
          registrationInSession.status = "confirmed";
          registrationInSession.decidedAt = new Date();
          await registrationInSession.save({ session });
          await Event.findByIdAndUpdate(
            registrationInSession.eventId,
            { $inc: { confirmedCount: 1 } },
            { session }
          );
        }

        // Create ticket (idempotent — reactivate if cancelled, create if missing)
        const existing = await Ticket.findOne({ registration: registrationInSession._id }).session(session);
        if (existing) {
          if (existing.status !== "VALID") {
            await Ticket.updateOne(
              { _id: existing._id },
              { $set: { status: "VALID" } },
              { session }
            );
            ticket = { ...existing.toObject(), status: "VALID" };
          } else {
            ticket = existing;
          }
        } else {
          const ticketId = uuidv4();
          const qrPayload = JSON.stringify({
            ticketId,
            eventId: String(registrationInSession.eventId),
            registrationId: String(registrationInSession._id),
          });
          const qrCode = await QRCode.toDataURL(qrPayload);

          try {
            [ticket] = await Ticket.create(
              [{ user: registrationInSession.userId, event: registrationInSession.eventId, registration: registrationInSession._id, ticketId, qrCode, status: "VALID" }],
              { session }
            );
          } catch (err) {
            if (err.code === 11000) {
              ticket = await Ticket.findOne({ registration: registrationInSession._id }).session(session);
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
      const event = await Event.findById(registration.eventId).select("title schedule venue");
      if (user && event) {
        const eventDate = event.schedule?.startDateTime
          ? new Date(event.schedule.startDateTime).toLocaleString("en-US", { dateStyle: "long", timeStyle: "short" })
          : "TBD";
        const eventVenue = event.venue?.name
          ? `${event.venue.name}${event.venue.city ? `, ${event.venue.city}` : ""}`
          : undefined;
        await sendPaymentConfirmationEmail({
          to: user.email,
          name: user.name,
          eventTitle: event.title,
          amount: payment.amount,
          ticketId: ticket?.ticketId,
          eventDate,
          eventVenue,
        });
      }
    } catch (err) {
      console.error("[Email] Payment confirmation email failed:", err.message);
    }

    return res.status(200).json({ success: true, message: "Payment verified and ticket issued" });
  } catch (error) {
    console.error("[Khalti] Verify error:", error.response?.data || error.message);
    next(error);
  }
};

// Export refund helper so registrationController can call it
exports.initiateKhaltiRefund = initiateKhaltiRefund;
