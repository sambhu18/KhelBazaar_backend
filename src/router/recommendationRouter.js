const express = require("express");
const { verifyToken, optionalAuth } = require("../middleware/authMiddleware");
const {
  generateRecommendations,
  getUserRecommendations,
  trackRecommendation,
  getRecommendationAnalytics,
  generateBulkRecommendations
} = require("../controller/recommendationController");

const router = express.Router();

// Protected routes (require authentication)
router.post("/generate", verifyToken, generateRecommendations); // Generate recommendations
router.get("/my-recommendations", verifyToken, getUserRecommendations); // Get user recommendations
router.post("/:id/track", trackRecommendation); // Track recommendation interaction (no auth required)

// Admin routes
router.get("/admin/analytics", verifyToken, getRecommendationAnalytics); // Get analytics
router.post("/admin/generate-bulk", verifyToken, generateBulkRecommendations); // Generate for all users

module.exports = router;