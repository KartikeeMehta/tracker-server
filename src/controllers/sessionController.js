const Session = require("../models/Session");
const { getOptimizedUrl } = require("../utils/cloudinary");
const User = require("../models/User");

// Start a new session
const startSession = async (req, res) => {
  try {
    // Check if user has an active session
    const activeSession = await Session.findOne({
      userId: req.user._id,
      status: "active",
    });

    if (activeSession) {
      return res
        .status(400)
        .json({ message: "You already have an active session" });
    }

    const session = new Session({
      userId: req.user._id,
      startTime: new Date(),
    });

    await session.save();
    res.status(201).json(session);
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error starting session", error: error.message });
  }
};

// Helper function to format seconds to HH:MM:SS
const secondsToHHMMSS = (seconds) => {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return [h, m, s].map((v) => v.toString().padStart(2, "0")).join(":");
};

// End current session
const endSession = async (req, res) => {
  try {
    console.log("Ending session, req.body:", req.body);
    const session = await Session.findOne({
      userId: req.user._id,
      status: "active",
    });

    if (!session) {
      return res.status(404).json({ message: "No active session found" });
    }

    // End any ongoing breaks or meetings
    if (session.breaks.length > 0) {
      const lastBreak = session.breaks[session.breaks.length - 1];
      if (!lastBreak.endTime) {
        lastBreak.endTime = new Date();
        lastBreak.duration = Math.round(
          (lastBreak.endTime - lastBreak.startTime) / 1000
        );
      }
    }

    if (session.meetings.length > 0) {
      const lastMeeting = session.meetings[session.meetings.length - 1];
      if (!lastMeeting.endTime) {
        lastMeeting.endTime = new Date();
        lastMeeting.duration = Math.round(
          (lastMeeting.endTime - lastMeeting.startTime) / 1000
        );
      }
    }

    session.endTime = new Date();
    session.status = "completed";

    // Store totalDuration in seconds
    session.totalDuration = Math.round(
      (session.endTime - session.startTime) / 1000
    );

    // Store idleTime in seconds
    if (req.body.idleTime !== undefined) {
      session.idleTime = req.body.idleTime;
    }

    // Calculate and store active time (excluding breaks and meetings)
    const totalBreakDuration = session.breaks.reduce(
      (total, b) => total + (b.duration || 0),
      0
    );
    const totalMeetingDuration = session.meetings.reduce(
      (total, m) => total + (m.duration || 0),
      0
    );

    session.activeTime = Math.max(
      0,
      session.totalDuration -
        session.idleTime -
        totalBreakDuration -
        totalMeetingDuration
    );

    // Store formatted times
    session.totalDurationFormatted = secondsToHHMMSS(session.totalDuration);
    session.idleTimeFormatted = secondsToHHMMSS(session.idleTime);
    session.activeTimeFormatted = secondsToHHMMSS(session.activeTime);

    await session.save();

    // Return the complete session data
    res.json({
      ...session.toObject(),
      totalBreakDuration,
      totalMeetingDuration,
      breakCount: session.breaks.length,
      meetingCount: session.meetings.length,
    });
  } catch (error) {
    console.error("Error ending session:", error);
    res
      .status(500)
      .json({ message: "Error ending session", error: error.message });
  }
};

