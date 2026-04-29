require("dotenv").config();
const app = require("./app");
const connectDB = require("./config/db");
const { startEventCompletionJob } = require("./utils/eventCompletionJob");
const { startPaymentExpiryJob } = require("./utils/paymentExpiryJob");

const PORT = process.env.PORT || 5000;

(async () => {
  try {
    await connectDB();
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