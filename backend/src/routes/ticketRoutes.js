const express = require("express");
const { protect } = require("../middlewares/authMiddleware");
const { allowRoles } = require("../middlewares/roleMiddleware");

const {
  getUserTickets,
  verifyTicket,
} = require("../controllers/ticketController");

const router = express.Router();

// Logged-in user: view own tickets
router.get("/my", protect, getUserTickets);

// Organizer/Admin: verify ticket
router.post(
  "/verify/:ticketId",
  protect,
  allowRoles("ADMIN", "ORGANIZER"),
  verifyTicket
);

module.exports = router;