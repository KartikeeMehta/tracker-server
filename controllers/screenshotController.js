const Screenshot = require("../models/Screenshot");
const { startOfDay, endOfDay } = require("date-fns");
const { cloudinary } = require("../config/cloudinary");

// Get screenshots with optional filters
exports.getScreenshots = async (req, res) => {
  try {
    const { date, userId } = req.query;
    const query = {};

    if (date) {
      const startDate = startOfDay(new Date(date));
      const endDate = endOfDay(new Date(date));
      query.timestamp = { $gte: startDate, $lte: endDate };
    }

    if (userId) {
      query.user = userId;
    }

    const screenshots = await Screenshot.find(query)
      .populate("user", "firstName lastName email")
      .sort({ timestamp: -1 });

    res.json(screenshots);
  } catch (error) {
    console.error("Error fetching screenshots:", error);
    res.status(500).json({ message: "Error fetching screenshots" });
  }
};

// Upload a new screenshot
exports.uploadScreenshot = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded" });
    }

    const { appName, duration, metadata } = req.body;
    const screenshot = new Screenshot({
      user: req.user._id,
      imageUrl: req.file.path,
      cloudinaryId: req.file.filename,
      appName,
      timestamp: new Date(),
      duration,
      metadata: metadata ? JSON.parse(metadata) : {},
    });

    await screenshot.save();
    res.status(201).json(screenshot);
  } catch (error) {
    console.error("Error uploading screenshot:", error);
    res.status(500).json({ message: "Error uploading screenshot" });
  }
};

// Download a screenshot (redirect to Cloudinary URL)
exports.downloadScreenshot = async (req, res) => {
  try {
    const screenshot = await Screenshot.findById(req.params.id);
    if (!screenshot) {
      return res.status(404).json({ message: "Screenshot not found" });
    }
    res.redirect(screenshot.imageUrl);
  } catch (error) {
    console.error("Error downloading screenshot:", error);
    res.status(500).json({ message: "Error downloading screenshot" });
  }
};

// Delete a screenshot
exports.deleteScreenshot = async (req, res) => {
  try {
    const screenshot = await Screenshot.findById(req.params.id);
    if (!screenshot) {
      return res.status(404).json({ message: "Screenshot not found" });
    }
    // Delete from Cloudinary
    await cloudinary.uploader.destroy(screenshot.cloudinaryId);
    // Delete from database
    await screenshot.remove();
    res.json({ message: "Screenshot deleted successfully" });
  } catch (error) {
    console.error("Error deleting screenshot:", error);
    res.status(500).json({ message: "Error deleting screenshot" });
  }
};
