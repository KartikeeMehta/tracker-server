const express = require("express");
const router = express.Router();
const { auth } = require("../middleware/auth");
const {
  getTimelineData,
  getSummaryStats,
  getDetailedActivities,
  exportTimelineData,
  getActiveSession,
} = require("../controllers/timelineController");

// Get timeline data
router.get("/", auth, getTimelineData);

// Get summary statistics
router.get("/summary", auth, getSummaryStats);

// Get detailed activities
router.get("/activities", auth, getDetailedActivities);

// Export timeline data
router.get("/export", auth, exportTimelineData);

// Get active session
router.get("/active-session", auth, getActiveSession);

module.exports = router;
