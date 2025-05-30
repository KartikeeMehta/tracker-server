// server/src/controllers/projectController.js

const getAllProjects = async (req, res) => {
  try {
    res.json({ message: "getAllProjects placeholder" });
  } catch (error) {
    res.status(500).json({ message: "Error fetching projects" });
  }
};

const createProject = async (req, res) => {
  try {
    res.json({ message: "createProject placeholder" });
  } catch (error) {
    res.status(500).json({ message: "Error creating project" });
  }
};

module.exports = {
  getAllProjects,
  createProject,
};
