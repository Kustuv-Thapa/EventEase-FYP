const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const validator = require("validator");

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Name is required"],
      trim: true,
      minlength: 2,
      maxlength: 60,
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      trim: true,
      validate: [validator.isEmail, "Invalid email"],
    },
    password: {
      type: String,
      required: [true, "Password is required"],
      minlength: 6,
      select: false, // important: password won't be returned unless explicitly requested
    },
    role: {
      type: String,
      enum: ["ATTENDEE", "ORGANIZER", "ADMIN"],
      default: "ATTENDEE",
    },
    passwordResetToken: { type: String, select: false },
    passwordResetExpiry: { type: Date, select: false },
    avatar: { type: String, default: "" }, // base64 data URL
    isVerified: { type: Boolean, default: false },
    otpCode: { type: String, select: false },
    otpExpiry: { type: Date, select: false },
  },
  { timestamps: true }
);

// Hash password before saving (only when changed)
userSchema.pre("save", async function () {
  if (!this.isModified("password")) return;

  const saltRounds = 10;
  this.password = await bcrypt.hash(this.password, saltRounds);
});

// Compare entered password with hashed password
userSchema.methods.comparePassword = async function (enteredPassword) {
  return bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model("User", userSchema);