const mongoose = require("mongoose");

const screenshotSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    imageUrl: {
      type: String,
      required: true,
    },
    cloudinaryId: {
      type: String,
      required: true,
    },
    appName: {
      type: String,
      required: true,
    },
    timestamp: {
      type: Date,
      default: Date.now,
    },
    duration: {
      type: Number,
      default: 0,
    },
    metadata: {
      type: Map,
      of: String,
      default: {},
    },
  },
  { timestamps: true }
);

// Index for faster queries
screenshotSchema.index({ user: 1, timestamp: -1 });
screenshotSchema.index({ timestamp: 1 });

module.exports = mongoose.model("Screenshot", screenshotSchema); 