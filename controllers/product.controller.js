const Product = require("../model/product.model");
const asyncWrapper = require("../middleware/asyncwrapper");
const { deleteImage } = require("../utils/images");
const { remember, invalidate } = require("../utils/memoryCache");

const PRODUCTS_TTL_MS = 60 * 1000;

// Create Product
const createProduct = asyncWrapper(async (req, res) => {
  const {
    title,
    description,
    price,
    discountPrice,
    inStock,
    category,
    stock,
    sizes 
  } = req.body;

  if (!req.files || !req.files.mainImage || req.files.mainImage.length === 0) {
    return res.status(400).json({ message: "Main image is required" });
  }

  const mainImage = req.files.mainImage[0].filename;
  const images = req.files.images ? req.files.images.map(file => file.filename) : [];

  const product = new Product({
    title,
    description,
    price,
    discountPrice,
    inStock,
    category,
    mainImage,
    images,
    stock,
    sizes: Array.isArray(sizes) ? sizes : (sizes ? [sizes] : []) 
  });

  await product.save();
  invalidate("products:");
  res.status(201).json(product);
});

// Get All Products
const getAllProducts = asyncWrapper(async (req, res) => {
  const products = await remember("products:all", PRODUCTS_TTL_MS, () =>
    Product.find({}, { __v: false }).sort({ createdAt: -1 }).lean()
  );
  res.set("Cache-Control", "public, no-cache");
  res.json(products);
});

// Get Product By ID
const getProductById = asyncWrapper(async (req, res) => {
  const product = await Product.findById(req.params.id, { __v: false }).lean();
  if (!product) return res.status(404).json({ message: "Product not found" });
  res.set("Cache-Control", "public, no-cache");
  res.json(product);
});

// Update Product
const updateProduct = asyncWrapper(async (req, res) => {
  const product = await Product.findById(req.params.id);
  if (!product) return res.status(404).json({ message: "Product not found" });

  const {
    title,
    description,
    price,
    discountPrice,
    inStock,
    category,
    stock,
    sizes,
    oldImages
  } = req.body;

  // Handle mainImage update
  if (req.files && req.files.mainImage && req.files.mainImage.length > 0) {
    // Remove old main image
    deleteImage(product.mainImage);
    product.mainImage = req.files.mainImage[0].filename;
  }

  // Handle images array update (smart merge)
  let newImages = [];
  if (req.files && req.files.images && req.files.images.length > 0) {
    newImages = req.files.images.map(file => file.filename);
  }

  // oldImages: array of filenames that should remain (from frontend)
  let oldImagesArr = [];
  if (oldImages) {
    if (Array.isArray(oldImages)) {
      oldImagesArr = oldImages;
    } else if (typeof oldImages === "string") {
      oldImagesArr = [oldImages];
    }
  } else {
    oldImagesArr = product.images || [];
  }

  // Remove deleted images from disk
  product.images.forEach(img => {
    if (!oldImagesArr.includes(img)) {
      deleteImage(img);
    }
  });

  // Final images = oldImagesArr (remaining) + newImages (added)
  product.images = [...oldImagesArr, ...newImages];

  product.title = title ?? product.title;
  product.description = description ?? product.description;
  product.price = price ?? product.price;
  product.discountPrice = discountPrice ?? product.discountPrice;
  product.inStock = inStock ?? product.inStock;
  product.category = category ?? product.category;
  product.stock = stock ?? product.stock;
  // Handle sizes as array of strings
  if (sizes) {
    if (Array.isArray(sizes)) {
      product.sizes = sizes;
    } else if (typeof sizes === "string") {
      product.sizes = [sizes];
    }
  }

  await product.save();
  invalidate("products:");
  res.json(product);
});

// Delete Product
const deleteProduct = asyncWrapper(async (req, res) => {
  const product = await Product.findById(req.params.id);
  if (!product) return res.status(404).json({ message: "Product not found" });

  // Remove images from disk
  deleteImage(product.mainImage);
  product.images.forEach(img => deleteImage(img));

  await product.deleteOne();
  invalidate("products:");
  res.json({ message: "Product deleted" });
});

module.exports = {
  createProduct,
  getAllProducts,
  getProductById,
  updateProduct,
  deleteProduct
}
