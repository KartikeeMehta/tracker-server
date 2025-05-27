const jwt = require("jsonwebtoken");
const User = require("../models/User");

const auth = async (req, res, next) => {
  console.log("Auth middleware - headers:", req.headers);
  try {
    const token = req.header("Authorization")?.replace("Bearer ", "");
    if (!token) {
      console.log("No token provided");
      return res.status(401).json({ message: "No token provided" });
    }

    if (!process.env.JWT_SECRET) {
      console.error("JWT_SECRET is not set in environment variables");
      return res.status(500).json({ message: "Server configuration error" });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log("Token decoded:", decoded);

    if (!decoded.userId) {
      console.log("Token does not contain userId");
      return res.status(401).json({ message: "Invalid token format" });
    }

    const user = await User.findById(decoded.userId).populate("companyId");
    if (!user) {
      console.log("User not found for token");
      return res.status(401).json({ message: "User not found" });
    }

    // Set both user and userId for compatibility
    req.user = user;
    req.userId = user._id;
    next();
  } catch (error) {
    console.error("Auth middleware error:", error);
    if (error.name === "JsonWebTokenError") {
      return res.status(401).json({ message: "Invalid token" });
    }
    if (error.name === "TokenExpiredError") {
      return res.status(401).json({ message: "Token expired" });
    }
    res.status(401).json({ message: "Authentication failed" });
  }
};

const checkRole = (roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: "Authentication required" });
    }
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: "Access denied" });
    }
    next();
  };
};

module.exports = {
  auth,
  checkRole,
};
