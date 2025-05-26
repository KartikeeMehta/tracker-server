const mongoose = require("mongoose");

const sessionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    startTime: {
      type: Date,
      required: true,
    },
    endTime: {
      type: Date,
      default: null,
    },
    status: {
      type: String,
      enum: ["active", "completed"],
      default: "active",
    },
    activities: [
      {
        timestamp: {
          type: Date,
          required: true,
        },
        windowTitle: {
          type: String,
          required: true,
        },
        processName: {
          type: String,
          required: true,
        },
        appName: {
          type: String,
          default: null,
        },
        url: {
          type: String,
          default: null,
        },
        tabInfo: {
          title: String,
          url: String,
          favicon: String,
          lastActive: Date,
          duration: {
            type: Number,
            default: 0,
          },
        },
        windowInfo: {
          type: Object,
          default: null,
        },
        screenshotUrl: {
          type: String,
          default: null,
        },
        screenshotPublicId: {
          type: String,
          default: null,
        },
        duration: {
          type: Number,
          default: 0,
        },
      },
    ],
    breaks: [
      {
        startTime: {
          type: Date,
          required: true,
        },
        endTime: {
          type: Date,
          default: null,
        },
        duration: {
          type: Number,
          default: 0,
        },
      },
    ],
    meetings: [
      {
        startTime: {
          type: Date,
          required: true,
        },
        endTime: {
          type: Date,
          default: null,
        },
        duration: {
          type: Number,
          default: 0,
        },
      },
    ],
    totalDuration: {
      type: Number, // in seconds
      default: 0,
    },
    idleTime: {
      type: Number, // in seconds
      default: 0,
    },
    activeTime: {
      type: Number, // in seconds
      default: 0,
    },
    totalDurationFormatted: {
      type: String,
      default: "00:00:00",
    },
    idleTimeFormatted: {
      type: String,
      default: "00:00:00",
    },
    activeTimeFormatted: {
      type: String,
      default: "00:00:00",
    },
  },
  {
    timestamps: true,
  }
);

// Calculate total duration, idle time, and active time (excluding breaks and meetings)
sessionSchema.methods.calculateTimes = function () {
  if (this.endTime) {
    const duration = (this.endTime - this.startTime) / 1000; // seconds
    this.totalDuration = Math.round(duration);
    const totalBreakDuration = this.breaks.reduce(
      (total, b) => total + (b.duration || 0),
      0
    );
    const totalMeetingDuration = this.meetings.reduce(
      (total, m) => total + (m.duration || 0),
      0
    );
    this.activeTime = Math.max(
      this.totalDuration -
        this.idleTime -
        totalBreakDuration -
        totalMeetingDuration,
      0
    );
  }
};

// Utility to format seconds as HH:MM:SS
function secondsToHHMMSS(seconds) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return [h, m, s].map((v) => v.toString().padStart(2, "0")).join(":");
}

// Get a summary object for the session
sessionSchema.methods.getTimeSummary = function () {
  return {
    totalDuration: this.totalDuration,
    idleTime: this.idleTime,
    activeTime: this.activeTime,
    totalDurationFormatted: secondsToHHMMSS(this.totalDuration),
    idleTimeFormatted: secondsToHHMMSS(this.idleTime),
    activeTimeFormatted: secondsToHHMMSS(this.activeTime),
  };
};

// Add activity to session
sessionSchema.methods.addActivity = function (activity) {
  // Update duration of previous activity if exists
  if (this.activities.length > 0) {
    const lastActivity = this.activities[this.activities.length - 1];
    const now = new Date();
    lastActivity.duration = Math.round((now - lastActivity.timestamp) / 1000);
  }

  this.activities.push(activity);
  return this.save();
};

// Start a break
sessionSchema.methods.startBreak = function () {
  const now = new Date();
  this.breaks.push({
    startTime: now,
  });
  return this.save();
};

// End a break
sessionSchema.methods.endBreak = function () {
  const now = new Date();
  const currentBreak = this.breaks[this.breaks.length - 1];
  if (currentBreak && !currentBreak.endTime) {
    currentBreak.endTime = now;
    currentBreak.duration = Math.round((now - currentBreak.startTime) / 1000);
  }
  return this.save();
};

// Start a meeting
sessionSchema.methods.startMeeting = function () {
  const now = new Date();
  this.meetings.push({
    startTime: now,
  });
  return this.save();
};

// End a meeting
sessionSchema.methods.endMeeting = function () {
  const now = new Date();
  const currentMeeting = this.meetings[this.meetings.length - 1];
  if (currentMeeting && !currentMeeting.endTime) {
    currentMeeting.endTime = now;
    currentMeeting.duration = Math.round(
      (now - currentMeeting.startTime) / 1000
    );
  }
  return this.save();
};

// Get break count for today
sessionSchema.statics.getBreakCount = async function (userId) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const sessions = await this.find({
    userId,
    startTime: { $gte: today },
  });

  return sessions.reduce((count, session) => {
    return count + session.breaks.length;
  }, 0);
};

// Get meeting count for today
sessionSchema.statics.getMeetingCount = async function (userId) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const sessions = await this.find({
    userId,
    startTime: { $gte: today },
  });

  return sessions.reduce((count, session) => {
    return count + session.meetings.length;
  }, 0);
};

const Session = mongoose.model("Session", sessionSchema);

module.exports = Session;
