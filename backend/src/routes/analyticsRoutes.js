const express = require("express");
const { getOrganizerAnalytics } = require("../controllers/analyticsController");
const { protect } = require("../middlewares/authMiddleware");
const { allowRoles } = require("../middlewares/roleMiddleware");

const router = express.Router();

router.get("/organizer", protect, allowRoles("ORGANIZER"), getOrganizerAnalytics);

module.exports = router;
