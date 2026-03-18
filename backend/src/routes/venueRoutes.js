const router = require("express").Router();

const { protect } = require("../middlewares/authMiddleware");
const { allowRoles } = require("../middlewares/roleMiddleware");
const validateObjectId = require("../middlewares/validateObjectId");

const venueController = require("../controllers/venueController");

// Public
router.get("/", venueController.getVenues);
router.get("/:id", validateObjectId(), venueController.getVenueById);

// Admin only
router.post("/", protect, allowRoles("ADMIN"), venueController.createVenue);
router.patch("/:id/image", protect, allowRoles("ADMIN"), validateObjectId(), venueController.uploadVenueImage);
router.patch("/:id", protect, allowRoles("ADMIN"), validateObjectId(), venueController.updateVenue);
router.delete("/:id", protect, allowRoles("ADMIN"), validateObjectId(), venueController.deleteVenue);

module.exports = router;