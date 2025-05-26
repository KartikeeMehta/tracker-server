const Session = require("../models/Session");
const { startOfDay, endOfDay } = require("date-fns");

// Get timeline data
const getTimelineData = async (req, res) => {
  try {
    console.log("Timeline request received:", {
      userId: req.user._id,
      query: req.query,
      headers: req.headers,
    });

    const { startDate, endDate } = req.query;
    const userId = req.user._id;

    if (!startDate || !endDate) {
      console.log("Missing date parameters");
      return res.status(400).json({
        message: "Missing required parameters: startDate and endDate",
      });
    }

    const start = startOfDay(new Date(startDate));
    const end = endOfDay(new Date(endDate));

    console.log("Fetching sessions for date range:", {
      start: start.toISOString(),
      end: end.toISOString(),
      userId,
    });

    const sessions = await Session.find({
      userId,
      startTime: { $gte: start, $lte: end },
    }).sort({ startTime: 1 });

    console.log(`Found ${sessions.length} sessions`);

    // Process sessions into daily data
    const dailyData = sessions.reduce((acc, session) => {
      const date = session.startTime.toISOString().split("T")[0];
      if (!acc[date]) {
        acc[date] = {
          date,
          activeTime: 0,
          idleTime: 0,
          breaks: 0,
          meetingBreaks: 0,
          sessions: [],
          breakDetails: [],
          meetingDetails: [],
        };
      }

      // Add session to daily data
      acc[date].sessions.push({
        startTime: session.startTime,
        endTime: session.endTime,
        totalDuration: session.totalDuration || 0,
        idleTime: session.idleTime || 0,
        activeTime: session.activeTime || 0,
        totalDurationFormatted: session.totalDurationFormatted || "00:00:00",
        idleTimeFormatted: session.idleTimeFormatted || "00:00:00",
        activeTimeFormatted: session.activeTimeFormatted || "00:00:00",
        breaks: session.breaks?.length || 0,
        meetingBreaks: session.meetings?.length || 0,
      });

      // Add break and meeting details
      if (session.breaks?.length) {
        acc[date].breakDetails.push(...session.breaks);
      }
      if (session.meetings?.length) {
        acc[date].meetingDetails.push(...session.meetings);
      }

      // Update daily totals
      acc[date].activeTime += session.activeTime || 0;
      acc[date].idleTime += session.idleTime || 0;
      acc[date].breaks += session.breaks?.length || 0;
      acc[date].meetingBreaks += session.meetings?.length || 0;

      return acc;
    }, {});

    // Convert to array and sort by date
    const timelineData = Object.values(dailyData).sort(
      (a, b) => new Date(a.date) - new Date(b.date)
    );

    console.log("Sending timeline data:", {
      dateRange: `${start.toISOString()} to ${end.toISOString()}`,
      dataPoints: timelineData.length,
    });

    res.json(timelineData);
  } catch (error) {
    console.error("Error in getTimelineData:", {
      error: error.message,
      stack: error.stack,
      query: req.query,
      userId: req.user?._id,
    });
    res.status(500).json({
      message: "Failed to get timeline data",
      error: error.message,
    });
  }
};

