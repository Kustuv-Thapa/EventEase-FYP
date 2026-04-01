const express = require("express");
const router = express.Router();

const {
  initiateEsewaPayment,
  esewaSuccess,
  esewaFailure,
  verifyEsewaPayment,
  verifyEsewaCallback,
} = require("../controllers/esewaController");

const { protect } = require("../middlewares/authMiddleware");

// User starts payment
router.post("/initiate", protect, initiateEsewaPayment);

// eSewa redirects here after success (legacy backend redirect — kept for fallback)
router.get("/success", esewaSuccess);

// eSewa redirects here after failure/cancel (legacy)
router.get("/failure", esewaFailure);

// Frontend calls this after eSewa redirects to frontend with ?data=
router.post("/verify-callback", protect, verifyEsewaCallback);

// Optional manual verification endpoint
router.get("/verify/:productId", protect, verifyEsewaPayment);

module.exports = router;