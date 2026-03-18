const mongoose = require("mongoose");

const venueSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 120 },
    capacity: { type: Number, required: true, min: 1 },
    location: {
      address: { type: String, required: true, trim: true, maxlength: 200 },
      city: { type: String, required: true, trim: true, maxlength: 80 },
      state: { type: String, trim: true, maxlength: 80 },
      country: { type: String, required: true, trim: true, maxlength: 80 },
      latitude: { type: Number, min: -90, max: 90 },
      longitude: { type: Number, min: -180, max: 180 },
    },
    amenities: {
      type: [String],
      default: [],
      validate: {
        validator: (arr) => Array.isArray(arr) && arr.length <= 50,
        message: "Amenities list is too long",
      },
    },
    image: { type: String, default: "" }, // base64 data URL
    isActive: { type: Boolean, default: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true }
);

// Helpful indexes
venueSchema.index({ name: 1, "location.city": 1 });

module.exports = mongoose.model("Venue", venueSchema);