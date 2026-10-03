const express = require("express");
const router = express.Router();
const shippingController = require("../controllers/shipping.controller");
const verfiyToken = require("../middleware/verfiytoken");
const isAdmin = require("../middleware/isAdmin");
const {
  createShippingValidation,
  updateShippingValidation,
  idValidation
} = require("../middleware/shipping.validation");
const validate = require("../middleware/validate");

// Create Shipping (protected)
router.post(
  "/",
  verfiyToken,
  isAdmin,
  createShippingValidation,
  validate,
  shippingController.createShipping
);

// Get All Shippings
router.get("/", shippingController.getAllShippings);

// Get Shipping By ID
router.get("/:id", idValidation, validate, shippingController.getShippingById);

// Update Shipping (protected)
router.put(
  "/:id",
  verfiyToken,
  isAdmin,
  updateShippingValidation,
  idValidation,
  validate,
  shippingController.updateShipping
);

// Delete Shipping (protected)
router.delete("/:id", verfiyToken, isAdmin, idValidation, validate, shippingController.deleteShipping);

module.exports = router;
