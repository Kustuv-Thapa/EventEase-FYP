const User = require("../models/User");
const { signToken } = require("../utils/jwt");
const crypto = require("crypto");
const tokenBlacklist = require("../utils/tokenBlacklist");
const { sendPasswordResetEmail, sendOtpEmail } = require("../utils/emailService");

const generateOtp = () => String(Math.floor(100000 + Math.random() * 900000));

// POST /api/auth/register
const register = async (req, res, next) => {
  try {
    const { name, email, password, role } = req.body;

    if (!name || !email || !password) {
      res.status(400);
      throw new Error("Name, email, and password are required");
    }

    if (password.length < 8) { res.status(400); throw new Error("Password must be at least 8 characters"); }
    if (!/[A-Z]/.test(password)) { res.status(400); throw new Error("Password must contain at least one uppercase letter"); }
    if (!/[0-9]/.test(password)) { res.status(400); throw new Error("Password must contain at least one number"); }
    if (!/[^A-Za-z0-9]/.test(password)) { res.status(400); throw new Error("Password must contain at least one special character"); }

    const existing = await User.findOne({ email });
    if (existing) {
      // If account exists but is unverified, resend OTP instead of blocking
      if (!existing.isVerified) {
        const otp = generateOtp();
        existing.otpCode = otp;
        existing.otpExpiry = new Date(Date.now() + 5 * 60 * 1000);
        await existing.save({ validateBeforeSave: false });
        await sendOtpEmail({ to: existing.email, name: existing.name, otp });
        return res.status(200).json({
          success: true,
          requiresVerification: true,
          message: "Account already exists but is unverified. A new OTP has been sent to your email.",
          data: { email: existing.email },
        });
      }
      res.status(409);
      throw new Error("Email already registered");
    }

    const safeRole = role && ["ATTENDEE", "ORGANIZER"].includes(role) ? role : "ATTENDEE";
    const otp = generateOtp();

    const user = await User.create({
      name,
      email,
      password,
      role: safeRole,
      isVerified: false,
      otpCode: otp,
      otpExpiry: new Date(Date.now() + 5 * 60 * 1000),
    });

    await sendOtpEmail({ to: user.email, name: user.name, otp });

    res.status(201).json({
      success: true,
      requiresVerification: true,
      message: "Account created. Please check your email for the verification code.",
      data: { email: user.email },
    });
  } catch (err) {
    next(err);
  }
};

// POST /api/auth/verify-otp
const verifyOtp = async (req, res, next) => {
  try {
    const { email, otp } = req.body;
    if (!email || !otp) {
      res.status(400);
      throw new Error("Email and OTP are required");
    }

    const user = await User.findOne({ email }).select("+otpCode +otpExpiry");
    if (!user) {
      res.status(404);
      throw new Error("Account not found");
    }

    if (user.isVerified) {
      res.status(400);
      throw new Error("Account is already verified");
    }

    if (!user.otpCode || !user.otpExpiry) {
      res.status(400);
      throw new Error("No OTP found. Please request a new one.");
    }

    if (new Date() > user.otpExpiry) {
      res.status(400);
      throw new Error("OTP has expired. Please request a new one.");
    }

    if (user.otpCode !== otp.trim()) {
      res.status(400);
      throw new Error("Invalid OTP");
    }

    // Activate account
    user.isVerified = true;
    user.otpCode = undefined;
    user.otpExpiry = undefined;
    await user.save({ validateBeforeSave: false });

    const token = signToken({ sub: user._id.toString(), role: user.role });

    res.status(200).json({
      success: true,
      message: "Account verified successfully",
      data: {
        user: { id: user._id, name: user.name, email: user.email, role: user.role, avatar: user.avatar || "" },
        token,
      },
    });
  } catch (err) {
    next(err);
  }
};

// POST /api/auth/resend-otp
const resendOtp = async (req, res, next) => {
  try {
    const { email } = req.body;
    if (!email) { res.status(400); throw new Error("Email is required"); }

    const user = await User.findOne({ email }).select("+otpCode +otpExpiry");
    if (!user) {
      // Always return 200 to avoid email enumeration
      return res.status(200).json({ success: true, message: "If that email is registered and unverified, a new OTP has been sent." });
    }

    if (user.isVerified) {
      return res.status(200).json({ success: true, message: "If that email is registered and unverified, a new OTP has been sent." });
    }

    const otp = generateOtp();
    user.otpCode = otp;
    user.otpExpiry = new Date(Date.now() + 5 * 60 * 1000);
    await user.save({ validateBeforeSave: false });

    await sendOtpEmail({ to: user.email, name: user.name, otp });

    res.status(200).json({ success: true, message: "A new OTP has been sent to your email." });
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

    // Check verification AFTER password check so we don't reveal whether
    // an email exists via a different error message (email enumeration).
    if (!user.isVerified) {
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
          avatar: user.avatar || "",
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
    // Fetch fresh from DB to include avatar
    const user = await User.findById(req.user.id).select("-password");
    if (!user) { res.status(404); throw new Error("User not found"); }

    res.status(200).json({
      success: true,
      data: {
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          avatar: user.avatar || "",
        },
      },
    });
  } catch (err) {
    next(err);
  }
};

// POST /api/auth/logout
const logout = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith("Bearer ")) {
      const token = authHeader.split(" ")[1];
      await tokenBlacklist.add(token);
    }
    res.status(200).json({ success: true, message: "Logged out successfully" });
  } catch (err) {
    next(err);
  }
};

