const mongoose = require("mongoose");

const taskSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    status: {
      type: String,
      enum: ["to-do", "in-progress", "done"],
      default: "to-do",
    },
    dueDate: {
      type: Date,
    },
    assignedTo: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    projectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Project",
      required: true,
    },
    estimatedTime: {
      type: Number,
      min: 0,
    },
    priority: {
      type: String,
      enum: ["none", "low", "medium", "high"],
      default: "none",
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    completionHistory: [
      {
        user: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
          required: true,
        },
        status: {
          type: String,
          enum: ["to-do", "in-progress", "done"],
          required: true,
        },
        timestamp: {
          type: Date,
          default: Date.now,
        },
        notes: String,
      },
    ],
    lastUpdatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    lastUpdatedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

// Add method to update task status
taskSchema.methods.updateStatus = async function (
  userId,
  newStatus,
  notes = ""
) {
  this.status = newStatus;
  this.completionHistory.push({
    user: userId,
    status: newStatus,
    notes,
    timestamp: new Date(),
  });
  this.lastUpdatedBy = userId;
  this.lastUpdatedAt = new Date();
  return this.save();
};

module.exports = mongoose.model("Task", taskSchema);
