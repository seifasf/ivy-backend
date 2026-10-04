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

// Per-size units arrive as JSON: [{"size":"M","stock":12}]
const cleanSizeStock = (value) => {
  if (value === undefined || value === null || value === "") return undefined;
  const list = typeof value === "string" ? JSON.parse(value) : value;
  const merged = new Map();
  for (const line of list) {
    const size = String(line.size).trim().toUpperCase();
    if (!SIZE_PATTERN.test(size)) continue;
    merged.set(size, (merged.get(size) || 0) + Math.max(0, Math.floor(Number(line.stock) || 0)));
  }
  return [...merged].map(([size, stock]) => ({ size, stock }));
};

// When units are tracked per size, the sizes on sale are exactly those sizes
// and their units must add up to the total stock.
const sizeStockProblem = (sizeStock, stock) => {
  if (!sizeStock.length) return null;
  const allocated = sizeStock.reduce((sum, line) => sum + line.stock, 0);
  if (allocated !== Number(stock)) {
    return `Size quantities add up to ${allocated} but total stock is ${Number(stock)}. They must match.`;
  }
  return null;
};

// Shoppers never see what a product costs the store
const PUBLIC_FIELDS = { __v: false, costPrice: false };

// A missing or invalid sale price means "no discount"
const resolveDiscount = (price, discountPrice) => {
  const sale = Number(discountPrice);
  return discountPrice !== undefined && discountPrice !== "" && Number.isFinite(sale) && sale >= 0
    ? sale
    : Number(price);
};

// Create Product
const createProduct = asyncWrapper(async (req, res) => {
  const { title, description, price, discountPrice, costPrice, inStock, category, stock, sizes, sizeStock, colors } = req.body;

  const mainImage = req.files?.mainImage?.[0]?.filename;
  if (!mainImage) {
    return res.status(400).json({ message: "Main image is required" });
  }

  const sizeStockList = cleanSizeStock(sizeStock) || [];
  const problem = sizeStockProblem(sizeStockList, stock);
  if (problem) return res.status(400).json({ message: problem });

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
    costPrice: Number(costPrice) || 0,
    sizes: sizeStockList.length ? sizeStockList.map((line) => line.size) : cleanSizes(sizes) || [],
    sizeStock: sizeStockList,
    colors: cleanColors(colors) || [],
  });

  invalidate("products:");
  res.status(201).json(product);
});

// Get All Products
const getAllProducts = asyncWrapper(async (req, res) => {
  const products = await remember("products:all", PRODUCTS_TTL_MS, () =>
    Product.find({}, PUBLIC_FIELDS).sort({ createdAt: -1 }).lean()
  );
  res.set("Cache-Control", "public, no-cache");
  res.json(products);
});

// Get All Products with cost data (admin)
const getAllProductsAdmin = asyncWrapper(async (req, res) => {
  const products = await Product.find({}, { __v: false }).sort({ createdAt: -1 }).lean();
  res.set("Cache-Control", "private, no-store");
  res.json(products);
});

// Get Product By ID
const getProductById = asyncWrapper(async (req, res) => {
  const product = await Product.findById(req.params.id, PUBLIC_FIELDS).lean();
  if (!product) return res.status(404).json({ message: "Product not found" });
  res.set("Cache-Control", "public, no-cache");
  res.json(product);
});

// Update Product
const updateProduct = asyncWrapper(async (req, res) => {
  const product = await Product.findById(req.params.id);
  if (!product) return res.status(404).json({ message: "Product not found" });

  const { title, description, price, discountPrice, costPrice, inStock, category, stock, sizes, sizeStock, colors, oldImages } = req.body;
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
  if (costPrice !== undefined) product.costPrice = Number(costPrice) || 0;
  if (stock !== undefined) product.stock = stock;
  const sizeList = cleanSizes(sizes);
  if (sizeList) product.sizes = sizeList;
  const sizeStockList = cleanSizeStock(sizeStock);
  if (sizeStockList) {
    product.sizeStock = sizeStockList;
    if (sizeStockList.length) product.sizes = sizeStockList.map((line) => line.size);
  } else if (sizeList && product.sizeStock.length) {
    // Sizes changed without new quantities: keep units only for sizes still on sale
    product.sizeStock = product.sizeStock.filter((line) => sizeList.includes(line.size));
  }
  const colorList = cleanColors(colors);
  if (colorList) product.colors = colorList;

  const problem = sizeStockProblem(product.sizeStock, product.stock);
  if (problem) return res.status(400).json({ message: problem });

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
  getAllProductsAdmin,
  getProductById,
  updateProduct,
  deleteProduct
}
