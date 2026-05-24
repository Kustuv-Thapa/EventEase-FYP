const mongoose = require("mongoose");
const Event = require("../models/Event");
const Registration = require("../models/Registration");
const Ticket = require("../models/Ticket");
const Payment = require("../models/Payment");
const { zeroFill } = require("../utils/zeroFill");

const VALID_WINDOWS = { "7d": 7, "30d": 30, "90d": 90 };

/**
 * GET /api/analytics/organizer
 * Returns aggregated analytics for the authenticated organizer.
 */
const getOrganizerAnalytics = async (req, res, next) => {
  try {
    // 1. Validate timeWindow
    const rawWindow = req.query.timeWindow;
    let timeWindow;
    if (!rawWindow) {
      timeWindow = "30d";
    } else if (VALID_WINDOWS[rawWindow] !== undefined) {
      timeWindow = rawWindow;
    } else {
      return res.status(400).json({ message: "Invalid timeWindow. Valid values: 7d, 30d, 90d" });
    }
    const windowDays = VALID_WINDOWS[timeWindow];

    // 2. Resolve organizerId
    const organizerId = new mongoose.Types.ObjectId(req.user.id);

    // 3. Fetch owned event IDs
    const ownedEvents = await Event.find({ organizerId }).select("_id");
    const ownedEventIds = ownedEvents.map((e) => e._id);

    // 4. Run four aggregation pipelines in parallel
    const [revenueResult, ticketResult, registrationResult, perEventResult] = await Promise.all([
      // 4a. Revenue: sum of successful payments
      Payment.aggregate([
        { $match: { eventId: { $in: ownedEventIds }, status: "success" } },
        { $group: { _id: null, total: { $sum: "$amount" } } },
      ]),

      // 4b. Ticket counts grouped by status (VALID + USED)
      Ticket.aggregate([
        { $match: { event: { $in: ownedEventIds }, status: { $in: ["VALID", "USED"] } } },
        { $group: { _id: "$status", count: { $sum: 1 } } },
      ]),

      // 4c. Registration counts grouped by status
      Registration.aggregate([
        { $match: { eventId: { $in: ownedEventIds } } },
        { $group: { _id: "$status", count: { $sum: 1 } } },
      ]),

      // 4d. Per-event breakdown
      // IMPORTANT: $lookup pipeline variables bound via `let` must be referenced
      // with "$$varName" (double dollar). Using "$varName" (single dollar) refers
      // to the pipeline document field, not the let-bound variable — causing the
      // join to always return empty arrays.
      Event.aggregate([
        { $match: { organizerId } },
        {
          $lookup: {
            from: "registrations",
            let: { eventId: "$_id" },
            pipeline: [
              { $match: { $expr: { $eq: ["$eventId", "$$eventId"] } } },
              { $group: { _id: "$status", count: { $sum: 1 } } },
            ],
            as: "registrationGroups",
          },
        },
        {
          $lookup: {
            from: "tickets",
            let: { eventId: "$_id" },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $and: [
                      { $eq: ["$event", "$$eventId"] },
                      { $in: ["$status", ["VALID", "USED"]] },
                    ],
                  },
                },
              },
              { $group: { _id: "$status", count: { $sum: 1 } } },
            ],
            as: "ticketGroups",
          },
        },
        {
          $lookup: {
            from: "payments",
            let: { eventId: "$_id" },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $and: [
                      { $eq: ["$eventId", "$$eventId"] },
                      { $eq: ["$status", "success"] },
                    ],
                  },
                },
              },
              { $group: { _id: null, total: { $sum: "$amount" } } },
            ],
            as: "paymentGroups",
          },
        },
        { $sort: { "schedule.startDateTime": -1 } },
        {
          $project: {
            _id: 1,
            title: 1,
            status: 1,
            startDate: "$schedule.startDateTime",
            registrationGroups: 1,
            ticketGroups: 1,
            paymentGroups: 1,
          },
        },
      ]),
    ]);

    // 5. Compute windowStart for trend queries
    const windowStart = new Date();
    windowStart.setDate(windowStart.getDate() - windowDays);

    // 6. Run two trend pipelines in parallel
    const [registrationTrendRaw, revenueTrendRaw] = await Promise.all([
      // 6a. Registration trend
      Registration.aggregate([
        {
          $match: {
            eventId: { $in: ownedEventIds },
            createdAt: { $gte: windowStart },
          },
        },
        {
          $group: {
            _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt", timezone: "UTC" } },
            count: { $sum: 1 },
          },
        },
      ]),

      // 6b. Revenue trend
      Payment.aggregate([
        {
          $match: {
            eventId: { $in: ownedEventIds },
            status: "success",
            createdAt: { $gte: windowStart },
          },
        },
        {
          $group: {
            _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt", timezone: "UTC" } },
            amount: { $sum: "$amount" },
          },
        },
      ]),
    ]);

    // 7. Compute summary metrics
    const totalRevenue = revenueResult[0]?.total ?? 0;

    const ticketByStatus = {};
    for (const t of ticketResult) ticketByStatus[t._id] = t.count;
    const validCount = ticketByStatus["VALID"] ?? 0;
    const usedCount = ticketByStatus["USED"] ?? 0;
    const totalTicketSales = validCount + usedCount;

    const regByStatus = {};
    for (const r of registrationResult) regByStatus[r._id] = r.count;
    const totalConfirmedRegistrations = regByStatus["confirmed"] ?? 0;
    const totalPendingRegistrations = regByStatus["pending"] ?? 0;
    const totalCancelledRegistrations = regByStatus["cancelled"] ?? 0;

    const overallCheckInRate =
      totalTicketSales === 0
        ? 0
        : Math.round((usedCount / totalTicketSales) * 100 * 100) / 100;

    const summary = {
      totalRevenue,
      totalTicketSales,
      totalConfirmedRegistrations,
      totalPendingRegistrations,
      totalCancelledRegistrations,
      overallCheckInRate,
    };

    // 8. Shape per-event breakdown
    const perEventBreakdown = perEventResult.map((ev) => {
      const evRegByStatus = {};
      for (const r of ev.registrationGroups) evRegByStatus[r._id] = r.count;
      const confirmedRegistrations = evRegByStatus["confirmed"] ?? 0;
      const pendingRegistrations = evRegByStatus["pending"] ?? 0;
      const cancelledRegistrations = evRegByStatus["cancelled"] ?? 0;

      const evTicketByStatus = {};
      for (const t of ev.ticketGroups) evTicketByStatus[t._id] = t.count;
      const evValidCount = evTicketByStatus["VALID"] ?? 0;
      const evUsedCount = evTicketByStatus["USED"] ?? 0;
      const ticketSales = evValidCount + evUsedCount;
      const checkIns = evUsedCount;

      const checkInRate =
        ticketSales === 0
          ? 0
          : Math.round((checkIns / ticketSales) * 100 * 100) / 100;

      const revenue = ev.paymentGroups[0]?.total ?? 0;

      return {
        eventId: ev._id.toString(),
        title: ev.title,
        status: ev.status,
        startDate: ev.startDate,
        confirmedRegistrations,
        pendingRegistrations,
        cancelledRegistrations,
        ticketSales,
        checkIns,
        checkInRate,
        revenue,
      };
    });

    // 9. Zero-fill trend arrays
    const registrationTrend = zeroFill(registrationTrendRaw, windowDays, "count");
    const revenueTrend = zeroFill(revenueTrendRaw, windowDays, "amount");

    return res.status(200).json({
      success: true,
      data: {
        summary,
        perEventBreakdown,
        registrationTrend,
        revenueTrend,
      },
    });
  } catch (err) {
    next(err);
  }
};

module.exports = { getOrganizerAnalytics };
