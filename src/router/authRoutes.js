const express = require("express");
const router = express.Router();
const AuthController = require("../controller/authController");

router.post("/register", AuthController.register);
router.post("/login", AuthController.Login);
router.get("/verify/:token", AuthController.Verify);
router.post('/google', AuthController.googleSignIn);

module.exports = router;