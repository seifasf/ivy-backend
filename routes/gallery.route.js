const express = require("express");
const router = express.Router();
const galleryController = require("../controllers/gallery.controller");
const verfiyToken = require("../middleware/verfiytoken");
const isAdmin = require("../middleware/isAdmin");
const upload = require("../middleware/upload");
const {
  createGalleryValidation,
  updateGalleryValidation,
  idValidation
} = require("../middleware/gallery.validation");
const validate = require("../middleware/validate");

// Create Gallery (protected)
router.post(
  "/",
  verfiyToken,
  isAdmin,
  upload.single("image"),
  createGalleryValidation,
  validate,
  galleryController.createGallery
);

// Get All Galleries
router.get("/", galleryController.getAllGalleries);

// Get Gallery By ID
router.get("/:id", idValidation, validate, galleryController.getGalleryById);

// Update Gallery (protected)
router.put(
  "/:id",
  verfiyToken,
  isAdmin,
  upload.single("image"),
  updateGalleryValidation,
  idValidation,
  validate,
  galleryController.updateGallery
);

// Delete Gallery (protected)
router.delete("/:id", verfiyToken, isAdmin, idValidation, validate, galleryController.deleteGallery);

module.exports = router;
