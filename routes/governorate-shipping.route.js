const express = require("express");
const router = express.Router();
const governorateShippingController = require("../controllers/governorate-shipping.controller");
const verfiyToken = require("../middleware/verfiytoken");
const isAdmin = require("../middleware/isAdmin");

// Admin: Initialize governorate fees (run once)
router.post(
  "/initialize",
  verfiyToken,
  isAdmin,
  governorateShippingController.initializeGovernoratesFees
);

// Public: Get all governorate fees
router.get("/", governorateShippingController.getAllGovernoratesFees);

// Public: Get specific governorate fee
router.get("/:governorate", governorateShippingController.getGovernoratesFee);

// Admin: Update single governorate fee
router.put(
  "/",
  verfiyToken,
  isAdmin,
  governorateShippingController.updateGovernoratesFee
);

// Admin: Update multiple governorate fees
router.put(
  "/bulk",
  verfiyToken,
  isAdmin,
  governorateShippingController.updateMultipleGovernoratesFees
);

module.exports = router;

