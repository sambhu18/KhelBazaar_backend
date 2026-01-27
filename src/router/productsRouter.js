const express = require("express");
const router = express.Router();
const {
  getAllProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
  getProductsByCategory,
} = require("../controller/productController");
const authMiddleware = require("../middleware/authMiddleware");
const multer = require("multer");
const path = require("path");

const { storage } = require("../config/cloudinary");

const upload = multer({ storage: storage });

// Routes
router.get("/", getAllProducts);
router.get("/category/:category", getProductsByCategory);
router.get("/:id", getProductById);

// Protected routes (Admin only)
router.post("/", authMiddleware.protect, authMiddleware.authorizeRoles("admin"), upload.array("images"), createProduct);
router.put("/:id", authMiddleware.protect, authMiddleware.authorizeRoles("admin"), upload.array("images"), updateProduct);
router.delete("/:id", authMiddleware.protect, authMiddleware.authorizeRoles("admin"), deleteProduct);

module.exports = router;
