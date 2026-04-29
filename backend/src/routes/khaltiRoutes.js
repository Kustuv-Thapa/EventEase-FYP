const express = require("express");
const router = express.Router();
const { initiateKhaltiPayment, verifyKhaltiPayment } = require("../controllers/khaltiController");
const { protect } = require("../middlewares/authMiddleware");

router.post("/initiate", protect, initiateKhaltiPayment);
// verify does not require auth — Khalti redirects without a token
router.post("/verify", verifyKhaltiPayment);

module.exports = router;
