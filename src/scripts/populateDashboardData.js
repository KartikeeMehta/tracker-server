const mongoose = require("mongoose");
const User = require("../models/User");
const Session = require("../models/Session");
const Team = require("../models/Team");
const Company = require("../models/Company");
require("dotenv").config();

const populateDashboardData = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("Connected to MongoDB");

    // Create a sample company
    const company = new Company({
      name: "Sample Company",
      email: "admin@samplecompany.com",
      domain: "samplecompany.com",
      industry: "Technology",
    });
    await company.save();
    console.log("Created sample company");

    // Create sample users if they don't exist
    const users = await User.find();
    if (users.length === 0) {
      const sampleUsers = [
        {
          firstName: "John",
          lastName: "Doe",
          email: "john@example.com",
          password: "password123",
          role: "developer",
          companyId: company._id,
        },
        {
          firstName: "Jane",
          lastName: "Smith",
          email: "jane@example.com",
          password: "password123",
          role: "designer",
          companyId: company._id,
        },
      ];

      await User.insertMany(sampleUsers);
      console.log("Created sample users");
    }

    // Create sample sessions
    const sampleSessions = [];
    const now = new Date();
    const yesterday = new Date(now - 24 * 60 * 60 * 1000);

    for (const user of users) {
      // Create a session for today
      const todaySession = new Session({
        userId: user._id,
        startTime: new Date(now - 4 * 60 * 60 * 1000), // 4 hours ago
        endTime: now,
        status: "completed",
        totalDuration: 14400, // 4 hours in seconds
        activeTime: 12000, // 3.33 hours
        idleTime: 2400, // 40 minutes
        activities: [
          {
            timestamp: new Date(now - 3 * 60 * 60 * 1000),
            windowTitle: "Working on Project X",
            processName: "code",
            appName: "VS Code",
            url: "https://github.com",
          },
          {
            timestamp: new Date(now - 2 * 60 * 60 * 1000),
            windowTitle: "Team Meeting",
            processName: "zoom",
            appName: "Zoom",
            url: "https://zoom.us",
          },
        ],
      });

      // Create a session for yesterday
      const yesterdaySession = new Session({
        userId: user._id,
        startTime: new Date(yesterday - 6 * 60 * 60 * 1000),
        endTime: yesterday,
        status: "completed",
        totalDuration: 21600, // 6 hours in seconds
        activeTime: 18000, // 5 hours
        idleTime: 3600, // 1 hour
        activities: [
          {
            timestamp: new Date(yesterday - 5 * 60 * 60 * 1000),
            windowTitle: "Design Review",
            processName: "figma",
            appName: "Figma",
            url: "https://figma.com",
          },
        ],
      });

      sampleSessions.push(todaySession, yesterdaySession);
    }

    await Session.insertMany(sampleSessions);
    console.log("Created sample sessions");

    // Create sample team
    const team = new Team({
      name: "Development Team",
      companyId: company._id,
      lead: users[0]._id,
      members: users.map((user) => user._id),
    });

    await team.save();
    console.log("Created sample team");

    console.log("Dashboard data populated successfully");
    process.exit(0);
  } catch (error) {
    console.error("Error populating dashboard data:", error);
    process.exit(1);
  }
};

populateDashboardData();
