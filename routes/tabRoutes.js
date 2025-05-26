const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/authMiddleware");
const tabController = require("../controllers/tabController");

router.get("/current", protect, tabController.getCurrentTab);
router.get("/history", protect, tabController.getTabHistory);
router.post("/update", protect, tabController.updateTab);

module.exports = router;
