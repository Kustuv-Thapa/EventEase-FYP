const mongoose = require("mongoose");
const Feedback = require("../models/Feedback");
const Event = require("../models/Event");
const Registration = require("../models/Registration");

// ─── Shared validation helper ────────────────────────────────────────────────

function validateRatingAndReview(rating, review, res) {
  if (rating !== undefined) {
    if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
      res.status(400);
      throw new Error("Rating must be an integer between 1 and 5.");
    }
  }
  if (review !== undefined && review !== null) {
    if (typeof review === "string" && review.length > 1000) {
      res.status(400);
      throw new Error("Review must not exceed 1000 characters.");
    }
  }
}

// ─── Shared aggregation builder ───────────────────────────────────────────────

function buildFeedbackAggregation(eventId, approvedOnly) {
  const matchStage = { eventId: new mongoose.Types.ObjectId(eventId) };
  if (approvedOnly) {
    matchStage.status = "approved";
  }

  return [
    { $match: matchStage },
    { $sort: { createdAt: -1 } },
    {
      $lookup: {
        from: "users",
        localField: "userId",
        foreignField: "_id",
        as: "userInfo",
      },
    },
    {
      $addFields: {
        userId: {
          $let: {
            vars: { u: { $arrayElemAt: ["$userInfo", 0] } },
            in: { _id: "$$u._id", name: "$$u.name", avatar: "$$u.avatar" },
          },
        },
      },
    },
    { $project: { userInfo: 0 } },
  ];
}

function computeAverageRating(reviews) {
  const approved = reviews.filter((r) => r.status === "approved");
  if (approved.length === 0) return null;
  const sum = approved.reduce((acc, r) => acc + r.rating, 0);
  return Math.round((sum / approved.length) * 10) / 10;
}

// ─── GET /api/feedback/events/:eventId  (public) ─────────────────────────────
// Task 2.1 — Requirements: 3.1, 3.2, 3.3, 3.4, 3.5

const getEventFeedback = async (req, res, next) => {
  try {
    const { eventId } = req.params;

    const pipeline = buildFeedbackAggregation(eventId, true);
    const reviews = await Feedback.aggregate(pipeline);

    const averageRating = computeAverageRating(reviews);
    const totalCount = reviews.length;

    res.status(200).json({
      success: true,
      data: { averageRating, totalCount, reviews },
    });
  } catch (err) {
    next(err);
  }
};

// ─── POST /api/feedback/events/:eventId  (authenticated) ─────────────────────
// Task 2.3 — Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 2.1, 2.2, 2.3, 2.4, 2.5, 2.6

const submitFeedback = async (req, res, next) => {
  try {
    const { eventId } = req.params;
    const { rating, review } = req.body;

    // Validate rating and review
    validateRatingAndReview(rating, review, res);

    // Ensure rating is provided
    if (rating === undefined || rating === null) {
      res.status(400);
      throw new Error("Rating must be an integer between 1 and 5.");
    }

    // Fetch the event
    const event = await Event.findById(eventId);
    if (!event) {
      res.status(404);
      throw new Error("Event not found");
    }

    if (event.status !== "COMPLETED") {
      res.status(400);
      throw new Error("Feedback can only be submitted for completed events.");
    }

    // Check confirmed registration
    const registration = await Registration.findOne({
      eventId,
      userId: req.user.id,
      status: "confirmed",
    });
    if (!registration) {
      res.status(403);
      throw new Error("You must be a confirmed attendee to leave feedback for this event.");
    }

    // Check for duplicate feedback
    const existing = await Feedback.findOne({ eventId, userId: req.user.id });
    if (existing) {
      res.status(409);
      throw new Error("You have already submitted feedback for this event.");
    }

    // Create feedback
    const feedback = await Feedback.create({
      userId: req.user.id,
      eventId,
      rating,
      review: review || "",
    });

    res.status(201).json({
      success: true,
      message: "Feedback submitted successfully",
      data: feedback,
    });
  } catch (err) {
    next(err);
  }
};

// ─── PUT /api/feedback/:feedbackId  (authenticated, owner only) ───────────────
// Task 2.5 — Requirements: 4.1, 4.2, 4.3, 4.4, 4.5

const updateFeedback = async (req, res, next) => {
  try {
    const { feedbackId } = req.params;
    const { rating, review } = req.body;

    const feedback = await Feedback.findById(feedbackId);
    if (!feedback) {
      res.status(404);
      throw new Error("Feedback not found");
    }

    if (feedback.userId.toString() !== req.user.id) {
      res.status(403);
      throw new Error("You are not authorized to edit this feedback.");
    }

    // Validate rating and review
    validateRatingAndReview(rating, review, res);

    // Apply updates — preserve existing status (do NOT force "approved";
    // an admin may have hidden this feedback and the edit must not un-hide it)
    if (rating !== undefined) feedback.rating = rating;
    if (review !== undefined) feedback.review = review;

    const updated = await feedback.save();

    res.status(200).json({
      success: true,
      message: "Feedback updated successfully",
      data: updated,
    });
  } catch (err) {
    next(err);
  }
};

