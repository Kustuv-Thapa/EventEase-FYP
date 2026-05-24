const Event = require("../models/Event");
const Registration = require("../models/Registration");
const Payment = require("../models/Payment");

const runEventCompletionJob = async () => {
  try {
    // Find all PUBLISHED events whose endDateTime has passed
    const expiredEvents = await Event.find({
      status: "PUBLISHED",
      "schedule.endDateTime": { $lt: new Date() },
    }).select("_id");

    if (expiredEvents.length === 0) return;

    const eventIds = expiredEvents.map((e) => e._id);

    // Cancel pending registrations that have no active payment.
    // Skip registrations that have a "success" OR "pending" payment:
    //   - "success"  → payment verified, registration should be confirmed (not cancelled)
    //   - "pending"  → payment verification may still be in-flight; cancelling now
    //                  would orphan a real payment and lose the user's money.
    const pendingRegs = await Registration.find({
      eventId: { $in: eventIds },
      status: "pending",
    }).select("_id");

    if (pendingRegs.length > 0) {
      const pendingRegIds = pendingRegs.map((r) => r._id);

      // Find registrations that have an active payment (success OR pending)
      const activePaymentRegIds = await Payment.distinct("registrationId", {
        registrationId: { $in: pendingRegIds },
        status: { $in: ["success", "pending"] },
      });

      const activeSet = new Set(activePaymentRegIds.map(String));
      const safeToCancel = pendingRegIds.filter((id) => !activeSet.has(String(id)));

      if (safeToCancel.length > 0) {
        await Registration.updateMany(
          { _id: { $in: safeToCancel } },
          { $set: { status: "cancelled" } }
        );
        console.log(`[EventJob] Cancelled ${safeToCancel.length} pending registration(s) with no active payment`);
      }
    }

    // Mark events as COMPLETED
    const result = await Event.updateMany(
      { _id: { $in: eventIds } },
      { $set: { status: "COMPLETED" } }
    );

    if (result.modifiedCount > 0) {
      console.log(`[EventJob] Marked ${result.modifiedCount} event(s) as COMPLETED`);
    }
  } catch (err) {
    console.error("[EventJob] Error:", err.message);
  }
};

const startEventCompletionJob = () => {
  // Run immediately on startup
  runEventCompletionJob();
  // Then every 60 seconds
  setInterval(runEventCompletionJob, 60 * 1000);
};

module.exports = { startEventCompletionJob };
