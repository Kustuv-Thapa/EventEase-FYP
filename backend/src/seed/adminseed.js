require("dotenv").config();
const mongoose = require("mongoose");
const User = require("../models/User");

const run = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);

    const email = "admin@example.com";
    const plainPassword = "Admin@12345";

    const existing = await User.findOne({ email });

    if (existing) {
      existing.role = "ADMIN";
      existing.isVerified = true; // ensure admin is always verified
      await existing.save({ validateBeforeSave: false });
      console.log("✅ Admin already exists. Role and verification ensured:", email);
      process.exit(0);
    }

    await User.create({
      name: "System Admin",
      email,
      password: plainPassword,
      role: "ADMIN",
      isVerified: true, // admin accounts skip OTP verification
    });

    console.log("✅ Admin created:", email, "password:", plainPassword);
    process.exit(0);
  } catch (err) {
    console.error("❌ Seed failed:", err.message);
    process.exit(1);
  }
};

run();
