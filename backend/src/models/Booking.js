const mongoose = require("mongoose");

const bookingSchema = new mongoose.Schema(
  {
    venue: { type: mongoose.Schema.Types.ObjectId, ref: "Venue", required: true, index: true },
    event: { type: mongoose.Schema.Types.ObjectId, ref: "Event" }, // optional link
    requestedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },

    startDateTime: { type: Date, required: true, index: true },
    endDateTime: { type: Date, required: true, index: true },

    // Approval workflow
    status: {
      type: String,
      enum: ["pending", "approved", "rejected", "cancelled"],
      default: "pending",
      index: true,
    },
    reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    reviewedAt: { type: Date },
    rejectionReason: { type: String, trim: true, maxlength: 300 },

    notes: { type: String, trim: true, maxlength: 500 },
  },
  { timestamps: true }
);

// Core overlap query needs these indexes
bookingSchema.index({ venue: 1, startDateTime: 1, endDateTime: 1, status: 1 });

// Basic time sanity — use this.invalidate() so Mongoose emits a proper ValidationError
bookingSchema.pre("validate", function () {
  if (this.startDateTime && this.endDateTime && this.startDateTime >= this.endDateTime) {
    this.invalidate("endDateTime", "endDateTime must be greater than startDateTime");
  }
});

module.exports = mongoose.model("Booking", bookingSchema);