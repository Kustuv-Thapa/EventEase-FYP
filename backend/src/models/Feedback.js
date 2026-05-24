const mongoose = require("mongoose");

const feedbackSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    eventId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Event",
      required: true,
      index: true,
    },
    rating: {
      type: Number,
      required: true,
      min: [1, "Rating must be an integer between 1 and 5"],
      max: [5, "Rating must be an integer between 1 and 5"],
      validate: {
        validator: Number.isInteger,
        message: "Rating must be an integer between 1 and 5",
      },
    },
    review: {
      type: String,
      trim: true,
      maxlength: [1000, "Review must not exceed 1000 characters"],
      default: "",
    },
    status: {
      type: String,
      enum: ["approved", "hidden"],
      default: "approved",
      index: true,
    },
    organizerReply: {
      text: { type: String, trim: true, maxlength: [1000, "Reply must not exceed 1000 characters"], default: "" },
      repliedAt: { type: Date, default: null },
    },
  },
  { timestamps: true }
);

// One feedback per user per event
feedbackSchema.index({ userId: 1, eventId: 1 }, { unique: true });

module.exports = mongoose.model("Feedback", feedbackSchema);
