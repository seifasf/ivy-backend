const express = require("express");
const router = express.Router();
const promoCodeController = require("../controllers/promocode.controller");
const {
  createPromoCodeValidation,
  updatePromoCodeValidation,
  validatePromoCodeValidation,
  applyPromoCodeValidation,
  idValidation
} = require("../middleware/promocode.validation");
const validate = require("../middleware/validate");
const verfiyToken = require("../middleware/verfiytoken");
const isAdmin = require("../middleware/isAdmin");
const { publicWriteLimiter } = require("../middleware/rateLimits");

// Admin: Create Promo Code (protected)
router.post(
  "/",
  verfiyToken,
  isAdmin,
  createPromoCodeValidation,
  validate,
  promoCodeController.createPromoCode
);

// Admin: Get All Promo Codes (protected)
router.get("/", verfiyToken, isAdmin, promoCodeController.getAllPromoCodes);

// Admin: Get Promo Code By ID (protected)
router.get("/:id", verfiyToken, isAdmin, idValidation, validate, promoCodeController.getPromoCodeById);

// Public: Validate Promo Code (for checkout)
router.post(
  "/validate",
  publicWriteLimiter,
  validatePromoCodeValidation,
  validate,
  promoCodeController.validatePromoCode
);

// Public: Apply Promo Code (increment usage after successful order)
router.post(
  "/apply",
  applyPromoCodeValidation,
  validate,
  promoCodeController.applyPromoCode
);

// Admin: Update Promo Code (protected)
router.put(
  "/:id",
  verfiyToken,
  isAdmin,
  idValidation,
  updatePromoCodeValidation,
  validate,
  promoCodeController.updatePromoCode
);

// Admin: Toggle Promo Code Active Status (protected)
router.patch(
  "/:id/toggle-active",
  verfiyToken,
  isAdmin,
  idValidation,
  validate,
  promoCodeController.togglePromoCodeActive
);

// Admin: Delete Promo Code (protected)
router.delete(
  "/:id",
  verfiyToken,
  isAdmin,
  idValidation,
  validate,
  promoCodeController.deletePromoCode
);

module.exports = router;

