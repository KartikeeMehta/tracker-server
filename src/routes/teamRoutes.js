const express = require("express");

module.exports = (io) => {
  const router = express.Router();
  const { auth } = require("../middleware/auth");
  const {
    getTeamOverview,
    getTeamMembers,
    addTeamMember,
    updateTeamMember,
    deleteTeamMember,
    getTeams,
    addTeam,
    updateTeam,
    deleteTeam,
    removeTeamMember,
    getAllUsers,
    getTeamPerformance,
  } = require("../controllers/teamController")(io);

  // Teams CRUD - Keep these first
  router.get("/", auth, getTeams); // List all teams
  router.post("/", auth, addTeam); // Add team

  // Team member operations
  router.get("/members", auth, getTeamMembers);
  router.post("/members", auth, addTeamMember);
  router.put("/members/:memberId", auth, updateTeamMember);
  router.delete("/members/:memberId", auth, deleteTeamMember);

  // Team overview
  router.get("/overview", auth, getTeamOverview);

  // Team performance
  router.get("/performance", auth, getTeamPerformance);

  // Fetch all users for selection
  router.get("/all-users", auth, getAllUsers);

  // Team operations with ID - Keep these last
  router.put("/:teamId", auth, updateTeam);
  router.delete("/:teamId", auth, deleteTeam);
  router.delete("/:teamId/members/:memberId", auth, removeTeamMember);

  return router;
};
