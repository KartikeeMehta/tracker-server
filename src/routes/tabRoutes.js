const express = require("express");
const router = express.Router();
const { auth } = require("../middleware/auth");
const tabController = require("../controllers/tabController");

console.log("tabController:", tabController);
console.log("tabController methods:", Object.keys(tabController));

// Add error handling middleware
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

// Simple route handlers
router.get("/current", auth, tabController.getCurrentTab);
router.get("/history", auth, tabController.getTabHistory);
router.post("/update", auth, tabController.updateTab);

module.exports = router;