// Add activity to current session
const addActivity = async (req, res) => {
  try {
    const { windowTitle, processName, appName, url, tabInfo, windowInfo } =
      req.body;
    const sessionId = req.params.sessionId;

    console.log("Received activity request for session:", sessionId);
    console.log(
      "Activity data:",
      JSON.stringify(
        {
          windowTitle,
          processName,
          appName,
          url,
          tabInfo,
          windowInfo,
        },
        null,
        2
      )
    );

    const session = await Session.findOne({
      _id: sessionId,
      userId: req.user._id,
    });

    if (!session) {
      console.log("Session not found:", sessionId);
      return res.status(404).json({ message: "Session not found" });
    }

    console.log("Found session:", session._id);
    console.log("Current activities count:", session.activities.length);

    // Get the Cloudinary public_id from the uploaded file
    const screenshotUrl = req.file ? getOptimizedUrl(req.file.filename) : null;

    const activity = {
      timestamp: new Date(),
      windowTitle,
      processName,
      appName,
      url,
      tabInfo: {
        title: tabInfo?.title,
        url: tabInfo?.url,
        favicon: tabInfo?.favicon,
        lastActive: tabInfo?.lastActive
          ? new Date(tabInfo.lastActive)
          : new Date(),
        duration: tabInfo?.duration || 0,
      },
      windowInfo: {
        ...windowInfo,
        type: windowInfo?.type || "activity",
        timestamp: new Date().toISOString(),
      },
      screenshotUrl,
      screenshotPublicId: req.file ? req.file.filename : null,
    };

    console.log("Created activity object:", JSON.stringify(activity, null, 2));

    await session.addActivity(activity);
    session.idleTime = req.body.idleTime || session.idleTime;
    await session.save();

    console.log(
      "Activity added successfully. New activities count:",
      session.activities.length
    );
    res.json(session);
  } catch (error) {
    console.error("Error adding activity:", error);
    res
      .status(500)
      .json({ message: "Error adding activity", error: error.message });
  }
};

// Get user's sessions
const getSessions = async (req, res) => {
  try {
    const { startDate, endDate, status } = req.query;
    const query = { userId: req.user._id };

    if (startDate && endDate) {
      query.startTime = {
        $gte: new Date(startDate),
        $lte: new Date(endDate),
      };
    }

    if (status) {
      query.status = status;
    }

    const sessions = await Session.find(query)
      .sort({ startTime: -1 })
      .limit(parseInt(req.query.limit) || 10)
      .skip(parseInt(req.query.skip) || 0);

    // Update screenshot URLs with optimized versions
    for (const session of sessions) {
      for (const activity of session.activities) {
        if (activity.screenshotPublicId) {
          activity.screenshotUrl = getOptimizedUrl(activity.screenshotPublicId);
        }
      }
    }

    res.json(sessions);
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error fetching sessions", error: error.message });
  }
};

// Get session statistics
const getSessionStats = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const query = { userId: req.user._id, status: "completed" };

    if (startDate && endDate) {
      query.startTime = {
        $gte: new Date(startDate),
        $lte: new Date(endDate),
      };
    }

    const stats = await Session.aggregate([
      { $match: query },
      {
        $group: {
          _id: null,
          totalSessions: { $sum: 1 },
          totalDuration: { $sum: "$totalDuration" },
          averageDuration: { $avg: "$totalDuration" },
        },
      },
    ]);

    res.json(
      stats[0] || { totalSessions: 0, totalDuration: 0, averageDuration: 0 }
    );
  } catch (error) {
    res.status(500).json({
      message: "Error fetching session statistics",
      error: error.message,
    });
  }
};

// Get current session
const getCurrentSession = async (req, res) => {
  try {
    console.log("Getting current session for user:", req.user._id);

    const session = await Session.findOne({
      userId: req.user._id,
      status: "active",
    }).populate({
      path: "activities",
      select: "type startTime endTime duration screenshotUrl",
    });

    if (!session) {
      console.log("No active session found for user:", req.user._id);
      return res.status(200).json({
        status: "inactive",
        message: "No active session found",
        code: "NO_ACTIVE_SESSION",
      });
    }

    // Update screenshot URLs to use optimized versions
    if (session.activities && session.activities.length > 0) {
      session.activities = session.activities.map((activity) => {
        if (activity.screenshotUrl) {
          activity.screenshotUrl = getOptimizedUrl(activity.screenshotUrl);
        }
        return activity;
      });
    }

    // Calculate total break and meeting durations
    const totalBreakDuration = session.breaks.reduce(
      (total, b) => total + (b.duration || 0),
      0
    );
    const totalMeetingDuration = session.meetings.reduce(
      (total, m) => total + (m.duration || 0),
      0
    );

    // Check for ongoing breaks or meetings
    const hasOngoingBreak =
      session.breaks.length > 0 &&
      !session.breaks[session.breaks.length - 1].endTime;
    const hasOngoingMeeting =
      session.meetings.length > 0 &&
      !session.meetings[session.meetings.length - 1].endTime;

    console.log("Found active session:", session._id);
    res.json({
      ...session.toObject(),
      status: "active",
      message: "Active session found",
      code: "SESSION_FOUND",
      totalBreakDuration,
      totalMeetingDuration,
      breakCount: session.breaks.length,
      meetingCount: session.meetings.length,
      hasOngoingBreak,
      hasOngoingMeeting,
    });
  } catch (error) {
    console.error("Error getting current session:", error);
    res.status(500).json({
      status: "error",
      message: "Error getting current session",
      code: "SERVER_ERROR",
      error: error.message,
    });
  }
};

