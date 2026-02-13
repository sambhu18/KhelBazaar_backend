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
  moveToCart,
  getLoyaltyPoints,
  getAddresses,
  addAddress,
  updateAddress,
  deleteAddress,
  deleteUser,
  updateUserRole,
  getUserAnalytics
} = require("../controller/userController");
const { verifyToken } = require("../middleware/authMiddleware");

// User profile routes (specific paths first)
router.get("/profile", verifyToken, getUserProfile);
router.put("/profile", verifyToken, updateUserProfile);
router.get("/loyalty/points", verifyToken, getLoyaltyPoints);

// Cart routes (specific paths)
router.get("/cart", verifyToken, getCart);
router.post("/cart/add", verifyToken, addToCart);
router.post("/cart/remove", verifyToken, removeFromCart);
router.put("/cart/update", verifyToken, updateCartQuantity);
router.delete("/cart/clear", verifyToken, clearCart);

// Wishlist routes (specific paths)
router.get("/wishlist", verifyToken, getWishlist);
router.post("/wishlist/add", verifyToken, addToWishlist);
router.post("/wishlist/remove", verifyToken, removeFromWishlist);
router.post("/wishlist/move-to-cart", verifyToken, moveToCart);

// Address routes
router.get("/addresses", verifyToken, getAddresses);
router.post("/addresses", verifyToken, addAddress);
router.put("/addresses/:addressId", verifyToken, updateAddress);
router.delete("/addresses/:addressId", verifyToken, deleteAddress);

// Admin routes (specific paths)
router.get("/admin/analytics", verifyToken, getUserAnalytics);
router.put("/:id/role", verifyToken, updateUserRole);
router.delete("/:id", verifyToken, deleteUser);

// General routes (least specific last)
router.get("/", verifyToken, getAllUsers);

module.exports = router;