// ─── DELETE /api/feedback/:feedbackId  (authenticated, owner only) ────────────
// Task 2.7 — Requirements: 5.1, 5.2, 5.3

const deleteFeedback = async (req, res, next) => {
  try {
    const { feedbackId } = req.params;

    const feedback = await Feedback.findById(feedbackId);
    if (!feedback) {
      res.status(404);
      throw new Error("Feedback not found");
    }

    if (feedback.userId.toString() !== req.user.id) {
      res.status(403);
      throw new Error("You are not authorized to delete this feedback.");
    }

    await feedback.deleteOne();

    res.status(200).json({
      success: true,
      message: "Feedback deleted successfully",
    });
  } catch (err) {
    next(err);
  }
};

// ─── PATCH /api/feedback/:feedbackId/hide  (admin only) ──────────────────────
// Task 2.8 — Requirements: 6.1, 6.3

const adminHideFeedback = async (req, res, next) => {
  try {
    const { feedbackId } = req.params;

    const feedback = await Feedback.findById(feedbackId);
    if (!feedback) {
      res.status(404);
      throw new Error("Feedback not found");
    }

    feedback.status = "hidden";
    const updated = await feedback.save();

    res.status(200).json({
      success: true,
      message: "Feedback hidden successfully",
      data: updated,
    });
  } catch (err) {
    next(err);
  }
};

// ─── DELETE /api/feedback/admin/:feedbackId  (admin only) ────────────────────
// Task 2.9 — Requirements: 6.2, 6.3

const adminDeleteFeedback = async (req, res, next) => {
  try {
    const { feedbackId } = req.params;

    const feedback = await Feedback.findById(feedbackId);
    if (!feedback) {
      res.status(404);
      throw new Error("Feedback not found");
    }

    await feedback.deleteOne();

    res.status(200).json({
      success: true,
      message: "Feedback deleted successfully",
    });
  } catch (err) {
    next(err);
  }
};

// ─── GET /api/feedback/admin/events/:eventId  (admin only) ───────────────────
// Task 2.10 — Requirements: 6.5, 6.6

const adminGetEventFeedback = async (req, res, next) => {
  try {
    const { eventId } = req.params;

    // No status filter — return all records including hidden
    const pipeline = buildFeedbackAggregation(eventId, false);
    const reviews = await Feedback.aggregate(pipeline);

    // Average is computed over approved records only (same as public endpoint)
    const averageRating = computeAverageRating(reviews);
    const totalCount = reviews.length;

    res.status(200).json({
      success: true,
      data: { averageRating, totalCount, reviews },
    });
  } catch (err) {
    next(err);
  }
};

// ─── PATCH /api/feedback/:feedbackId/reply  (organizer only) ─────────────────

const replyToFeedback = async (req, res, next) => {
  try {
    const { feedbackId } = req.params;
    const { text } = req.body;

    if (!text || typeof text !== "string" || text.trim().length === 0) {
      res.status(400);
      throw new Error("Reply text is required.");
    }
    if (text.trim().length > 1000) {
      res.status(400);
      throw new Error("Reply must not exceed 1000 characters.");
    }

    const feedback = await Feedback.findById(feedbackId);
    if (!feedback) {
      res.status(404);
      throw new Error("Feedback not found");
    }

    // Verify the requester is the organizer of the event
    const event = await Event.findById(feedback.eventId).select("organizerId");
    if (!event) {
      res.status(404);
      throw new Error("Event not found");
    }
    if (req.user.role !== "ORGANIZER" || event.organizerId.toString() !== req.user.id) {
      res.status(403);
      throw new Error("You are not authorized to reply to this feedback.");
    }

    feedback.organizerReply = { text: text.trim(), repliedAt: new Date() };
    const updated = await feedback.save();

    res.status(200).json({
      success: true,
      message: "Reply posted successfully",
      data: updated,
    });
  } catch (err) {
    next(err);
  }
};

// ─── DELETE /api/feedback/:feedbackId/reply  (organizer only) ────────────────

const deleteOrganizerReply = async (req, res, next) => {
  try {
    const { feedbackId } = req.params;

    const feedback = await Feedback.findById(feedbackId);
    if (!feedback) {
      res.status(404);
      throw new Error("Feedback not found");
    }

    const event = await Event.findById(feedback.eventId).select("organizerId");
    if (!event) {
      res.status(404);
      throw new Error("Event not found");
    }
    if (req.user.role !== "ORGANIZER" || event.organizerId.toString() !== req.user.id) {
      res.status(403);
      throw new Error("You are not authorized to delete this reply.");
    }

    feedback.organizerReply = { text: "", repliedAt: null };
    await feedback.save();

    res.status(200).json({
      success: true,
      message: "Reply deleted successfully",
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getEventFeedback,
  submitFeedback,
  updateFeedback,
  deleteFeedback,
  adminHideFeedback,
  adminDeleteFeedback,
  adminGetEventFeedback,
  replyToFeedback,
  deleteOrganizerReply,
};
