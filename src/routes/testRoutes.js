const express = require("express");
const router = express.Router();
const { upload } = require("../utils/cloudinary");
const { getOptimizedUrl } = require("../utils/cloudinary");

// Test route to check if server is running
router.get("/ping", (req, res) => {
  res.json({ message: "Server is running", timestamp: new Date() });
});

// Test route to upload an image
router.post("/upload", (req, res, next) => {
  console.log("Upload request received");
  upload.single("image")(req, res, (err) => {
    if (err) {
      console.error("Multer/Cloudinary error:", {
        name: err.name,
        message: err.message,
        stack: err.stack,
      });
      return res.status(400).json({
        message: "Upload error",
        error: err.message,
        type: err.name,
      });
    }

    try {
      console.log("File received:", req.file);

      if (!req.file) {
        return res.status(400).json({
          message: "No image file provided",
          receivedFiles: req.files,
          body: req.body,
        });
      }

      // Get the optimized URL for the uploaded image
      const imageUrl = getOptimizedUrl(req.file.filename);
      console.log("Generated URL:", imageUrl);

      res.json({
        message: "Image uploaded successfully",
        file: {
          filename: req.file.filename,
          originalname: req.file.originalname,
          mimetype: req.file.mimetype,
          size: req.file.size,
          url: imageUrl,
          path: req.file.path,
          public_id: req.file.filename,
        },
      });
    } catch (error) {
      console.error("Processing error:", {
        name: error.name,
        message: error.message,
        stack: error.stack,
      });
      res.status(500).json({
        message: "Error processing upload",
        error: error.message,
        type: error.name,
      });
    }
  });
});

module.exports = router;
