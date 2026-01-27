const express = require("express");
const router = express.Router();
const {
  getAllUsers,
  getUserProfile,
  updateUserProfile,
  getCart,
  addToCart,
  removeFromCart,
  updateCartQuantity,
  clearCart,
  getWishlist,
  addToWishlist,
  removeFromWishlist,
  getLoyaltyPoints,
  deleteUser,
  updateUserRole,
} = require("../controller/userController");
const { protect, authorizeRoles } = require("../middleware/authMiddleware");

// User profile routes (specific paths first)
router.get("/profile", protect, getUserProfile);
router.put("/profile", protect, updateUserProfile);
router.get("/loyalty/points", protect, getLoyaltyPoints);

// Cart routes (specific paths)
router.get("/cart", protect, getCart);
router.post("/cart/add", protect, addToCart);
router.post("/cart/remove", protect, removeFromCart);
router.put("/cart/update", protect, updateCartQuantity);
router.delete("/cart/clear", protect, clearCart);

// Wishlist routes (specific paths)
router.get("/wishlist", protect, getWishlist);
router.post("/wishlist/add", protect, addToWishlist);
router.post("/wishlist/remove", protect, removeFromWishlist);

// Admin routes (specific paths)
router.put("/:id/role", protect, authorizeRoles("admin"), updateUserRole);
router.delete("/:id", protect, authorizeRoles("admin"), deleteUser);

// General routes (least specific last)
router.get("/", protect, authorizeRoles("admin"), getAllUsers);

module.exports = router;
