const express = require("express");
const router = express.Router();
const {
  getAllProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
  getProductsByCategory,
  getProductDiscovery,
  moderateProduct,
  getProductVariants,
  searchProducts
} = require("../controller/productController");
const { verifyToken } = require("../middleware/authMiddleware");
const multer = require("multer");
const { storage } = require("../config/cloudinary");
const path = require("path");

// Configure multer for product images
const upload = multer({
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: function (req, file, cb) {
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
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
router.get("/", getAllProducts); // Get all products with filtering
router.get("/discovery", getProductDiscovery); // Get discovery feed (trending, new, recommendations)
router.get("/search", searchProducts); // Search products
router.get("/category/:category", getProductsByCategory); // Get products by category
router.get("/:id", getProductById); // Get single product with reviews and related
router.get("/:id/variants", getProductVariants); // Get product variants and stock

// Protected routes (Admin and Vendors)
router.post("/", verifyToken, upload.array("images", 10), createProduct); // Create product
router.put("/:id", verifyToken, upload.array("images", 10), updateProduct); // Update product
router.delete("/:id", verifyToken, deleteProduct); // Delete product

// Admin only routes
router.put("/:id/moderate", verifyToken, moderateProduct); // Approve/reject products

module.exports = router;
