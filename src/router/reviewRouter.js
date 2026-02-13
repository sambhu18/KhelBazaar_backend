const express = require("express");
const multer = require("multer");
const path = require("path");
const { verifyToken } = require("../middleware/authMiddleware");
const { storage } = require("../config/cloudinary");
const {
  createReview,
  getProductReviews,
  getUserReviews,
  updateReview,
  deleteReview,
  markHelpful,
  getAllReviews,
  moderateReview
} = require("../controller/reviewController");

const router = express.Router();

// Configure multer for review images
const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
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
router.get("/product/:productId", getProductReviews); // Get reviews for a product

// Protected routes (require authentication)
router.post("/", verifyToken, upload.array("images", 5), createReview); // Create review
router.get("/my-reviews", verifyToken, getUserReviews); // Get user's reviews
router.put("/:id", verifyToken, upload.array("images", 5), updateReview); // Update review
router.delete("/:id", verifyToken, deleteReview); // Delete review
router.post("/:id/helpful", markHelpful); // Mark review as helpful (no auth required)

// Admin routes
router.get("/admin/all", verifyToken, getAllReviews); // Get all reviews for moderation
router.put("/admin/:id/moderate", verifyToken, moderateReview); // Moderate review

module.exports = router;