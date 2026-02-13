const express = require("express");
const multer = require("multer");
const path = require("path");
const { verifyToken } = require("../middleware/authMiddleware");
const { storage } = require("../config/cloudinary");
const {
  createRental,
  getUserRentals,
  getRentalById,
  updateRentalStatus,
  returnRental,
  getAllRentals,
  checkAvailability,
  cancelRental
} = require("../controller/rentalController");

const router = express.Router();

// Configure multer for rental condition images
const upload = multer({
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: function (req, file, cb) {
    const allowedTypes = /jpeg|jpg|png|gif/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error("Only image files are allowed"));
    }
  },
});

// Public routes
router.get("/availability/:productId", checkAvailability); // Check product availability

// Protected routes (require authentication)
router.post("/", verifyToken, createRental); // Create rental booking
router.get("/my-rentals", verifyToken, getUserRentals); // Get user's rentals
router.get("/:id", verifyToken, getRentalById); // Get rental details
router.put("/:id/return", verifyToken, upload.array("images", 10), returnRental); // Return rental
router.put("/:id/cancel", verifyToken, cancelRental); // Cancel rental

// Admin routes
router.get("/admin/all", verifyToken, getAllRentals); // Get all rentals
router.put("/admin/:id/status", verifyToken, updateRentalStatus); // Update rental status

module.exports = router;