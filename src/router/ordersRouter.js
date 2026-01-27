const express = require("express");
const router = express.Router();
const {
  getAllOrders,
  getUserOrders,
  getOrderById,
  createOrder,
  updateOrderStatus,
  updatePaymentStatus,
  deleteOrder,
} = require("../controller/orderController");
const { protect, authorizeRoles } = require("../middleware/authMiddleware");

// Public routes (specific routes first)
router.post("/", protect, createOrder);
router.get("/user/my-orders", protect, getUserOrders);

// Admin routes (specific paths first)
router.put("/:id/status", protect, authorizeRoles("admin"), updateOrderStatus);
router.put("/:id/payment", protect, authorizeRoles("admin"), updatePaymentStatus);
router.delete("/:id", protect, authorizeRoles("admin"), deleteOrder);

// General routes (least specific last)
router.get("/", protect, authorizeRoles("admin"), getAllOrders);
router.get("/:id", protect, getOrderById);

module.exports = router;