// Get user's sessions for today
const getUserSessions = async (req, res) => {
  try {
    const userId = req.user._id;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const sessions = await Session.find({
      userId,
      startTime: { $gte: today },
    }).sort({ startTime: -1 });

    res.json(sessions);
  } catch (error) {
    console.error("Error in getUserSessions:", error);
    res.status(500).json({ message: "Failed to get user sessions" });
  }
};

// Get activity timeline
const getActivityTimeline = async (req, res) => {
  try {
    const userId = req.user._id;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const sessions = await Session.find({
      userId,
      startTime: { $gte: today },
    }).sort({ startTime: -1 });

    // Flatten and sort activities
    const activities = sessions.reduce((acc, session) => {
      const sessionActivities = session.activities.map((activity) => ({
        ...activity.toObject(),
        sessionId: session._id,
      }));
      return [...acc, ...sessionActivities];
    }, []);

    activities.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    res.json(activities);
  } catch (error) {
    console.error("Error in getActivityTimeline:", error);
    res.status(500).json({ message: "Failed to get activity timeline" });
  }
};

// Get focus streak
const getFocusStreak = async (req, res) => {
  try {
    const userId = req.user._id;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Get sessions for the last 30 days
    const thirtyDaysAgo = new Date(today);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const sessions = await Session.find({
      userId,
      startTime: { $gte: thirtyDaysAgo },
    }).sort({ startTime: 1 });

    // Calculate focus streak
    let streak = 0;
    let currentDate = new Date(today);
    currentDate.setHours(0, 0, 0, 0);

    while (true) {
      const hasSession = sessions.some((session) => {
        const sessionDate = new Date(session.startTime);
        sessionDate.setHours(0, 0, 0, 0);
        return sessionDate.getTime() === currentDate.getTime();
      });

      if (!hasSession) break;

      streak++;
      currentDate.setDate(currentDate.getDate() - 1);
    }

    res.json({ streak });
  } catch (error) {
    console.error("Error in getFocusStreak:", error);
    res.status(500).json({ message: "Failed to get focus streak" });
  }
};

// Add break to current session
const takeBreak = async (req, res) => {
  try {
    const session = await Session.findOne({
      userId: req.user._id,
      status: "active",
    });
    if (!session) {
      return res.status(404).json({ message: "No active session found" });
    }
    session.activities.push({
      timestamp: new Date(),
      windowTitle: "Break",
      processName: "Break",
      appName: "Break",
      url: null,
      windowInfo: { type: "break" },
    });
    session.idleTime = req.body.idleTime || session.idleTime;
    await session.save();
    res.json({ success: true, message: "Break recorded" });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error recording break", error: error.message });
  }
};

// Add meeting to current session
const takeMeeting = async (req, res) => {
  try {
    const session = await Session.findOne({
      userId: req.user._id,
      status: "active",
    });
    if (!session) {
      return res.status(404).json({ message: "No active session found" });
    }
    session.activities.push({
      timestamp: new Date(),
      windowTitle: "Meeting",
      processName: "Meeting",
      appName: "Meeting",
      url: null,
      windowInfo: { type: "meeting" },
    });
    session.idleTime = req.body.idleTime || session.idleTime;
    await session.save();
    res.json({ success: true, message: "Meeting recorded" });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error recording meeting", error: error.message });
  }
};

