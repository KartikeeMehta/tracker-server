const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const path = require("path");
const http = require("http");
const { Server } = require("socket.io");
require("dotenv").config({ path: path.join(__dirname, "../.env") });

// Initialize models
require("./models");

// Function to check and delete expired projects
async function checkExpiredProjects() {
  try {
    const now = new Date();
    const result = await mongoose.model("Project").deleteMany({
      endDate: { $lt: now },
      status: { $ne: "completed" },
    });

    if (result.deletedCount > 0) {
      console.log(`Deleted ${result.deletedCount} expired projects`);
    }
  } catch (error) {
    console.error("Error checking expired projects:", error);
  }
}

// Run the check every day at midnight
setInterval(checkExpiredProjects, 24 * 60 * 60 * 1000);
// Also run it immediately when server starts
checkExpiredProjects();

// Log environment variables (without sensitive data)
console.log("Environment Check:", {
  NODE_ENV: process.env.NODE_ENV,
  PORT: process.env.PORT,
  MONGODB_URI: process.env.MONGODB_URI ? "Set" : "Not Set",
  CLOUDINARY_CLOUD_NAME: process.env.CLOUDINARY_CLOUD_NAME ? "Set" : "Not Set",
  CLOUDINARY_API_KEY: process.env.CLOUDINARY_API_KEY ? "Set" : "Not Set",
  CLOUDINARY_API_SECRET: process.env.CLOUDINARY_API_SECRET ? "Set" : "Not Set",
  JWT_SECRET: process.env.JWT_SECRET ? "Set" : "Not Set",
});

const userRoutes = require("./routes/userRoutes");
const sessionRoutes = require("./routes/sessionRoutes");
const testRoutes = require("./routes/testRoutes");
const authRoutes = require("./routes/auth");
const teamRoutes = require("./routes/teamRoutes");
const projectRoutes = require("./routes/projectRoutes");
const timelineRoutes = require("./routes/timelineRoutes");
const tabRoutes = require("./routes/tabRoutes");

const app = express();
const server = http.createServer(app);

// Configure Socket.IO
const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL, // Allow connections from your frontend URL
    methods: ["GET", "POST", "PUT", "DELETE"], // Add other necessary methods
  },
});

// Socket.IO connection handling
io.on("connection", (socket) => {
  console.log("A user connected:", socket.id);

  // Identify user on connection (e.g., via a query parameter or handshake)
  const userId = socket.handshake.query.userId;
  if (userId) {
    console.log(`User ${userId} connected with socket ID ${socket.id}`);
    // You might want to store this mapping (userId to socket.id) if you need to send notifications to specific users
  }

  // Handle disconnection
  socket.on("disconnect", () => {
    console.log("User disconnected:", socket.id);
  });

  // You can add more specific event listeners here if needed
});

// CORS configuration
const corsOptions = {
  origin: [
    "http://localhost:5173",
    "https://blaze-tracker.digiwbs.com",
    process.env.CLIENT_URL,
  ],
  credentials: true,
};

app.use(cors(corsOptions));

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files from uploads directory
app.use("/uploads", express.static(path.join(__dirname, "../uploads")));

// MongoDB Connection with retry logic
const connectWithRetry = async () => {
  try {
    const MONGODB_URI =
      process.env.MONGODB_URI ||
      "mongodb+srv://tracker:tracker%40123@tracker.sj8pkix.mongodb.net/tracker";

    console.log("Attempting to connect to MongoDB...");
    await mongoose.connect(MONGODB_URI, {
      serverSelectionTimeoutMS: 5000,
      retryWrites: true,
    });
    console.log("Connected to MongoDB Atlas");
  } catch (err) {
    console.error("Detailed MongoDB connection error:", {
      name: err.name,
      message: err.message,
      code: err.code,
      stack: err.stack,
    });
    console.log("Retrying MongoDB connection in 5 seconds...");
    setTimeout(connectWithRetry, 5000);
  }
};

// Start MongoDB connection
connectWithRetry();

// Routes - Pass the io instance to routes that need it
app.use("/api/users", userRoutes);
app.use("/api/sessions", sessionRoutes);
app.use("/api/test", testRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/teams", teamRoutes(io));
app.use("/api/projects", projectRoutes(io));
app.use("/api/timeline", timelineRoutes);
app.use("/api/tabs", tabRoutes);

// Health check route
app.get("/health", (req, res) => {
  res.json({
    status: "ok",
    timestamp: new Date(),
    environment: process.env.NODE_ENV,
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error("Error:", err);
  res.status(500).json({
    message: "Something went wrong!",
    error: err.message,
  });
});

// Connect to MongoDB and start server (remove duplicate connection)
// mongoose.connect(process.env.MONGODB_URI)
//   .then(() => {
//     console.log("Connected to MongoDB");
const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  console.log(`Health check available at: http://localhost:${PORT}/health`);
});
//   })
//   .catch((err) => {
//     console.error("MongoDB connection error:", err);
//   });
