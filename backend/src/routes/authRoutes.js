const express = require("express");
const router = express.Router();
const { signup, verifyOtp, login, resendOtp, getMe } = require("../controllers/authController");
const { protect } = require("../middleware/authMiddleware");

// Public routes
router.post("/signup", signup);
router.post("/verify-otp", verifyOtp);
router.post("/login", login);
router.post("/resend-otp", resendOtp);

// Protected routes
router.get("/me", protect, getMe);

module.exports = router;
