require("dotenv").config();
const express = require("express");
const cors = require("cors");
const path = require("path");
const fs = require("fs");
const multer = require("multer");
const connectDB = require("./src/config/db");
const authRoutes = require("./src/router/authRoutes");
const productsRouter = require("./src/router/productsRouter");
const ordersRouter = require("./src/router/ordersRouter");
const usersRouter = require("./src/router/usersRouter");
const clubPostRouter = require("./src/router/clubPostRouter");
const reviewRouter = require("./src/router/reviewRouter");
const rentalRouter = require("./src/router/rentalRouter");
const recommendationRouter = require("./src/router/recommendationRouter");
const clubsRouter = require("./src/router/clubsRouter");

const app = express();
app.use(express.json());
app.use((req, res, next) => {
  console.log("REQ:", req.method, req.url);
  next();
});

// FIXED CORS
app.use(
  cors({
    origin: "http://localhost:3000",
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

// IMPORTANT — Handle preflight
// Redundant cors() call removed to avoid overriding custom config

// Create upload directories if they don't exist
const uploadDirs = [
  "uploads",
  "uploads/products",
  "uploads/reviews",
  "uploads/rentals",
  "uploads/users",
  "uploads/clubs"
];

uploadDirs.forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// Serve uploaded files
app.use("/uploads", express.static("uploads"));

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/products", productsRouter);
app.use("/api/orders", ordersRouter);
app.use("/api/users", usersRouter);
app.use("/api/club-posts", clubPostRouter);
app.use("/api/clubs", clubsRouter);
app.use("/api/reviews", reviewRouter);
app.use("/api/rentals", rentalRouter);
app.use("/api/recommendations", recommendationRouter);

// Health check endpoint
app.get("/api/health", (req, res) => {
  res.status(200).json({
    status: "OK",
    timestamp: new Date().toISOString(),
    version: "2.0.0"
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error("Error:", err);

  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ msg: "File too large" });
    }
    if (err.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({ msg: "Too many files" });
    }
  }

  res.status(500).json({
    msg: "Something went wrong!",
    error: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error'
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ msg: "Route not found" });
});

// Connect DB
connectDB();

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));

