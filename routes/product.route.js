const express = require("express");
const router = express.Router();
const productController = require("../controllers/product.controller");
const Product = require("../model/product.model");
const verfiyToken = require("../middleware/verfiytoken");
const upload = require("../middleware/upload");
const {
  createProductValidation,
  updateProductValidation,
  idValidation
} = require("../middleware/product.validation");
const validate = require("../middleware/validate");
const isAdmin = require("../middleware/isAdmin");

// Create Product (protected)
router.post(
  "/",
  verfiyToken,
  isAdmin,
  upload.fields([
    { name: "mainImage", maxCount: 1 },
    { name: "images", maxCount: 10 }
  ]),
  createProductValidation,
  validate,
  productController.createProduct
);

// Get All Products
router.get("/", productController.getAllProducts);

// Get Product By ID
router.get("/:id", idValidation, validate, productController.getProductById);

// Update Product (protected)
router.put(
  "/:id",
  verfiyToken,
  isAdmin,
  upload.fields([
    { name: "mainImage", maxCount: 1 },
    { name: "images", maxCount: 10 }
  ]),
  updateProductValidation,
  idValidation,
  validate,
  productController.updateProduct
);

// Delete Product (protected)
router.delete("/:id", verfiyToken, isAdmin, idValidation, validate, productController.deleteProduct);

// Add a new image to images array
router.post(
  "/:id/images",
  verfiyToken,
  isAdmin,
  upload.single("image"),
  async (req, res) => {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ message: "Product not found" });
    if (!req.file) return res.status(400).json({ message: "No image uploaded" });
    product.images.push(req.file.filename);
    await product.save();
    res.json(product);
  }
);

// Replace a specific image in images array
router.put(
  "/:id/images/:imageName",
  verfiyToken,
  isAdmin,
  upload.single("image"),
  async (req, res) => {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ message: "Product not found" });
    const idx = product.images.indexOf(req.params.imageName);
    if (idx === -1) return res.status(404).json({ message: "Image not found" });
    // Remove old image from disk
    const fs = require("fs");
    const path = require("path");
    try {
      fs.unlinkSync(path.join("uploads", req.params.imageName));
    } catch {}
    // Replace with new image
    if (!req.file) return res.status(400).json({ message: "No image uploaded" });
    product.images[idx] = req.file.filename;
    await product.save();
    res.json(product);
  }
);

// Delete a specific image from images array
router.delete(
  "/:id/images/:imageName",
  verfiyToken,
  isAdmin,
  async (req, res) => {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ message: "Product not found" });
    const idx = product.images.indexOf(req.params.imageName);
    if (idx === -1) return res.status(404).json({ message: "Image not found" });
    // Remove from disk
    const fs = require("fs");
    const path = require("path");
    try {
      fs.unlinkSync(path.join("uploads", req.params.imageName));
    } catch {}
    product.images.splice(idx, 1);
    await product.save();
    res.json(product);
  }
);

module.exports = router;
