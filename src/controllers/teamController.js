const Team = require("../models/Team");
const User = require("../models/User");
const Session = require("../models/Session");
const { sendNewMemberCredentials } = require("../utils/email");

// Get team overview
exports.getTeamOverview = async (req, res) => {
  try {
    // Get all users in the company
    const users = await User.find({ companyId: req.user.companyId }).select(
      "firstName lastName email role _id"
    );
    // Get all teams in the company
    const teams = await Team.find({ companyId: req.user.companyId })
      .populate("lead", "firstName lastName email role _id")
      .populate("members", "firstName lastName email role _id");
    // Get all active sessions (endTime: null)
    const now = new Date();
    const sessions = await require("../models/Session").find({
      userId: { $in: users.map((u) => u._id) },
      endTime: null,
    });
    // Map userId to last activity and status
    const userStatusMap = {};
    sessions.forEach((session) => {
      // Assume last activity is now for demo; you can enhance with real activity
      userStatusMap[session.userId.toString()] = {
        status: "active",
        lastActive: session.updatedAt || now,
      };
    });
    // Calculate stats
    let activeMembers = 0;
    let onBreakMembers = 0;
    let offlineMembers = 0;
    users.forEach((user) => {
      const status = userStatusMap[user._id.toString()];
      if (status && status.status === "active") {
        activeMembers++;
      } else {
        offlineMembers++;
      }
    });
    // Build response
    res.json({
      totalMembers: users.length,
      activeMembers,
      onBreakMembers, // (implement break logic if you track it)
      offlineMembers,
      teams: teams.map((team) => ({
        id: team._id,
        name: team.name,
        lead: team.lead
          ? {
              id: team.lead._id,
              name: `${team.lead.firstName} ${team.lead.lastName}`,
              email: team.lead.email,
            }
          : null,
        members: team.members.map((member) => ({
          id: member._id,
          name: `${member.firstName} ${member.lastName}`,
          email: member.email,
          role: member.role,
          status: userStatusMap[member._id.toString()]?.status || "offline",
        })),
      })),
    });
  } catch (error) {
    console.error("Error in getTeamOverview:", error);
    res.status(500).json({ message: "Error fetching team overview" });
  }
};

// Get team members
exports.getTeamMembers = async (req, res) => {
  try {
    const users = await User.find({ company: req.user.company })
      .select("-password -verificationToken")
      .populate("teams", "name");

    // Get active sessions for all users
    const activeSessions = await Session.find({
      user: { $in: users.map((user) => user._id) },
      endTime: null,
    });

    // Create a map of user IDs to their active sessions
    const userSessions = activeSessions.reduce((acc, session) => {
      acc[session.user.toString()] = session;
      return acc;
    }, {});

    const members = users.map((user) => {
      const activeSession = userSessions[user._id.toString()];
      let status = "offline";
      let lastActive = null;

      if (activeSession) {
        const lastActivity = new Date(activeSession.lastActivity);
        const now = new Date();
        const minutesSinceLastActivity = Math.floor(
          (now - lastActivity) / (1000 * 60)
        );

        if (minutesSinceLastActivity <= 5) {
          status = activeSession.isBreak ? "break" : "active";
        }
        lastActive = lastActivity;
      }

      return {
        _id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        role: user.role,
        phone: user.phone,
        location: user.location,
        teams: user.teams.map((team) => ({
          id: team._id,
          name: team.name,
        })),
        status,
        lastActive,
      };
    });

    res.json(members);
  } catch (error) {
    console.error("Error in getTeamMembers:", error);
    res.status(500).json({ message: "Error fetching team members" });
  }
};

// Add new team member
exports.addTeamMember = async (req, res) => {
  try {
    const { firstName, lastName, email, role, phone, location } = req.body;

    console.log("Adding team member with data:", {
      firstName,
      lastName,
      email,
      role,
      phone,
      location,
      company: req.user.companyId,
    });

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: "User already exists" });
    }

    // Generate temporary password and employee ID
    const tempPassword = Math.random().toString(36).slice(-8);
    const employeeId = `EMP${Date.now()}`;

    // Create new user
    const user = new User({
      firstName,
      lastName,
      email,
      password: tempPassword,
      role,
      phone,
      location,
      companyId: req.user.companyId._id,
      employeeId,
      isVerified: true, // Since this is an admin action
    });

    console.log("Created user object:", user);

    await user.save();
    console.log("User saved successfully");

    // Send credentials email to the new member
    const loginUrl = process.env.CLIENT_URL
      ? `${process.env.CLIENT_URL}/login`
      : "http://localhost:5173/login";
    const companyName = req.user.companyId.name || "Your Company";
    await sendNewMemberCredentials(
      user.email,
      user.firstName,
      tempPassword,
      loginUrl,
      companyName
    );

    res.status(201).json({
      message: "Team member added successfully",
      user: {
        _id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        role: user.role,
        phone: user.phone,
        location: user.location,
        employeeId: user.employeeId,
        tempPassword, // Send temporary password to admin
      },
    });
  } catch (error) {
    console.error("Error in addTeamMember:", {
      error: error.message,
      stack: error.stack,
      user: req.user,
      body: req.body,
    });
    res.status(500).json({
      message: "Error adding team member",
      error: error.message,
      details: error.stack,
    });
  }
};

