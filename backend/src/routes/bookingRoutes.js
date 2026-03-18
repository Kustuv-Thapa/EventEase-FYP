const router = require("express").Router();

const { protect } = require("../middlewares/authMiddleware");
const { allowRoles } = require("../middlewares/roleMiddleware");
const validateObjectId = require("../middlewares/validateObjectId");
const { validateBookingRequest, validateRejectionReason } = require("../middlewares/bookingValidation");

const bookingController = require("../controllers/bookingController");

// Availability check (can be public OR protected; your choice)
router.get("/venues/:venueId/availability", validateObjectId("venueId"), bookingController.checkAvailability);

// User
router.post("/", protect, validateBookingRequest, bookingController.createBooking);
router.get("/me", protect, bookingController.getMyBookings);
router.patch("/:id/cancel", protect, validateObjectId(), bookingController.cancelMyBooking);

// Admin
router.get("/admin/all", protect, allowRoles("ADMIN"), bookingController.getAdminBookings);
router.get("/admin/stats", protect, allowRoles("ADMIN"), bookingController.adminDashboardStats);
router.patch("/:id/approve", protect, allowRoles("ADMIN"), validateObjectId(), bookingController.approveBooking);
router.patch("/:id/reject", protect, allowRoles("ADMIN"), validateObjectId(), validateRejectionReason, bookingController.rejectBooking);

module.exports = router;