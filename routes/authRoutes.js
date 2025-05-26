const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/authMiddleware");
const authController = require("../controllers/authController");

router.post("/login", authController.login);
router.post("/logout", protect, authController.logout);
router.get("/me", protect, authController.getCurrentUser);

module.exports = router;
