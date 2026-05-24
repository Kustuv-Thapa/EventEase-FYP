const express = require("express");
const { protect } = require("../middlewares/authMiddleware");
const { allowRoles } = require("../middlewares/roleMiddleware");
const validateObjectId = require("../middlewares/validateObjectId");
const {
  adminListUsers,
  adminUserStats,
  adminGetUser,
  adminUpdateUserRole,
  adminVerifyUser,
  adminDeleteUser,
} = require("../controllers/userController");

const router = express.Router();

// All routes are admin-only
router.get("/admin/stats",    protect, allowRoles("ADMIN"), adminUserStats);
router.get("/admin",          protect, allowRoles("ADMIN"), adminListUsers);
router.get("/admin/:id",      protect, allowRoles("ADMIN"), validateObjectId("id"), adminGetUser);
router.patch("/admin/:id/role",   protect, allowRoles("ADMIN"), validateObjectId("id"), adminUpdateUserRole);
router.patch("/admin/:id/verify", protect, allowRoles("ADMIN"), validateObjectId("id"), adminVerifyUser);
router.delete("/admin/:id",   protect, allowRoles("ADMIN"), validateObjectId("id"), adminDeleteUser);

module.exports = router;
