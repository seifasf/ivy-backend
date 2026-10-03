const express = require("express");
const router = express.Router();
const userController = require("../controllers/admin.controller");
const validate = require("../middleware/validate");
const verfiyToken = require("../middleware/verfiytoken");
const isAdmin = require("../middleware/isAdmin");
const {
  signupValidation,
  loginValidation,
  forgotPasswordValidation,
  resetPasswordValidation,
} = require("../middleware/admin.validation");

// Sign Up
router.post("/signup", signupValidation, validate, userController.signup);

// Login
router.post("/login", loginValidation, validate, userController.login);

// Forgot Password
router.post("/forgot-password", forgotPasswordValidation, validate, userController.forgotPassword);

// Reset Password
router.post("/reset-password", resetPasswordValidation, validate, userController.resetPassword);

// Get All Admins (protected + admin only)
router.get("/", verfiyToken, isAdmin, userController.getAllUsers);

// Get Admin By ID (protected + admin only)
router.get("/:id", verfiyToken, isAdmin, userController.getUserById);

// Delete Admin By ID (protected + admin only)
router.delete("/:id", verfiyToken, isAdmin, userController.deleteUser);

module.exports = router;
