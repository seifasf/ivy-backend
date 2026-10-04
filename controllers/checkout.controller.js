const Checkout = require("../model/checkout.model");
const Product = require("../model/product.model");
const PromoCode = require("../model/promocode.model");
const GovernorateShipping = require("../model/governorate-shipping.model");
const Settings = require("../model/settings.model");
const asyncWrapper = require("../middleware/asyncwrapper");
const { effectivePrice, promoDiscount, promoProblem, escapeRegex } = require("../utils/pricing");
const { groupLines, reserveStock, releaseStock } = require("../utils/stock");
const { invalidate } = require("../utils/memoryCache");

const ORDER_STATUSES = ["pending", "processing", "shipped", "delivered", "cancelled"];

const availableUnits = (product, size) => {
  if (!product) return 0;
  if (product.sizeStock?.length) {
    return product.sizeStock.find((line) => line.size === size)?.stock ?? 0;
  }
  return Math.max(product.stock ?? 0, 0);
};

const stockMessage = (product, size, available) => {
  const what = `"${product.title}"${size && product.sizeStock?.length ? ` in size ${size}` : ""}`;
  return available > 0
    ? `Only ${available} left of ${what}. Please lower the quantity.`
    : `${what} is sold out`;
};

const shippingFeeFor = async (governorate) => {
  const fee = await GovernorateShipping.findOne({
    governorate: { $regex: new RegExp(`^${escapeRegex(governorate.trim())}$`, "i") },
  }).lean();
  if (fee) return fee.shippingFee;

  const shipping = await Settings.findOne({ type: "shipping" }).lean();
  return Number(shipping?.data?.baseShippingFee ?? 50);
};

// Create new order. Prices, shipping and discounts are recalculated from the database;
// the amounts sent by the browser are ignored.
const createCheckout = asyncWrapper(async (req, res) => {
  const { userInfo, items, paymentMethod, promoCode } = req.body;

  const productIds = [...new Set(items.map((item) => String(item.productId)))];
  const products = await Product.find(
    { _id: { $in: productIds } },
    { title: 1, price: 1, discountPrice: 1, inStock: 1, mainImage: 1, sizes: 1, colors: 1, stock: 1, sizeStock: 1, costPrice: 1 }
  ).lean();
  const productsById = new Map(products.map((p) => [String(p._id), p]));

  const orderItems = [];
  for (const item of items) {
    const product = productsById.get(String(item.productId));
    if (!product) {
      return res.status(400).json({ message: `"${item.title || "A product"}" is no longer available` });
    }
    if (!product.inStock) {
      return res.status(400).json({ message: `"${product.title}" is out of stock` });
    }
    const size = (item.size || "").trim();
    if (product.sizes?.length && !product.sizes.includes(size)) {
      return res.status(400).json({ message: `Please choose a valid size for "${product.title}"` });
    }
    const colorNames = (product.colors || []).map((c) => c.name);
    const color = (item.color || "").trim();
    if (colorNames.length && !colorNames.includes(color)) {
      return res.status(400).json({ message: `Please choose a valid color for "${product.title}"` });
    }
    orderItems.push({
      productId: product._id,
      title: product.title,
      price: effectivePrice(product),
      mainImage: product.mainImage,
      quantity: item.quantity,
      size,
      color,
      costPrice: product.costPrice || 0,
    });
  }

  for (const line of groupLines(orderItems)) {
    const product = productsById.get(String(line.productId));
    const available = availableUnits(product, line.size);
    if (line.quantity > available) {
      return res.status(400).json({ message: stockMessage(product, line.size, available) });
    }
  }

  const subtotal = orderItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const shippingFee = await shippingFeeFor(userInfo.governorate);

  let promo = null;
  if (promoCode && promoCode.trim()) {
    promo = await PromoCode.findOne({ code: promoCode.trim().toUpperCase() }).lean();
    const problem = promoProblem(promo, subtotal);
    if (problem) return res.status(400).json({ message: problem });
  }

  // Re-checked atomically: another shopper may have bought the last units meanwhile
  const shortLine = await reserveStock(orderItems);
  if (shortLine) {
    const product = productsById.get(String(shortLine.productId));
    const fresh = await Product.findById(shortLine.productId, { stock: 1, sizeStock: 1 }).lean();
    return res.status(400).json({ message: stockMessage(product, shortLine.size, availableUnits(fresh, shortLine.size)) });
  }

  let discount = 0;
  let appliedCode = "";
  if (promo) {
    // Atomic so two simultaneous orders cannot exceed maxUsage
    const claimed = await PromoCode.findOneAndUpdate(
      { _id: promo._id, active: true, $expr: { $lt: ["$currentUsage", "$maxUsage"] } },
      { $inc: { currentUsage: 1 } },
      { new: true }
    ).lean();
    if (!claimed) {
      await releaseStock(orderItems);
      return res.status(400).json({ message: "Promo code usage limit reached" });
    }
    discount = promoDiscount(claimed, subtotal);
    appliedCode = claimed.code;
  }

  const userId = req.decoded?.role === "user" ? req.decoded.id : null;

  let order;
  try {
    order = await Checkout.create({
      userId,
      userInfo,
      items: orderItems,
      paymentMethod: paymentMethod || "cash-on-delivery",
      total: Math.round((subtotal - discount + shippingFee) * 100) / 100,
      shippingFee,
      promoCode: appliedCode,
      stockTracked: true,
      stockDeducted: true,
    });
  } catch (err) {
    await releaseStock(orderItems);
    if (promo && appliedCode) await PromoCode.updateOne({ _id: promo._id }, { $inc: { currentUsage: -1 } });
    throw err;
  }
  invalidate("products:");

  const { stockTracked, stockDeducted, ...publicOrder } = order.toObject();
  publicOrder.items = publicOrder.items.map(({ costPrice, ...item }) => item);

  res.status(201).json({
    message: "Order placed successfully",
    orderId: order._id,
    order: publicOrder,
    summary: { subtotal, discount, shippingFee, total: order.total },
  });
});

