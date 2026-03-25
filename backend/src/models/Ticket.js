const mongoose = require("mongoose");

const ticketSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    event: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Event",
      required: true,
      index: true,
    },

    registration: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Registration",
      required: true,
      unique: true,
    },

    ticketId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true,
    },

    qrCode: {
      type: String,
      required: true,
    },

    status: {
      type: String,
      enum: ["VALID", "USED", "CANCELLED"],
      default: "VALID",
      index: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Ticket", ticketSchema);