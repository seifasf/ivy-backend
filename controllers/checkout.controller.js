const Checkout = require("../model/checkout.model");
const asyncWrapper = require("../middleware/asyncwrapper");

// Create new order
const createCheckout = asyncWrapper(async (req, res) => {
  const { userInfo, items, paymentMethod, total, shippingFee, promoCode, userId } = req.body;
  const order = new Checkout({
    userId: userId || null, // Link to user if logged in
    userInfo,
    items,
    paymentMethod: paymentMethod || "cash-on-delivery",
    total,
    shippingFee: shippingFee || 0,
    promoCode: promoCode || ""
  });
  await order.save();
  res.status(201).json({ message: "Order placed successfully", orderId: order._id, order });
});

// Get all orders (admin)
const getAllCheckouts = asyncWrapper(async (req, res) => {
  const orders = await Checkout.find().sort({ createdAt: -1 });
  res.json(orders);
});

// Get order by ID (admin)
const getCheckoutById = asyncWrapper(async (req, res) => {
  const order = await Checkout.findById(req.params.id);
  if (!order) return res.status(404).json({ message: "Order not found" });
  res.json(order);
});

// Update order status (admin)
const updateCheckoutStatus = asyncWrapper(async (req, res) => {
  const { status } = req.body;
  const order = await Checkout.findById(req.params.id);
  if (!order) return res.status(404).json({ message: "Order not found" });
  const validStatuses = ["pending", "processing", "shipped", "delivered", "cancelled"];
  if (!validStatuses.includes(status)) {
    return res.status(400).json({ message: "Invalid status" });
  }
  order.status = status;
  await order.save();
  res.json({ message: "Order status updated", order });
});

// Update shipping fee (admin)
const updateShippingFee = asyncWrapper(async (req, res) => {
  const { shippingFee } = req.body;
  const order = await Checkout.findById(req.params.id);
  if (!order) return res.status(404).json({ message: "Order not found" });
  order.shippingFee = shippingFee;
  await order.save();
  res.json({ message: "Shipping fee updated", order });
});

// Delete order (admin)
const deleteCheckout = asyncWrapper(async (req, res) => {
  const order = await Checkout.findById(req.params.id);
  if (!order) return res.status(404).json({ message: "Order not found" });
  await order.deleteOne();
  res.json({ message: "Order deleted" });
});

module.exports = {
  createCheckout,
  getAllCheckouts,
  getCheckoutById,
  updateCheckoutStatus,
  updateShippingFee,
  deleteCheckout,
};
