const express = require("express");
const router = express.Router();
const businessController = require("../controllers/business.controllers");
const verfiyToken = require("../middleware/verfiytoken");
const isAdmin = require("../middleware/isAdmin");
const {
  createBusinessValidation,
  updateBusinessValidation,
  idValidation
} = require("../middleware/business.validation");
const validate = require("../middleware/validate");
const { publicWriteLimiter } = require("../middleware/rateLimits");

// Create Business (public)
router.post(
  "/",
  publicWriteLimiter,
  createBusinessValidation,
  validate,
  businessController.createBusiness
);

// Get All Businesses (protected)
router.get("/", verfiyToken, isAdmin, businessController.getAllBusinesses);

// Get Business By ID (protected)
router.get("/:id", verfiyToken, isAdmin, idValidation, validate, businessController.getBusinessById);

// Update Business (protected)
router.put(
  "/:id",
  verfiyToken,
  isAdmin,
  updateBusinessValidation,
  idValidation,
  validate,
  businessController.updateBusiness
);

// Delete Business (protected)
router.delete("/:id", verfiyToken, isAdmin, idValidation, validate, businessController.deleteBusiness);

module.exports = router;
