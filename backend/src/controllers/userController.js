const mongoose = require("mongoose");
const User = require("../models/User");
const Registration = require("../models/Registration");
const Event = require("../models/Event");

// GET /api/users/admin?page=1&limit=10&role=&search=
const adminListUsers = async (req, res, next) => {
  try {
    const page  = Math.min(Math.max(parseInt(req.query.page  || "1",  10), 1), 500);
    const limit = Math.min(Math.max(parseInt(req.query.limit || "10", 10), 1), 50);
    const skip  = (page - 1) * limit;

    const filter = {};
    if (req.query.role && ["ATTENDEE", "ORGANIZER", "ADMIN"].includes(req.query.role)) {
      filter.role = req.query.role;
    }
    if (req.query.search) {
      const escaped = req.query.search.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      filter.$or = [
        { name:  { $regex: escaped, $options: "i" } },
        { email: { $regex: escaped, $options: "i" } },
      ];
    }

    const [users, total] = await Promise.all([
      User.find(filter)
        .select("-password -passwordResetToken -passwordResetExpiry -otpCode -otpExpiry")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      User.countDocuments(filter),
    ]);

    res.status(200).json({
      success: true,
      message: "Users fetched",
      data: {
        items: users,
        pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
      },
    });
  } catch (err) {
    next(err);
  }
};

// GET /api/users/admin/stats
const adminUserStats = async (req, res, next) => {
  try {
    const [total, attendees, organizers, admins, verified, unverified] = await Promise.all([
      User.countDocuments({}),
      User.countDocuments({ role: "ATTENDEE" }),
      User.countDocuments({ role: "ORGANIZER" }),
      User.countDocuments({ role: "ADMIN" }),
      User.countDocuments({ isVerified: true }),
      User.countDocuments({ isVerified: false }),
    ]);

    res.status(200).json({
      success: true,
      data: { total, attendees, organizers, admins, verified, unverified },
    });
  } catch (err) {
    next(err);
  }
};

// GET /api/users/admin/:id
const adminGetUser = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      res.status(400); throw new Error("Invalid user ID");
    }

    const user = await User.findById(id)
      .select("-password -passwordResetToken -passwordResetExpiry -otpCode -otpExpiry");
    if (!user) { res.status(404); throw new Error("User not found"); }

    // Fetch activity summary
    const [registrationCount, eventCount] = await Promise.all([
      Registration.countDocuments({ userId: id }),
      Event.countDocuments({ organizerId: id }),
    ]);

    res.status(200).json({
      success: true,
      data: { user, activity: { registrations: registrationCount, events: eventCount } },
    });
  } catch (err) {
    next(err);
  }
};

// PATCH /api/users/admin/:id/role
const adminUpdateUserRole = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { role } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      res.status(400); throw new Error("Invalid user ID");
    }
    if (!["ATTENDEE", "ORGANIZER"].includes(role)) {
      res.status(400); throw new Error("Role must be ATTENDEE or ORGANIZER");
    }
    // Prevent admin from changing their own role
    if (id === req.user.id) {
      res.status(400); throw new Error("You cannot change your own role");
    }

    const user = await User.findById(id);
    if (!user) { res.status(404); throw new Error("User not found"); }
    if (user.role === "ADMIN") {
      res.status(400); throw new Error("Cannot change the role of another admin");
    }

    user.role = role;
    await user.save({ validateBeforeSave: false });

    res.status(200).json({
      success: true,
      message: `User role updated to ${role}`,
      data: { id: user._id, name: user.name, email: user.email, role: user.role },
    });
  } catch (err) {
    next(err);
  }
};

// PATCH /api/users/admin/:id/verify
const adminVerifyUser = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      res.status(400); throw new Error("Invalid user ID");
    }

    const user = await User.findById(id);
    if (!user) { res.status(404); throw new Error("User not found"); }
    if (user.isVerified) {
      res.status(400); throw new Error("User is already verified");
    }

    user.isVerified = true;
    user.otpCode    = undefined;
    user.otpExpiry  = undefined;
    await user.save({ validateBeforeSave: false });

    res.status(200).json({
      success: true,
      message: "User manually verified",
      data: { id: user._id, name: user.name, email: user.email, isVerified: true },
    });
  } catch (err) {
    next(err);
  }
};

// DELETE /api/users/admin/:id
const adminDeleteUser = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      res.status(400); throw new Error("Invalid user ID");
    }
    if (id === req.user.id) {
      res.status(400); throw new Error("You cannot delete your own account");
    }

    const user = await User.findById(id);
    if (!user) { res.status(404); throw new Error("User not found"); }
    if (user.role === "ADMIN") {
      res.status(400); throw new Error("Cannot delete another admin account");
    }

    await user.deleteOne();

    res.status(200).json({ success: true, message: "User deleted" });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  adminListUsers,
  adminUserStats,
  adminGetUser,
  adminUpdateUserRole,
  adminVerifyUser,
  adminDeleteUser,
};
