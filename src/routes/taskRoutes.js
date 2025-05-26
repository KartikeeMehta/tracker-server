const express = require("express");
const router = express.Router();
const { auth } = require("../middleware/auth");
const Task = require("../models/Task");

// Get task history (completed and deleted tasks)
router.get("/history", auth, async (req, res) => {
  try {
    const tasks = await Task.find({
      $or: [{ isDeleted: true }, { status: "completed" }],
    })
      .populate([
        { path: "projectId", select: "name description" },
        { path: "assignedTo", select: "firstName lastName email" },
        { path: "createdBy", select: "firstName lastName email" },
      ])
      .sort({ updatedAt: -1 });

    console.log("Found tasks:", tasks.length);
    res.json(tasks);
  } catch (error) {
    console.error("Error fetching task history:", error);
    res.status(500).json({ message: "Error fetching task history" });
  }
});

// Get active tasks
router.get("/", auth, async (req, res) => {
  try {
    const tasks = await Task.find({
      isDeleted: false,
      status: { $ne: "completed" },
    })
      .populate([
        { path: "projectId", select: "name description" },
        { path: "assignedTo", select: "firstName lastName email" },
        { path: "createdBy", select: "firstName lastName email" },
      ])
      .sort({ updatedAt: -1 });

    res.json(tasks);
  } catch (error) {
    console.error("Error fetching tasks:", error);
    res.status(500).json({ message: "Error fetching tasks" });
  }
});

// Complete a task
router.put("/:id/complete", auth, async (req, res) => {
  try {
    const task = await Task.findByIdAndUpdate(
      req.params.id,
      {
        status: "completed",
        completedAt: new Date(),
      },
      { new: true }
    );

    if (!task) {
      return res.status(404).json({ message: "Task not found" });
    }

    res.json(task);
  } catch (error) {
    console.error("Error completing task:", error);
    res.status(500).json({ message: "Error completing task" });
  }
});

// Delete a task (soft delete)
router.delete("/:id", auth, async (req, res) => {
  try {
    const task = await Task.findByIdAndUpdate(
      req.params.id,
      { isDeleted: true },
      { new: true }
    );

    if (!task) {
      return res.status(404).json({ message: "Task not found" });
    }

    res.json({ message: "Task deleted successfully" });
  } catch (error) {
    console.error("Error deleting task:", error);
    res.status(500).json({ message: "Error deleting task" });
  }
});

module.exports = router;
