const express = require("express");
const {
  createEvent,
  getEvents,
  getEventById,
  getMyEvents,
  updateEvent,
  deleteEvent,
  submitEventForApproval,
  adminListPendingEvents,
  adminApproveEvent,
  adminRejectEvent,
  uploadEventImage,
} = require("../controllers/eventController");

const { protect } = require("../middlewares/authMiddleware");
const { allowRoles } = require("../middlewares/roleMiddleware");
const validateObjectId = require("../middlewares/validateObjectId");

const router = express.Router();

// Public
router.get("/", getEvents);

// Must come before /:id to avoid being caught as an id
router.get("/mine", protect, allowRoles("ADMIN", "ORGANIZER"), getMyEvents);
router.get("/admin/pending", protect, allowRoles("ADMIN"), adminListPendingEvents);

router.get("/:id", validateObjectId("id"), getEventById);

// Organizer actions
router.post("/", protect, allowRoles("ADMIN", "ORGANIZER"), createEvent);
router.put("/:id", protect, allowRoles("ADMIN", "ORGANIZER"), validateObjectId("id"), updateEvent);
router.delete("/:id", protect, allowRoles("ADMIN", "ORGANIZER"), validateObjectId("id"), deleteEvent);
router.patch("/:id/submit", protect, allowRoles("ORGANIZER"), validateObjectId("id"), submitEventForApproval);

// Admin actions
router.patch("/:id/approve", protect, allowRoles("ADMIN"), validateObjectId("id"), adminApproveEvent);
router.patch("/:id/reject", protect, allowRoles("ADMIN"), validateObjectId("id"), adminRejectEvent);
router.patch("/:id/image", protect, allowRoles("ADMIN", "ORGANIZER"), validateObjectId("id"), uploadEventImage);

module.exports = router;
