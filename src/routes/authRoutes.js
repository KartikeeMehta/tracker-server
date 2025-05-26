const express = require("express");
const router = express.Router();
const authController = require("../controllers/authController");
const { auth } = require("../middleware/auth");
const { validateRequest } = require("../middleware/validation");
const { loginSchema, registerSchema } = require("../utils/validators");
const jwt = require("jsonwebtoken");

// Public routes
router.post(
  "/register",
  validateRequest(registerSchema),
  authController.register
);
router.post("/login", validateRequest(loginSchema), authController.login);
router.post("/verify-email", authController.verifyEmail);
router.post("/forgot-password", authController.forgotPassword);
router.post("/reset-password", authController.resetPassword);

// Protected routes
router.get("/me", auth, async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: "User not found" });
    }

    // Return user data without sensitive information
    const userData = {
      _id: req.user._id,
      email: req.user.email,
      firstName: req.user.firstName,
      lastName: req.user.lastName,
      role: req.user.role,
      companyId: req.user.companyId,
      isVerified: req.user.isVerified,
      createdAt: req.user.createdAt,
      updatedAt: req.user.updatedAt,
    };

    res.json(userData);
  } catch (error) {
    console.error("Error in /me route:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/refresh", auth, async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: "User not found" });
    }

    // Generate new token
    const token = jwt.sign({ userId: req.user._id }, process.env.JWT_SECRET, {
      expiresIn: "1h",
    });

    res.json({ token });
  } catch (error) {
    console.error("Error in /refresh route:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/logout", auth, authController.logout);

module.exports = router;
