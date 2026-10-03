const express = require("express");
const router = express.Router();
const customizeController = require("../controllers/customize.controller");
const verfiyToken = require("../middleware/verfiytoken");
const isAdmin = require("../middleware/isAdmin");
const upload = require("../middleware/upload");
const {
  createCustomizeValidation,
  updateCustomizeValidation,
  idValidation
} = require("../middleware/customize.validation");
const validate = require("../middleware/validate");
const { publicWriteLimiter } = require("../middleware/rateLimits");

// Create Customize (public)
router.post(
  "/",
  publicWriteLimiter,
  upload.array("image", 5),
  createCustomizeValidation,
  validate,
  customizeController.createCustomize
);

// Get All Customizes (protected)
router.get("/", verfiyToken, isAdmin, customizeController.getAllCustomizes);

// Get Customize By ID (protected)
router.get("/:id", verfiyToken, isAdmin, idValidation, validate, customizeController.getCustomizeById);

// Update Customize (protected)
router.put(
  "/:id",
  verfiyToken,
  isAdmin,
  upload.array("image", 5),
  updateCustomizeValidation,
  idValidation,
  validate,
  customizeController.updateCustomize
);

// Delete Customize (protected)
router.delete("/:id", verfiyToken, isAdmin, idValidation, validate, customizeController.deleteCustomize);

module.exports = router;
