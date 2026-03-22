const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/authMiddleware");
const {
  initiatePayment,
  verifyPayment,
  statusCheck,
} = require("../controller/esewaController");

// POST /api/esewa/initiate
// Protected — user must be logged in to initiate payment
router.post("/initiate", protect, initiatePayment);

// POST /api/esewa/verify
// Called by frontend after eSewa redirects back with base64 encoded data
router.post("/verify", verifyPayment);

// GET /api/esewa/status/:orderNumber
// Admin / debug status check
router.get("/status/:orderNumber", protect, statusCheck);

module.exports = router;
