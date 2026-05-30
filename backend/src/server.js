require("dotenv").config();
const app = require("./app");
const connectDB = require("./config/db");
const { startEventCompletionJob } = require("./utils/eventCompletionJob");
const { startPaymentExpiryJob } = require("./utils/paymentExpiryJob");
const User = require("./models/User");

const PORT = process.env.PORT || 5000;

const seedAdmin = async () => {
  try {
    const email = process.env.ADMIN_EMAIL;
    const password = process.env.ADMIN_PASSWORD;
    if (!email || !password) return;
    const existing = await User.findOne({ email });
    if (existing) {
      existing.role = "ADMIN";
      existing.isVerified = true;
      await existing.save({ validateBeforeSave: false });
    } else {
      await User.create({ name: "System Admin", email, password, role: "ADMIN", isVerified: true });
      console.log("✅ Admin seeded:", email);
    }
  } catch (err) {
    console.error("Admin seed error:", err.message);
  }
};

(async () => {
  try {
    await connectDB();
    await seedAdmin();
    startEventCompletionJob();
    startPaymentExpiryJob();
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (err) {
    console.error("Failed to start server:", err.message);
    process.exit(1);
  }
})();