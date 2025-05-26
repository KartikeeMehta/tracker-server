const express = require("express");
const router = express.Router();
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const User = require("../models/User");
const Company = require("../models/Company");
const { auth } = require("../middleware/auth");
const {
  sendVerificationEmail,
  sendInvitationEmail,
} = require("../utils/email");

// Register new company and admin
router.post("/register", async (req, res) => {
  try {
    const { companyName, domain, email, password, firstName, lastName } =
      req.body;

    // Check if company domain already exists
    const existingCompany = await Company.findOne({ domain });
    if (existingCompany) {
      return res.status(400).json({ error: "Company domain already exists" });
    }

    // Create company
    const company = new Company({
      name: companyName,
      domain,
    });
    await company.save();

    // Create verification token
    const verificationToken = crypto.randomBytes(32).toString("hex");
    const verificationTokenExpires = Date.now() + 24 * 60 * 60 * 1000; // 24 hours

    // Create admin user
    const user = new User({
      email,
      password,
      firstName,
      lastName,
      companyId: company._id,
      employeeId: `EMP${Date.now()}`,
      role: "admin",
      verificationToken,
      verificationTokenExpires,
    });
    await user.save();

    // Send verification email
    await sendVerificationEmail(email, verificationToken);

    res.status(201).json({
      message:
        "Registration successful. Please check your email to verify your account.",
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Login
router.post("/login", async (req, res) => {
  console.log("Login request received:", {
    body: req.body,
    headers: req.headers,
    origin: req.headers.origin,
    ip: req.ip,
  });

  try {
    const { email, password } = req.body;

    if (!email || !password) {
      console.log("Missing credentials:", {
        email: !!email,
        password: !!password,
      });
      return res.status(400).json({
        message: "Email and password are required",
        error: "MISSING_CREDENTIALS",
      });
    }

    const user = await User.findOne({ email });
    if (!user) {
      console.log("User not found:", email);
      return res.status(401).json({
        message: "Invalid email or password",
        error: "USER_NOT_FOUND",
      });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      console.log("Password mismatch for user:", email);
      return res.status(401).json({
        message: "Invalid email or password",
        error: "INVALID_PASSWORD",
      });
    }

    const token = user.generateAuthToken();
    console.log("Login successful:", {
      email,
      userId: user._id,
      role: user.role,
    });

    // Set CORS headers explicitly
    res.header("Access-Control-Allow-Origin", req.headers.origin);
    res.header("Access-Control-Allow-Credentials", "true");

    res.json({
      token,
      user: user.toJSON(),
      message: "Login successful",
    });
  } catch (error) {
    console.error("Login error:", {
      error: error.message,
      stack: error.stack,
      email: req.body.email,
    });
    res.status(500).json({
      message: "Server error during login",
      error: "SERVER_ERROR",
      details:
        process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
});

// Get current user
router.get("/me", auth, async (req, res) => {
  try {
    console.log("Fetching user profile for ID:", req.userId);

    const user = await User.findById(req.userId)
      .select("-password -verificationToken -verificationTokenExpires")
      .populate({
        path: "companyId",
        select: "name domain logo",
      });

    if (!user) {
      console.log("User not found for ID:", req.userId);
      return res.status(404).json({ error: "User not found" });
    }

    console.log("User profile found:", {
      id: user._id,
      email: user.email,
      role: user.role,
      company: user.companyId ? user.companyId.name : null,
    });

    res.json(user);
  } catch (error) {
    console.error("Error in /me route:", error);
    res.status(500).json({
      error: "Error fetching user profile",
      details: error.message,
    });
  }
});

// Logout
router.post("/logout", auth, async (req, res) => {
  try {
    res.json({ message: "Logged out successfully" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Verify email
router.get("/verify/:token", async (req, res) => {
  try {
    const user = await User.findOne({
      verificationToken: req.params.token,
      verificationTokenExpires: { $gt: Date.now() },
    });

    if (!user) {
      return res
        .status(400)
        .json({ error: "Invalid or expired verification token" });
    }

    user.isVerified = true;
    user.verificationToken = undefined;
    user.verificationTokenExpires = undefined;
    await user.save();

    res.json({ message: "Email verified successfully" });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Invite team member
router.post("/invite", auth, async (req, res) => {
  try {
    const { email, firstName, lastName, role, teamId } = req.body;
    const company = await Company.findById(req.user.companyId);

    // Generate temporary password
    const tempPassword = crypto.randomBytes(8).toString("hex");
    const verificationToken = crypto.randomBytes(32).toString("hex");
    const verificationTokenExpires = Date.now() + 24 * 60 * 60 * 1000; // 24 hours

    const user = new User({
      email,
      password: tempPassword,
      firstName,
      lastName,
      companyId: company._id,
      employeeId: `EMP${Date.now()}`,
      role,
      teams: teamId ? [teamId] : [],
      verificationToken,
      verificationTokenExpires,
    });
    await user.save();

    // Send invitation email
    await sendInvitationEmail(email, verificationToken, tempPassword);

    res.status(201).json({ message: "Invitation sent successfully" });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

module.exports = router;