// Add a placeholder for getTeamPerformance to prevent server crash
exports.getTeamPerformance = async (req, res) => {
  console.log("getTeamPerformance route hit - Placeholder response");
  try {
    // For now, return an empty array or sample data structure
    res.json([]);
  } catch (error) {
    console.error("Error in getTeamPerformance placeholder:", error);
    res.status(500).json({ message: "Error fetching team performance" });
  }
};

// Update team member
exports.updateTeamMember = async (req, res) => {
  try {
    const { memberId } = req.params;
    const { firstName, lastName, email, role, phone, location } = req.body;

    // Check if user exists and belongs to the same company
    const user = await User.findOne({
      _id: memberId,
      company: req.user.company,
    });

    if (!user) {
      return res.status(404).json({ message: "Team member not found" });
    }

    // Update user
    user.firstName = firstName;
    user.lastName = lastName;
    user.email = email;
    user.role = role;
    user.phone = phone;
    user.location = location;

    await user.save();

    res.json({
      message: "Team member updated successfully",
      user: {
        _id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        role: user.role,
        phone: user.phone,
        location: user.location,
      },
    });
  } catch (error) {
    console.error("Error in updateTeamMember:", error);
    res.status(500).json({ message: "Error updating team member" });
  }
};

// Delete team member
exports.deleteTeamMember = async (req, res) => {
  try {
    const { memberId } = req.params;

    // Check if user exists and belongs to the same company
    const user = await User.findOne({
      _id: memberId,
      company: req.user.company,
    });

    if (!user) {
      return res.status(404).json({ message: "Team member not found" });
    }

    // Remove user from all teams
    await Team.updateMany(
      { members: memberId },
      { $pull: { members: memberId } }
    );

    // Delete user's sessions
    await Session.deleteMany({ user: memberId });

    // Delete user
    await user.deleteOne();

    res.json({ message: "Team member deleted successfully" });
  } catch (error) {
    console.error("Error in deleteTeamMember:", error);
    res.status(500).json({ message: "Error deleting team member" });
  }
};

// List all teams
exports.getTeams = async (req, res) => {
  try {
    const teams = await Team.find({ companyId: req.user.companyId })
      .populate("lead", "firstName lastName email")
      .populate("members", "firstName lastName email");
    res.json(teams);
  } catch (error) {
    res
      .status(500)
      .json({ message: "Failed to fetch teams", error: error.message });
  }
};

// Add a new team
exports.addTeam = async (req, res) => {
  try {
    const { name, lead, members } = req.body;
    const team = new Team({
      name,
      lead: lead || null,
      members: members || [],
      companyId: req.user.companyId,
    });
    await team.save();
    await team.populate("lead", "firstName lastName email");
    await team.populate("members", "firstName lastName email");
    res.status(201).json(team);
  } catch (error) {
    res
      .status(500)
      .json({ message: "Failed to add team", error: error.message });
  }
};

// Update a team
exports.updateTeam = async (req, res) => {
  try {
    const { teamId } = req.params;
    const { name, lead, members } = req.body;
    const team = await Team.findOneAndUpdate(
      { _id: teamId, companyId: req.user.companyId },
      { name, lead: lead || null, members: members || [] },
      { new: true }
    )
      .populate("lead", "firstName lastName email")
      .populate("members", "firstName lastName email");
    if (!team) return res.status(404).json({ message: "Team not found" });
    res.json(team);
  } catch (error) {
    res
      .status(500)
      .json({ message: "Failed to update team", error: error.message });
  }
};

// Delete a team
exports.deleteTeam = async (req, res) => {
  try {
    const { teamId } = req.params;
    const team = await Team.findOneAndDelete({
      _id: teamId,
      companyId: req.user.companyId,
    });
    if (!team) return res.status(404).json({ message: "Team not found" });
    res.json({ message: "Team deleted successfully" });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Failed to delete team", error: error.message });
  }
};

// Remove a member from a team
exports.removeTeamMember = async (req, res) => {
  try {
    const { teamId, memberId } = req.params;
    const team = await Team.findOneAndUpdate(
      { _id: teamId, companyId: req.user.companyId },
      { $pull: { members: memberId } },
      { new: true }
    )
      .populate("lead", "firstName lastName email")
      .populate("members", "firstName lastName email");
    if (!team) return res.status(404).json({ message: "Team not found" });
    res.json(team);
  } catch (error) {
    res
      .status(500)
      .json({ message: "Failed to remove member", error: error.message });
  }
};

// Fetch all users in the company (for selection)
exports.getAllUsers = async (req, res) => {
  try {
    const users = await User.find({ companyId: req.user.companyId }).select(
      "firstName lastName email role"
    );
    res.json(users);
  } catch (error) {
    res
      .status(500)
      .json({ message: "Failed to fetch users", error: error.message });
  }
};
