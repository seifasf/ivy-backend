const express = require("express");
const router = express.Router();
const checkoutController = require("../controllers/checkout.controller");
const {
  checkoutValidation,
  statusValidation,
  shippingFeeValidation,
  idValidation,
} = require("../middleware/checkout.validation");
const validate = require("../middleware/validate");
const verfiyToken = require("../middleware/verfiytoken");
const isAdmin = require("../middleware/isAdmin");
const { publicWriteLimiter } = require("../middleware/rateLimits");

// User creates order (public; linked to the account when a user token is sent)
router.post("/", publicWriteLimiter, verfiyToken.optional, checkoutValidation, validate, checkoutController.createCheckout);

// Admin: get all orders
router.get("/", verfiyToken, isAdmin, checkoutController.getAllCheckouts);

// Admin: get order by id
router.get("/:id", verfiyToken, isAdmin, idValidation, validate, checkoutController.getCheckoutById);

// Admin: update order status
router.put("/:id/status", verfiyToken, isAdmin, idValidation, statusValidation, validate, checkoutController.updateCheckoutStatus);

// Admin: update shipping fee
router.put("/:id/shipping-fee", verfiyToken, isAdmin, idValidation, shippingFeeValidation, validate, checkoutController.updateShippingFee);

// Admin: delete order
router.delete("/:id", verfiyToken, isAdmin, idValidation, validate, checkoutController.deleteCheckout);

module.exports = router;
