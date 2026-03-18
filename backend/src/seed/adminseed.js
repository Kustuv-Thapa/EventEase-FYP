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
      await existing.save();
      console.log("✅ Admin already exists. Role ensured ADMIN:", email);
      process.exit(0);
    }

    await User.create({
      name: "System Admin",
      email,
      password: plainPassword, 
      role: "ADMIN",
    });

    console.log("✅ Admin created:", email, "password:", plainPassword);
    process.exit(0);
  } catch (err) {
    console.error("❌ Seed failed:", err.message);
    process.exit(1);
  }
};

run();