const User = require("../models/User");
const { signToken } = require("../utils/jwt");

// POST /api/auth/register
const register = async (req, res, next) => {
  try {
    const { name, email, password, role } = req.body;

    // Basic validation
    if (!name || !email || !password) {
      res.status(400);
      throw new Error("Name, email, and password are required");
    }

    // Prevent duplicate accounts
    const existing = await User.findOne({ email });
    if (existing) {
      res.status(409);
      throw new Error("Email already registered");
    }

    // Optional: prevent users from self-assigning ADMIN in real systems
    const safeRole = role && ["ATTENDEE", "ORGANIZER"].includes(role) ? role : "ATTENDEE";

    const user = await User.create({
      name,
      email,
      password,
      role: safeRole,
    });

    // Create JWT (keep payload minimal)
    const token = signToken({ sub: user._id.toString(), role: user.role });

    res.status(201).json({
      success: true,
      message: "Registration successful",
      data: {
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
        },
        token,
      },
    });
  } catch (err) {
    next(err);
  }
};

// POST /api/auth/login
const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      res.status(400);
      throw new Error("Email and password are required");
    }

    // Need password, so explicitly select it
    const user = await User.findOne({ email }).select("+password");
    if (!user) {
      res.status(401);
      throw new Error("Invalid credentials");
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      res.status(401);
      throw new Error("Invalid credentials");
    }

    const token = signToken({ sub: user._id.toString(), role: user.role });

    res.status(200).json({
      success: true,
      message: "Login successful",
      data: {
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
        },
        token,
      },
    });
  } catch (err) {
    next(err);
  }
};

// GET /api/auth/profile
const getProfile = async (req, res, next) => {
  try {
    res.status(200).json({
      success: true,
      data: {
        user: {
          id: req.user.id,
          name: req.user.name,
          email: req.user.email,
          role: req.user.role,
        },
      },
    });
  } catch (err) {
    next(err);
  }
};

module.exports = { register, login, getProfile };