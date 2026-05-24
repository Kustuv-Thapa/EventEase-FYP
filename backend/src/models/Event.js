const mongoose = require("mongoose");

const eventSchema = new mongoose.Schema(
  {
    organizerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Organizer is required"],
      index: true,
    },

    title: {
      type: String,
      required: [true, "Title is required"],
      trim: true,
      minlength: 3,
      maxlength: 120,
    },

    description: {
      type: String,
      trim: true,
      maxlength: 5000,
      default: "",
    },

    genre: {
      type: [String],
      default: [],
      validate: {
        validator: (arr) => Array.isArray(arr) && arr.length <= 10,
        message: "Genre/tags can have at most 10 items",
      },
    },

    venue: {
      name: { type: String, required: [true, "Venue name is required"], trim: true, maxlength: 120 },
      address: { type: String, required: [true, "Venue address is required"], trim: true, maxlength: 250 },
      city: { type: String, required: [true, "City is required"], trim: true, maxlength: 80 },
    },

    schedule: {
      startDateTime: { type: Date, required: [true, "Start date/time is required"] },
      endDateTime: { type: Date, required: [true, "End date/time is required"] },
    },

    capacity: {
      type: Number,
      required: [true, "Capacity is required"],
      min: [1, "Capacity must be at least 1"],
    },

    budget: {
      type: Number,
      min: 0,
      default: 0,
    },

    pricing: {
      type: {
        type: String,
        enum: ["FREE", "PAID"],
        default: "FREE",
      },
      // Keep simple for now (you can add tiers later)
      price: { type: Number, min: 0, default: 0 },
    },

    status: {
      type: String,
      enum: ["DRAFT", "PENDING_APPROVAL", "PUBLISHED", "CANCELLED", "COMPLETED"],
      default: "DRAFT",
      index: true,
    },

    image: { type: String, default: "" }, // base64 data URL — cover image (first of images array)
    images: { type: [String], default: [] }, // gallery images (base64 data URLs, max 5)
    confirmedCount: { type: Number, default: 0, min: 0 },
    bookingId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Booking",
      default: null,
    },
    rejectionReason: {
      type: String,
      trim: true,
      maxlength: 300,
      default: null,
    },
  },
  { timestamps: true }
);

// Simple schedule validation (end must be after start)
eventSchema.pre("validate", function () {
  if (this.schedule?.startDateTime && this.schedule?.endDateTime) {
    if (this.schedule.endDateTime <= this.schedule.startDateTime) {
      this.invalidate("schedule.endDateTime", "End date/time must be after start date/time");
    }
  }

  // If FREE, force price = 0
  if (this.pricing?.type === "FREE") {
    this.pricing.price = 0;
  }

  // If PAID, price must be > 0 (simple rule)
  if (this.pricing?.type === "PAID" && (!this.pricing.price || this.pricing.price <= 0)) {
    this.invalidate("pricing.price", "Paid events must have price > 0");
  }
});

// Guard against invalid status transitions
const VALID_TRANSITIONS = {
  DRAFT: ["PENDING_APPROVAL", "CANCELLED"],
  PENDING_APPROVAL: ["PUBLISHED", "DRAFT", "CANCELLED"],
  PUBLISHED: ["COMPLETED", "CANCELLED"],
  CANCELLED: [],   // terminal
  COMPLETED: [],   // terminal
};

eventSchema.pre("save", function () {
  // Only enforce when status is being modified on an existing document
  if (!this.isNew && this.isModified("status")) {
    const prev = this._previousStatus;
    if (prev && VALID_TRANSITIONS[prev] && !VALID_TRANSITIONS[prev].includes(this.status)) {
      throw Object.assign(
        new Error(`Invalid status transition: ${prev} → ${this.status}`),
        { statusCode: 400 }
      );
    }
  }
  // Cache current status so the next save can compare
  this._previousStatus = this.status;
});

module.exports = mongoose.model("Event", eventSchema);