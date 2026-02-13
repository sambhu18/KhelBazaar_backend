const express = require("express");
const router = express.Router();
const {
  getAllPosts,
  getPostById,
  createPost,
  updatePost,
  deletePost,
  likePost,
  addComment,
  getPostsByClub,
} = require("../controller/clubPostController");
const { protect } = require("../middleware/authMiddleware");
const multer = require("multer");
const { storage } = require("../config/cloudinary");
const path = require("path");

// Multer configuration for file uploads
const upload = multer({
  storage: storage,
  fileFilter: (req, file, cb) => {
    const allowedMimes = ["image/jpeg", "image/png", "image/webp", "image/gif"];
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Invalid file type. Only images are allowed."));
    }
  },
});

// Public routes (specific routes first)
router.get("/", getAllPosts);
router.get("/club/:clubId", getPostsByClub);
router.get("/:id", getPostById);

// Protected routes
router.post("/", protect, upload.array("images"), createPost);
router.put("/:id", protect, upload.array("images"), updatePost);
router.delete("/:id", protect, deletePost);
router.post("/:id/like", protect, likePost);
router.post("/:id/comment", protect, addComment);

module.exports = router;
