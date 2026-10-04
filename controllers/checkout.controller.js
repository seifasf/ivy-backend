const Checkout = require("../model/checkout.model");
const Product = require("../model/product.model");
const PromoCode = require("../model/promocode.model");
const GovernorateShipping = require("../model/governorate-shipping.model");
const Settings = require("../model/settings.model");
const asyncWrapper = require("../middleware/asyncwrapper");
const { effectivePrice, promoDiscount, promoProblem, escapeRegex } = require("../utils/pricing");

const ORDER_STATUSES = ["pending", "processing", "shipped", "delivered", "cancelled"];

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
    { title: 1, price: 1, discountPrice: 1, inStock: 1, mainImage: 1, sizes: 1, colors: 1 }
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
    });
  }

  const subtotal = orderItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const shippingFee = await shippingFeeFor(userInfo.governorate);

  let discount = 0;
  let appliedCode = "";
  if (promoCode && promoCode.trim()) {
    const code = promoCode.trim().toUpperCase();
    const promo = await PromoCode.findOne({ code }).lean();
    const problem = promoProblem(promo, subtotal);
    if (problem) return res.status(400).json({ message: problem });

    // Atomic so two simultaneous orders cannot exceed maxUsage
    const claimed = await PromoCode.findOneAndUpdate(
      { _id: promo._id, active: true, $expr: { $lt: ["$currentUsage", "$maxUsage"] } },
      { $inc: { currentUsage: 1 } },
      { new: true }
    ).lean();
    if (!claimed) return res.status(400).json({ message: "Promo code usage limit reached" });

    discount = promoDiscount(claimed, subtotal);
    appliedCode = code;
  }

  const userId = req.decoded?.role === "user" ? req.decoded.id : null;

  const order = await Checkout.create({
    userId,
    userInfo,
    items: orderItems,
    paymentMethod: paymentMethod || "cash-on-delivery",
    total: Math.round((subtotal - discount + shippingFee) * 100) / 100,
    shippingFee,
    promoCode: appliedCode,
  });

  res.status(201).json({
    message: "Order placed successfully",
    orderId: order._id,
    order,
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
  const order = await Checkout.findByIdAndUpdate(req.params.id, { status }, { new: true }).lean();
  if (!order) return res.status(404).json({ message: "Order not found" });
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
