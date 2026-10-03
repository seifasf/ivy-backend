const { body, param } = require("express-validator");

const createPromoCodeValidation = [
  body("code")
    .trim()
    .notEmpty().withMessage("Code is required")
    .isLength({ min: 3, max: 20 }).withMessage("Code must be 3-20 characters"),
  body("discountType")
    .notEmpty().withMessage("Discount type is required")
    .isIn(['percentage', 'fixed']).withMessage("Discount type must be 'percentage' or 'fixed'"),
  body("discountValue")
    .notEmpty().withMessage("Discount value is required")
    .isFloat({ min: 0 }).withMessage("Discount value must be a positive number"),
  body("minOrderValue")
    .notEmpty().withMessage("Minimum order value is required")
    .isFloat({ min: 0 }).withMessage("Minimum order value must be a positive number"),
  body("maxUsage")
    .notEmpty().withMessage("Max usage is required")
    .isInt({ min: 1 }).withMessage("Max usage must be at least 1"),
  body("expiryDate")
    .notEmpty().withMessage("Expiry date is required")
    .isISO8601().withMessage("Invalid date format"),
  body("active")
    .optional()
    .isBoolean().withMessage("Active must be a boolean")
];

const updatePromoCodeValidation = [
  body("code")
    .optional()
    .trim()
    .isLength({ min: 3, max: 20 }).withMessage("Code must be 3-20 characters"),
  body("discountType")
    .optional()
    .isIn(['percentage', 'fixed']).withMessage("Discount type must be 'percentage' or 'fixed'"),
  body("discountValue")
    .optional()
    .isFloat({ min: 0 }).withMessage("Discount value must be a positive number"),
  body("minOrderValue")
    .optional()
    .isFloat({ min: 0 }).withMessage("Minimum order value must be a positive number"),
  body("maxUsage")
    .optional()
    .isInt({ min: 1 }).withMessage("Max usage must be at least 1"),
  body("expiryDate")
    .optional()
    .isISO8601().withMessage("Invalid date format"),
  body("active")
    .optional()
    .isBoolean().withMessage("Active must be a boolean")
];

const validatePromoCodeValidation = [
  body("code")
    .trim()
    .notEmpty().withMessage("Code is required"),
  body("orderTotal")
    .notEmpty().withMessage("Order total is required")
    .isFloat({ min: 0 }).withMessage("Order total must be a positive number")
];

const applyPromoCodeValidation = [
  body("code")
    .trim()
    .notEmpty().withMessage("Code is required")
];

const idValidation = [
  param("id").isMongoId().withMessage("Invalid ID format")
];

module.exports = {
  createPromoCodeValidation,
  updatePromoCodeValidation,
  validatePromoCodeValidation,
  applyPromoCodeValidation,
  idValidation
};

