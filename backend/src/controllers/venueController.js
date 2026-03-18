const Venue = require("../models/Venue");

exports.createVenue = async (req, res, next) => {
  try {
    const { name, capacity, location, amenities } = req.body;

    if (!name || !capacity || !location?.address || !location?.city || !location?.country) {
      return res.status(400).json({ message: "Missing required venue fields" });
    }

    const venue = await Venue.create({
      name,
      capacity,
      location,
      amenities: amenities || [],
      createdBy: req.user.id,
    });

    res.status(201).json({ message: "Venue created", data: venue });
  } catch (err) {
    next(err);
  }
};

exports.getVenues = async (req, res, next) => {
  try {
    const { city, active } = req.query;

    const filter = {};
    if (city) filter["location.city"] = city;
    if (active === "true") filter.isActive = true;
    if (active === "false") filter.isActive = false;

    const venues = await Venue.find(filter).sort({ createdAt: -1 });
    res.json({ data: venues });
  } catch (err) {
    next(err);
  }
};

exports.getVenueById = async (req, res, next) => {
  try {
    const venue = await Venue.findById(req.params.id);
    if (!venue) return res.status(404).json({ message: "Venue not found" });
    res.json({ data: venue });
  } catch (err) {
    next(err);
  }
};

exports.updateVenue = async (req, res, next) => {
  try {
    const venue = await Venue.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });

    if (!venue) return res.status(404).json({ message: "Venue not found" });
    res.json({ message: "Venue updated", data: venue });
  } catch (err) {
    next(err);
  }
};

exports.deleteVenue = async (req, res, next) => {
  try {
    const venue = await Venue.findByIdAndDelete(req.params.id);
    if (!venue) return res.status(404).json({ message: "Venue not found" });
    res.json({ message: "Venue deleted" });
  } catch (err) {
    next(err);
  }
};

exports.uploadVenueImage = async (req, res, next) => {
  try {
    const { image } = req.body;
    if (!image || !image.startsWith("data:image/")) {
      return res.status(400).json({ message: "Invalid image data" });
    }
    // Limit ~2MB base64
    if (image.length > 2 * 1024 * 1024 * 1.37) {
      return res.status(400).json({ message: "Image too large (max ~2MB)" });
    }
    const venue = await Venue.findByIdAndUpdate(
      req.params.id,
      { image },
      { new: true }
    );
    if (!venue) return res.status(404).json({ message: "Venue not found" });
    res.json({ message: "Venue image updated", data: venue });
  } catch (err) {
    next(err);
  }
};