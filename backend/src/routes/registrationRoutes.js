const express = require("express");
const { protect } = require("../middlewares/authMiddleware");
const { allowRoles } = require("../middlewares/roleMiddleware");
const validateObjectId = require("../middlewares/validateObjectId");

const {
  registerForEvent,
  getMyRegistrations,
  adminListRegistrations,
  adminDecideRegistration,
  adminRegistrationStats,
} = require("../controllers/registrationController");

const router = express.Router();

// User routes
router.post("/events/:eventId", protect, validateObjectId("eventId"), registerForEvent);
router.get("/me", protect, getMyRegistrations);

// Admin routes
router.get("/admin", protect, allowRoles("ADMIN"), adminListRegistrations);
router.patch("/admin/:id/decision", protect, allowRoles("ADMIN"), validateObjectId("id"), adminDecideRegistration);
router.get("/admin/stats", protect, allowRoles("ADMIN"), adminRegistrationStats);

module.exports = router;