const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/authMiddleware");
const screenshotController = require("../controllers/screenshotController");
const { upload } = require("../config/cloudinary");

// Protected routes
router.use(protect);

// Get all screenshots with optional filters
router.get("/", screenshotController.getScreenshots);

// Upload a new screenshot
router.post(
  "/",
  upload.single("screenshot"),
  screenshotController.uploadScreenshot
);

// Download a screenshot
router.get("/:id/download", screenshotController.downloadScreenshot);

// Delete a screenshot
router.delete("/:id", screenshotController.deleteScreenshot);

module.exports = router;
