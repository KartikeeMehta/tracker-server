const AWS = require("aws-sdk");
const multer = require("multer");
const multerS3 = require("multer-s3");
const path = require("path");

// Configure AWS
AWS.config.update({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION,
});

const s3 = new AWS.S3();

// Configure multer for file upload
const upload = multer({
  storage: multerS3({
    s3: s3,
    bucket: process.env.AWS_BUCKET_NAME,
    metadata: function (req, file, cb) {
      cb(null, { fieldName: file.fieldname });
    },
    key: function (req, file, cb) {
      const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
      cb(
        null,
        `screenshots/${req.user._id}/${uniqueSuffix}${path.extname(
          file.originalname
        )}`
      );
    },
  }),
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

// Function to delete a file from S3
const deleteFile = async (fileKey) => {
  try {
    await s3
      .deleteObject({
        Bucket: process.env.AWS_BUCKET_NAME,
        Key: fileKey,
      })
      .promise();
    return true;
  } catch (error) {
    console.error("Error deleting file from S3:", error);
    return false;
  }
};

// Function to get a signed URL for temporary access
const getSignedUrl = async (fileKey, expiresIn = 3600) => {
  try {
    const url = await s3.getSignedUrlPromise("getObject", {
      Bucket: process.env.AWS_BUCKET_NAME,
      Key: fileKey,
      Expires: expiresIn,
    });
    return url;
  } catch (error) {
    console.error("Error generating signed URL:", error);
    return null;
  }
};

module.exports = {
  upload,
  deleteFile,
  getSignedUrl,
};
