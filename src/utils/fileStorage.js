const multer = require("multer");
const path = require("path");
const fs = require("fs");

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(__dirname, "../../uploads");
const screenshotsDir = path.join(uploadsDir, "screenshots");

if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir);
}
if (!fs.existsSync(screenshotsDir)) {
  fs.mkdirSync(screenshotsDir);
}

// Configure storage
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const userDir = path.join(screenshotsDir, req.user._id.toString());
    if (!fs.existsSync(userDir)) {
      fs.mkdirSync(userDir, { recursive: true });
    }
    cb(null, userDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  },
});

// Configure multer
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith("image/")) {
      cb(null, true);
    } else {
      cb(new Error("Not an image! Please upload an image."), false);
    }
  },
});

// Function to get file URL
const getFileUrl = (filePath) => {
  const relativePath = path.relative(uploadsDir, filePath);
  return `/uploads/${relativePath.replace(/\\/g, "/")}`;
};

// Function to delete file
const deleteFile = async (filePath) => {
  try {
    const fullPath = path.join(uploadsDir, filePath);
    if (fs.existsSync(fullPath)) {
      fs.unlinkSync(fullPath);
      return true;
    }
    return false;
  } catch (error) {
    console.error("Error deleting file:", error);
    return false;
  }
};

module.exports = {
  upload,
  getFileUrl,
  deleteFile,
};
