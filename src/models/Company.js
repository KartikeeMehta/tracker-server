const mongoose = require("mongoose");

const companySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    domain: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    logo: {
      type: String,
      default: null,
    },
    industry: {
      type: String,
      trim: true,
    },
    address: {
      type: String,
      trim: true,
    },
    website: {
      type: String,
      trim: true,
    },
    foundedYear: {
      type: Number,
      min: 1800,
      max: new Date().getFullYear(),
    },
    status: {
      type: String,
      enum: ["active", "inactive", "suspended"],
      default: "active",
    },
    teams: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Team",
      },
    ],
    settings: {
      timezone: {
        type: String,
        default: "UTC",
      },
      workingHours: {
        start: {
          type: String,
          default: "09:00",
        },
        end: {
          type: String,
          default: "17:00",
        },
      },
      screenshotInterval: {
        type: Number,
        default: 5, // minutes
      },
    },
  },
  {
    timestamps: true,
  }
);

// Add indexes
companySchema.index({ domain: 1 });
companySchema.index({ name: 1 });

const Company = mongoose.model("Company", companySchema);

module.exports = Company;