// Start break in current session
const startBreak = async (req, res) => {
  try {
    const session = await Session.findOne({
      userId: req.user._id,
      status: "active",
    });
    if (!session) {
      return res.status(404).json({ message: "No active session found" });
    }

    // Check if user has already taken a break today
    const breakCount = await Session.getBreakCount(req.user._id);
    if (breakCount >= 1) {
      return res
        .status(400)
        .json({ message: "You have already taken your daily break" });
    }

    // Add new break with start time
    session.breaks.push({
      startTime: new Date(),
      duration: 0,
    });

    // Pause active time tracking
    session.lastBreakStart = new Date();
    session.isOnBreak = true;

    await session.save();
    res.json({ success: true, message: "Break started" });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error starting break", error: error.message });
  }
};

// End break in current session
const endBreak = async (req, res) => {
  try {
    const session = await Session.findOne({
      userId: req.user._id,
      status: "active",
    });
    if (!session) {
      return res.status(404).json({ message: "No active session found" });
    }

    // Get the last break
    const lastBreak = session.breaks[session.breaks.length - 1];
    if (!lastBreak || lastBreak.endTime) {
      return res.status(400).json({ message: "No active break found" });
    }

    // Set end time and calculate duration in seconds
    lastBreak.endTime = new Date();
    lastBreak.duration = Math.round(
      (lastBreak.endTime - lastBreak.startTime) / 1000
    );

    // Resume active time tracking
    if (session.lastBreakStart) {
      const breakDuration = Math.round(
        (new Date() - session.lastBreakStart) / 1000
      );
      session.activeTime = Math.max(0, session.activeTime - breakDuration);
    }
    session.isOnBreak = false;
    session.lastBreakStart = null;

    await session.save();
    res.json({
      success: true,
      message: "Break ended",
      duration: lastBreak.duration,
    });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error ending break", error: error.message });
  }
};

// Start meeting in current session
const startMeeting = async (req, res) => {
  try {
    const session = await Session.findOne({
      userId: req.user._id,
      status: "active",
    });
    if (!session) {
      return res.status(404).json({ message: "No active session found" });
    }

    // Check if user has already taken 3 meetings today
    const meetingCount = await Session.getMeetingCount(req.user._id);
    if (meetingCount >= 3) {
      return res
        .status(400)
        .json({ message: "You have reached your daily meeting limit" });
    }

    // Add new meeting with start time
    session.meetings.push({
      startTime: new Date(),
      duration: 0,
    });

    // Pause active time tracking
    session.lastMeetingStart = new Date();
    session.isInMeeting = true;

    await session.save();
    res.json({ success: true, message: "Meeting started" });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error starting meeting", error: error.message });
  }
};

// End meeting in current session
const endMeeting = async (req, res) => {
  try {
    const session = await Session.findOne({
      userId: req.user._id,
      status: "active",
    });
    if (!session) {
      return res.status(404).json({ message: "No active session found" });
    }

    // Get the last meeting
    const lastMeeting = session.meetings[session.meetings.length - 1];
    if (!lastMeeting || lastMeeting.endTime) {
      return res.status(400).json({ message: "No active meeting found" });
    }

    // Set end time and calculate duration in seconds
    lastMeeting.endTime = new Date();
    lastMeeting.duration = Math.round(
      (lastMeeting.endTime - lastMeeting.startTime) / 1000
    );

    // Resume active time tracking
    if (session.lastMeetingStart) {
      const meetingDuration = Math.round(
        (new Date() - session.lastMeetingStart) / 1000
      );
      session.activeTime = Math.max(0, session.activeTime - meetingDuration);
    }
    session.isInMeeting = false;
    session.lastMeetingStart = null;

    await session.save();
    res.json({
      success: true,
      message: "Meeting ended",
      duration: lastMeeting.duration,
    });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error ending meeting", error: error.message });
  }
};

module.exports = {
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
};