// Get summary statistics
const getSummaryStats = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const userId = req.user._id;

    const start = startOfDay(new Date(startDate));
    const end = endOfDay(new Date(endDate));

    const sessions = await Session.find({
      userId,
      startTime: { $gte: start, $lte: end },
    });

    // Calculate summary statistics
    const summary = sessions.reduce(
      (acc, session) => {
        const duration = Math.round(
          (session.endTime - session.startTime) / (1000 * 60)
        );
        acc.totalTime += duration;
        acc.totalBreaks += session.breaks?.length || 0;
        acc.totalMeetingBreaks += session.meetings?.length || 0;
        return acc;
      },
      {
        totalTime: 0,
        totalBreaks: 0,
        totalMeetingBreaks: 0,
        averageSessionTime: 0,
        totalIdleTime: 0,
        totalActiveTime: 0,
        mostUsedApps: [],
      }
    );

    // Calculate average session time
    summary.averageSessionTime = sessions.length
      ? Math.round(summary.totalTime / sessions.length)
      : 0;

    // Get most used apps
    const appUsage = sessions.reduce((acc, session) => {
      session.activities?.forEach((activity) => {
        if (!acc[activity.appName]) {
          acc[activity.appName] = 0;
        }
        acc[activity.appName] += activity.duration || 0;
      });
      return acc;
    }, {});

    summary.mostUsedApps = Object.entries(appUsage)
      .map(([name, duration]) => ({ name, duration }))
      .sort((a, b) => b.duration - a.duration)
      .slice(0, 5);

    res.json(summary);
  } catch (error) {
    console.error("Error in getSummaryStats:", error);
    res.status(500).json({ message: "Failed to get summary statistics" });
  }
};

// Get detailed activities
const getDetailedActivities = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const userId = req.user._id;

    const start = startOfDay(new Date(startDate));
    const end = endOfDay(new Date(endDate));

    const sessions = await Session.find({
      userId,
      startTime: { $gte: start, $lte: end },
    }).sort({ startTime: -1 });

    // Extract and sort all activities
    const activities = sessions.reduce((acc, session) => {
      const sessionActivities = session.activities.map((activity) => ({
        ...activity.toObject(),
        sessionId: session._id,
        startTime: session.startTime,
        endTime: session.endTime,
      }));
      return [...acc, ...sessionActivities];
    }, []);

    activities.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    res.json(activities);
  } catch (error) {
    console.error("Error in getDetailedActivities:", error);
    res.status(500).json({ message: "Failed to get detailed activities" });
  }
};

// Export timeline data
const exportTimelineData = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const userId = req.user._id;

    const start = startOfDay(new Date(startDate));
    const end = endOfDay(new Date(endDate));

    const sessions = await Session.find({
      userId,
      startTime: { $gte: start, $lte: end },
    }).sort({ startTime: 1 });

    // Convert sessions to CSV format
    const csvRows = [
      [
        "Date",
        "Start Time",
        "End Time",
        "Duration (minutes)",
        "Breaks",
        "Meetings",
        "Activities",
      ].join(","),
    ];

    sessions.forEach((session) => {
      const duration = Math.round(
        (session.endTime - session.startTime) / (1000 * 60)
      );
      const activities = session.activities
        ?.map((a) => `${a.appName}: ${a.duration}min`)
        .join("; ");

      csvRows.push(
        [
          session.startTime.toISOString().split("T")[0],
          session.startTime.toISOString(),
          session.endTime.toISOString(),
          duration,
          session.breaks?.length || 0,
          session.meetings?.length || 0,
          `"${activities || ""}"`,
        ].join(",")
      );
    });

    const csvContent = csvRows.join("\n");

    res.setHeader("Content-Type", "text/csv");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=timeline-${startDate}-to-${endDate}.csv`
    );
    res.send(csvContent);
  } catch (error) {
    console.error("Error in exportTimelineData:", error);
    res.status(500).json({ message: "Failed to export timeline data" });
  }
};

// Get active session
const getActiveSession = async (req, res) => {
  try {
    const userId = req.user._id;

    // Find the most recent session that hasn't ended
    const activeSession = await Session.findOne({
      userId,
      endTime: null,
    }).sort({ startTime: -1 });

    if (!activeSession) {
      return res.status(404).json({ message: "No active session found" });
    }

    res.json(activeSession);
  } catch (error) {
    console.error("Error in getActiveSession:", error);
    res.status(500).json({ message: "Failed to get active session" });
  }
};

module.exports = {
  getTimelineData,
  getSummaryStats,
  getDetailedActivities,
  exportTimelineData,
  getActiveSession,
};
