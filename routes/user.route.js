const express = require("express");
const router = express.Router();
const userController = require("../controllers/user.controller");
const validate = require("../middleware/validate");
const verfiyToken = require("../middleware/verfiytoken");
const isAdmin = require("../middleware/isAdmin");
const { authLimiter } = require("../middleware/rateLimits");
const {
  signupValidation,
  loginValidation,
  forgotPasswordValidation,
  resetPasswordValidation,
} = require("../middleware/user.validation");

// Sign Up
router.post("/signup", authLimiter, signupValidation, validate, userController.signup);

// Login
router.post("/login", authLimiter, loginValidation, validate, userController.login);

// Forgot Password
router.post("/forgot-password", authLimiter, forgotPasswordValidation, validate, userController.forgotPassword);

// Reset Password
router.post("/reset-password", authLimiter, resetPasswordValidation, validate, userController.resetPassword);

// Google OAuth - Create or Login
router.post("/google-auth", authLimiter, userController.googleAuth);

// Get User Orders (protected)
router.get("/orders/my-orders", verfiyToken, userController.getUserOrders);

// Get All Users (protected + admin only)
router.get("/", verfiyToken, isAdmin, userController.getAllUsers);

// Get User By ID (protected + admin only)
router.get("/:id", verfiyToken, isAdmin, userController.getUserById);

// Delete User By ID (protected + admin only)
router.delete("/:id", verfiyToken, isAdmin, userController.deleteUser);

module.exports = router;
