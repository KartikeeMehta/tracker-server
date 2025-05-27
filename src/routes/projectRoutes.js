const express = require("express");
const router = express.Router();
const { auth } = require("../middleware/auth");
const Project = require("../models/Project");
const Task = require("../models/Task");

// Get all active projects
router.get("/", auth, async (req, res) => {
  try {
    const projects = await Project.find({
      isDeleted: false,
      ...(req.query.includeCompleted !== "true" && {
        status: { $ne: "completed" },
      }),
      ...(req.query.includeCompleted === "true" && {
        isDeleted: { $in: [true, false] },
      }),
    })
      .populate([
        { path: "projectLead", select: "firstName lastName email" },
        { path: "members", select: "firstName lastName email" },
        { path: "teamId", select: "name" },
      ])
      .sort({ updatedAt: -1 });

    res.json(projects);
  } catch (error) {
    console.error("Error fetching projects:", error);
    res.status(500).json({ message: "Error fetching projects" });
  }
});

// Create new project
router.post("/", auth, async (req, res) => {
  try {
    const project = new Project(req.body);
    await project.save();
    res.status(201).json(project);
  } catch (error) {
    console.error("Error creating project:", error);
    res.status(500).json({ message: "Error creating project" });
  }
});

// Get project and task history (completed and deleted)
router.get("/history", auth, async (req, res) => {
  try {
    const projects = await Project.find({
      $or: [{ isDeleted: true }, { status: "completed" }],
    })
      .populate([
        { path: "projectLead", select: "firstName lastName email" },
        { path: "members", select: "firstName lastName email" },
        { path: "teamId", select: "name" },
      ])
      .sort({ updatedAt: -1 });

    const tasks = await Task.find({
      $or: [{ isDeleted: true }, { status: "completed" }],
    })
      .populate([
        { path: "projectId", select: "name description" },
        { path: "assignedTo", select: "firstName lastName email" },
        { path: "createdBy", select: "firstName lastName email" },
      ])
      .sort({ updatedAt: -1 });

    res.json({ projects, tasks });
  } catch (error) {
    console.error("Error fetching history:", error);
    res.status(500).json({ message: "Error fetching history" });
  }
});

// Get tasks by user ID
router.get("/tasks/user/:userId", auth, async (req, res) => {
  try {
    const { userId } = req.params;

    if (userId !== req.user._id.toString() && req.user.role !== "admin") {
      return res.status(403).json({
        message: "Not authorized to access these tasks",
      });
    }

    const tasks = await Task.find({
      assignedTo: userId,
      isDeleted: { $ne: true },
    })
      .populate({
        path: "projectId",
        select: "name description",
      })
      .populate({
        path: "assignedTo",
        select: "firstName lastName email",
      })
      .sort({ createdAt: -1 });

    const formattedTasks = tasks.map((task) => ({
      _id: task._id,
      title: task.name,
      description: task.description,
      status: task.status,
      dueDate: task.dueDate,
      project: task.projectId,
      assignedTo: task.assignedTo,
      createdAt: task.createdAt,
      updatedAt: task.updatedAt,
      priority: task.priority,
      estimatedTime: task.estimatedTime,
    }));

    res.json(formattedTasks);
  } catch (error) {
    console.error("Error fetching user tasks:", error);
    res.status(500).json({
      message: "Error fetching user tasks",
      error: error.message,
    });
  }
});

// Project operations with ID
router.get("/:id", auth, async (req, res) => {
  try {
    const project = await Project.findById(req.params.id).populate([
      { path: "projectLead", select: "firstName lastName email" },
      { path: "members", select: "firstName lastName email" },
      { path: "teamId", select: "name" },
      {
        path: "tasks",
        populate: { path: "assignedTo", select: "firstName lastName email" },
      },
    ]);

    if (!project) {
      return res.status(404).json({ message: "Project not found" });
    }

    res.json(project);
  } catch (error) {
    console.error("Error fetching project:", error);
    res.status(500).json({ message: "Error fetching project" });
  }
});

router.put("/:id", auth, async (req, res) => {
  try {
    const project = await Project.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
    });

    if (!project) {
      return res.status(404).json({ message: "Project not found" });
    }

    res.json(project);
  } catch (error) {
    console.error("Error updating project:", error);
    res.status(500).json({ message: "Error updating project" });
  }
});

router.put("/:id/complete", auth, async (req, res) => {
  try {
    const project = await Project.findByIdAndUpdate(
      req.params.id,
      {
        status: "completed",
        completedAt: new Date(),
      },
      { new: true }
    );

    if (!project) {
      return res.status(404).json({ message: "Project not found" });
    }

    res.json(project);
  } catch (error) {
    console.error("Error completing project:", error);
    res.status(500).json({ message: "Error completing project" });
  }
});

// Project tasks operations
router.get("/:projectId/tasks", auth, async (req, res) => {
  try {
    const tasks = await Task.find({ projectId: req.params.projectId })
      .populate("assignedTo", "firstName lastName email")
      .sort({ createdAt: -1 });
    res.json(tasks);
  } catch (error) {
    console.error("Error fetching tasks:", error);
    res.status(500).json({ message: "Error fetching tasks" });
  }
});

router.post("/:projectId/tasks", auth, async (req, res) => {
  try {
    const { assignedMembers, ...rest } = req.body; // Extract assignedMembers

    const task = new Task({
      ...rest, // Include other task data from req.body
      projectId: req.params.projectId,
      createdBy: req.user._id,
      assignedTo: assignedMembers, // Use assignedMembers for assignedTo field
    });
    await task.save();
    res.status(201).json(task);
  } catch (error) {
    console.error("Error creating task:", error);
    res.status(500).json({ message: "Error creating task" });
  }
});

router.put("/:projectId/tasks/:taskId", auth, async (req, res) => {
  try {
    const task = await Task.findByIdAndUpdate(req.params.taskId, req.body, {
      new: true,
    });

    if (!task) {
      return res.status(404).json({ message: "Task not found" });
    }

    res.json(task);
  } catch (error) {
    console.error("Error updating task:", error);
    res.status(500).json({ message: "Error updating task" });
  }
});

router.delete("/:projectId/tasks/:taskId", auth, async (req, res) => {
  try {
    const task = await Task.findByIdAndDelete(req.params.taskId);

    if (!task) {
      return res.status(404).json({ message: "Task not found" });
    }

    res.json({ message: "Task deleted successfully" });
  } catch (error) {
    console.error("Error deleting task:", error);
    res.status(500).json({ message: "Error deleting task" });
  }
});

// Delete project (soft delete)
router.delete("/:projectId", auth, async (req, res) => {
  try {
    const project = await Project.findById(req.params.projectId);

    if (!project) {
      return res.status(404).json({ message: "Project not found" });
    }

    project.isDeleted = true;
    await project.save();

    res.json({ message: "Project deleted successfully" });
  } catch (error) {
    console.error("Error deleting project:", error);
    res.status(500).json({ message: "Error deleting project" });
  }
});

module.exports = router;
