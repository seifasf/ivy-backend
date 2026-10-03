const express = require("express");
const router = express.Router();
const checkoutController = require("../controllers/checkout.controller");
const { checkoutValidation, statusValidation } = require("../middleware/checkout.validation");
const validate = require("../middleware/validate");
const verfiyToken = require("../middleware/verfiytoken");
const isAdmin = require("../middleware/isAdmin");

// User creates order (public)
router.post("/", checkoutValidation, validate, checkoutController.createCheckout);

// Admin: get all orders
router.get("/", verfiyToken, isAdmin, checkoutController.getAllCheckouts);

// Admin: get order by id
router.get("/:id", verfiyToken, isAdmin, checkoutController.getCheckoutById);

// Admin: update order status
router.put("/:id/status", verfiyToken, isAdmin, statusValidation, validate, checkoutController.updateCheckoutStatus);

// Admin: update shipping fee
router.put("/:id/shipping-fee", verfiyToken, isAdmin, checkoutController.updateShippingFee);

// Admin: delete order
router.delete("/:id", verfiyToken, isAdmin, checkoutController.deleteCheckout);

module.exports = router;
