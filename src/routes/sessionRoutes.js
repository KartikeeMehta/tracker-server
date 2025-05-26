const express = require("express");
const router = express.Router();
const { auth } = require("../middleware/auth");
const { upload } = require("../utils/cloudinary");
const {
  startSession,
  endSession,
  addActivity,
  getSessions,
  getSessionStats,
  getCurrentSession,
  getUserSessions,
  getActivityTimeline,
  getFocusStreak,
  takeBreak,
  takeMeeting,
  startBreak,
  endBreak,
  startMeeting,
  endMeeting,
} = require("../controllers/sessionController");

// Get current active session
router.get("/current", auth, async (req, res, next) => {
  try {
    console.log("GET /current - User:", req.user._id);
    await getCurrentSession(req, res);
  } catch (error) {
    console.error("Error in /current route:", error);
    next(error);
  }
});

// Start a new session
router.post("/start", auth, async (req, res, next) => {
  try {
    console.log("POST /start - User:", req.user._id);
    await startSession(req, res);
  } catch (error) {
    console.error("Error in /start route:", error);
    next(error);
  }
});

// End current session
router.post("/end", auth, async (req, res, next) => {
  try {
    console.log("POST /end - User:", req.user._id);
    await endSession(req, res);
  } catch (error) {
    console.error("Error in /end route:", error);
    next(error);
  }
});

// Add activity to a specific session
router.post(
  "/:sessionId/activity",
  auth,
  upload.single("screenshot"),
  async (req, res, next) => {
    try {
      console.log("POST /:sessionId/activity - User:", req.user._id);
      await addActivity(req, res);
    } catch (error) {
      console.error("Error in /:sessionId/activity route:", error);
      next(error);
    }
  }
);

// Get user's sessions with pagination
router.get("/", auth, async (req, res, next) => {
  try {
    console.log("GET / - User:", req.user._id);
    await getSessions(req, res);
  } catch (error) {
    console.error("Error in / route:", error);
    next(error);
  }
});

// Get session statistics
router.get("/stats", auth, async (req, res, next) => {
  try {
    console.log("GET /stats - User:", req.user._id);
    await getSessionStats(req, res);
  } catch (error) {
    console.error("Error in /stats route:", error);
    next(error);
  }
});

// Get user's sessions
router.get("/user", auth, getUserSessions);

// Get activity timeline
router.get("/activity-timeline", auth, getActivityTimeline);

// Get focus streak
router.get("/focus-streak", auth, getFocusStreak);

// Add break to current session
router.post("/break/start", auth, async (req, res, next) => {
  try {
    await startBreak(req, res);
  } catch (error) {
    next(error);
  }
});

router.post("/break/end", auth, async (req, res, next) => {
  try {
    await endBreak(req, res);
  } catch (error) {
    next(error);
  }
});

// Add meeting to current session
router.post("/meeting/start", auth, async (req, res, next) => {
  try {
    await startMeeting(req, res);
  } catch (error) {
    next(error);
  }
});

router.post("/meeting/end", auth, async (req, res, next) => {
  try {
    await endMeeting(req, res);
  } catch (error) {
    next(error);
  }
});

module.exports = router;
