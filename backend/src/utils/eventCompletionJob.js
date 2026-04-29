const Event = require("../models/Event");
const Registration = require("../models/Registration");

const runEventCompletionJob = async () => {
  try {
    // Find all PUBLISHED events whose endDateTime has passed
    const expiredEvents = await Event.find({
      status: "PUBLISHED",
      "schedule.endDateTime": { $lt: new Date() },
    }).select("_id");

    if (expiredEvents.length === 0) return;

    const eventIds = expiredEvents.map((e) => e._id);

    // Cancel any pending registrations for these events (unpaid)
    await Registration.updateMany(
      { eventId: { $in: eventIds }, status: "pending" },
      { $set: { status: "cancelled" } }
    );

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
