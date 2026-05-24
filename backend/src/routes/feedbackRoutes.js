const express = require("express");
const { protect } = require("../middlewares/authMiddleware");
const { allowRoles } = require("../middlewares/roleMiddleware");
const validateObjectId = require("../middlewares/validateObjectId");

const {
  getEventFeedback,
  submitFeedback,
  updateFeedback,
  deleteFeedback,
  adminHideFeedback,
  adminDeleteFeedback,
  adminGetEventFeedback,
  replyToFeedback,
  deleteOrganizerReply,
} = require("../controllers/feedbackController");

const router = express.Router();

// Public route — no protect
router.get("/events/:eventId", getEventFeedback);

// User routes — specific paths before parameterized ones
router.post("/events/:eventId", protect, validateObjectId("eventId"), submitFeedback);
router.get("/admin/events/:eventId", protect, allowRoles("ADMIN"), validateObjectId("eventId"), adminGetEventFeedback);
router.patch("/:feedbackId/hide", protect, allowRoles("ADMIN"), validateObjectId("feedbackId"), adminHideFeedback);
router.patch("/:feedbackId/reply", protect, allowRoles("ORGANIZER"), validateObjectId("feedbackId"), replyToFeedback);
router.delete("/:feedbackId/reply", protect, allowRoles("ORGANIZER"), validateObjectId("feedbackId"), deleteOrganizerReply);
router.delete("/admin/:feedbackId", protect, allowRoles("ADMIN"), validateObjectId("feedbackId"), adminDeleteFeedback);
router.put("/:feedbackId", protect, validateObjectId("feedbackId"), updateFeedback);
router.delete("/:feedbackId", protect, validateObjectId("feedbackId"), deleteFeedback);

module.exports = router;
