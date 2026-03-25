const express = require("express");
const { protect } = require("../middlewares/authMiddleware");
const { allowRoles } = require("../middlewares/roleMiddleware");
const validateObjectId = require("../middlewares/validateObjectId");

const {
  registerForEvent,
  getMyRegistrations,
  cancelMyRegistration,
  adminListRegistrations,
  adminDecideRegistration,
  adminRegistrationStats,
  adminEventRegistrations,
} = require("../controllers/registrationController");

const router = express.Router();

// User routes
router.post("/events/:eventId", protect, validateObjectId("eventId"), registerForEvent);
router.get("/me", protect, getMyRegistrations);
router.delete("/:id", protect, validateObjectId("id"), cancelMyRegistration);

// Admin routes — specific paths before /:id
router.get("/admin/stats", protect, allowRoles("ADMIN"), adminRegistrationStats);
router.get("/admin/event/:eventId", protect, allowRoles("ADMIN", "ORGANIZER"), validateObjectId("eventId"), adminEventRegistrations);
router.get("/admin", protect, allowRoles("ADMIN"), adminListRegistrations);
router.patch("/admin/:id/decision", protect, allowRoles("ADMIN"), validateObjectId("id"), adminDecideRegistration);

module.exports = router;