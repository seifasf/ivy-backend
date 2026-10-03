const express = require("express");
const router = express.Router();
const userController = require("../controllers/admin.controller");
const Admin = require("../model/admin.model");
const validate = require("../middleware/validate");
const verfiyToken = require("../middleware/verfiytoken");
const isAdmin = require("../middleware/isAdmin");
const { authLimiter } = require("../middleware/rateLimits");
const {
  signupValidation,
  loginValidation,
  forgotPasswordValidation,
  resetPasswordValidation,
} = require("../middleware/admin.validation");

// Anyone may create the very first admin; after that only a logged-in admin can add more.
const firstAdminOrAdmin = async (req, res, next) => {
  const adminExists = await Admin.exists({});
  if (!adminExists) return next();
  verfiyToken(req, res, () => isAdmin(req, res, next));
};

// Sign Up
router.post("/signup", authLimiter, firstAdminOrAdmin, signupValidation, validate, userController.signup);

// Login
router.post("/login", authLimiter, loginValidation, validate, userController.login);

// Forgot Password
router.post("/forgot-password", authLimiter, forgotPasswordValidation, validate, userController.forgotPassword);

// Reset Password
router.post("/reset-password", authLimiter, resetPasswordValidation, validate, userController.resetPassword);

// Get All Admins (protected + admin only)
router.get("/", verfiyToken, isAdmin, userController.getAllUsers);

// Get Admin By ID (protected + admin only)
router.get("/:id", verfiyToken, isAdmin, userController.getUserById);

// Delete Admin By ID (protected + admin only)
router.delete("/:id", verfiyToken, isAdmin, userController.deleteUser);

module.exports = router;
