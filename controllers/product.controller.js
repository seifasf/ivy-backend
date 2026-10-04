const Product = require("../model/product.model");
const asyncWrapper = require("../middleware/asyncwrapper");
const { deleteImage } = require("../utils/images");
const { remember, invalidate } = require("../utils/memoryCache");

const PRODUCTS_TTL_MS = 60 * 1000;

const MAX_EXTRA_IMAGES = 10;

// Form fields arrive as a JSON array string, repeated fields, or a single value
const toList = (value) => {
  if (value === undefined || value === null) return undefined;
  if (Array.isArray(value)) return value.map(String);
  const text = String(value).trim();
  if (text.startsWith("[")) {
    try {
      return JSON.parse(text).map(String);
    } catch {
      return [];
    }
  }
  return text ? [text] : [];
};

// Sizes look like "M", "XXL", "42" or "ONE SIZE"; anything else is a stray encoded value
const SIZE_PATTERN = /^[A-Z0-9][A-Z0-9 ./-]{0,19}$/;

const cleanSizes = (value) => {
  const list = toList(value);
  return list && [...new Set(list.map((s) => s.trim().toUpperCase()).filter((s) => SIZE_PATTERN.test(s)))];
};

const cleanColors = (value) => {
  if (value === undefined || value === null) return undefined;
  const list = typeof value === "string" ? JSON.parse(value) : value;
  const seen = new Set();
  return list
    .map((c) => ({ name: String(c.name).trim(), hex: (c.hex || "").toLowerCase() }))
    .filter((c) => c.name && !seen.has(c.name.toLowerCase()) && seen.add(c.name.toLowerCase()));
};

// A missing or invalid sale price means "no discount"
const resolveDiscount = (price, discountPrice) => {
  const sale = Number(discountPrice);
  return discountPrice !== undefined && discountPrice !== "" && Number.isFinite(sale) && sale >= 0
    ? sale
    : Number(price);
};

// Create Product
const createProduct = asyncWrapper(async (req, res) => {
  const { title, description, price, discountPrice, inStock, category, stock, sizes, colors } = req.body;

  const mainImage = req.files?.mainImage?.[0]?.filename;
  if (!mainImage) {
    return res.status(400).json({ message: "Main image is required" });
  }
  const images = (req.files?.images || []).map((file) => file.filename);

  const product = await Product.create({
    title: title.trim(),
    description: description.trim(),
    price,
    discountPrice: resolveDiscount(price, discountPrice),
    inStock: inStock ?? true,
    category: category.trim(),
    mainImage,
    images,
    stock,
    sizes: cleanSizes(sizes) || [],
    colors: cleanColors(colors) || [],
  });

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

  const { title, description, price, discountPrice, inStock, category, stock, sizes, colors, oldImages } = req.body;
  const removedImages = [];

  const newMain = req.files?.mainImage?.[0]?.filename;
  if (newMain) {
    removedImages.push(product.mainImage);
    product.mainImage = newMain;
  }

  // oldImages lists the existing extra images to keep; omitted means keep all
  const keepList = toList(oldImages);
  const kept = keepList ? product.images.filter((img) => keepList.includes(img)) : [...product.images];
  removedImages.push(...product.images.filter((img) => !kept.includes(img)));

  const added = (req.files?.images || []).map((file) => file.filename);
  if (kept.length + added.length > MAX_EXTRA_IMAGES) {
    return res.status(400).json({ message: `A product can have at most ${MAX_EXTRA_IMAGES} extra images` });
  }
  product.images = [...kept, ...added];

  if (title !== undefined) product.title = title.trim();
  if (description !== undefined) product.description = description.trim();
  if (category !== undefined) product.category = category.trim();
  if (price !== undefined) product.price = price;
  if (discountPrice !== undefined || price !== undefined) {
    product.discountPrice = resolveDiscount(product.price, discountPrice ?? product.discountPrice);
  }
  if (inStock !== undefined) product.inStock = inStock;
  if (stock !== undefined) product.stock = stock;
  const sizeList = cleanSizes(sizes);
  if (sizeList) product.sizes = sizeList;
  const colorList = cleanColors(colors);
  if (colorList) product.colors = colorList;

  await product.save();
  // Only remove replaced images once the product points at the new ones
  removedImages.forEach((img) => deleteImage(img));
  invalidate("products:");
  res.json(product);
});

// Delete Product
const deleteProduct = asyncWrapper(async (req, res) => {
  const product = await Product.findById(req.params.id);
  if (!product) return res.status(404).json({ message: "Product not found" });

  await product.deleteOne();
  deleteImage(product.mainImage);
  product.images.forEach(img => deleteImage(img));
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