// Get all orders (admin)
const getAllCheckouts = asyncWrapper(async (req, res) => {
  const orders = await Checkout.find({}, { __v: 0 }).sort({ createdAt: -1 }).lean();
  res.json(orders);
});

// Get order by ID (admin)
const getCheckoutById = asyncWrapper(async (req, res) => {
  const order = await Checkout.findById(req.params.id, { __v: 0 }).lean();
  if (!order) return res.status(404).json({ message: "Order not found" });
  res.json(order);
});

// Update order status (admin)
const updateCheckoutStatus = asyncWrapper(async (req, res) => {
  const { status } = req.body;
  if (!ORDER_STATUSES.includes(status)) {
    return res.status(400).json({ message: "Invalid status" });
  }
  const order = await Checkout.findById(req.params.id);
  if (!order) return res.status(404).json({ message: "Order not found" });

  // Cancelling returns the units to stock; reopening a cancelled order takes them again
  if (status === "cancelled" && order.stockDeducted) {
    await releaseStock(order.items);
    order.stockDeducted = false;
    invalidate("products:");
  } else if (status !== "cancelled" && order.status === "cancelled" && order.stockTracked && !order.stockDeducted) {
    const shortLine = await reserveStock(order.items);
    if (shortLine) {
      const item = order.items.find((i) => String(i.productId) === String(shortLine.productId));
      return res.status(409).json({ message: `Not enough stock left to reopen this order ("${item?.title || "item"}"${shortLine.size ? `, size ${shortLine.size}` : ""})` });
    }
    order.stockDeducted = true;
    invalidate("products:");
  }

  order.status = status;
  await order.save();
  res.json({ message: "Order status updated", order });
});

// Update shipping fee (admin)
const updateShippingFee = asyncWrapper(async (req, res) => {
  const shippingFee = Number(req.body.shippingFee);
  const order = await Checkout.findById(req.params.id);
  if (!order) return res.status(404).json({ message: "Order not found" });

  // Keep the order total consistent with the new fee
  order.total = Math.round((order.total - (order.shippingFee || 0) + shippingFee) * 100) / 100;
  order.shippingFee = shippingFee;
  await order.save();
  res.json({ message: "Shipping fee updated", order });
});

// Delete order (admin)
const deleteCheckout = asyncWrapper(async (req, res) => {
  const order = await Checkout.findByIdAndDelete(req.params.id).lean();
  if (!order) return res.status(404).json({ message: "Order not found" });
  // Units of an order that never left the store go back on the shelf
  if (order.stockDeducted && ["pending", "processing"].includes(order.status)) {
    await releaseStock(order.items);
    invalidate("products:");
  }
  res.json({ message: "Order deleted" });
});

module.exports = {
  ORDER_STATUSES,
  createCheckout,
  getAllCheckouts,
  getCheckoutById,
  updateCheckoutStatus,
  updateShippingFee,
  deleteCheckout,
};
