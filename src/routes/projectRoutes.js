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

    // Emit notification for new project
    io.emit("receive_notification", {
      title: "New Project Created",
      message: `Project '${project.name}' has been created.`,
      timestamp: new Date(),
      link: `/projects/${project._id}`, // Optional link to the project
    });

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
    const projectId = req.params.id;

    // Fetch the project
    const project = await Project.findById(projectId).populate([
      { path: "projectLead", select: "firstName lastName email" },
      { path: "members", select: "firstName lastName email" },
      { path: "teamId", select: "name" },
    ]);

    if (!project) {
      return res.status(404).json({ message: "Project not found" });
    }

    // Explicitly fetch tasks related to this project
    const tasks = await Task.find({ projectId: projectId })
      .populate("assignedTo", "firstName lastName email")
      .sort({ createdAt: -1 });

    // Add the fetched tasks to the project object
    const projectWithTasks = project.toObject(); // Convert to plain JavaScript object
    projectWithTasks.tasks = tasks;

    console.log("Backend: Fetched project with tasks:", projectWithTasks);

    res.json(projectWithTasks);
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

    // Emit notification for project update
    io.emit("receive_notification", {
      title: "Project Updated",
      message: `Project '${project.name}' has been updated.`,
      timestamp: new Date(),
      link: `/projects/${project._id}`, // Optional link to the project
    });

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

    // Emit notification for project completion
    io.emit("receive_notification", {
      title: "Project Completed",
      message: `Project '${project.name}' has been marked as completed.`,
      timestamp: new Date(),
      link: `/projects/${project._id}`, // Optional link to the project
    });

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

    // Populate assignedTo to get user details for notification
    const populatedTask = await task.populate(
      "assignedTo",
      "firstName lastName email"
    );

    // Emit notification for new task
    if (populatedTask.assignedTo && populatedTask.assignedTo.length > 0) {
      // Notify assigned members
      populatedTask.assignedTo.forEach((assignedUser) => {
        io.to(assignedUser._id.toString()).emit("receive_notification", {
          title: "New Task Assigned",
          message: `You have been assigned a new task: '${populatedTask.name}'.`,
          timestamp: new Date(),
          link: `/projects/${populatedTask.projectId}/tasks/${populatedTask._id}`, // Optional link to the task
        });
      });
    } else {
      // If no assigned members, maybe notify project lead or all project members
      // You would implement logic here to find relevant users to notify
      console.log(
        `Task '${populatedTask.name}' created with no assigned members. No specific user notification sent.`
      );
      // Example: Emit to all users (less targeted)
      // io.emit('receive_notification', { title: 'New Task Created', message: `A new task '${populatedTask.name}' has been created.`, timestamp: new Date() });
    }

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

    // Emit notification for task update
    if (task.assignedTo && task.assignedTo.length > 0) {
      // Notify assigned members
      const project = await Project.findById(task.projectId).select("name"); // Fetch project name for context
      task.assignedTo.forEach((assignedUser) => {
        io.to(assignedUser.toString()).emit("receive_notification", {
          title: "Task Updated",
          message: `Task '${task.name}' in project '${
            project?.name || "Unknown Project"
          }' has been updated. Status: ${task.status}.`,
          timestamp: new Date(),
          link: `/projects/${task.projectId}/tasks/${task._id}`, // Optional link to the task
        });
      });
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

    // Emit notification for task deletion (optional - decide who should be notified)
    // You would likely fetch the project and assigned users before deletion if you need to send targeted notifications
    console.log(`Task '${task.name}' deleted.`);
    // Example: io.emit('receive_notification', { title: 'Task Deleted', message: `Task '${task.name}' has been deleted.`, timestamp: new Date() });

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

    // Emit notification for project deletion
    io.emit("receive_notification", {
      title: "Project Deleted",
      message: `Project '${project.name}' has been deleted.`,
      timestamp: new Date(),
    });

    res.json({ message: "Project deleted successfully" });
  } catch (error) {
    console.error("Error deleting project:", error);
    res.status(500).json({ message: "Error deleting project" });
  }
});

module.exports = router;
