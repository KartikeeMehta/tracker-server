const mongoose = require("mongoose");

const projectSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    clientName: { type: String, required: true },
    description: { type: String },
    status: {
      type: String,
      enum: ["active", "completed", "on_hold", "cancelled"],
      default: "active",
    },
    members: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    tasks: [{ type: mongoose.Schema.Types.ObjectId, ref: "Task" }],
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      required: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Project", projectSchema);
