/**
 * Payment Expiry Job
 *
 * Runs periodically to cancel pending paid registrations and their
 * associated pending payments that have exceeded the expiry window.
 *
 * Default expiry: 30 minutes after registration creation.
 * Call startPaymentExpiryJob() once on server startup.
 */

const Registration = require("../models/Registration");
const Payment = require("../models/Payment");
const { sendRegistrationCancelledEmail } = require("./emailService");

const EXPIRY_MINUTES = 30;
const INTERVAL_MS = 5 * 60 * 1000; // run every 5 minutes

const expireStalePayments = async () => {
  try {
    const cutoff = new Date(Date.now() - EXPIRY_MINUTES * 60 * 1000);

    // Find pending registrations older than the cutoff that have no successful payment
    const staleRegs = await Registration.find({
      status: "pending",
      createdAt: { $lt: cutoff },
    }).populate("userId", "name email").populate("eventId", "title schedule venue");

    if (staleRegs.length === 0) return;

    for (const reg of staleRegs) {
      // Check if a successful payment exists — if so, skip (khalti verify may be in progress)
      const successPayment = await Payment.findOne({
        registrationId: reg._id,
        status: "success",
      });
      if (successPayment) continue;

      // Cancel the registration
      await Registration.updateOne({ _id: reg._id }, { $set: { status: "cancelled" } });

      // Mark any pending payments as failed
      await Payment.updateMany(
        { registrationId: reg._id, status: "pending" },
        { $set: { status: "failed" } }
      );

      // Notify the attendee (non-blocking)
      try {
        if (reg.userId?.email && reg.eventId) {
          const eventDate = reg.eventId.schedule?.startDateTime
            ? new Date(reg.eventId.schedule.startDateTime).toLocaleString("en-US", { dateStyle: "long", timeStyle: "short" })
            : "TBD";
          sendRegistrationCancelledEmail({
            to: reg.userId.email,
            name: reg.userId.name,
            eventTitle: reg.eventId.title,
            eventDate,
            eventVenue: `${reg.eventId.venue?.name || ""}, ${reg.eventId.venue?.city || ""}`,
            reason: "Payment was not completed within 30 minutes. Please register again.",
          });
        }
      } catch { /* email failure must not stop the job */ }
    }

    if (staleRegs.length > 0) {
      console.log(`[PaymentExpiry] Expired ${staleRegs.length} stale pending registration(s)`);
    }
  } catch (err) {
    console.error("[PaymentExpiry] Job error:", err.message);
  }
};

const startPaymentExpiryJob = () => {
  console.log(`[PaymentExpiry] Started — checking every 5 min, expiry: ${EXPIRY_MINUTES} min`);
  setInterval(expireStalePayments, INTERVAL_MS);
  // Also run immediately on startup to catch any stale records from before restart
  expireStalePayments();
};

module.exports = { startPaymentExpiryJob };
