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
const esewaRouter = require("./src/router/esewaRouter");

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
app.use("/api/esewa", esewaRouter);

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
  console.error("FULL ERROR STACK:", err.stack || err);

  // Default error response
  let status = 500;
  let message = "Something went wrong!";
  let errorDetail = process.env.NODE_ENV === 'development' ? err.message : 'Internal server error';

  if (err.name === 'MulterError') {
    status = 400;
    message = "File upload error";
    errorDetail = err.message;
    if (err.code === 'LIMIT_FILE_SIZE') {
      errorDetail = "File size is too large. Max 5MB allowed.";
    }
  } else if (err.message === "Only image files are allowed") {
    status = 400;
    message = "Invalid file type";
    errorDetail = err.message;
  } else if (err.name === 'ValidationError') {
    status = 400;
    message = "Validation failed";
    errorDetail = Object.values(err.errors).map(val => val.message).join(', ');
  } else if (err.name === 'MongoError' || err.name === 'BulkWriteError' || (err.code === 11000)) {
     status = 400;
     message = "Recording error / Validation failed";
     errorDetail = err.code === 11000 ? "This record (e.g. title/slug) already exists." : err.message;
  }

  res.status(status).json({
    msg: message,
    error: errorDetail
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

