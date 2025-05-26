const cloudinary = require("cloudinary").v2;
const multer = require("multer");
const { CloudinaryStorage } = require("multer-storage-cloudinary");

// Log environment variables (without sensitive data)
console.log("Cloudinary Config Check:", {
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME ? "Set" : "Not Set",
  api_key: process.env.CLOUDINARY_API_KEY ? "Set" : "Not Set",
  api_secret: process.env.CLOUDINARY_API_SECRET ? "Set" : "Not Set",
});

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Verify Cloudinary configuration
cloudinary.api
  .ping()
  .then(() => console.log("Cloudinary connection successful"))
  .catch((err) => console.error("Cloudinary connection failed:", err.message));

// Configure storage
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: "productivity-tracker/screenshots",
    allowed_formats: ["jpg", "jpeg", "png", "avif", "webp", "gif"],
    transformation: [{ width: 1920, height: 1080, crop: "limit" }], // Limit max size
    resource_type: "image",
  },
});

// Configure multer
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    console.log("Processing file:", {
      originalname: file.originalname,
      mimetype: file.mimetype,
      size: file.size,
    });

    // Updated mime type check to include more formats
    const allowedMimeTypes = [
      "image/jpeg",
      "image/png",
      "image/avif",
      "image/webp",
      "image/gif",
    ];

    if (allowedMimeTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(
        new Error(
          `File format ${file.mimetype} not allowed. Please upload: jpg, jpeg, png, avif, webp, or gif`
        ),
        false
      );
    }
  },
});

// Function to delete file
const deleteFile = async (publicId) => {
  try {
    const result = await cloudinary.uploader.destroy(publicId);
    return result.result === "ok";
  } catch (error) {
    console.error("Error deleting file from Cloudinary:", error);
    return false;
  }
};

// Function to get optimized URL
const getOptimizedUrl = (publicId, options = {}) => {
  const defaultOptions = {
    quality: "auto",
    fetch_format: "auto",
    width: 1920,
    crop: "limit",
  };

  return cloudinary.url(publicId, { ...defaultOptions, ...options });
};

module.exports = {
  upload,
  deleteFile,
  getOptimizedUrl,
  cloudinary,
};
