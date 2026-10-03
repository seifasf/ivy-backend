const express = require("express");
const router = express.Router();
const userController = require("../controllers/user.controller");
const validate = require("../middleware/validate");
const verfiyToken = require("../middleware/verfiytoken");
const isAdmin = require("../middleware/isAdmin");
const {
  signupValidation,
  loginValidation,
  forgotPasswordValidation,
  resetPasswordValidation,
} = require("../middleware/user.validation");

// Sign Up
router.post("/signup", signupValidation, validate, userController.signup);

// Login
router.post("/login", loginValidation, validate, userController.login);

// Forgot Password
router.post("/forgot-password", forgotPasswordValidation, validate, userController.forgotPassword);

// Reset Password
router.post("/reset-password", resetPasswordValidation, validate, userController.resetPassword);

// Get All Users (protected + admin only)
router.get("/", verfiyToken, isAdmin, userController.getAllUsers);
 
// Get User By ID (protected)
router.get("/:id", verfiyToken,isAdmin, userController.getUserById);

// Delete User By ID (protected)
router.delete("/:id", verfiyToken,isAdmin, userController.deleteUser);

// Google OAuth - Create or Login
router.post("/google-auth", userController.googleAuth);

// Get User Orders (protected)
router.get("/orders/my-orders", verfiyToken, userController.getUserOrders);

module.exports = router;
