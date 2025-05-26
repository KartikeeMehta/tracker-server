const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/authMiddleware");
const sessionController = require("../controllers/sessionController");

router.get("/current", protect, sessionController.getCurrentSession);

module.exports = router;