// POST /api/auth/forgot-password
const forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;
    if (!email) {
      res.status(400);
      throw new Error("Email is required");
    }

    const user = await User.findOne({ email: email.toLowerCase().trim() });
    // Always return 200 to avoid revealing whether email exists
    if (!user) {
      return res.status(200).json({ success: true, message: "If that email is registered, a reset link has been sent." });
    }

    const rawToken = crypto.randomBytes(32).toString("hex");
    const hashedToken = crypto.createHash("sha256").update(rawToken).digest("hex");

    user.passwordResetToken = hashedToken;
    user.passwordResetExpiry = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
    await user.save({ validateBeforeSave: false });

    const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${rawToken}`;

    try {
      await sendPasswordResetEmail({ to: user.email, name: user.name, resetUrl });
    } catch (emailErr) {
      // Roll back the token fields so the user can retry
      user.passwordResetToken = undefined;
      user.passwordResetExpiry = undefined;
      await user.save({ validateBeforeSave: false });
      return res.status(500).json({ success: false, message: "Failed to send reset email. Please try again." });
    }

    res.status(200).json({
      success: true,
      message: "If that email is registered, a reset link has been sent.",
    });
  } catch (err) {
    next(err);
  }
};

// POST /api/auth/reset-password
const resetPassword = async (req, res, next) => {
  try {
    const { token, newPassword } = req.body;
    if (!token || !newPassword) {
      res.status(400);
      throw new Error("Token and new password are required");
    }
    if (newPassword.length < 8) { res.status(400); throw new Error("Password must be at least 8 characters"); }
    if (!/[A-Z]/.test(newPassword)) { res.status(400); throw new Error("Password must contain at least one uppercase letter"); }
    if (!/[0-9]/.test(newPassword)) { res.status(400); throw new Error("Password must contain at least one number"); }
    if (!/[^A-Za-z0-9]/.test(newPassword)) { res.status(400); throw new Error("Password must contain at least one special character"); }

    const hashedToken = crypto.createHash("sha256").update(token).digest("hex");

    const user = await User.findOne({
      passwordResetToken: hashedToken,
      passwordResetExpiry: { $gt: new Date() },
    }).select("+password +passwordResetToken +passwordResetExpiry");

    if (!user) {
      res.status(400);
      throw new Error("Invalid or expired reset token");
    }

    user.password = newPassword;
    user.passwordResetToken = undefined;
    user.passwordResetExpiry = undefined;
    await user.save();

    res.status(200).json({ success: true, message: "Password reset successfully" });
  } catch (err) {
    next(err);
  }
};

// PATCH /api/auth/profile — update name, email, and/or avatar
const updateProfile = async (req, res, next) => {
  try {
    const { name, email, avatar } = req.body;

    if (!name && !email && avatar === undefined) {
      res.status(400);
      throw new Error("Provide at least one field to update");
    }

    const updates = {};

    if (name) {
      const trimmed = name.trim();
      if (trimmed.length < 2 || trimmed.length > 60) {
        res.status(400);
        throw new Error("Name must be between 2 and 60 characters");
      }
      updates.name = trimmed;
    }

    if (email) {
      const trimmed = email.toLowerCase().trim();
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(trimmed)) {
        res.status(400);
        throw new Error("Invalid email format");
      }
      const existing = await User.findOne({ email: trimmed, _id: { $ne: req.user.id } });
      if (existing) {
        res.status(409);
        throw new Error("Email already in use by another account");
      }
      updates.email = trimmed;
    }

    if (avatar !== undefined) {
      if (avatar === "") {
        // Allow clearing the avatar
        updates.avatar = "";
      } else {
        if (!avatar.startsWith("data:image/")) {
          res.status(400);
          throw new Error("Invalid image format");
        }
        // ~2MB limit (base64 is ~1.37x raw size)
        if (avatar.length > 2 * 1024 * 1024 * 1.37) {
          res.status(400);
          throw new Error("Image too large (max ~2MB)");
        }
        updates.avatar = avatar;
      }
    }

    const updated = await User.findByIdAndUpdate(
      req.user.id,
      { $set: updates },
      { new: true, runValidators: true }
    ).select("-password");

    if (!updated) {
      res.status(404);
      throw new Error("User not found");
    }

    res.status(200).json({
      success: true,
      message: "Profile updated",
      data: {
        user: {
          id: updated._id,
          name: updated.name,
          email: updated.email,
          role: updated.role,
          avatar: updated.avatar || "",
        },
      },
    });
  } catch (err) {
    next(err);
  }
};

// PATCH /api/auth/change-password — change password (requires current password)
const changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      res.status(400);
      throw new Error("currentPassword and newPassword are required");
    }

    if (newPassword.length < 8) { res.status(400); throw new Error("Password must be at least 8 characters"); }
    if (!/[A-Z]/.test(newPassword)) { res.status(400); throw new Error("Password must contain at least one uppercase letter"); }
    if (!/[0-9]/.test(newPassword)) { res.status(400); throw new Error("Password must contain at least one number"); }
    if (!/[^A-Za-z0-9]/.test(newPassword)) { res.status(400); throw new Error("Password must contain at least one special character"); }

    const user = await User.findById(req.user.id).select("+password");
    if (!user) {
      res.status(404);
      throw new Error("User not found");
    }

    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) {
      res.status(401);
      throw new Error("Current password is incorrect");
    }

    if (currentPassword === newPassword) {
      res.status(400);
      throw new Error("New password must be different from current password");
    }

    user.password = newPassword;
    await user.save();

    res.status(200).json({ success: true, message: "Password changed successfully" });
  } catch (err) {
    next(err);
  }
};

module.exports = { register, verifyOtp, resendOtp, login, getProfile, logout, forgotPassword, resetPassword, updateProfile, changePassword };
