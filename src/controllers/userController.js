const jwt = require("jsonwebtoken");
const User = require("../models/User");
const Company = require("../models/Company");

// Register a new user
const register = async (req, res) => {
  try {
    const { email, password, name } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: "User already exists" });
    }

    // Create new user
    const user = new User({
      email,
      password,
      name,
    });

    await user.save();

    // Generate token
    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, {
      expiresIn: process.env.JWT_EXPIRES_IN,
    });

    res.status(201).json({
      token,
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
    });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error registering user", error: error.message });
  }
};

// Login user
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Find user
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    // Check password
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    // Update last active
    user.lastActive = new Date();
    await user.save();

    // Generate token
    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, {
      expiresIn: process.env.JWT_EXPIRES_IN,
    });

    res.json({
      token,
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
    });
  } catch (error) {
    res.status(500).json({ message: "Error logging in", error: error.message });
  }
};

// Get current user
const getCurrentUser = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select("-password");
    res.json(user);
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error fetching user", error: error.message });
  }
};

// Update user settings
const updateSettings = async (req, res) => {
  try {
    const { screenshotInterval, activityInterval, notifications } = req.body;

    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Update settings
    if (screenshotInterval)
      user.settings.screenshotInterval = screenshotInterval;
    if (activityInterval) user.settings.activityInterval = activityInterval;
    if (notifications !== undefined)
      user.settings.notifications = notifications;

    await user.save();
    res.json(user.settings);
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error updating settings", error: error.message });
  }
};

// Update user profile
const updateProfile = async (req, res) => {
  try {
    const userId = req.user._id;
    const updateData = req.body;

    // Remove sensitive fields that shouldn't be updated
    delete updateData.password;
    delete updateData.email;
    delete updateData.role;
    delete updateData.employeeId;
    delete updateData.createdAt;
    delete updateData.updatedAt;
    delete updateData._id;

    // If company data is being updated
    if (updateData.companyId) {
      const companyId = req.user.companyId;
      const companyUpdateData = updateData.companyId;

      // Remove sensitive company fields
      delete companyUpdateData._id;
      delete companyUpdateData.domain;
      delete companyUpdateData.createdAt;
      delete companyUpdateData.updatedAt;

      // Update company
      const updatedCompany = await Company.findByIdAndUpdate(
        companyId,
        { $set: companyUpdateData },
        { new: true, runValidators: true }
      );

      if (!updatedCompany) {
        return res.status(404).json({ message: "Company not found" });
      }

      // Remove company data from user update
      delete updateData.companyId;
    }

    // Update user
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { $set: updateData },
      { new: true, runValidators: true }
    )
      .select("-password -verificationToken -verificationTokenExpires")
      .populate({
        path: "companyId",
        select: "name domain logo industry address website foundedYear",
      });

    if (!updatedUser) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json(updatedUser);
  } catch (error) {
    console.error("Error updating profile:", error);
    res.status(400).json({ message: error.message });
  }
};

// Get all users in the same company
const getCompanyMembers = async (req, res) => {
  try {
    const users = await User.find()
      .select("firstName lastName email")
      .sort({ firstName: 1, lastName: 1 });

    res.json(users);
  } catch (error) {
    console.error("Error fetching users:", error);
    res.status(500).json({
      message: "Failed to fetch users",
      error: error.message,
    });
  }
};

// Get user by ID
const getUserById = async (req, res) => {
  try {
    const { userId } = req.params;

    // Check if the requesting user is trying to access their own data
    // or if they are an admin
    if (userId !== req.user._id.toString() && req.user.role !== "admin") {
      return res.status(403).json({
        message: "Not authorized to access this user's data",
      });
    }

    const user = await User.findById(userId)
      .select("-password -verificationToken -verificationTokenExpires")
      .populate({
        path: "companyId",
        select: "name domain logo industry address website foundedYear",
      });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Format the response
    const formattedUser = {
      _id: user._id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      phone: user.phone,
      location: user.location,
      role: user.role,
      companyId: user.companyId,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };

    res.json(formattedUser);
  } catch (error) {
    console.error("Error fetching user:", error);
    res.status(500).json({
      message: "Failed to fetch user data",
      error: error.message,
    });
  }
};

module.exports = {
  register,
  login,
  getCurrentUser,
  updateSettings,
  updateProfile,
  getCompanyMembers,
  getUserById,
};
