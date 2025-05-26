const express = require("express");
const router = express.Router();
const { auth } = require("../middleware/auth");
const {
  register,
  login,
  getCurrentUser,
  updateSettings,
  updateProfile,
  getCompanyMembers,
  getUserById,
} = require("../controllers/userController");

// Public routes
router.post("/register", register);
router.post("/login", login);

// Protected routes
router.get("/me", auth, getCurrentUser);
router.get("/all", auth, getCompanyMembers);
router.put("/profile", auth, updateProfile);
router.put("/settings", auth, updateSettings);
// Keep the parameterized route last
router.get("/:userId", auth, getUserById);

module.exports = router;
