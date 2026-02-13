const express = require("express");
const router = express.Router();
const {
    getAllClubs,
    createClub,
    updateClub,
    deleteClub
} = require("../controller/clubController");
const { verifyToken } = require("../middleware/authMiddleware");

// Routes
router.get("/", getAllClubs);
router.post("/", verifyToken, createClub);
router.put("/:id", verifyToken, updateClub);
router.delete("/:id", verifyToken, deleteClub);

module.exports = router;
